import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { 
  Settings, 
  GitBranch, 
  Database, 
  History, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  Upload, 
  Building2, 
  MapPin, 
  Percent, 
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  
  // Branding & Company Details State
  const [companyName, setCompanyName] = useState(settings.company_name);
  const [companyTagline, setCompanyTagline] = useState(settings.company_tagline);
  const [contactPhone, setContactPhone] = useState(settings.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(settings.contact_email || '');
  const [companyAddress, setCompanyAddress] = useState(settings.company_address || '');
  const [defaultCity, setDefaultCity] = useState(settings.default_city || 'Valencia');
  const [defaultProvince, setDefaultProvince] = useState(settings.default_province || 'Bukidnon');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || '₱');

  // Revenue Splits (Partner Share, All Staff Incentive Pool, Company Net Share)
  const [partnerPct, setPartnerPct] = useState<string>(settings.partner_share_percentage?.toString() || '25.00');
  const [staffPct, setStaffPct] = useState<string>(settings.staff_incentive_percentage?.toString() || '5.00');
  const [gartechPct, setGartechPct] = useState<string>(settings.gartech_net_percentage?.toString() || '70.00');
  
  // Status flags
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Database maintenance state
  const [cleaningDb, setCleaningDb] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  // GitHub update checker state
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name);
      setCompanyTagline(settings.company_tagline);
      setContactPhone(settings.contact_phone || '');
      setContactEmail(settings.contact_email || '');
      setCompanyAddress(settings.company_address || '');
      setDefaultCity(settings.default_city || 'Valencia');
      setDefaultProvince(settings.default_province || 'Bukidnon');
      setCurrencySymbol(settings.currency_symbol || '₱');
      setPartnerPct(settings.partner_share_percentage?.toString() || '25.00');
      setStaffPct(settings.staff_incentive_percentage?.toString() || '5.00');
      setGartechPct(settings.gartech_net_percentage?.toString() || '70.00');
    }
  }, [settings]);

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const logs = await api.getAuditLogs({ limit: 50 });
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await api.checkSystemUpdates();
      setUpdateInfo(res);
    } catch (err: any) {
      alert(`Update check failed: ${err.message}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
    handleCheckUpdate();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedMsg(null);
    try {
      const p = parseFloat(partnerPct) || 0;
      const s = parseFloat(staffPct) || 0;
      const g = 100 - p - s;
      if (g < 0) {
        alert("Partner Share % + Staff Incentive % cannot exceed 100%.");
        setSavingSettings(false);
        return;
      }
      await api.updateSystemSettings({
        company_name: companyName,
        company_tagline: companyTagline,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        company_address: companyAddress,
        default_city: defaultCity,
        default_province: defaultProvince,
        currency_symbol: currencySymbol,
        partner_share_percentage: p,
        staff_incentive_percentage: s,
        gartech_net_percentage: g
      });
      await refreshSettings();
      setSettingsSavedMsg('Company details & revenue distribution saved successfully!');
      setTimeout(() => setSettingsSavedMsg(null), 4000);
      loadAuditLogs();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Upload Logo
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show temporary local preview
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    setUploadingLogo(true);
    try {
      const res = await api.uploadLogo(formData);
      await refreshSettings();
      alert('Logo updated successfully!');
      loadAuditLogs();
    } catch (err: any) {
      alert(`Failed to upload logo: ${err.message}`);
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Clean Database Actions
  const handleCleanHarvests = async () => {
    if (confirm("Are you sure you want to wipe all harvest transactions? Vendo machines, staff, and user accounts will remain completely safe.")) {
      setCleaningDb(true);
      try {
        const res = await api.cleanDatabase('harvests');
        setCleanResult(res.message);
        loadAuditLogs();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setCleaningDb(false);
      }
    }
  };

  const handleCleanVendos = async () => {
    if (confirm("WARNING: This will delete ALL vendo machines and their harvest records. Are you sure?")) {
      setCleaningDb(true);
      try {
        const res = await api.cleanDatabase('vendos');
        setCleanResult(res.message);
        loadAuditLogs();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setCleaningDb(false);
      }
    }
  };

  const handleFullReset = async () => {
    if (confirm("DANGER: This will perform a FULL RESET, removing all vendos and harvests. System will return to initial production state. Proceed?")) {
      setCleaningDb(true);
      try {
        const res = await api.cleanDatabase('all');
        setCleanResult(res.message);
        loadAuditLogs();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setCleaningDb(false);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">System Settings & Customization</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Branding, company details, default locations, revenue split, and database maintenance.
          </p>
        </div>
      </div>

      {settingsSavedMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-2xl flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span>{settingsSavedMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left & Middle Column (2 cols): Customization Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* 1. App Logo & Branding */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
                <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">App Logo & Visual Identity</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group shrink-0">
                  <img
                    src={logoPreview || settings.logo_url || "/logo.jpg"}
                    alt="Company Logo Preview"
                    key={logoPreview || settings.logo_url}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-emerald-500/40 shadow-lg shadow-emerald-500/10 bg-slate-950"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.endsWith('/logo.jpg')) target.src = '/logo.jpg';
                    }}
                  />
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white text-xs font-bold">
                      Uploading...
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="text-sm font-bold text-navy-900 dark:text-white">Custom Logo</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Upload your official company or network logo. Accepted formats: JPG, PNG, WEBP, SVG.
                  </p>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingLogo ? 'Uploading...' : 'Choose Logo Image'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Company Details */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">Company & Office Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Company Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={companyTagline}
                    onChange={(e) => setCompanyTagline(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0917-000-0001"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="support@gartech.ph"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Headquarters / Office Address</label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Valencia City, Bukidnon, Philippines"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="₱"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Default Vendo Location */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">Default Vendo Location</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                These default location values automatically pre-populate when registering new vendo machines.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Default City / Municipality</label>
                  <input
                    type="text"
                    required
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Default Province</label>
                  <input
                    type="text"
                    required
                    value={defaultProvince}
                    onChange={(e) => setDefaultProvince(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Revenue Distribution Configuration (Partner, Staff Pool, GARTECH Net) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
                <Percent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">Revenue Distribution Configuration</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Configure default percentage allocations across Location Partners, Staff & Harvester Incentive Pool, and GARTECH Net Operating Share.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-blue-700 dark:text-blue-400 mb-1">
                    Location Partner Share (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={partnerPct}
                    onChange={(e) => {
                      setPartnerPct(e.target.value);
                      const p = parseFloat(e.target.value) || 0;
                      const s = parseFloat(staffPct) || 0;
                      setGartechPct(Math.max(0, 100 - p - s).toFixed(2));
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Staff & Employee Pool (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={staffPct}
                    onChange={(e) => {
                      setStaffPct(e.target.value);
                      const p = parseFloat(partnerPct) || 0;
                      const s = parseFloat(e.target.value) || 0;
                      setGartechPct(Math.max(0, 100 - p - s).toFixed(2));
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    GARTECH Net (%) – Remainder
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={gartechPct}
                    className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-800 dark:text-emerald-300 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300 font-mono">
                Distribution: <strong>Partner {partnerPct}%</strong> + <strong>Staff Pool {staffPct}%</strong> + <strong>GARTECH Net {gartechPct}%</strong> = <strong>100.00%</strong>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                {savingSettings ? 'Saving Settings...' : 'Save All Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: GitHub Updates, Database Maintenance, and Audit Logs */}
        <div className="space-y-6">
          {/* GitHub Update Checker Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
                <GitBranch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">GitHub Repository Updates</h2>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                title="Check Now"
              >
                <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400">
              Synchronized with GitHub repository <strong className="text-slate-800 dark:text-slate-200">chavxxx/VendoRevenue</strong>.
            </p>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Version:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{updateInfo?.current_version || 'v2.1.0'}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Installed Commit:</span>
                <span className="text-slate-800 dark:text-slate-200">{updateInfo?.current_commit || 'HEAD'}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Status:</span>
                <span className={updateInfo?.has_update ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                  {updateInfo?.has_update ? 'Update Available' : 'Up to Date'}
                </span>
              </div>
            </div>

            <div>
              <a
                href="https://github.com/chavxxx/VendoRevenue"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Database Maintenance Tools */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
              <Database className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h2 className="text-base font-bold">Database Maintenance</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Maintain and clean records to keep performance light and fast.
            </p>

            {cleanResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cleanResult}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={handleCleanHarvests}
                disabled={cleaningDb}
                className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Harvest Records</span>
              </button>

              <button
                onClick={handleCleanVendos}
                disabled={cleaningDb}
                className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Vendo Machines</span>
              </button>

              <button
                onClick={handleFullReset}
                disabled={cleaningDb}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 dark:bg-slate-800 hover:bg-black text-rose-400 border border-rose-500/30 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Full System Reset (Clean State)</span>
              </button>
            </div>
          </div>

          {/* Audit Logs Quick View */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
                <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">Audit Logs</h2>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Last 50 events</span>
            </div>

            <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar text-[11px]">
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {loadingLogs ? (
                  <div className="py-4 text-center text-gray-400">Loading audit trail...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-4 text-center text-gray-400">No logs recorded yet.</div>
                ) : (
                  auditLogs.slice(0, 15).map((l) => (
                    <div key={l.id} className="py-2 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{l.action}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(l.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-slate-400 truncate">
                        {l.entity_type} {l.entity_id ? `(${l.entity_id})` : ''} by {l.username}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
