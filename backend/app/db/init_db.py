import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Staff, VendoMachine, 
    VendoStatus, HarvestTransaction, HarvestStatus, 
    RevenueShareConfiguration, AuditLog, SystemSetting
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
        
        # 1. System Settings & Customization
        system_setting = SystemSetting(
            company_name="GARTECH VENDO NETWORK",
            company_tagline="Vendo Machine Revenue Management & Monitoring",
            contact_phone="0917-000-0001",
            contact_email="support@gartech.ph",
            company_address="Valencia City, Bukidnon, Philippines",
            default_city="Valencia",
            default_province="Bukidnon",
            currency_symbol="₱",
            logo_url="/logo.jpg",
            staff_incentive_percentage=Decimal("5.00"),
            gartech_net_percentage=Decimal("95.00")
        )
        db.add(system_setting)
        
        # 2. Revenue Share Configuration (0% partner, 5% harvester incentive, 95% gartech net)
        rev_config = RevenueShareConfiguration(
            partner_percentage=Decimal("0.00"),
            staff_incentive_percentage=Decimal("5.00"),
            gartech_net_percentage=Decimal("95.00"),
            is_active=True,
            effective_date=date(2026, 1, 1)
        )
        db.add(rev_config)
        db.flush()

        # 3. Staff / Field Harvesters
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

        # 5. Vendo Machines (VLANs 101 to 120, 100% company-owned without partner)
        vendos_data = [
            (101, "WiFi Vendo - Purok 1 Central", "Purok 1, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9065, 125.0935),
            (102, "WiFi Vendo - Poblacion Public Market", "Poblacion, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9080, 125.0910),
            (103, "WiFi Vendo - Bagontaas Highway Junction", "Barangay Bagontaas, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8920, 125.1050),
            (104, "WiFi Vendo - Batangan Commercial Strip", "Barangay Batangan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8750, 125.1200),
            (105, "WiFi Vendo - Lumbo Central Terminal", "Sayre Highway, Lumbo, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9250, 125.0800),
            (106, "WiFi Vendo - Mailag Corner Store", "Barangay Mailag, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9400, 125.0700),
            (107, "WiFi Vendo - Guinoyoran Terminal", "Barangay Guinoyoran, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8600, 125.0500),
            (108, "WiFi Vendo - San Carlos Plaza", "Barangay San Carlos, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8800, 125.0600),
            (109, "WiFi Vendo - Colonia Basketball Court", "Barangay Colonia, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8500, 125.1100),
            (110, "WiFi Vendo - Lurugan Agro Market", "Barangay Lurugan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9500, 125.0600),
            (111, "WiFi Vendo - Mt. Nebo Tourist Stop", "Barangay Mt. Nebo, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9700, 125.0200),
            (112, "WiFi Vendo - Barobo Junction", "Barangay Barobo, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8900, 125.1300),
            (113, "WiFi Vendo - Banlag Barangay Hall", "Barangay Banlag, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9100, 125.1400),
            (114, "WiFi Vendo - Lilingayon High School", "Barangay Lilingayon, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9300, 125.1500),
            (115, "WiFi Vendo - Sugod Health Center", "Barangay Sugod, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8700, 125.0900),
            (116, "WiFi Vendo - Pinatilan Overpass", "Barangay Pinatilan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8600, 125.0800),
            (117, "WiFi Vendo - Tugaya Riverside", "Barangay Tugaya, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9050, 125.0750),
            (118, "WiFi Vendo - Laligan Trading Post", "Barangay Laligan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.9200, 125.1150),
            (119, "WiFi Vendo - Sinabuagan Crossing", "Barangay Sinabuagan, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8450, 125.0950),
            (120, "WiFi Vendo - Concepcion Community Center", "Barangay Concepcion, Valencia, Bukidnon", "Valencia", "Bukidnon", 7.8950, 125.0450),
        ]
        
        vendo_objs = []
        for vlan, name, addr, city, prov, lat, lng in vendos_data:
            v_obj = VendoMachine(
                vlan_id=vlan,
                vendo_name=name,
                partner_id=None,
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
