import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { VendoMachine, Partner, VendoStatus } from '../../types';
import { 
  Wifi, Search, Plus, Download, Upload, Filter, 
  MapPin, CheckCircle, AlertTriangle, XCircle, ArrowUpDown, Edit, Archive
} from 'lucide-react';

export const VendosPage: React.FC = () => {
  const [vendos, setVendos] = useState<VendoMachine[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [partnerFilter, setPartnerFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('vlan_id');
  const [sortOrder, setSortOrder] = useState<string>('asc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVendo, setEditingVendo] = useState<VendoMachine | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    vlan_id: '',
    vendo_name: '',
    partner_id: '',
    complete_address: '',
    city_municipality: 'Valencia',
    province: 'Bukidnon',
    latitude: '',
    longitude: '',
    installation_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    remarks: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, sRes, pRes] = await Promise.all([
        api.getVendos({
          search: search || undefined,
          status: statusFilter || undefined,
          partner_id: partnerFilter || undefined,
          sort_by: sortBy,
          sort_order: sortOrder
        }),
        api.getVendoStats(),
        api.getPartners({ is_active: true })
      ]);
      setVendos(vRes);
      setStats(sRes);
      setPartners(pRes);
    } catch (err) {
      console.error('Failed to load vendo data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, partnerFilter, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVendo({
        vlan_id: parseInt(formData.vlan_id),
        vendo_name: formData.vendo_name,
        partner_id: parseInt(formData.partner_id),
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
      loadData();
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
        partner_id: parseInt(formData.partner_id),
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
      loadData();
    } catch (err: any) {
      alert(`Error updating vendo: ${err.message}`);
    }
  };

  const handleArchive = async (vlanId: number) => {
    if (confirm(`Are you sure you want to archive or remove Vendo VLAN ${vlanId}?`)) {
      try {
        await api.archiveVendo(vlanId);
        loadData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vlan_id: '',
      vendo_name: '',
      partner_id: '',
      complete_address: '',
      city_municipality: 'Valencia',
      province: 'Bukidnon',
      latitude: '',
      longitude: '',
      installation_date: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      remarks: ''
    });
  };

  const formatPeso = (val?: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">Vendo Machines Network</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Central repository for all WiFi vendos indexed by unique VLAN identifier.
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
              placeholder="Search by VLAN ID, Machine Name, Partner, or Address..."
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
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 flex-1 md:flex-none"
            >
              <option value="">All Partners</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
                    <span>Vendo Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Partner</th>
                <th className="py-3 px-4">Installation Address</th>
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
                    No vendo machines found matching your criteria.
                  </td>
                </tr>
              ) : (
                vendos.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        VLAN {v.vlan_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy-900 dark:text-white">{v.vendo_name}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium">{v.partner_name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400 max-w-xs truncate" title={v.complete_address}>
                      {v.complete_address}
                    </td>
                    <td className="py-3 px-4">
                      {v.last_harvest_date ? (
                        <div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPeso(v.last_gross_harvest)}</div>
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
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => {
                            setEditingVendo(v);
                            setFormData({
                              vlan_id: v.vlan_id.toString(),
                              vendo_name: v.vendo_name,
                              partner_id: v.partner_id.toString(),
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
                          title="Edit Vendo"
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(v.vlan_id)}
                          title="Archive / Remove Vendo"
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Archive className="w-3.5 h-3.5" />
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

      {/* Add Vendo Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-black text-navy-900 dark:text-white mb-4">Register New WiFi Vendo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">VLAN ID (Unique)*</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 121"
                    value={formData.vlan_id}
                    onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Machine Name*</label>
                  <input
                    type="text"
                    required
                    placeholder="WiFi Vendo - Location"
                    value={formData.vendo_name}
                    onChange={(e) => setFormData({ ...formData, vendo_name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Location Partner*</label>
                <select
                  required
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.partner_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Installation Address*</label>
                <input
                  type="text"
                  required
                  placeholder="Purok, Barangay, Landmark"
                  value={formData.complete_address}
                  onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">City / Municipality</label>
                  <input
                    type="text"
                    value={formData.city_municipality}
                    onChange={(e) => setFormData({ ...formData, city_municipality: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Machine Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  Save Vendo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendo Modal */}
      {isEditModalOpen && editingVendo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-black text-navy-900 dark:text-white mb-4">Edit Vendo VLAN {editingVendo.vlan_id}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Machine Name*</label>
                <input
                  type="text"
                  required
                  value={formData.vendo_name}
                  onChange={(e) => setFormData({ ...formData, vendo_name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Location Partner*</label>
                <select
                  required
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.partner_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Installation Address*</label>
                <input
                  type="text"
                  required
                  value={formData.complete_address}
                  onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Machine Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  <option value="REMOVED">REMOVED</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingVendo(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
