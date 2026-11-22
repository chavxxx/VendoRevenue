import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Partner } from '../../types';
import { Users, Plus, Search, Edit, Phone, Mail, MapPin, Building, CreditCard } from 'lucide-react';

export const PartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    partner_code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: 'Valencia',
    province: 'Bukidnon',
    default_share_percentage: '25.00',
    gcash_number: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: ''
  });

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await api.getPartners({ search: search || undefined });
      setPartners(data);
    } catch (err) {
      console.error('Failed to load partners', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        await api.updatePartner(editingPartner.id, {
          name: formData.name,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          gcash_number: formData.gcash_number,
          bank_name: formData.bank_name,
          bank_account_name: formData.bank_account_name,
          bank_account_number: formData.bank_account_number
        });
      } else {
        await api.createPartner({
          partner_code: formData.partner_code,
          name: formData.name,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          default_share_percentage: parseFloat(formData.default_share_percentage),
          gcash_number: formData.gcash_number,
          bank_name: formData.bank_name,
          bank_account_name: formData.bank_account_name,
          bank_account_number: formData.bank_account_number
        });
      }
      setIsModalOpen(false);
      setEditingPartner(null);
      loadPartners();
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-900">Location Partners Directory</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Store owners, building hosts, and location partners sharing 25% WiFi vendo revenue.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPartner(null);
            setFormData({
              partner_code: `PRT-${(partners.length + 1).toString().padStart(3, '0')}`,
              name: '',
              contact_person: '',
              phone: '',
              email: '',
              address: '',
              city: 'Valencia',
              province: 'Bukidnon',
              default_share_percentage: '25.00',
              gcash_number: '',
              bank_name: '',
              bank_account_name: '',
              bank_account_number: ''
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Location Partner
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search partners by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {p.partner_code}
                  </span>
                  <h3 className="text-base font-bold text-navy-900 mt-1">{p.name}</h3>
                  <div className="text-xs text-gray-500">{p.contact_person || 'Location Owner'}</div>
                </div>
                <button
                  onClick={() => {
                    setEditingPartner(p);
                    setFormData({
                      partner_code: p.partner_code,
                      name: p.name,
                      contact_person: p.contact_person || '',
                      phone: p.phone || '',
                      email: p.email || '',
                      address: p.address,
                      city: p.city,
                      province: p.province,
                      default_share_percentage: p.default_share_percentage.toString(),
                      gcash_number: p.gcash_number || '',
                      bank_name: p.bank_name || '',
                      bank_account_name: p.bank_account_name || '',
                      bank_account_number: p.bank_account_number || ''
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{p.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{p.address}, {p.city}</span>
                </div>
                {p.gcash_number && (
                  <div className="flex items-center space-x-1.5 text-blue-600">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>GCash: {p.gcash_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Machines Deployed:</span>
                <strong className="text-navy-900">{p.vendo_count || 0}</strong>
              </div>
              <div className="flex justify-between text-purple-700 font-bold pt-1 border-t border-gray-100">
                <span>Earned 25% Share:</span>
                <strong>{formatPeso(p.total_earnings)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-bold text-navy-900 mb-4">
              {editingPartner ? `Edit Partner ${editingPartner.name}` : 'Register New Location Partner'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Partner Code*</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPartner}
                    value={formData.partner_code}
                    onChange={(e) => setFormData({ ...formData, partner_code: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Partner / Business Name*</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile / Phone*</label>
                  <input
                    type="text"
                    required
                    placeholder="0917-..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Complete Address*</label>
                <input
                  type="text"
                  required
                  placeholder="Purok, Street, Landmark"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GCash Number</label>
                  <input
                    type="text"
                    placeholder="0917..."
                    value={formData.gcash_number}
                    onChange={(e) => setFormData({ ...formData, gcash_number: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="BDO, BPI, Landbank..."
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Share Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled
                    value={formData.default_share_percentage}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {editingPartner ? 'Update Partner' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
