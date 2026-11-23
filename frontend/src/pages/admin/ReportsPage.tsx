import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Staff, Partner, ReportScope } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { 
  Download, Table, Printer, Layers, UserCheck, Users, MapPin
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { settings, formatCurrency } = useSettings();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [scope, setScope] = useState<ReportScope>('all');
  
  // Scope-specific filter parameters
  const [selectedHarvesterId, setSelectedHarvesterId] = useState<string>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  // Date filters
  const [periodMonth, setPeriodMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [vlanId, setVlanId] = useState<string>('');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getStaff({ is_active: true }),
      api.getPartners({ is_active: true })
    ]).then(([staffRes, partnersRes]) => {
      setStaffList(staffRes);
      setPartners(partnersRes);
      if (staffRes.length > 0 && !selectedHarvesterId) {
        setSelectedHarvesterId(staffRes[0].id.toString());
      }
      if (partnersRes.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(partnersRes[0].id.toString());
      }
    }).catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    const params: Record<string, any> = {
      scope,
      harvester_id: scope === 'individual_harvester' && selectedHarvesterId ? parseInt(selectedHarvesterId) : undefined,
      partner_id: scope === 'individual_partner' && selectedPartnerId ? parseInt(selectedPartnerId) : undefined,
      city: scope === 'group_location' && selectedCity ? selectedCity : undefined,
    };

    if (vlanId) params.vlan_id = parseInt(vlanId);

    try {
      let res = null;
      if (reportType === 'daily') {
        params.report_date = dailyDate;
        res = await api.getDailyReport(params);
      } else if (reportType === 'weekly') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        res = await api.getWeeklyReport(params);
      } else if (reportType === 'monthly') {
        params.period = periodMonth;
        res = await api.getMonthlyReport(params);
      } else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        res = await api.getCustomReport(params);
      }
      setReportData(res);
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [
    reportType, scope, selectedHarvesterId, selectedPartnerId,
    selectedCity, periodMonth, dailyDate, startDate, endDate, vlanId
  ]);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const getExportParams = () => {
    const params: Record<string, any> = {
      report_type: reportType,
      scope: scope,
    };
    if (scope === 'individual_harvester' && selectedHarvesterId) {
      params.harvester_id = selectedHarvesterId;
    }
    if (scope === 'individual_partner' && selectedPartnerId) {
      params.partner_id = selectedPartnerId;
    }
    if (scope === 'group_location' && selectedCity) {
      params.city = selectedCity;
    }
    if (reportType === 'monthly' && periodMonth) params.period = periodMonth;
    if (reportType === 'daily' && dailyDate) params.report_date = dailyDate;
    if ((reportType === 'weekly' || reportType === 'custom') && startDate) params.start_date = startDate;
    if ((reportType === 'weekly' || reportType === 'custom') && endDate) params.end_date = endDate;
    if (vlanId) params.vlan_id = vlanId;
    return params;
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await api.downloadReport('excel', getExportParams());
    } catch (err: any) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      await api.downloadReport('csv', getExportParams());
    } catch (err: any) {
      alert(`CSV export failed: ${err.message}`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">Financial Reports & Auditing</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Fleet collections, partner revenue shares, harvester incentives, and company net financial statements.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 ${isExportingExcel ? 'animate-spin' : ''}`} />
            <span>{isExportingExcel ? 'Exporting...' : 'Excel Export'}</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Table className={`w-3.5 h-3.5 ${isExportingCsv ? 'animate-spin' : ''}`} />
            <span>{isExportingCsv ? 'Exporting...' : 'CSV Export'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition no-print">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Report Frequency:</span>
          {(['daily', 'weekly', 'monthly', 'custom'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setReportType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                reportType === t
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t} Report
            </button>
          ))}
        </div>

        {/* Scope Selector */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Report Scope:</span>
          {[
            { id: 'all', label: 'All Fleet & Personnel', icon: Layers },
            { id: 'individual_harvester', label: 'Individual Harvester', icon: UserCheck },
            { id: 'individual_partner', label: 'Individual Location Partner', icon: Users },
            { id: 'group_location', label: 'Group by City / Municipality', icon: MapPin },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setScope(item.id as ReportScope)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                  scope === item.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Filters depending on Scope and Frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Harvester Dropdown */}
          {scope === 'individual_harvester' && (
            <div>
              <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Select Harvester:</label>
              <select
                value={selectedHarvesterId}
                onChange={(e) => setSelectedHarvesterId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.staff_code})</option>
                ))}
              </select>
            </div>
          )}

          {/* Partner Dropdown */}
          {scope === 'individual_partner' && (
            <div>
              <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Select Partner:</label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.partner_code})</option>
                ))}
              </select>
            </div>
          )}

          {scope === 'group_location' && (
            <div>
              <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">City / Municipality:</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Cities / Locations</option>
                <option value={settings.default_city}>{settings.default_city}</option>
                <option value="Valencia">Valencia City</option>
                <option value="Malaybalay">Malaybalay City</option>
                <option value="Maramag">Maramag</option>
              </select>
            </div>
          )}

          {/* Date range filters */}
          {reportType === 'daily' && (
            <div>
              <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Report Date:</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <div>
              <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Report Period (Month):</label>
              <input
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {(reportType === 'weekly' || reportType === 'custom') && (
            <>
              <div>
                <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Filter by VLAN ID (Optional):</label>
            <input
              type="number"
              placeholder="e.g. 101"
              value={vlanId}
              onChange={(e) => setVlanId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gross Fleet Collections</span>
            <div className="text-2xl font-black text-navy-900 dark:text-white mt-1">
              {formatCurrency(reportData.total_gross_harvest || reportData.total_gross)}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {reportData.total_records || reportData.machines_harvested_count || 0} collections recorded
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Location Partner Share
            </span>
            <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
              {formatCurrency(reportData.total_partner_shares || reportData.total_partner_share)}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Distributed to venue partners</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Staff Incentive Pool ({settings.staff_incentive_percentage}%)
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(reportData.total_staff_incentives || reportData.total_staff_incentive)}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Staff & employee incentives</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {settings.company_name} Net ({settings.gartech_net_percentage}%)
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(reportData.total_gartech_net)}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Retained operating revenue</div>
          </div>
        </div>
      )}

      {/* Report Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-bold text-navy-900 dark:text-white">
            {reportType.toUpperCase()} FINANCIAL STATEMENT — SCOPE: {scope.toUpperCase()}
          </h2>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {reportData?.records?.length || 0} Transactions Included
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 dark:bg-black text-white font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">TXN Ref</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">VLAN ID</th>
                <th className="py-3 px-4">Vendo Name</th>
                <th className="py-3 px-4">Partner</th>
                <th className="py-3 px-4">Harvester</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-right">Partner Share</th>
                <th className="py-3 px-4 text-right">Staff ({settings.staff_incentive_percentage}%)</th>
                <th className="py-3 px-4 text-right">{settings.company_name} Net</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400 dark:text-slate-500">
                    Loading financial statement...
                  </td>
                </tr>
              ) : !reportData || !reportData.records || reportData.records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400 dark:text-slate-500">
                    No transactions match this reporting criteria.
                  </td>
                </tr>
              ) : (
                reportData.records.map((r: any) => (
                  <tr key={r.id || r.transaction_ref} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700 dark:text-slate-300">{r.transaction_ref}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400">{r.harvest_date}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">VLAN {r.vlan_id}</td>
                    <td className="py-3 px-4 font-semibold text-navy-900 dark:text-white">{r.vendo_name}</td>
                    <td className="py-3 px-4 text-purple-700 dark:text-purple-300 font-medium">{r.partner_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-amber-700 dark:text-amber-300">{r.harvester_name || '–'}</td>
                    <td className="py-3 px-4 text-right font-bold text-navy-900 dark:text-white">{formatCurrency(r.gross_harvest)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-700 dark:text-purple-300">{formatCurrency(r.partner_share)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(r.staff_incentive)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.gartech_net)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
