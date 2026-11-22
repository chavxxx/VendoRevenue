import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { HarvestTransaction, HarvestStatus } from '../../types';
import { 
  Receipt, Search, Filter, CheckCircle2, XCircle, 
  Slash, Eye, Calendar, User, FileText, X
} from 'lucide-react';

export const HarvestsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { settings, formatCurrency } = useSettings();
  const [harvests, setHarvests] = useState<HarvestTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [vlanFilter, setVlanFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  
  // Modals
  const [selectedTxn, setSelectedTxn] = useState<HarvestTransaction | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const loadHarvests = async () => {
    setLoading(true);
    try {
      const data = await api.getHarvests({
        vlan_id: vlanFilter ? parseInt(vlanFilter) : undefined,
        status: statusFilter || undefined,
        harvest_period: periodFilter || undefined
      });
      setHarvests(data);
    } catch (err) {
      console.error('Failed to load harvests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHarvests();
  }, [vlanFilter, statusFilter, periodFilter]);

  const handleApprove = async (id: number) => {
    if (confirm('Approve this harvest transaction? This will confirm financial distribution.')) {
      try {
        await api.approveHarvest(id);
        loadHarvests();
        if (selectedTxn?.id === id) setSelectedTxn(null);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;
    try {
      await api.rejectHarvest(selectedTxn.id, rejectReason);
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedTxn(null);
      loadHarvests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;
    if (!voidReason.trim()) {
      alert('A mandatory void reason must be entered.');
      return;
    }
    try {
      await api.voidHarvest(selectedTxn.id, voidReason);
      setIsVoidModalOpen(false);
      setVoidReason('');
      setSelectedTxn(null);
      loadHarvests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: HarvestStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>APPROVED</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <span>SUBMITTED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <XCircle className="w-3 h-3" />
            <span>REJECTED</span>
          </span>
        );
      case 'VOIDED':
        return (
          <span className="inline-flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <Slash className="w-3 h-3" />
            <span>VOIDED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">Harvest Records</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Audit-grade collection history, incentives, and net revenue distributions.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="number"
            placeholder="Filter by VLAN ID..."
            value={vlanFilter}
            onChange={(e) => setVlanFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="APPROVED">APPROVED</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="VOIDED">VOIDED</option>
        </select>

        <input
          type="month"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
        />

        {(vlanFilter || statusFilter || periodFilter) && (
          <button
            onClick={() => {
              setVlanFilter('');
              setStatusFilter('');
              setPeriodFilter('');
            }}
            className="text-xs text-rose-500 hover:underline px-2 py-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Harvests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Ref Code</th>
                <th className="py-3 px-4">Harvest Date</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Harvester</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-right">Incentive</th>
                <th className="py-3 px-4 text-right">GARTECH Net</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 dark:text-slate-500">Loading harvest records...</td>
                </tr>
              ) : harvests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 dark:text-slate-500">No harvest records found.</td>
                </tr>
              ) : (
                harvests.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700 dark:text-slate-300">{t.transaction_ref}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400">{t.harvest_date}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="font-mono">VLAN {t.vlan_id}</span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 font-normal ml-2">{t.vendo_name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-slate-400 font-medium">{t.harvester_name || '–'}</td>
                    <td className="py-3 px-4 text-right font-bold text-navy-900 dark:text-white">{formatCurrency(t.gross_harvest)}</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">{formatCurrency(t.staff_incentive)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(t.gartech_net)}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedTxn(t)}
                          title="View Details"
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && t.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleApprove(t.id)}
                              title="Approve Transaction"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTxn(t);
                                setIsRejectModalOpen(true);
                              }}
                              title="Reject Transaction"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {isAdmin && t.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              setSelectedTxn(t);
                              setIsVoidModalOpen(true);
                            }}
                            title="Void Approved Transaction"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <Slash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxn && !isRejectModalOpen && !isVoidModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-navy-900 dark:text-white">{selectedTxn.transaction_ref}</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500">VLAN {selectedTxn.vlan_id} • Harvest Date: {selectedTxn.harvest_date}</p>
              </div>
              <div>{getStatusBadge(selectedTxn.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Machine</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.vendo_name || `VLAN ${selectedTxn.vlan_id}`}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Harvester</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.harvester_name || 'Assigned Staff'}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Encoded By</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.encoded_by_name || 'Encoder'}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Period</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.harvest_period}</span>
              </div>
            </div>

            {/* Financial Card (100% Company-Owned) */}
            <div className="bg-slate-950 text-white p-4 rounded-xl space-y-2 text-xs border border-slate-800">
              <div className="flex justify-between items-center text-sm font-bold border-b border-slate-800 pb-2">
                <span>Gross Coin Harvest</span>
                <span className="text-emerald-400">{formatCurrency(selectedTxn.gross_harvest)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-400">
                <span>Staff Harvester Incentive ({selectedTxn.staff_percentage}%)</span>
                <span>{formatCurrency(selectedTxn.staff_incentive)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold pt-1 border-t border-slate-800">
                <span>GARTECH Net Share ({selectedTxn.gartech_percentage}%)</span>
                <span>{formatCurrency(selectedTxn.gartech_net)}</span>
              </div>
            </div>

            {selectedTxn.remarks && (
              <div className="text-xs text-gray-500 dark:text-slate-400 italic">
                <strong>Remarks:</strong> {selectedTxn.remarks}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedTxn(null)}
                className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Reject Harvest Transaction</h3>
            <p className="text-xs text-gray-500">Ref: {selectedTxn.transaction_ref}</p>
            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Reason for Rejection</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Mismatched counter, corrupted physical deposit..."
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3 py-2 text-xs text-gray-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {isVoidModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Void Approved Transaction</h3>
            <p className="text-xs text-gray-500">Ref: {selectedTxn.transaction_ref}</p>
            <form onSubmit={handleVoid} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Mandatory Audit Void Reason</label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Encoded under incorrect VLAN by mistake..."
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(false)}
                  className="px-3 py-2 text-xs text-gray-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Void
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
