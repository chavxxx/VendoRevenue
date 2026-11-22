const API_BASE = '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('gartech_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('gartech_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('gartech_token');
  localStorage.removeItem('gartech_user');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  if (response.headers.get('Content-Type')?.includes('application/json')) {
    return response.json();
  }
  return response.blob() as any;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),

  // Vendos
  getVendos: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/vendos/?${query}`);
  },
  getVendoStats: () => apiRequest('/vendos/stats'),
  getVendoByVlan: (vlanId: number) => apiRequest(`/vendos/${vlanId}`),
  createVendo: (data: any) => apiRequest('/vendos/', { method: 'POST', body: JSON.stringify(data) }),
  updateVendo: (vlanId: number, data: any) => apiRequest(`/vendos/${vlanId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendo: (vlanId: number) => apiRequest(`/vendos/${vlanId}`, { method: 'DELETE' }),
  clearAllVendos: () => apiRequest('/vendos/clear-all', { method: 'POST' }),
  importVendosCsv: (formData: FormData) => apiRequest('/vendos/import/csv', { method: 'POST', body: formData }),

  // System Settings & Customization
  getSystemSettings: () => apiRequest('/users/system/settings'),
  updateSystemSettings: (data: any) => apiRequest('/users/system/settings', { method: 'PUT', body: JSON.stringify(data) }),
  uploadLogo: (formData: FormData) => apiRequest('/users/system/settings/logo', { method: 'POST', body: formData }),

  // Partners (Location Partners)
  getPartners: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/partners/?${query}`);
  },
  getPartnerDetail: (id: number) => apiRequest(`/partners/${id}`),
  createPartner: (data: any) => apiRequest('/partners/', { method: 'POST', body: JSON.stringify(data) }),
  updatePartner: (id: number, data: any) => apiRequest(`/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Staff / Harvesters
  getStaff: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/staff/?${query}`);
  },
  getStaffDetail: (id: number) => apiRequest(`/staff/${id}`),
  createStaff: (data: any) => apiRequest('/staff/', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: number, data: any) => apiRequest(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: number) => apiRequest(`/staff/${id}`, { method: 'DELETE' }),

  // Users & System Accounts
  getUsers: () => apiRequest('/users/'),
  createUser: (data: any) => apiRequest('/users/', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => apiRequest(`/users/${id}`, { method: 'DELETE' }),

  // Harvests
  previewHarvest: (data: { gross_harvest: number; vlan_id?: number; partner_percentage?: number; staff_percentage?: number }) =>
    apiRequest('/harvests/preview', { method: 'POST', body: JSON.stringify(data) }),
  encodeHarvest: (data: { vlan_id: number; harvest_date: string; gross_harvest: number; harvester_id: number; remarks?: string }) =>
    apiRequest('/harvests/', { method: 'POST', body: JSON.stringify(data) }),
  getHarvests: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/harvests/?${query}`);
  },
  getHarvestDetail: (id: number) => apiRequest(`/harvests/${id}`),
  approveHarvest: (id: number) => apiRequest(`/harvests/${id}/approve`, { method: 'POST' }),
  rejectHarvest: (id: number, reason?: string) =>
    apiRequest(`/harvests/${id}/reject`, { method: 'POST', body: JSON.stringify({ status: 'REJECTED', reason }) }),
  voidHarvest: (id: number, void_reason: string) =>
    apiRequest(`/harvests/${id}/void`, { method: 'POST', body: JSON.stringify({ void_reason }) }),

  // Dashboard
  getDashboardSummary: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/summary?${query}`);
  },
  getDailyChart: (days: number = 14) => apiRequest(`/dashboard/charts/daily?days=${days}`),
  getMonthlyChart: (months: number = 6) => apiRequest(`/dashboard/charts/monthly?months=${months}`),
  getTopVendos: (params: Record<string, any> | number = 10) => {
    if (typeof params === 'number') {
      return apiRequest(`/dashboard/charts/top-vendos?limit=${params}`);
    }
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/charts/top-vendos?${query}`);
  },
  getLocationPerformance: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/charts/locations?${query}`);
  },
  getMunicipalities: () => apiRequest('/dashboard/municipalities'),

  // Harvesters Performance (Requirements 1 & 2)
  getHarvestersPerformance: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/harvesters?${query}`);
  },
  getHarvesterDetail: (staffId: number, params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/harvesters/${staffId}?${query}`);
  },

  // Reports (Requirements: Individual, Group, All)
  getDailyReport: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/daily?${query}`);
  },
  getWeeklyReport: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/weekly?${query}`);
  },
  getMonthlyReport: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/monthly?${query}`);
  },
  getCustomReport: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/custom?${query}`);
  },

  // Settings & Configuration
  getRevenueConfig: () => apiRequest('/users/config/revenue-share'),
  updateRevenueConfig: (data: any) => apiRequest('/users/config/revenue-share', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: (params: Record<string, any> = {}) => apiRequest(`/audit/?${new URLSearchParams(params).toString()}`),

  // System & GitHub Updates
  checkSystemUpdates: () => apiRequest('/users/system/update-check'),
  cleanDatabase: (target: 'harvests' | 'vendos' | 'all' = 'harvests') => 
    apiRequest(`/users/system/clean-database?target=${target}`, { method: 'POST' }),
};
