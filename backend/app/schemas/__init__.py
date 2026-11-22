from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal
from app.models import UserRole, VendoStatus, HarvestStatus

# --- AUTH SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool = True
    staff_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- PARTNER SCHEMAS ---
class PartnerBase(BaseModel):
    partner_code: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: str
    city: str = "Valencia"
    province: str = "Bukidnon"
    default_share_percentage: Decimal = Decimal("25.00")
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    gcash_number: Optional[str] = None
    is_active: bool = True

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    default_share_percentage: Optional[Decimal] = None
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    gcash_number: Optional[str] = None
    is_active: Optional[bool] = None

class PartnerResponse(PartnerBase):
    id: int
    created_at: datetime
    vendo_count: Optional[int] = 0
    total_earnings: Optional[Decimal] = Decimal("0.00")

    class Config:
        from_attributes = True

# --- STAFF SCHEMAS ---
class StaffBase(BaseModel):
    staff_code: str
    full_name: str
    phone: str
    email: Optional[str] = None
    role_type: str = "FIELD_HARVESTER"
    default_incentive_percentage: Decimal = Decimal("5.00")
    is_active: bool = True

class StaffCreate(StaffBase):
    pass

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role_type: Optional[str] = None
    default_incentive_percentage: Optional[Decimal] = None
    is_active: Optional[bool] = None

class StaffResponse(StaffBase):
    id: int
    created_at: datetime
    assigned_vendos_count: Optional[int] = 0
    total_incentives_earned: Optional[Decimal] = Decimal("0.00")

    class Config:
        from_attributes = True

# --- SYSTEM SETTINGS SCHEMAS ---
class SystemSettingBase(BaseModel):
    company_name: str = "GARTECH VENDO NETWORK"
    company_tagline: str = "Vendo Machine Revenue Management & Monitoring"
    contact_phone: Optional[str] = "0917-000-0001"
    contact_email: Optional[str] = "support@gartech.ph"
    company_address: Optional[str] = "Valencia City, Bukidnon, Philippines"
    default_city: str = "Valencia"
    default_province: str = "Bukidnon"
    currency_symbol: str = "₱"
    logo_url: str = "/logo.jpg"
    staff_incentive_percentage: Decimal = Decimal("5.00")
    gartech_net_percentage: Decimal = Decimal("95.00")

class SystemSettingUpdate(BaseModel):
    company_name: Optional[str] = None
    company_tagline: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    company_address: Optional[str] = None
    default_city: Optional[str] = None
    default_province: Optional[str] = None
    currency_symbol: Optional[str] = None
    staff_incentive_percentage: Optional[Decimal] = None
    gartech_net_percentage: Optional[Decimal] = None

class SystemSettingResponse(SystemSettingBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DatabaseCleanRequest(BaseModel):
    target: str = Field(..., description="harvests, vendos, or all")
    confirmation: str = Field(..., description="Must be 'CONFIRM'")

# --- VENDO SCHEMAS ---
class VendoBase(BaseModel):
    vlan_id: int
    vendo_name: str
    partner_id: Optional[int] = None
    complete_address: str
    city_municipality: str = "Valencia"
    province: str = "Bukidnon"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    assigned_staff_id: Optional[int] = None
    assigned_harvester_id: Optional[int] = None
    installation_date: date
    status: VendoStatus = VendoStatus.ACTIVE
    remarks: Optional[str] = None

class VendoCreate(VendoBase):
    pass

class VendoUpdate(BaseModel):
    vlan_id: Optional[int] = None
    vendo_name: Optional[str] = None
    partner_id: Optional[int] = None
    complete_address: Optional[str] = None
    city_municipality: Optional[str] = None
    province: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    assigned_staff_id: Optional[int] = None
    assigned_harvester_id: Optional[int] = None
    installation_date: Optional[date] = None
    status: Optional[VendoStatus] = None
    remarks: Optional[str] = None

class VendoResponse(VendoBase):
    id: int
    partner_name: Optional[str] = None
    harvester_name: Optional[str] = None
    last_harvest_date: Optional[date] = None
    last_gross_harvest: Optional[Decimal] = None
    last_partner_share: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- HARVEST SCHEMAS ---
class HarvestCalculationPreview(BaseModel):
    gross_harvest: Decimal
    partner_percentage: Decimal
    partner_share: Decimal
    staff_percentage: Decimal
    staff_incentive: Decimal
    gartech_percentage: Decimal
    gartech_net: Decimal

class HarvestCreate(BaseModel):
    vlan_id: int
    harvest_date: date
    gross_harvest: Decimal
    harvester_id: int # selected when encoding harvest
    remarks: Optional[str] = None

class HarvestApprovalRequest(BaseModel):
    status: HarvestStatus # APPROVED or REJECTED
    reason: Optional[str] = None

class HarvestVoidRequest(BaseModel):
    void_reason: str

class HarvestResponse(BaseModel):
    id: int
    transaction_ref: str
    vendo_id: int
    vlan_id: int
    vendo_name: Optional[str] = None
    partner_id: Optional[int] = None
    partner_name: Optional[str] = None
    harvester_id: Optional[int] = None
    harvester_name: Optional[str] = None
    encoded_by_user_id: int
    encoded_by_name: Optional[str] = None
    harvest_date: date
    harvest_period: str
    gross_harvest: Decimal
    partner_percentage: Decimal = Decimal("0.00")
    partner_share: Decimal = Decimal("0.00")
    staff_percentage: Decimal
    staff_incentive: Decimal
    gartech_percentage: Decimal
    gartech_net: Decimal
    status: HarvestStatus
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    void_reason: Optional[str] = None
    approved_by_user_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- DASHBOARD & REPORTS SCHEMAS ---
class DashboardSummary(BaseModel):
    total_vendos: int
    active_vendos: int
    inactive_vendos: int
    total_partners: Optional[int] = 0
    total_gross_harvest: Decimal
    total_partner_shares: Optional[Decimal] = Decimal("0.00")
    total_staff_incentives: Decimal
    total_gartech_net: Decimal

class ChartDataPoint(BaseModel):
    label: str
    value: Decimal
    secondary_value: Optional[Decimal] = None

class TopEntityItem(BaseModel):
    id: int
    name: str
    subtitle: Optional[str] = None
    total_revenue: Decimal
    count: Optional[int] = None

class LocationPerformanceItem(BaseModel):
    location: str
    vendo_count: int
    total_gross: Decimal

class HarvesterPerformanceItem(BaseModel):
    staff_id: int
    staff_code: str
    staff_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    assigned_vendos_count: int
    harvests_count: int
    total_gross_harvest: Decimal
    total_incentive: Decimal
    latest_harvest_date: Optional[date] = None

class HarvesterDetailResponse(BaseModel):
    staff_id: int
    staff_code: str
    staff_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    assigned_vendos_count: int
    harvests_count: int
    total_gross_harvest: Decimal
    total_incentive: Decimal
    harvests: List[HarvestResponse] = []
    daily_trends: List[ChartDataPoint] = []

class SystemUpdateInfo(BaseModel):
    current_version: str
    current_commit: str
    latest_commit: Optional[str] = None
    has_update: bool
    latest_message: Optional[str] = None
    latest_author: Optional[str] = None
    latest_date: Optional[str] = None
    repo_url: str
    checked_at: str
