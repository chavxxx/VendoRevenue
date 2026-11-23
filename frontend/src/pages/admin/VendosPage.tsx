import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { VendoMachine, VendoStatus } from '../../types';
import { 
  Wifi, Search, Plus, Download, Upload, 
  MapPin, CheckCircle, AlertTriangle, ArrowUpDown, Edit, Trash2, X, AlertOctagon
} from 'lucide-react';

export const VendosPage: React.FC = () => {
  const { settings, formatCurrency } = useSettings();
  const [vendos, setVendos] = useState<VendoMachine[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('vlan_id');
  const [sortOrder, setSortOrder] = useState<string>('asc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVendo, setEditingVendo] = useState<VendoMachine | null>(null);
  
  // Delete Confirmation Modal
  const [deletingVendo, setDeletingVendo] = useState<VendoMachine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear Database / Clear All Vendos Modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vlan_id: '',
    vendo_name: '',
    complete_address: '',
    city_municipality: settings.default_city || 'Valencia',
    province: settings.default_province || 'Bukidnon',
    latitude: '',
    longitude: '',
    installation_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    remarks: ''
  });

  const loadData = async (overrideParams: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        status: statusFilter || undefined,
        city: cityFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...overrideParams
      };
      const [vRes, sRes] = await Promise.all([
        api.getVendos(params),
        api.getVendoStats(),
      ]);
      setVendos(vRes);
      setStats(sRes);
    } catch (err) {
      console.error('Failed to load vendo data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, cityFilter, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const resetForm = () => {
    setFormData({
      vlan_id: '',
      vendo_name: '',
      complete_address: '',
      city_municipality: settings.default_city || 'Valencia',
      province: settings.default_province || 'Bukidnon',
      latitude: '',
      longitude: '',
      installation_date: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      remarks: ''
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVendo({
        vlan_id: parseInt(formData.vlan_id),
        vendo_name: formData.vendo_name,
        complete_address: formData.complete_address,
        city_municipality: formData.city_municipality,
        province: formData.province,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        installation_date: formData.installation_date,
        status: formData.status as VendoStatus,
        remarks: formData.remarks
      });
      setIsAddModalOpen(false);
      resetForm();
      setSearch('');
      setStatusFilter('');
      setCityFilter('');
      await loadData({ search: undefined, status: undefined, city: undefined });
    } catch (err: any) {
      alert(`Error creating vendo: ${err.message}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendo) return;
    try {
      await api.updateVendo(editingVendo.vlan_id, {
        vendo_name: formData.vendo_name,
        complete_address: formData.complete_address,
        city_municipality: formData.city_municipality,
        province: formData.province,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: formData.status as VendoStatus,
        remarks: formData.remarks
      });
      setIsEditModalOpen(false);
      setEditingVendo(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(`Error updating vendo: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingVendo) return;
    setIsDeleting(true);
    try {
      await api.deleteVendo(deletingVendo.vlan_id);
      setDeletingVendo(null);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting vendo: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllVendos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearConfirmation !== 'CONFIRM') {
      alert("Please type 'CONFIRM' to verify database wipe.");
      return;
    }
    setIsClearing(true);
    try {
      const res = await api.clearAllVendos();
      alert(res.message);
      setIsClearModalOpen(false);
      setClearConfirmation('');
      loadData();
    } catch (err: any) {
      alert(`Error clearing database: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  // Distinct cities for filter dropdown
  const uniqueCities = Array.from(new Set(vendos.map(v => v.city_municipality))).filter(Boolean);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">Vendo Machines Network</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Central repository for all WiFi vendos indexed by unique VLAN identifier.
          </p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => {
              setClearConfirmation('');
              setIsClearModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
            title="Wipe all vendos and harvest history"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Database</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendo Machine</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">Total Installed Vendos</div>
            <div className="text-2xl font-black text-navy-900 dark:text-white mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">Active Operational</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">Inactive / Maintenance</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.inactive}</div>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by VLAN ID, Machine Name, Address, or Municipality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 flex-1 md:flex-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
              <option value="REMOVED">REMOVED</option>
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 flex-1 md:flex-none"
            >
              <option value="">All Locations</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Vendos Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 cursor-pointer hover:text-navy-900 dark:hover:text-white" onClick={() => handleSort('vlan_id')}>
                  <div className="flex items-center space-x-1">
                    <span>VLAN ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-navy-900 dark:hover:text-white" onClick={() => handleSort('vendo_name')}>
                  <div className="flex items-center space-x-1">
                    <span>Machine Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Installation Address</th>
                <th className="py-3 px-4">Municipality & Province</th>
                <th className="py-3 px-4">Latest Harvest</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-slate-500">
                    <span className="inline-block animate-spin mr-2">◌</span>
                    Loading vendo machines...
                  </td>
                </tr>
              ) : vendos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-slate-500">
                    No vendo machines found. Click "Add Vendo Machine" above to register one.
                  </td>
                </tr>
              ) : (
                vendos.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 font-mono">
                        VLAN {v.vlan_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy-900 dark:text-white">{v.vendo_name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-slate-300 max-w-xs truncate" title={v.complete_address}>
                      {v.complete_address}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400">
                      {v.city_municipality}, {v.province}
                    </td>
                    <td className="py-3 px-4">
                      {v.last_harvest_date ? (
                        <div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.last_gross_harvest)}</div>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500">{v.last_harvest_date}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 text-[10px]">No harvest yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : v.status === 'UNDER_MAINTENANCE'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit Vendo Button */}
                        <button
                          onClick={() => {
                            setEditingVendo(v);
                            setFormData({
                              vlan_id: v.vlan_id.toString(),
                              vendo_name: v.vendo_name,
                              complete_address: v.complete_address,
                              city_municipality: v.city_municipality,
                              province: v.province,
                              latitude: v.latitude?.toString() || '',
                              longitude: v.longitude?.toString() || '',
                              installation_date: v.installation_date,
                              status: v.status,
                              remarks: v.remarks || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit Vendo"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete Vendo Button */}
                        <button
                          onClick={() => setDeletingVendo(v)}
                          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete Vendo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD VENDO MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-navy-900 dark:text-white flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-emerald-500" />
                <span>Register New Vendo Machine</span>
              </h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    VLAN ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 121"
                    value={formData.vlan_id}
                    onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Machine / Location Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WiFi Vendo - Poblacion Public Market"
                  value={formData.vendo_name}
                  onChange={(e) => setFormData({ ...formData, vendo_name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Complete Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purok 4, Sayre Highway, Poblacion"
                  value={formData.complete_address}
                  onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">City / Municipality</label>
                  <input
                    type="text"
                    required
                    value={formData.city_municipality}
                    onChange={(e) => setFormData({ ...formData, city_municipality: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Province</label>
                  <input
                    type="text"
                    required
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Installation Date</label>
                <input
                  type="date"
                  required
                  value={formData.installation_date}
                  onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes, hardware info, router model, etc."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/30"
                >
                  Save Vendo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VENDO MODAL */}
      {isEditModalOpen && editingVendo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-navy-900 dark:text-white flex items-center space-x-2">
                <Edit className="w-5 h-5 text-emerald-500" />
                <span>Edit Vendo Machine (VLAN {editingVendo.vlan_id})</span>
              </h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">VLAN ID</label>
                  <input
                    type="number"
                    disabled
                    value={editingVendo.vlan_id}
                    className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-500 dark:text-slate-400 font-mono font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                    <option value="REMOVED">REMOVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Machine Name</label>
                <input
                  type="text"
                  required
                  value={formData.vendo_name}
                  onChange={(e) => setFormData({ ...formData, vendo_name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Complete Address</label>
                <input
                  type="text"
                  required
                  value={formData.complete_address}
                  onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">City / Municipality</label>
                  <input
                    type="text"
                    required
                    value={formData.city_municipality}
                    onChange={(e) => setFormData({ ...formData, city_municipality: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Province</label>
                  <input
                    type="text"
                    required
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/30"
                >
                  Update Vendo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingVendo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900 dark:text-white">Delete Vendo Machine</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 text-xs space-y-1">
              <div><strong className="text-slate-700 dark:text-slate-300">VLAN ID:</strong> <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{deletingVendo.vlan_id}</span></div>
              <div><strong className="text-slate-700 dark:text-slate-300">Machine:</strong> {deletingVendo.vendo_name}</div>
              <div><strong className="text-slate-700 dark:text-slate-300">Address:</strong> {deletingVendo.complete_address}</div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400">
              All harvest records associated with VLAN {deletingVendo.vlan_id} will also be deleted from the database.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingVendo(null)}
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md shadow-rose-600/30"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL VENDOS / CLEAR DATABASE MODAL */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900 dark:text-white">Clear All Vendo Machines</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Dangerous Operation</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300">
              This will permanently delete <strong className="text-rose-600 dark:text-rose-400">all {stats.total} vendo machines</strong> and every harvest transaction in the database.
            </p>

            <form onSubmit={handleClearAllVendos} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Type <span className="font-mono text-rose-500 font-bold">CONFIRM</span> to proceed:
                </label>
                <input
                  type="text"
                  required
                  placeholder="CONFIRM"
                  value={clearConfirmation}
                  onChange={(e) => setClearConfirmation(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClearing || clearConfirmation !== 'CONFIRM'}
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  {isClearing ? 'Wiping...' : 'Wipe All Vendos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
