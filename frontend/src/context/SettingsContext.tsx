import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSetting } from '../types';

interface SettingsContextType {
  settings: SystemSetting;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  formatCurrency: (amount?: number) => string;
}

const defaultSettings: SystemSetting = {
  id: 1,
  company_name: 'GARTECH VENDO NETWORK',
  company_tagline: 'Vendo Machine Revenue Management & Monitoring',
  contact_phone: '0917-000-0001',
  contact_email: 'support@gartech.ph',
  company_address: 'Valencia City, Bukidnon, Philippines',
  default_city: 'Valencia',
  default_province: 'Bukidnon',
  currency_symbol: '₱',
  logo_url: '/logo.jpg',
  partner_share_percentage: 25.0,
  staff_incentive_percentage: 5.0,
  gartech_net_percentage: 70.0,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
  formatCurrency: () => '₱0.00',
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSetting>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSettings = async () => {
    try {
      const data = await api.getSystemSettings();
      if (data && data.company_name) {
        setSettings(data);
      }
    } catch (err) {
      console.warn('Failed to fetch system settings; using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const formatCurrency = (amount?: number): string => {
    const val = amount || 0;
    const symbol = settings.currency_symbol || '₱';
    const formattedNum = new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
    return `${symbol}${formattedNum}`;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
