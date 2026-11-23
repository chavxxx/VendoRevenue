import pytest
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.services.calculation import compute_revenue_distribution

client = TestClient(app)

def test_financial_decimal_exactness():
    """Verify exact 2-decimal arithmetic across Partner, Staff Incentive Pool, and GARTECH Net."""
    # ₱10,000.00 with 25% partner, 5% staff, 70% gartech
    res = compute_revenue_distribution(
        gross_harvest=Decimal("10000.00"),
        partner_percentage=Decimal("25.00"),
        staff_incentive_percentage=Decimal("5.00"),
        gartech_net_percentage=Decimal("70.00")
    )
    assert res["gross_harvest"] == Decimal("10000.00")
    assert res["partner_share"] == Decimal("2500.00")
    assert res["staff_incentive"] == Decimal("500.00")
    assert res["gartech_net"] == Decimal("7000.00")
    assert res["partner_share"] + res["staff_incentive"] + res["gartech_net"] == res["gross_harvest"]

    # Test uneven decimal amounts (e.g. ₱7,333.33)
    res2 = compute_revenue_distribution(
        gross_harvest=Decimal("7333.33"),
        partner_percentage=Decimal("25.00"),
        staff_incentive_percentage=Decimal("5.00"),
        gartech_percentage=Decimal("70.00")
    )
    assert res2["partner_share"] + res2["staff_incentive"] + res2["gartech_net"] == Decimal("7333.33")

def test_login_and_roles():
    """Test login authentication for Admin."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    assert admin_res.status_code == 200
    assert admin_res.json()["user"]["role"] == "ADMIN"

def test_staff_and_user_crud():
    """Test Add, Edit, and Delete for Staff and User accounts."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Staff Harvester
    create_staff = client.post("/api/v1/staff/", headers=headers, json={
        "staff_code": "STF-TEST-99",
        "full_name": "Test Harvester 99",
        "phone": "0917-999-8888",
        "role_type": "FIELD_HARVESTER"
    })
    assert create_staff.status_code == 201
    staff_id = create_staff.json()["id"]

    # 2. Update Staff
    update_staff = client.put(f"/api/v1/staff/{staff_id}", headers=headers, json={
        "full_name": "Updated Harvester 99",
        "phone": "0917-999-7777"
    })
    assert update_staff.status_code == 200
    assert update_staff.json()["full_name"] == "Updated Harvester 99"

    # 3. Create User Account
    create_user = client.post("/api/v1/users/", headers=headers, json={
        "username": "testuser99",
        "full_name": "Test User 99",
        "email": "testuser99@gartech.ph",
        "role": "STAFF_ENCODER",
        "password": "Password123!"
    })
    assert create_user.status_code == 201
    user_id = create_user.json()["id"]

    # 4. Delete User Account
    del_user = client.delete(f"/api/v1/users/{user_id}", headers=headers)
    assert del_user.status_code == 200

    # 5. Delete Staff Harvester
    del_staff = client.delete(f"/api/v1/staff/{staff_id}", headers=headers)
    assert del_staff.status_code == 200

def test_harvest_preview_and_encoding():
    """Verify harvest calculation preview with configured partner share."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create or get test staff
    staff_res = client.post("/api/v1/staff/", headers=headers, json={
        "staff_code": "STF-TEST-99",
        "full_name": "Test Harvester 99",
        "phone": "0917-555-1234",
        "role_type": "FIELD_HARVESTER"
    })
    if staff_res.status_code == 400:
        harv_id = client.get("/api/v1/staff/", headers=headers).json()[0]["id"]
    else:
        assert staff_res.status_code == 201
        harv_id = staff_res.json()["id"]

    vendo_res = client.post("/api/v1/vendos/", headers=headers, json={
        "vlan_id": 999,
        "vendo_name": "WiFi Vendo Test 999",
        "complete_address": "Test Plaza, Valencia City",
        "city_municipality": "Valencia",
        "province": "Bukidnon",
        "installation_date": "2026-11-22"
    })
    if vendo_res.status_code == 400:
        vlan_val = 999
    else:
        assert vendo_res.status_code == 201
        vlan_val = vendo_res.json()["vlan_id"]

    # Preview calculation (default 25% partner, 5% staff pool, 70% gartech)
    preview_res = client.post("/api/v1/harvests/preview", headers=headers, json={
        "gross_harvest": 10000.00,
        "vlan_id": vlan_val
    })
    assert preview_res.status_code == 200
    prev = preview_res.json()
    assert prev["gross_harvest"] == "10000.00"
    assert prev["partner_share"] == "2500.00"
    assert prev["staff_incentive"] == "500.00"
    assert prev["gartech_net"] == "7000.00"

    # Encode Harvest
    encode_res = client.post("/api/v1/harvests/", headers=headers, json={
        "vlan_id": 555,
        "harvest_date": "2026-11-22",
        "gross_harvest": 10000.00,
        "harvester_id": harv_id
    })
    assert encode_res.status_code == 201
    txn = encode_res.json()
    assert txn["partner_share"] == "2500.00"
    assert txn["staff_incentive"] == "500.00"
    assert txn["gartech_net"] == "7000.00"

def test_settings_revenue_distribution_configuration():
    """Verify system settings and 3-way revenue share configuration."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update revenue configuration to 30% Partner, 5% Staff, 65% Net
    put_s = client.put("/api/v1/users/system/settings", headers=headers, json={
        "partner_share_percentage": 30.00,
        "staff_incentive_percentage": 5.00
    })
    assert put_s.status_code == 200
    assert float(put_s.json()["partner_share_percentage"]) == 30.00
    assert float(put_s.json()["staff_incentive_percentage"]) == 5.00
    assert float(put_s.json()["gartech_net_percentage"]) == 65.00

    # Reset back to 25% Partner, 5% Staff, 70% Net
    put_back = client.put("/api/v1/users/system/settings", headers=headers, json={
        "partner_share_percentage": 25.00,
        "staff_incentive_percentage": 5.00
    })
    assert put_back.status_code == 200
    assert float(put_back.json()["partner_share_percentage"]) == 25.00
    assert float(put_back.json()["gartech_net_percentage"]) == 70.00

def test_system_update_check():
    """Verify check for updates endpoint operates cleanly without data loss."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_res = client.get("/api/v1/users/system/update-check", headers=headers)
    assert update_res.status_code == 200
    data = update_res.json()
    assert "current_commit" in data
    assert "repo_url" in data
    assert "checked_at" in data
    assert "PST" in data["checked_at"]
