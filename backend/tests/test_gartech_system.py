import pytest
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.services.calculation import compute_revenue_distribution

client = TestClient(app)

def test_financial_decimal_exactness():
    """Verify exact 2-decimal arithmetic and penny balance conservation."""
    # Test case from project spec: ₱10,000.00
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
    """Test login authentication for Admin and Staff Encoder."""
    # Admin login
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    assert admin_res.status_code == 200
    assert admin_res.json()["user"]["role"] == "ADMIN"

    # Staff Encoder login
    encoder_res = client.post("/api/v1/auth/login", json={
        "username": "encoder1",
        "password": "GartechEncoder2026!"
    })
    assert encoder_res.status_code == 200
    assert encoder_res.json()["user"]["role"] == "STAFF_ENCODER"

def test_harvest_encoding_workflow_and_flexible_dates():
    """Verify final workflow (date, vlan, income, harvester, submit) with no monthly restriction."""
    encoder_res = client.post("/api/v1/auth/login", json={
        "username": "encoder1",
        "password": "GartechEncoder2026!"
    })
    token = encoder_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Encode first harvest for VLAN 101 on Nov 5
    h1_res = client.post("/api/v1/harvests/", headers=headers, json={
        "vlan_id": 101,
        "harvest_date": "2026-11-05",
        "gross_harvest": 5000.00,
        "harvester_id": 2
    })
    assert h1_res.status_code == 201
    assert h1_res.json()["gross_harvest"] == "5000.00"
    assert h1_res.json()["harvester_id"] == 2

    # Encode second harvest for same VLAN 101 in same month (e.g. Nov 20 - weekly/twice a month allowed!)
    h2_res = client.post("/api/v1/harvests/", headers=headers, json={
        "vlan_id": 101,
        "harvest_date": "2026-11-20",
        "gross_harvest": 7500.00,
        "harvester_id": 3
    })
    assert h2_res.status_code == 201
    assert h2_res.json()["gross_harvest"] == "7500.00"
    assert h2_res.json()["harvester_id"] == 3

    # Encode a preview calculation
    preview_res = client.post("/api/v1/harvests/preview", headers=headers, json={
        "gross_harvest": 15000.00
    })
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["gross_harvest"] == "15000.00"
    assert preview["partner_share"] == "3750.00"
    assert preview["staff_incentive"] == "750.00"
    assert preview["gartech_net"] == "10500.00"

def test_dashboard_all_harvesters_and_per_harvester():
    """Verify dashboard harvester performance endpoints (Requirements 1 & 2)."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # All harvesters view (Requirement 2)
    all_h_res = client.get("/api/v1/dashboard/harvesters?period=all_time", headers=headers)
    assert all_h_res.status_code == 200
    harvesters = all_h_res.json()
    assert len(harvesters) >= 2
    for h in harvesters:
        assert "staff_name" in h
        assert "total_gross_harvest" in h
        assert "total_incentive" in h

    # Per harvester view (Requirement 1)
    staff_id = harvesters[0]["staff_id"]
    detail_res = client.get(f"/api/v1/dashboard/harvesters/{staff_id}?period=all_time", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["staff_id"] == staff_id
    assert "harvests" in detail
    assert "daily_trends" in detail

def test_reports_scope_and_exports():
    """Verify reports support all scopes (Requirement 3) and exports."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Scope: all
    rep_all = client.get("/api/v1/reports/monthly?period=2026-11&scope=all", headers=headers)
    assert rep_all.status_code == 200
    assert "records" in rep_all.json()

    # Scope: individual_harvester
    rep_indiv = client.get("/api/v1/reports/monthly?period=2026-11&scope=individual_harvester&harvester_id=2", headers=headers)
    assert rep_indiv.status_code == 200

    # Scope: group_location
    rep_grp = client.get("/api/v1/reports/monthly?period=2026-11&scope=group_location&city=Valencia", headers=headers)
    assert rep_grp.status_code == 200

    # Export endpoints
    excel_res = client.get("/api/v1/reports/export/excel?report_type=monthly&period=2026-11&scope=all", headers=headers)
    assert excel_res.status_code == 200
    assert "openxmlformats" in excel_res.headers["content-type"]

    csv_res = client.get("/api/v1/reports/export/csv?report_type=monthly&scope=all", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

def test_system_update_check_and_clean_database():
    """Verify GitHub update checker and clean database maintenance endpoints."""
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "GartechAdmin2026!"
    })
    token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update check
    update_res = client.get("/api/v1/users/system/update-check", headers=headers)
    assert update_res.status_code == 200
    update_info = update_res.json()
    assert "current_version" in update_info
    assert "repo_url" in update_info
    assert "has_update" in update_info

    # Clean database (wipes all sample harvests for production)
    clean_res = client.post("/api/v1/users/system/clean-database", headers=headers)
    assert clean_res.status_code == 200
    assert clean_res.json()["status"] == "SUCCESS"
