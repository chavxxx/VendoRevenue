export type UserRole = 'ADMIN' | 'STAFF_ENCODER';

export type VendoStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'REMOVED';

export type HarvestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'VOIDED';

export type ReportScope = 'all' | 'individual_harvester' | 'individual_partner' | 'group_location';

export interface Partner {
  id: number;
  partner_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address: string;
  city: string;
  province: string;
  default_share_percentage: number;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  gcash_number?: string;
  is_active: boolean;
  vendos_count?: number;
  total_earnings?: number;
  created_at: string;
}

export interface SystemSetting {
  id: number;
  company_name: string;
  company_tagline: string;
  contact_phone?: string;
  contact_email?: string;
  company_address?: string;
  default_city: string;
  default_province: string;
  currency_symbol: string;
  logo_url: string;
  partner_share_percentage: number;
  staff_incentive_percentage: number;
  gartech_net_percentage: number;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  staff_id?: number;
  created_at: string;
}

export interface Staff {
  id: number;
  staff_code: string;
  full_name: string;
  phone: string;
  email?: string;
  role_type: string;
  default_incentive_percentage: number;
  is_active: boolean;
  assigned_vendos_count?: number;
  total_incentives_earned?: number;
  created_at: string;
}

export interface VendoMachine {
  id: number;
  vlan_id: number;
  vendo_name: string;
  partner_id?: number;
  partner_name?: string;
  complete_address: string;
  city_municipality: string;
  province: string;
  latitude?: number;
  longitude?: number;
  assigned_staff_id?: number;
  assigned_harvester_id?: number;
  harvester_name?: string;
  installation_date: string;
  status: VendoStatus;
  remarks?: string;
  last_harvest_date?: string;
  last_gross_harvest?: number;
  last_partner_share?: number;
  created_at: string;
}

export interface HarvestTransaction {
  id: number;
  transaction_ref: string;
  vendo_id: number;
  vlan_id: number;
  vendo_name?: string;
  partner_id?: number;
  partner_name?: string;
  harvester_id?: number;
  harvester_name?: string;
  encoded_by_user_id: number;
  encoded_by_name?: string;
  harvest_date: string;
  harvest_period: string;
  gross_harvest: number;
  partner_percentage?: number;
  partner_share?: number;
  staff_percentage: number;
  staff_incentive: number;
  gartech_percentage: number;
  gartech_net: number;
  status: HarvestStatus;
  remarks?: string;
  rejection_reason?: string;
  void_reason?: string;
  approved_by_user_id?: number;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
}

export interface DashboardSummary {
  total_vendos: number;
  active_vendos: number;
  inactive_vendos: number;
  total_partners?: number;
  total_gross_harvest: number;
  total_partner_shares?: number;
  total_staff_incentives: number;
  total_gartech_net: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary_value?: number;
}

export interface TopEntityItem {
  id: number;
  name: string;
  subtitle?: string;
  total_revenue: number;
  count?: number;
}

export interface LocationPerformanceItem {
  location: string;
  vendo_count: number;
  total_gross: number;
}

export interface HarvesterPerformanceItem {
  staff_id: number;
  staff_code: string;
  staff_name: string;
  phone?: string;
  email?: string;
  assigned_vendos_count: number;
  harvests_count: number;
  total_gross_harvest: number;
  total_incentive: number;
  latest_harvest_date?: string;
}

export interface HarvesterDetailResponse {
  staff_id: number;
  staff_code: string;
  staff_name: string;
  phone?: string;
  email?: string;
  assigned_vendos_count: number;
  harvests_count: number;
  total_gross_harvest: number;
  total_incentive: number;
  harvests: HarvestTransaction[];
  daily_trends: ChartDataPoint[];
}
