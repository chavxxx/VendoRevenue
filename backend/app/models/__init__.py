from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Numeric, 
    ForeignKey, Text, Enum, Float, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STAFF_ENCODER = "STAFF_ENCODER"

class VendoStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    REMOVED = "REMOVED"

class HarvestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    VOIDED = "VOIDED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STAFF_ENCODER)
    is_active = Column(Boolean, default=True, nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    staff = relationship("Staff", back_populates="user", foreign_keys=[staff_id])

class Partner(Base):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    partner_code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(25), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(255), nullable=False)
    city = Column(String(100), default="Valencia", nullable=False)
    province = Column(String(100), default="Bukidnon", nullable=False)
    default_share_percentage = Column(Numeric(5, 2), default=25.00, nullable=False)
    bank_name = Column(String(100), nullable=True)
    bank_account_name = Column(String(100), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    gcash_number = Column(String(25), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vendos = relationship("VendoMachine", back_populates="partner")
    harvests = relationship("HarvestTransaction", back_populates="partner")

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    staff_code = Column(String(20), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(25), nullable=False)
    email = Column(String(100), nullable=True)
    role_type = Column(String(50), default="FIELD_HARVESTER", nullable=False)
    default_incentive_percentage = Column(Numeric(5, 2), default=5.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="staff", uselist=False, foreign_keys="User.staff_id")
    assigned_vendos = relationship("VendoMachine", back_populates="assigned_harvester", foreign_keys="VendoMachine.assigned_harvester_id")
    harvests = relationship("HarvestTransaction", back_populates="harvester", foreign_keys="HarvestTransaction.harvester_id")

class VendoMachine(Base):
    __tablename__ = "vendo_machines"

    id = Column(Integer, primary_key=True, index=True)
    vlan_id = Column(Integer, unique=True, index=True, nullable=False)
    vendo_name = Column(String(150), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True, index=True)
    complete_address = Column(String(255), nullable=False)
    city_municipality = Column(String(100), default="Valencia", nullable=False)
    province = Column(String(100), default="Bukidnon", nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    assigned_staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    assigned_harvester_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    installation_date = Column(Date, nullable=False)
    status = Column(Enum(VendoStatus), default=VendoStatus.ACTIVE, nullable=False, index=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    partner = relationship("Partner", back_populates="vendos")
    assigned_staff = relationship("Staff", foreign_keys=[assigned_staff_id])
    assigned_harvester = relationship("Staff", back_populates="assigned_vendos", foreign_keys=[assigned_harvester_id])
    harvests = relationship("HarvestTransaction", back_populates="vendo")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(150), default="GARTECH VENDO NETWORK", nullable=False)
    company_tagline = Column(String(255), default="Vendo Machine Revenue Management & Monitoring", nullable=False)
    contact_phone = Column(String(50), default="0917-000-0001", nullable=True)
    contact_email = Column(String(100), default="support@gartech.ph", nullable=True)
    company_address = Column(String(255), default="Valencia City, Bukidnon, Philippines", nullable=True)
    default_city = Column(String(100), default="Valencia", nullable=False)
    default_province = Column(String(100), default="Bukidnon", nullable=False)
    currency_symbol = Column(String(10), default="₱", nullable=False)
    logo_url = Column(String(255), default="/logo.jpg", nullable=False)
    staff_incentive_percentage = Column(Numeric(5, 2), default=5.00, nullable=False)
    gartech_net_percentage = Column(Numeric(5, 2), default=95.00, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class RevenueShareConfiguration(Base):
    __tablename__ = "revenue_share_configurations"

    id = Column(Integer, primary_key=True, index=True)
    partner_percentage = Column(Numeric(5, 2), default=25.00, nullable=False)
    staff_incentive_percentage = Column(Numeric(5, 2), default=5.00, nullable=False)
    gartech_net_percentage = Column(Numeric(5, 2), default=70.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    effective_date = Column(Date, nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class HarvestTransaction(Base):
    __tablename__ = "harvest_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_ref = Column(String(50), unique=True, index=True, nullable=False)
    vendo_id = Column(Integer, ForeignKey("vendo_machines.id"), nullable=False, index=True)
    vlan_id = Column(Integer, nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True, index=True)
    harvester_id = Column(Integer, ForeignKey("staff.id"), nullable=True, index=True)
    encoded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    harvest_date = Column(Date, nullable=False, index=True)
    harvest_period = Column(String(7), nullable=False, index=True)
    
    gross_harvest = Column(Numeric(12, 2), nullable=False)
    partner_percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    partner_share = Column(Numeric(12, 2), default=0.00, nullable=False)
    staff_percentage = Column(Numeric(5, 2), default=5.00, nullable=False)
    staff_incentive = Column(Numeric(12, 2), nullable=False)
    gartech_percentage = Column(Numeric(5, 2), default=95.00, nullable=False)
    gartech_net = Column(Numeric(12, 2), nullable=False)
    
    status = Column(Enum(HarvestStatus), default=HarvestStatus.APPROVED, nullable=False, index=True)
    remarks = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    void_reason = Column(Text, nullable=True)
    
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_vlan_harvest_period", "vlan_id", "harvest_period"),
    )

    vendo = relationship("VendoMachine", back_populates="harvests")
    partner = relationship("Partner", back_populates="harvests")
    harvester = relationship("Staff", back_populates="harvests", foreign_keys=[harvester_id])
    encoded_by = relationship("User", foreign_keys=[encoded_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(50), nullable=True)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User")
