import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Partner, Staff, VendoMachine, 
    VendoStatus, HarvestTransaction, HarvestStatus, 
    RevenueShareConfiguration, AuditLog
)
from app.services.calculation import compute_revenue_distribution

def init_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        admin_check = db.query(User).filter(User.username == "admin").first()
        if admin_check:
            print("Database already initialized with seed data.")
            return

        print("Initializing GARTECH VENDO database with production schema & seed data...")
        
        # 1. Revenue Share Configuration
        rev_config = RevenueShareConfiguration(
            partner_percentage=Decimal("25.00"),
            staff_incentive_percentage=Decimal("5.00"),
            gartech_net_percentage=Decimal("70.00"),
            is_active=True,
            effective_date=date(2026, 1, 1)
        )
        db.add(rev_config)
        db.flush()

        # 2. Staff / Field Harvesters
        staff1 = Staff(
            staff_code="STF-001",
            full_name="Mark Bautista",
            phone="0917-111-2233",
            email="mark.bautista@gartech.ph",
            role_type="ENCODER",
            default_incentive_percentage=Decimal("5.00"),
            is_active=True
        )
        staff2 = Staff(
            staff_code="STF-002",
            full_name="Carlo Mendoza",
            phone="0918-333-4455",
            email="carlo.mendoza@gartech.ph",
            role_type="FIELD_HARVESTER",
            default_incentive_percentage=Decimal("5.00"),
            is_active=True
        )
        staff3 = Staff(
            staff_code="STF-003",
            full_name="Danilo Ramos",
            phone="0919-555-6677",
            email="danilo.ramos@gartech.ph",
            role_type="FIELD_HARVESTER",
            default_incentive_percentage=Decimal("5.00"),
            is_active=True
        )
        db.add_all([staff1, staff2, staff3])
        db.flush()

        # 3. Location Partners
        partner1 = Partner(
            partner_code="PRT-001",
            name="Juan Dela Cruz",
            contact_person="Juan Dela Cruz",
            phone="0917-888-1234",
            email="juan.delacruz@gmail.com",
            address="Purok 1, Valencia City",
            city="Valencia",
            province="Bukidnon",
            default_share_percentage=Decimal("25.00"),
            gcash_number="09178881234",
            bank_name="BDO Unibank",
            bank_account_name="Juan Dela Cruz",
            bank_account_number="1002-3456-7890"
        )
        partner2 = Partner(
            partner_code="PRT-002",
            name="Pedro Santos",
            contact_person="Pedro Santos",
            phone="0918-999-5678",
            email="pedro.santos@gmail.com",
            address="Poblacion, Valencia City",
            city="Valencia",
            province="Bukidnon",
            default_share_percentage=Decimal("25.00"),
            gcash_number="09189995678",
            bank_name="Bank of the Philippine Islands (BPI)",
            bank_account_name="Pedro Santos",
            bank_account_number="2003-8877-6655"
        )
        partner3 = Partner(
            partner_code="PRT-003",
            name="Maria Reyes",
            contact_person="Maria Reyes",
            phone="0920-777-4321",
            email="maria.reyes@yahoo.com",
            address="Barangay Bagontaas, Valencia City",
            city="Valencia",
            province="Bukidnon",
            default_share_percentage=Decimal("25.00"),
            gcash_number="09207774321"
        )
        partner4 = Partner(
            partner_code="PRT-004",
            name="Antonio Luna",
            contact_person="Antonio Luna",
            phone="0922-444-1122",
            email="antonio.luna@gmail.com",
            address="Barangay Batangan, Valencia City",
            city="Valencia",
            province="Bukidnon",
            default_share_percentage=Decimal("25.00"),
            bank_name="Land Bank of the Philippines",
            bank_account_name="Antonio Luna",
            bank_account_number="3005-1122-3344"
        )
        partner5 = Partner(
            partner_code="PRT-005",
            name="Elena Santos",
            contact_person="Elena Santos",
            phone="0923-555-8899",
            email="elena.santos@gmail.com",
            address="Sayre Highway, Lumbo, Valencia City",
            city="Valencia",
            province="Bukidnon",
            default_share_percentage=Decimal("25.00"),
            gcash_number="09235558899"
        )
        db.add_all([partner1, partner2, partner3, partner4, partner5])
        db.flush()

        # 4. Strictly 2 User Accounts: Admin and Staff Encoder
        admin_user = User(
            username="admin",
            email="admin@gartech.ph",
            hashed_password=get_password_hash("GartechAdmin2026!"),
            full_name="GARTECH Administrator",
            phone="0917-000-0001",
            role=UserRole.ADMIN,
            is_active=True
        )
        encoder_user = User(
            username="encoder1",
            email="encoder1@gartech.ph",
            hashed_password=get_password_hash("GartechEncoder2026!"),
            full_name="Mark Bautista (Encoder)",
            phone="0917-111-2233",
            role=UserRole.STAFF_ENCODER,
            staff_id=staff1.id,
            is_active=True
        )
        db.add_all([admin_user, encoder_user])
        db.flush()

        # 5. Vendo Machines (VLANs 101 to 120)
        vendos_data = [
            (101, "WiFi Vendo - Purok 1 Central", partner1.id, "Purok 1, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9065, 125.0935),
            (102, "WiFi Vendo - Poblacion Public Market", partner2.id, "Poblacion, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9080, 125.0910),
            (103, "WiFi Vendo - Bagontaas Highway Junction", partner3.id, "Barangay Bagontaas, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8920, 125.1050),
            (104, "WiFi Vendo - Batangan Commercial Strip", partner4.id, "Barangay Batangan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8750, 125.1200),
            (105, "WiFi Vendo - Lumbo Central Terminal", partner5.id, "Sayre Highway, Lumbo, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9250, 125.0800),
            (106, "WiFi Vendo - Mailag Corner Store", partner1.id, "Barangay Mailag, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9400, 125.0700),
            (107, "WiFi Vendo - Guinoyoran Terminal", partner2.id, "Barangay Guinoyoran, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8600, 125.0500),
            (108, "WiFi Vendo - San Carlos Plaza", partner3.id, "Barangay San Carlos, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8800, 125.0600),
            (109, "WiFi Vendo - Colonia Basketball Court", partner4.id, "Barangay Colonia, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8500, 125.1100),
            (110, "WiFi Vendo - Lurugan Agro Market", partner5.id, "Barangay Lurugan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9500, 125.0600),
            (111, "WiFi Vendo - Mt. Nebo Tourist Stop", partner1.id, "Barangay Mt. Nebo, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9700, 125.0200),
            (112, "WiFi Vendo - Barobo Junction", partner2.id, "Barangay Barobo, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8900, 125.1300),
            (113, "WiFi Vendo - Banlag Barangay Hall", partner3.id, "Barangay Banlag, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9100, 125.1400),
            (114, "WiFi Vendo - Lilingayon High School", partner4.id, "Barangay Lilingayon, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9300, 125.1500),
            (115, "WiFi Vendo - Sugod Health Center", partner5.id, "Barangay Sugod, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8700, 125.0900),
            (116, "WiFi Vendo - Pinatilan Overpass", partner1.id, "Barangay Pinatilan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8600, 125.0800),
            (117, "WiFi Vendo - Tugaya Riverside", partner2.id, "Barangay Tugaya, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9050, 125.0750),
            (118, "WiFi Vendo - Laligan Trading Post", partner3.id, "Barangay Laligan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9200, 125.1150),
            (119, "WiFi Vendo - Sinabuagan Crossing", partner4.id, "Barangay Sinabuagan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8450, 125.0950),
            (120, "WiFi Vendo - Concepcion Community Center", partner5.id, "Barangay Concepcion, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8950, 125.0450),
        ]
        
        vendo_objs = []
        for vlan, name, pid, addr, city, prov, lat, lng in vendos_data:
            v_obj = VendoMachine(
                vlan_id=vlan,
                vendo_name=name,
                partner_id=pid,
                complete_address=addr,
                city_municipality=city,
                province=prov,
                latitude=lat,
                longitude=lng,
                installation_date=date(2025, 1, 15),
                status=VendoStatus.ACTIVE,
                remarks="Operational and synced"
            )
            vendo_objs.append(v_obj)
        db.add_all(vendo_objs)
        db.flush()

        # 6. Audit Log for system initialization (Clean database without sample transactions)
        log = AuditLog(
            user_id=admin_user.id,
            action="INITIALIZE_SYSTEM",
            entity_type="SYSTEM",
            entity_id="ROOT",
            new_values="Initialized clean production database for GARTECH VENDO."
        )
        db.add(log)
        
        db.commit()
        print("Database initialized with clean schema (zero sample harvest transactions), Admin & Encoder accounts, and 20 vendos!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during database initialization: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
