import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { 
  DashboardSummary, 
  ChartDataPoint, 
  TopEntityItem, 
  LocationPerformanceItem,
  HarvesterPerformanceItem,
  HarvesterDetailResponse,
  Staff
} from '../../types';
import { 
  Wifi, 
  Users, 
  Coins, 
  TrendingUp, 
  Award,
  Calendar,
  RefreshCw,
  UserCheck,
  User,
  ArrowRight,
  MapPin,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { settings, formatCurrency } = useSettings();
  
  // Active sub-tab: 'fleet' (Fleet Overview), 'all-harvesters' (Requirement 2), 'per-harvester' (Requirement 1)
  const [activeTab, setActiveTab] = useState<'fleet' | 'all-harvesters' | 'per-harvester'>('fleet');
  
  // Date filter state
  const [period, setPeriod] = useState<string>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Fleet Overview states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dailyChart, setDailyChart] = useState<ChartDataPoint[]>([]);
  const [monthlyChart, setMonthlyChart] = useState<ChartDataPoint[]>([]);
  const [topVendos, setTopVendos] = useState<TopEntityItem[]>([]);
  const [locations, setLocations] = useState<LocationPerformanceItem[]>([]);
  
  // Harvester Performance states
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [allHarvesters, setAllHarvesters] = useState<HarvesterPerformanceItem[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [harvesterDetail, setHarvesterDetail] = useState<HarvesterDetailResponse | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);

  // Load staff list once for dropdown selection
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await api.getStaff({ limit: 100 });
        setStaffList(staff);
        if (staff.length > 0 && selectedStaffId === null) {
          const harvester = staff.find((s: Staff) => s.role_type === 'FIELD_HARVESTER') || staff[0];
          setSelectedStaffId(harvester.id);
        }
      } catch (err) {
        console.error('Failed to load staff list', err);
      }
    };
    fetchStaff();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const filterParams: Record<string, any> = { period };
    if (period === 'custom' && customStartDate && customEndDate) {
      filterParams.start_date = customStartDate;
      filterParams.end_date = customEndDate;
    }

    try {
      if (activeTab === 'fleet') {
        const [sumRes, dailyRes, monthlyRes, vendosRes, locsRes] = await Promise.all([
          api.getDashboardSummary(filterParams),
          api.getDailyChart(14),
          api.getMonthlyChart(6),
          api.getTopVendos(8),
          api.getLocationPerformance()
        ]);
        setSummary(sumRes);
        setDailyChart(dailyRes);
        setMonthlyChart(monthlyRes);
        setTopVendos(vendosRes);
        setLocations(locsRes);
      } else if (activeTab === 'all-harvesters') {
        const harvestersRes = await api.getHarvestersPerformance(filterParams);
        setAllHarvesters(harvestersRes);
      } else if (activeTab === 'per-harvester' && selectedStaffId) {
        const detailRes = await api.getHarvesterDetail(selectedStaffId, filterParams);
        setHarvesterDetail(detailRes);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab, period, customStartDate, customEndDate, selectedStaffId]);

  const formatPeso = (val?: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  // Switch to drilldown with selected harvester
  const handleViewHarvesterDrilldown = (staffId: number) => {
    setSelectedStaffId(staffId);
    setActiveTab('per-harvester');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">Executive Dashboard & Income Monitoring</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Fleet monitoring, gross collections, and field harvester performance tracking.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'fleet'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-navy-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fleet Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('all-harvesters')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'all-harvesters'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-navy-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Harvesters</span>
          </button>
          <button
            onClick={() => setActiveTab('per-harvester')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'per-harvester'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-navy-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Per Harvester</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 font-bold text-gray-700 mr-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Period:</span>
          </div>

          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              period === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Daily (Today)
          </button>

          <button
            onClick={() => setPeriod('this_week')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              period === 'this_week' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weekly (This Week)
          </button>

          <button
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              period === 'this_month' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly (This Month)
          </button>

          <button
            onClick={() => setPeriod('last_month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              period === 'last_month' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Last Month
          </button>

          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              period === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Custom Range
          </button>

          {/* Harvester Dropdown for 'per-harvester' tab */}
          {activeTab === 'per-harvester' && (
            <div className="flex items-center space-x-1.5 ml-3 pl-3 border-l border-gray-200">
              <span className="font-bold text-gray-700">Harvester:</span>
              <select
                value={selectedStaffId || ''}
                onChange={(e) => setSelectedStaffId(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-navy-900 focus:outline-none focus:border-blue-500"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.staff_code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {period === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs"
              />
            </div>
          )}
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: FLEET OVERVIEW */}
      {activeTab === 'fleet' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Gross Harvest */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gross Coin Harvest</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-navy-900 dark:text-white mt-2">
                {formatCurrency(summary?.total_gross_harvest)}
              </div>
              <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Total coins collected
              </div>
            </div>

            {/* GARTECH Net Revenue */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">GARTECH Net Share ({settings.gartech_net_percentage || 95}%)</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(summary?.total_gartech_net)}
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">Retained operating revenue</div>
            </div>

            {/* Staff Incentives */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Harvester Incentives ({settings.staff_incentive_percentage || 5}%)</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {formatCurrency(summary?.total_staff_incentives)}
              </div>
              <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">Field harvester commissions</div>
            </div>

            {/* Fleet Status Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Active Fleet</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <Wifi className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-navy-900 dark:text-white mt-2">
                {summary?.active_vendos || 0} / {summary?.total_vendos || 0}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Operational vendo machines
              </div>
            </div>
          </div>

          {/* Main Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Harvest Trend */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-900">Daily Gross Coin Harvest (Last 14 Days)</h2>
                  <p className="text-xs text-gray-400">Total coin collections in Philippine Pesos</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChart}>
                    <defs>
                      <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₱${val/1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => [formatPeso(val), 'Gross Coins']}
                      contentStyle={{ backgroundColor: '#0B1528', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#grossGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Revenue Comparison */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-900">Monthly Revenue Comparison</h2>
                  <p className="text-xs text-gray-400">Gross Harvest vs. GARTECH Net Share (70%)</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₱${val/1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => formatPeso(val)}
                      contentStyle={{ backgroundColor: '#0B1528', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="value" name="Gross Harvest" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="secondary_value" name="GARTECH Net (70%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Performers Grid (Vendos & Locations) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Vendos */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h2 className="text-base font-bold text-navy-900 dark:text-white mb-1 flex items-center">
                <Wifi className="w-4 h-4 text-emerald-500 mr-2" />
                Top Earning Vendo Machines
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Ranked by total coin collections</p>
              <div className="space-y-3">
                {topVendos.map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-navy-900 dark:text-white">{v.name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-slate-500">{v.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.total_revenue)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Performance */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h2 className="text-base font-bold text-navy-900 dark:text-white mb-1 flex items-center">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                Performance by Location
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Geographic distribution and collections</p>
              <div className="space-y-3">
                {locations.map((loc) => (
                  <div key={loc.location} className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-navy-900 dark:text-white">{loc.location}</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400">{loc.vendo_count} Machines Deployed</div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(loc.total_gross)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL HARVESTERS VIEW (REQUIREMENT 2) */}
      {activeTab === 'all-harvesters' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Field Harvesters</span>
              <div className="text-2xl font-bold text-navy-900 mt-1">{allHarvesters.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">Personnel assigned to routes</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Gross Harvest (Period)</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {formatPeso(allHarvesters.reduce((acc, h) => acc + (h.total_gross_harvest || 0), 0))}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Across {allHarvesters.reduce((acc, h) => acc + (h.harvests_count || 0), 0)} collections
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Harvester Incentives (5%)</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {formatPeso(allHarvesters.reduce((acc, h) => acc + (h.total_incentive || 0), 0))}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Earned 5% commission in period</div>
            </div>
          </div>

          {/* Comparative Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-base font-bold text-navy-900 mb-1">Harvester Collection & Incentive Comparison</h2>
            <p className="text-xs text-gray-400 mb-4">Gross collections vs. 5% staff incentives for the selected period</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allHarvesters.map(h => ({
                  name: h.staff_name,
                  gross: h.total_gross_harvest,
                  incentive: h.total_incentive
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip 
                    formatter={(val: any) => formatPeso(val)}
                    contentStyle={{ backgroundColor: '#0B1528', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="gross" name="Gross Harvest Collected" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incentive" name="5% Harvester Incentive" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* All Harvesters Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-navy-900">All Harvesters Performance Ledger</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Detailed metrics per harvester. Click "Drilldown" to inspect daily logs and individual machine collections.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Harvester</th>
                    <th className="py-3 px-4">Staff Code</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Assigned Machines</th>
                    <th className="py-3 px-4 text-center">Harvests in Period</th>
                    <th className="py-3 px-4 text-right">Gross Harvest</th>
                    <th className="py-3 px-4 text-right">Incentive (5%)</th>
                    <th className="py-3 px-4 text-center">Latest Harvest</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allHarvesters.map((h) => (
                    <tr key={h.staff_id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy-900 text-sm">{h.staff_name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{h.staff_code}</td>
                      <td className="py-3.5 px-4 text-gray-500">{h.phone || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                          {h.assigned_vendos_count} vendos
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-navy-900">
                        {h.harvests_count}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-navy-900">
                        {formatPeso(h.total_gross_harvest)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                        {formatPeso(h.total_incentive)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-500">
                        {h.latest_harvest_date || 'None'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleViewHarvesterDrilldown(h.staff_id)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-xs transition-all flex items-center space-x-1 mx-auto"
                        >
                          <span>Drilldown</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allHarvesters.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        No harvester performance records found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PER HARVESTER DRILLDOWN (REQUIREMENT 1) */}
      {activeTab === 'per-harvester' && harvesterDetail && (
        <div className="space-y-6">
          {/* Profile & KPI Cards */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold text-xl">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-navy-900">{harvesterDetail.staff_name}</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {harvesterDetail.staff_code}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-4">
                  <span>Phone: {harvesterDetail.phone || 'N/A'}</span>
                  <span>Email: {harvesterDetail.email || 'N/A'}</span>
                  <span>Assigned: {harvesterDetail.assigned_vendos_count} Machines</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-slate-900 text-white px-5 py-3 rounded-xl text-right">
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">5% Harvester Incentive</div>
                <div className="text-xl font-extrabold text-amber-400">{formatPeso(harvesterDetail.total_incentive)}</div>
              </div>
              <div className="bg-blue-600 text-white px-5 py-3 rounded-xl text-right">
                <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Total Gross Harvest</div>
                <div className="text-xl font-extrabold">{formatPeso(harvesterDetail.total_gross_harvest)}</div>
              </div>
            </div>
          </div>

          {/* Daily Trend Chart for this Harvester */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-navy-900 mb-1">
              Collection Timeline for {harvesterDetail.staff_name}
            </h3>
            <p className="text-xs text-gray-400 mb-4">Daily gross coin collection volume</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={harvesterDetail.daily_trends}>
                  <defs>
                    <linearGradient id="harvesterTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip 
                    formatter={(val: any) => [formatPeso(val), 'Gross Coins']}
                    contentStyle={{ backgroundColor: '#0B1528', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#harvesterTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Harvest Records for this Harvester */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-navy-900">
                Harvest Records Encoded for {harvesterDetail.staff_name} ({harvesterDetail.harvests_count} collections)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">TXN Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">VLAN ID</th>
                    <th className="py-3 px-4">Vendo Name</th>
                    <th className="py-3 px-4 text-right">Gross Harvest</th>
                    <th className="py-3 px-4 text-right">Harvester ({settings.staff_incentive_percentage}%)</th>
                    <th className="py-3 px-4 text-right">{settings.company_name} Net ({settings.gartech_net_percentage}%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {harvesterDetail.harvests.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{h.transaction_ref}</td>
                      <td className="py-3 px-4 text-gray-600">{h.harvest_date}</td>
                      <td className="py-3 px-4 font-bold text-navy-900">VLAN {h.vlan_id}</td>
                      <td className="py-3 px-4 font-semibold text-navy-900">{h.vendo_name}</td>
                      <td className="py-3 px-4 text-right font-bold text-navy-900">{formatCurrency(h.gross_harvest)}</td>
                      <td className="py-3 px-4 text-right text-amber-600 font-bold">{formatCurrency(h.staff_incentive)}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(h.gartech_net)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {harvesterDetail.harvests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        No harvest collections recorded for this harvester in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
