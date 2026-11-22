import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { VendoMachine, Staff } from '../../types';
import { 
  PlusCircle, Search, Calendar, User, CheckCircle, 
  AlertCircle, DollarSign, ArrowRight, ShieldCheck, 
  MapPin, Clock, Tag
} from 'lucide-react';

export const HarvestEncodingPage: React.FC = () => {
  const { settings, formatCurrency } = useSettings();
  
  // Form State - Final Streamlined Workflow
  // Step 1: Select Harvest Date
  const [harvestDate, setHarvestDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Step 2: Select Vendo Machine (VLAN lookup or quick dropdown)
  const [vlanSearch, setVlanSearch] = useState<string>('');
  const [selectedVendo, setSelectedVendo] = useState<VendoMachine | null>(null);
  const [vendosList, setVendosList] = useState<VendoMachine[]>([]);
  
  // Harvester Selection
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedHarvesterId, setSelectedHarvesterId] = useState<string>('');

  // Step 3: Input Gross Income & Remarks
  const [grossInput, setGrossInput] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  
  // Real-time calculation state
  const [calculation, setCalculation] = useState<{
    gross_harvest: number;
    partner_percentage: number;
    partner_share: number;
    staff_percentage: number;
    staff_incentive: number;
    gartech_percentage: number;
    gartech_net: number;
  } | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successTxn, setSuccessTxn] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load available vendos & staff on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vData, sData] = await Promise.all([
          api.getVendos({ limit: 200 }),
          api.getStaff({ is_active: true })
        ]);
        setVendosList(vData);
        setStaffList(sData);
        if (sData.length > 0) {
          const firstHarvester = sData.find((s: Staff) => s.role_type === 'FIELD_HARVESTER') || sData[0];
          setSelectedHarvesterId(firstHarvester.id.toString());
        }
      } catch (err) {
        console.error('Failed to load encoding dependencies', err);
      }
    };
    fetchData();
  }, []);

  // Handle direct VLAN search
  const handleVlanSearch = async (val: string) => {
    setVlanSearch(val);
    setErrorMsg(null);
    if (!val || isNaN(Number(val))) {
      setSelectedVendo(null);
      return;
    }
    try {
      const vendo = await api.getVendoByVlan(parseInt(val));
      setSelectedVendo(vendo);
    } catch {
      setSelectedVendo(null);
      setErrorMsg(`Vendo machine with VLAN ${val} not found.`);
    }
  };

  // Quick select from dropdown
  const handleDropdownSelect = (vlanIdStr: string) => {
    if (!vlanIdStr) {
      setSelectedVendo(null);
      setVlanSearch('');
      return;
    }
    const found = vendosList.find(v => v.vlan_id === parseInt(vlanIdStr));
    if (found) {
      setSelectedVendo(found);
      setVlanSearch(found.vlan_id.toString());
      setErrorMsg(null);
    }
  };

  // Real-time automated calculation preview (100% company-owned: 5% staff, 95% gartech)
  useEffect(() => {
    const calcTimeout = setTimeout(async () => {
      const grossNum = parseFloat(grossInput);
      if (isNaN(grossNum) || grossNum <= 0) {
        setCalculation(null);
        return;
      }
      try {
        const preview = await api.previewHarvest({
          gross_harvest: grossNum,
          partner_percentage: 0.0,
          staff_percentage: settings.staff_incentive_percentage || 5.0
        });
        setCalculation(preview);
      } catch (err) {
        console.error('Computation preview error', err);
      }
    }, 150);

    return () => clearTimeout(calcTimeout);
  }, [grossInput, settings.staff_incentive_percentage]);

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedVendo) {
      setErrorMsg('Please select a valid Vendo Machine.');
      return;
    }
    if (!selectedHarvesterId) {
      setErrorMsg('Please select the staff harvester who conducted this collection.');
      return;
    }

    const grossNum = parseFloat(grossInput);
    if (isNaN(grossNum) || grossNum <= 0) {
      setErrorMsg('Please enter a valid positive gross income.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.encodeHarvest({
        vlan_id: selectedVendo.vlan_id,
        harvest_date: harvestDate,
        gross_harvest: grossNum,
        harvester_id: parseInt(selectedHarvesterId),
        remarks: remarks || undefined
      });

      setSuccessTxn(res);
      // Reset income input and remarks for next entry
      setGrossInput('');
      setRemarks('');
      setCalculation(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit harvest transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRecord = () => {
    setSuccessTxn(null);
    setSelectedVendo(null);
    setVlanSearch('');
    setGrossInput('');
    setRemarks('');
    setCalculation(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Fast Encoding Workflow
            </span>
            <span className="text-gray-400 text-xs">Flexible Harvest Dates</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white mt-1">
            Encode Vendo Harvest
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Select harvest date, select vendo machine, enter coin income, and submit.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-3 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUCCESS MODAL / BANNER */}
      {successTxn && (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="text-base font-bold">Harvest Record Successfully Saved & Approved!</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Ref: <strong className="font-mono">{successTxn.transaction_ref}</strong> | Period: {successTxn.harvest_period}
                </p>
              </div>
            </div>
            <button
              onClick={handleNewRecord}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md transition cursor-pointer"
            >
              Encode Next Vendo
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400">Machine</div>
              <div className="font-bold text-navy-900 dark:text-white">VLAN {successTxn.vlan_id}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400">Gross Harvest</div>
              <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(successTxn.gross_harvest)}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400">Harvester Incentive</div>
              <div className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(successTxn.staff_incentive)}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400">GARTECH Net</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(successTxn.gartech_net)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Encoding Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Harvest Date & Vendo Selection */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white uppercase tracking-wider">
              Harvest Date & Vendo Machine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Harvest Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Collection Date (No Monthly Restrictions)*</span>
              </label>
              <input
                type="date"
                required
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                Harvests can occur weekly, bi-weekly, or at irregular intervals.
              </p>
            </div>

            {/* Vendo Machine Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                <Search className="w-3.5 h-3.5 text-emerald-500" />
                <span>Select Vendo (or type VLAN ID)*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="VLAN ID"
                  value={vlanSearch}
                  onChange={(e) => handleVlanSearch(e.target.value)}
                  className="w-28 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold font-mono focus:outline-none focus:border-emerald-500 text-center"
                />
                <select
                  value={selectedVendo ? selectedVendo.vlan_id.toString() : ''}
                  onChange={(e) => handleDropdownSelect(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 truncate"
                >
                  <option value="">Choose from machine roster...</option>
                  {vendosList.map((v) => (
                    <option key={v.id} value={v.vlan_id}>
                      VLAN {v.vlan_id} – {v.vendo_name} ({v.city_municipality})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Selected Vendo Details Card */}
          {selectedVendo ? (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md font-mono">
                    VLAN {selectedVendo.vlan_id}
                  </span>
                  <span className="font-bold text-navy-900 dark:text-white text-sm">{selectedVendo.vendo_name}</span>
                </div>
                <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {selectedVendo.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-slate-400 pt-1">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate"><strong>Address:</strong> {selectedVendo.complete_address}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>Municipality:</strong> {selectedVendo.city_municipality}, {selectedVendo.province}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-950 border border-dashed border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-slate-500">
              Select or type a VLAN ID above to confirm machine details.
            </div>
          )}
        </div>

        {/* Step 2: Harvester Assignment & Gross Income */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white uppercase tracking-wider">
              Assign Harvester & Input Income
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic Harvester Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Assigned Harvester (Selected During Harvest)*
              </label>
              <select
                required
                value={selectedHarvesterId}
                onChange={(e) => setSelectedHarvesterId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Field Harvester...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role_type} - {s.staff_code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                Assigning harvester dynamically per collection.
              </p>
            </div>

            {/* Gross Coin Harvest Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                GROSS COIN HARVEST AMOUNT ({settings.currency_symbol || '₱'})*
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-lg font-bold text-gray-400 dark:text-slate-500">
                  {settings.currency_symbol || '₱'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={!selectedVendo}
                  placeholder="0.00"
                  value={grossInput}
                  onChange={(e) => setGrossInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xl font-black text-navy-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Real-time Financial Breakdown Display (No Partner) */}
          {calculation && (
            <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Live Revenue Distribution
                </span>
                <span className="text-[11px] bg-slate-900 px-2.5 py-0.5 rounded text-slate-300 font-mono border border-slate-800">
                  100% Company-Owned Vendo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Staff / Harvester Incentive */}
                <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30">
                  <div className="text-xs text-amber-400 font-bold uppercase">
                    Harvester Incentive ({calculation.staff_percentage}%)
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {formatCurrency(calculation.staff_incentive)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Assigned field staff incentive</div>
                </div>

                {/* GARTECH Net */}
                <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30">
                  <div className="text-xs text-emerald-400 font-bold uppercase">
                    GARTECH Net Share ({calculation.gartech_percentage}%)
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {formatCurrency(calculation.gartech_net)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Retained net revenue</div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                {formatCurrency(calculation.staff_incentive)} + {formatCurrency(calculation.gartech_net)} = {formatCurrency(calculation.gross_harvest)}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly collection, tested coin acceptor..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !selectedVendo || !grossInput}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer"
          >
            <span>{submitting ? 'Submitting Record...' : 'Submit Harvest Record'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
