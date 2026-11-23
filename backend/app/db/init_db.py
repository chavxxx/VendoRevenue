import zoneinfo
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Staff, VendoMachine, 
    RevenueShareConfiguration, AuditLog, SystemSetting
)

PST_TZ = zoneinfo.ZoneInfo("Asia/Manila")

def init_database():
    """
    Initializes clean production database schema, default system settings, 
    revenue share config, and the single root administrator account.
    CRITICAL: Does NOT seed any sample vendos, sample staff, or mock partners.
    Preserves all production data on system restarts and updates.
    """
    Base.metadata.create_all(bind=engine)
    
    # Safe schema migration: ensure new columns exist in existing database tables
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE harvest_transactions ADD COLUMN IF NOT EXISTS expenses NUMERIC(12, 2) DEFAULT 0.00;"))
                conn.commit()
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE harvest_transactions ADD COLUMN expenses NUMERIC(12, 2) DEFAULT 0.00;"))
                    conn.commit()
                except Exception:
                    pass
    except Exception as e:
        print("Schema migration notice:", e)

    db = SessionLocal()
    
    try:
        admin_check = db.query(User).filter(User.username == "admin").first()
        if admin_check:
            # Ensure system settings and revenue configuration exist even if admin is already present
            setting = db.query(SystemSetting).first()
            if not setting:
                setting = SystemSetting(
                    company_name="GARTECH VENDO NETWORK",
                    company_tagline="Vendo Machine Revenue Management & Monitoring",
                    contact_phone="0917-000-0001",
                    contact_email="support@gartech.ph",
                    company_address="Valencia City, Bukidnon, Philippines",
                    default_city="Valencia",
                    default_province="Bukidnon",
                    currency_symbol="₱",
                    logo_url="/logo.jpg",
                    partner_share_percentage=Decimal("25.00"),
                    staff_incentive_percentage=Decimal("5.00"),
                    gartech_net_percentage=Decimal("70.00")
                )
                db.add(setting)
                db.commit()

            rev_cfg = db.query(RevenueShareConfiguration).filter(RevenueShareConfiguration.is_active == True).first()
            if not rev_cfg:
                rev_cfg = RevenueShareConfiguration(
                    partner_percentage=Decimal("25.00"),
                    staff_incentive_percentage=Decimal("5.00"),
                    gartech_net_percentage=Decimal("70.00"),
                    is_active=True,
                    effective_date=date(2026, 1, 1)
                )
                db.add(rev_cfg)
                db.commit()

            print("Database already initialized with production admin and settings.")
            return

        print("Initializing clean GARTECH VENDO production database (zero sample data)...")
        
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
            partner_share_percentage=Decimal("25.00"),
            staff_incentive_percentage=Decimal("5.00"),
            gartech_net_percentage=Decimal("70.00")
        )
        db.add(system_setting)
        
        # 2. Revenue Share Configuration (Default 25% Location Partner, 5% Staff Incentive Pool, 70% GARTECH Net)
        rev_config = RevenueShareConfiguration(
            partner_percentage=Decimal("25.00"),
            staff_incentive_percentage=Decimal("5.00"),
            gartech_net_percentage=Decimal("70.00"),
            is_active=True,
            effective_date=date(2026, 1, 1)
        )
        db.add(rev_config)
        db.flush()

        # 3. Default Production Superadministrator User Account
        admin_user = User(
            username="admin",
            email="admin@gartech.ph",
            hashed_password=get_password_hash("GartechAdmin2026!"),
            full_name="GARTECH Administrator",
            phone="0917-000-0001",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.flush()

        # 4. Audit Log for clean system initialization
        log = AuditLog(
            user_id=admin_user.id,
            action="INITIALIZE_SYSTEM",
            entity_type="SYSTEM",
            entity_id="ROOT",
            new_values="Initialized clean production database for GARTECH VENDO without sample data."
        )
        db.add(log)
        
        db.commit()
        print("✓ Clean production database initialized successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during database initialization: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
