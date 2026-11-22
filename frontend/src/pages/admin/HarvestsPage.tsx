import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { HarvestTransaction, HarvestStatus } from '../../types';
import { 
  Receipt, Search, Filter, CheckCircle2, XCircle, 
  Slash, Eye, Calendar, User, FileText
} from 'lucide-react';

export const HarvestsPage: React.FC = () => {
  const { isAdmin } = useAuth();
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

  const formatPeso = (val?: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const getStatusBadge = (status: HarvestStatus) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">APPROVED</span>;
      case 'SUBMITTED':
        return <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">SUBMITTED</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">REJECTED</span>;
      case 'VOIDED':
        return <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">VOIDED</span>;
      default:
        return <span className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">Harvest Transaction Ledger</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Immutable financial history. Historical percentages are preserved permanently.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 transition">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="number"
              placeholder="Filter by VLAN ID..."
              value={vlanFilter}
              onChange={(e) => setVlanFilter(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted (Pending Approval)</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="VOIDED">Voided</option>
          </select>

          <input
            type="month"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={() => {
            setVlanFilter('');
            setStatusFilter('');
            setPeriodFilter('');
          }}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
        >
          Reset Filters
        </button>
      </div>

      {/* Harvest Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-black text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">TXN Ref</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">VLAN</th>
                <th className="py-3 px-4">Partner</th>
                <th className="py-3 px-4">Harvester</th>
                <th className="py-3 px-4 text-right">Gross (₱)</th>
                <th className="py-3 px-4 text-right">Partner 25% (₱)</th>
                <th className="py-3 px-4 text-right">Harvester 5% (₱)</th>
                <th className="py-3 px-4 text-right">GARTECH 70% (₱)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400 dark:text-slate-500">Loading harvest records...</td>
                </tr>
              ) : harvests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400 dark:text-slate-500">No harvest records found.</td>
                </tr>
              ) : (
                harvests.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700 dark:text-slate-300">{t.transaction_ref}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400">{t.harvest_date}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">VLAN {t.vlan_id}</td>
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-slate-200">{t.partner_name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-slate-400">{t.harvester_name || '–'}</td>
                    <td className="py-3 px-4 text-right font-bold text-navy-900 dark:text-white">{formatPeso(t.gross_harvest)}</td>
                    <td className="py-3 px-4 text-right font-medium text-purple-600 dark:text-purple-400">{formatPeso(t.partner_share)}</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">{formatPeso(t.staff_incentive)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatPeso(t.gartech_net)}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedTxn(t)}
                          title="View Details"
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && t.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleApprove(t.id)}
                              title="Approve Transaction"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTxn(t);
                                setIsRejectModalOpen(true);
                              }}
                              title="Reject Transaction"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
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
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
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
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Partner</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.partner_name}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Machine</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.vendo_name}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Encoded By</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.encoded_by_name || 'Staff'}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Harvester</span>
                <span className="font-semibold text-navy-900 dark:text-white">{selectedTxn.harvester_name || 'Assigned'}</span>
              </div>
            </div>

            {/* Financial Card */}
            <div className="bg-slate-950 text-white p-4 rounded-xl space-y-2 text-xs border border-slate-800">
              <div className="flex justify-between items-center text-sm font-bold border-b border-slate-800 pb-2">
                <span>Gross Coin Harvest</span>
                <span className="text-emerald-400">{formatPeso(selectedTxn.gross_harvest)}</span>
              </div>
              <div className="flex justify-between items-center text-purple-400">
                <span>Partner Share ({selectedTxn.partner_percentage}%)</span>
                <span>{formatPeso(selectedTxn.partner_share)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-400">
                <span>Staff Incentive ({selectedTxn.staff_percentage}%)</span>
                <span>{formatPeso(selectedTxn.staff_incentive)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold pt-1 border-t border-slate-800">
                <span>GARTECH Net Share ({selectedTxn.gartech_percentage}%)</span>
                <span>{formatPeso(selectedTxn.gartech_net)}</span>
              </div>
            </div>

            {selectedTxn.rejection_reason && (
              <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
                <strong>Rejection Reason:</strong> {selectedTxn.rejection_reason}
              </div>
            )}
            {selectedTxn.void_reason && (
              <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-xl border border-gray-300 dark:border-slate-700 text-xs text-gray-800 dark:text-slate-300">
                <strong>Void Reason (Audit Log):</strong> {selectedTxn.void_reason}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
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
            <h2 className="text-base font-bold text-navy-900 dark:text-white">Reject Transaction {selectedTxn.transaction_ref}</h2>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Reason for Rejection*</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Mismatched counter photo, gross harvest discrepancy..."
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
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
            <div className="flex items-center space-x-2 text-rose-600">
              <Slash className="w-5 h-5" />
              <h2 className="text-base font-bold text-navy-900 dark:text-white">Void Approved Transaction</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Financial records are never deleted permanently. Voiding records an immutable audit log and zeroes out balance attribution.
            </p>
            <form onSubmit={handleVoid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Mandatory Audit Void Reason*</label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Encoded under wrong VLAN ID, authorized by manager..."
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20"
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
