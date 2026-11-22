import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { VendoMachine, Staff } from '../../types';
import { 
  Coins, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  User, 
  Send
} from 'lucide-react';

export const HarvestEncodingPage: React.FC = () => {
  // Step 1: Select Date (Flexible: weekly, bi-weekly, or monthly)
  const [harvestDate, setHarvestDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Step 2: Select Vendo
  const [vlanSearch, setVlanSearch] = useState<string>('');
  const [selectedVendo, setSelectedVendo] = useState<VendoMachine | null>(null);
  const [vendosList, setVendosList] = useState<VendoMachine[]>([]);
  
  // Dynamic Harvester Assignment
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
          api.getVendos({ limit: 100 }),
          api.getStaff({ is_active: true })
        ]);
        setVendosList(vData);
        setStaffList(sData);
        if (sData.length > 0) {
          // Preselect first field harvester if available
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

  // Real-time automated calculation preview
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
          partner_percentage: 25.0,
          staff_percentage: 5.0
        });
        setCalculation(preview);
      } catch (err) {
        console.error('Computation preview error', err);
      }
    }, 120);

    return () => clearTimeout(calcTimeout);
  }, [grossInput, selectedVendo]);

  // Step 4: Submit Harvest
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendo) {
      setErrorMsg('Please select a valid Vendo machine.');
      return;
    }
    if (!selectedHarvesterId) {
      setErrorMsg('Please select the Field Harvester who performed the collection.');
      return;
    }
    const grossNum = parseFloat(grossInput);
    if (isNaN(grossNum) || grossNum <= 0) {
      setErrorMsg('Please enter a valid gross coin income amount greater than 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const newTxn = await api.encodeHarvest({
        vlan_id: selectedVendo.vlan_id,
        harvest_date: harvestDate,
        gross_harvest: grossNum,
        harvester_id: parseInt(selectedHarvesterId),
        remarks: remarks || undefined
      });

      setSuccessTxn(newTxn);
      setGrossInput('');
      setRemarks('');
      setVlanSearch('');
      setSelectedVendo(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting harvest record.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPeso = (val?: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">Encode Coin Harvest</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            4-step workflow: <strong>Select Date → Select Vendo → Assign Harvester & Income → Submit</strong>.
          </p>
          <div className="mt-2 inline-flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span>✓ Flexible harvest dates (weekly, bi-weekly, or monthly supported)</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800">
          <Coins className="w-6 h-6" />
        </div>
      </div>

      {/* Success Notification Banner */}
      {successTxn && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Harvest Recorded Successfully! Ref: {successTxn.transaction_ref}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  VLAN {successTxn.vlan_id} ({successTxn.vendo_name}) – Gross Income: {formatPeso(successTxn.gross_harvest)}
                  {successTxn.harvester_name && <span> | Harvester: <strong>{successTxn.harvester_name}</strong></span>}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs font-semibold">
                  <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-slate-700 text-purple-700 dark:text-purple-300">
                    Partner Share (25%): {formatPeso(successTxn.partner_share)}
                  </span>
                  <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-slate-700 text-amber-700 dark:text-amber-300">
                    Harvester Incentive (5%): {formatPeso(successTxn.staff_incentive)}
                  </span>
                  <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-300">
                    GARTECH Net (70%): {formatPeso(successTxn.gartech_net)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSuccessTxn(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4-Step Final Workflow Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Step 1 & 2: Date & Vendo Selection */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white uppercase tracking-wider">
              Select Date & Vendo Machine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Select Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Harvest Date*
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 2. Select Vendo */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Quick Select Vendo or Type VLAN ID*
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    placeholder="VLAN (e.g. 101)"
                    value={vlanSearch}
                    onChange={(e) => handleVlanSearch(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={selectedVendo ? selectedVendo.vlan_id.toString() : ''}
                  onChange={(e) => handleDropdownSelect(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-emerald-500 max-w-[200px]"
                >
                  <option value="">Choose Machine...</option>
                  {vendosList.map((v) => (
                    <option key={v.vlan_id} value={v.vlan_id}>
                      VLAN {v.vlan_id} - {v.vendo_name}
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
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
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
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>Partner:</strong> {selectedVendo.partner_name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate"><strong>Location:</strong> {selectedVendo.complete_address}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-950 border border-dashed border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-slate-500">
              Select or type a VLAN ID above to confirm machine details.
            </div>
          )}
        </div>

        {/* Step 3: Harvester Assignment & Gross Income */}
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
                GROSS COIN HARVEST AMOUNT (₱)*
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-lg font-bold text-gray-400 dark:text-slate-500">₱</span>
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

          {/* Real-time Financial Breakdown Display */}
          {calculation && (
            <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Live Automatic Revenue Split
                </span>
                <span className="text-[11px] bg-slate-900 px-2.5 py-0.5 rounded text-slate-300 font-mono border border-slate-800">
                  Exact Decimal Precision
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Partner Share (25%) */}
                <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/30">
                  <div className="text-xs text-purple-400 font-bold uppercase">
                    Location Partner ({calculation.partner_percentage}%)
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {formatPeso(calculation.partner_share)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Payable to {selectedVendo?.partner_name}</div>
                </div>

                {/* Staff / Harvester Incentive (5%) */}
                <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30">
                  <div className="text-xs text-amber-400 font-bold uppercase">
                    Harvester Incentive ({calculation.staff_percentage}%)
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {formatPeso(calculation.staff_incentive)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Assigned field staff commission</div>
                </div>

                {/* GARTECH Net (70%) */}
                <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30">
                  <div className="text-xs text-emerald-400 font-bold uppercase">
                    GARTECH Net Share ({calculation.gartech_percentage}%)
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {formatPeso(calculation.gartech_net)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Retained net revenue</div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                {formatPeso(calculation.partner_share)} + {formatPeso(calculation.staff_incentive)} + {formatPeso(calculation.gartech_net)} = {formatPeso(calculation.gross_harvest)}
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

        {/* Step 4: Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !selectedVendo || !grossInput || !selectedHarvesterId}
            className="w-full sm:w-auto px-10 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center transition cursor-pointer"
          >
            {submitting ? (
              <span className="animate-spin mr-2">◌</span>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Harvest Record
          </button>
        </div>

      </form>
    </div>
  );
};
