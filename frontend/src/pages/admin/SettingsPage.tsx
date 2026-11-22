import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Settings, 
  GitBranch, 
  Database, 
  History, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [partnerPct, setPartnerPct] = useState<string>('25.00');
  const [staffPct, setStaffPct] = useState<string>('5.00');
  const [gartechPct, setGartechPct] = useState<string>('70.00');
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Update check state
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Database clean state
  const [cleaningDb, setCleaningDb] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  const loadSettingsAndLogs = async () => {
    try {
      const cfg = await api.getRevenueConfig();
      setPartnerPct(cfg.partner_percentage.toString());
      setStaffPct(cfg.staff_incentive_percentage.toString());
      setGartechPct(cfg.gartech_net_percentage.toString());
    } catch (err) {
      console.error('Failed to load revenue config', err);
    }

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

  const handleCleanDatabase = async () => {
    if (confirm("Are you sure you want to clean the sample database? All sample harvest transactions will be wiped. Vendo machines, partners, staff, and user accounts will remain intact.")) {
      setCleaningDb(true);
      try {
        const res = await api.cleanDatabase();
        setCleanResult(res.message);
        loadSettingsAndLogs();
      } catch (err: any) {
        alert(`Error cleaning database: ${err.message}`);
      } finally {
        setCleaningDb(false);
      }
    }
  };

  useEffect(() => {
    loadSettingsAndLogs();
    handleCheckUpdate();
  }, []);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(partnerPct);
    const s = parseFloat(staffPct);
    const g = parseFloat(gartechPct);

    if (Math.abs(p + s + g - 100.00) > 0.001) {
      alert(`Percentages must sum to exactly 100.00%. Current sum: ${(p + s + g).toFixed(2)}%`);
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateRevenueConfig({
        partner_percentage: p,
        staff_incentive_percentage: s,
        gartech_net_percentage: g
      });
      alert(res.message);
      loadSettingsAndLogs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">System Settings & Maintenance</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Revenue sharing configuration, GitHub system updates, database maintenance, and audit trails.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Revenue Sharing & System Updates */}
        <div className="space-y-6">
          {/* Revenue Configuration */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition">
            <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
              <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold">Revenue Sharing Splits</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Configure system default distribution rates. Historical records remain strictly immutable.
            </p>

            <form onSubmit={handleUpdateConfig} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
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
                    setGartechPct((100 - p - s).toFixed(2));
                  }}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Staff Harvester Incentive (%)
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
                    const s = parseFloat(e.target.value) || 0;
                    const p = parseFloat(partnerPct) || 0;
                    setGartechPct((100 - p - s).toFixed(2));
                  }}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  GARTECH Net Share (%) – Auto Balanced
                </label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  value={gartechPct}
                  className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 dark:text-emerald-300 cursor-not-allowed"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300">
                Total Balanced Sum: <strong>{(parseFloat(partnerPct || '0') + parseFloat(staffPct || '0') + parseFloat(gartechPct || '0')).toFixed(2)}%</strong>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer"
              >
                {saving ? 'Updating...' : 'Save Configuration'}
              </button>
            </form>
          </div>

          {/* GitHub Update Checker Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
                <GitBranch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">GitHub Repository Updates</h2>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-emerald-500"
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

            <div className="flex space-x-2">
              <a
                href="https://github.com/chavxxx/VendoRevenue"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Database Cleaning & Reset */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition">
            <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
              <Database className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h2 className="text-base font-bold">Database Maintenance</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Clear test/sample harvest transactions to keep production fresh and light. All vendos and accounts are preserved.
            </p>

            {cleanResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cleanResult}</span>
              </div>
            )}

            <button
              onClick={handleCleanDatabase}
              disabled={cleaningDb}
              className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{cleaningDb ? 'Cleaning Database...' : 'Wipe Sample Harvest Records'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Immutable Audit Trail Log */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-navy-900 dark:text-white">
              <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold">System Audit Logs</h2>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-500">Showing last 50 events</span>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-900 dark:bg-black text-white z-10">
                <tr className="text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 dark:text-slate-500">Loading audit trail...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 dark:text-slate-500">No audit logs recorded yet.</td>
                  </tr>
                ) : (
                  auditLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-gray-400 dark:text-slate-500 font-mono text-[11px]">
                        {new Date(l.created_at).toLocaleString('en-PH')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-navy-900 dark:text-white">{l.username}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">{l.action}</td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400">
                        {l.entity_type} {l.entity_id ? `(${l.entity_id})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300 max-w-xs truncate" title={l.new_values || l.old_values || ''}>
                        {l.new_values || l.old_values || '–'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
