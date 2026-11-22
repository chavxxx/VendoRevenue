import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Staff } from '../../types';
import { UserCheck, Plus, Search, Phone, Mail, Award, Edit } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    staff_code: '',
    full_name: '',
    phone: '',
    email: '',
    role_type: 'FIELD_HARVESTER',
    default_incentive_percentage: '5.00'
  });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await api.getStaff({ search: search || undefined });
      setStaff(data);
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.updateStaff(editingStaff.id, {
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          role_type: formData.role_type
        });
      } else {
        await api.createStaff({
          staff_code: formData.staff_code,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          role_type: formData.role_type,
          default_incentive_percentage: parseFloat(formData.default_incentive_percentage)
        });
      }
      setIsModalOpen(false);
      setEditingStaff(null);
      loadStaff();
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
          <h1 className="text-xl sm:text-2xl font-bold text-navy-900">Staff & Field Harvesters</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Personnel assigned to monthly coin collections, earning 5% field incentives.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData({
              staff_code: `STF-${(staff.length + 1).toString().padStart(3, '0')}`,
              full_name: '',
              phone: '',
              email: '',
              role_type: 'FIELD_HARVESTER',
              default_incentive_percentage: '5.00'
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Staff Member
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((s) => (
          <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {s.staff_code}
                  </span>
                  <h3 className="text-base font-bold text-navy-900 mt-1">{s.full_name}</h3>
                  <div className="text-xs font-semibold text-blue-600">{s.role_type}</div>
                </div>
                <button
                  onClick={() => {
                    setEditingStaff(s);
                    setFormData({
                      staff_code: s.staff_code,
                      full_name: s.full_name,
                      phone: s.phone,
                      email: s.email || '',
                      role_type: s.role_type,
                      default_incentive_percentage: s.default_incentive_percentage.toString()
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
                  <span>{s.phone}</span>
                </div>
                {s.email && (
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{s.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Incentive Box */}
            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Assigned Machines:</span>
                <strong className="text-navy-900">{s.assigned_vendos_count || 0}</strong>
              </div>
              <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-gray-100">
                <span>Earned 5% Incentive:</span>
                <strong>{formatPeso(s.total_incentives_earned)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h2 className="text-lg font-bold text-navy-900 mb-4">
              {editingStaff ? `Edit Staff Member` : 'Add Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Staff Code*</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStaff}
                  value={formData.staff_code}
                  onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name*</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number*</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role Type</label>
                <select
                  value={formData.role_type}
                  onChange={(e) => setFormData({ ...formData, role_type: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="FIELD_HARVESTER">Field Harvester</option>
                  <option value="ENCODER">Staff Encoder</option>
                  <option value="SUPERVISOR">Field Supervisor</option>
                </select>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
