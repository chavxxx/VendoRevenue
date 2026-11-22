import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Staff, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Award, 
  Edit, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  Users
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  // Tabs: 'all', 'harvesters', 'system_users'
  const [activeTab, setActiveTab] = useState<'all' | 'harvesters' | 'system_users'>('all');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Forms
  const [staffForm, setStaffForm] = useState({
    staff_code: '',
    full_name: '',
    phone: '',
    email: '',
    role_type: 'FIELD_HARVESTER',
    default_incentive_percentage: '5.00'
  });

  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'STAFF_ENCODER',
    password: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, usersData] = await Promise.all([
        api.getStaff({ search: search || undefined }),
        api.getUsers()
      ]);
      setStaff(staffData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Handle Staff (Harvester) Save
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.updateStaff(editingStaff.id, {
          full_name: staffForm.full_name,
          phone: staffForm.phone,
          email: staffForm.email || undefined,
          role_type: staffForm.role_type,
          default_incentive_percentage: parseFloat(staffForm.default_incentive_percentage) || 5.0
        });
      } else {
        await api.createStaff({
          staff_code: staffForm.staff_code,
          full_name: staffForm.full_name,
          phone: staffForm.phone,
          email: staffForm.email || undefined,
          role_type: staffForm.role_type,
          default_incentive_percentage: parseFloat(staffForm.default_incentive_percentage) || 5.0
        });
      }
      setIsStaffModalOpen(false);
      setEditingStaff(null);
      await loadData();
    } catch (err: any) {
      alert(`Error saving staff: ${err.message}`);
    }
  };

  // Handle Staff Delete
  const handleStaffDelete = async () => {
    if (!deletingStaff) return;
    try {
      await api.deleteStaff(deletingStaff.id);
      setDeletingStaff(null);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting staff: ${err.message}`);
    }
  };

  // Handle User Save
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          full_name: userForm.full_name,
          email: userForm.email,
          phone: userForm.phone || undefined,
          role: userForm.role,
          password: userForm.password ? userForm.password : undefined
        });
      } else {
        await api.createUser({
          username: userForm.username,
          full_name: userForm.full_name,
          email: userForm.email,
          phone: userForm.phone || undefined,
          role: userForm.role,
          password: userForm.password
        });
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      alert(`Error saving user account: ${err.message}`);
    }
  };

  // Handle User Delete
  const handleUserDelete = async () => {
    if (!deletingUser) return;
    try {
      await api.deleteUser(deletingUser.id);
      setDeletingUser(null);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white">
            Staff & User Accounts Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Manage all administrators, encoders, and field harvesters. The 5% incentive pool is allocated to all staff & employees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingStaff(null);
              setStaffForm({
                staff_code: `STF-${(staff.length + 1).toString().padStart(3, '0')}`,
                full_name: '',
                phone: '',
                email: '',
                role_type: 'FIELD_HARVESTER',
                default_incentive_percentage: '5.00'
              });
              setIsStaffModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center shadow-md shadow-emerald-600/20 cursor-pointer transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Harvester / Staff
          </button>

          <button
            onClick={() => {
              setEditingUser(null);
              setUserForm({
                username: '',
                full_name: '',
                email: '',
                phone: '',
                role: 'STAFF_ENCODER',
                password: ''
              });
              setIsUserModalOpen(true);
            }}
            className="bg-slate-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center shadow-md cursor-pointer transition"
          >
            <Shield className="w-4 h-4 mr-1.5 text-emerald-400" />
            Add Login Account
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex-1 sm:flex-initial ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:text-navy-900'
            }`}
          >
            All Accounts ({staff.length + users.length})
          </button>
          <button
            onClick={() => setActiveTab('system_users')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex-1 sm:flex-initial ${
              activeTab === 'system_users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:text-navy-900'
            }`}
          >
            Login Accounts & Admin ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('harvesters')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex-1 sm:flex-initial ${
              activeTab === 'harvesters'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:text-navy-900'
            }`}
          >
            Field Harvesters ({staff.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts or staff code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* SECTION 1: SYSTEM LOGIN USERS (ADMIN & ENCODERS) */}
      {(activeTab === 'all' || activeTab === 'system_users') && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-navy-900 dark:text-white">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h2>System Login Accounts ({users.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {u.role === 'ADMIN' ? '👑 SYSTEM ADMIN' : 'STAFF ENCODER'}
                      </span>
                      <h3 className="text-base font-bold text-navy-900 dark:text-white mt-1.5">{u.full_name}</h3>
                      <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">@{u.username}</div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setUserForm({
                            username: u.username,
                            full_name: u.full_name,
                            email: u.email,
                            phone: u.phone || '',
                            role: u.role,
                            password: ''
                          });
                          setIsUserModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg cursor-pointer transition"
                        title="Edit Account"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer transition"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800/80 text-[11px] text-gray-500 flex justify-between items-center">
                  <span>Status: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{u.is_active ? 'Active' : 'Disabled'}</strong></span>
                  <span className="font-mono text-[10px]">ID: #{u.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: FIELD HARVESTERS & STAFF */}
      {(activeTab === 'all' || activeTab === 'harvesters') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-2 text-sm font-bold text-navy-900 dark:text-white">
            <UserCheck className="w-4 h-4 text-amber-500" />
            <h2>Field Harvesters & Collection Staff ({staff.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                        {s.staff_code}
                      </span>
                      <h3 className="text-base font-bold text-navy-900 dark:text-white mt-1.5">{s.full_name}</h3>
                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">{s.role_type}</div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingStaff(s);
                          setStaffForm({
                            staff_code: s.staff_code,
                            full_name: s.full_name,
                            phone: s.phone,
                            email: s.email || '',
                            role_type: s.role_type,
                            default_incentive_percentage: s.default_incentive_percentage?.toString() || '5.00'
                          });
                          setIsStaffModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg cursor-pointer transition"
                        title="Edit Staff"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingStaff(s)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer transition"
                        title="Delete Staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-slate-400">
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

                {/* Incentive Pool & Commission Card */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Assigned Machines:</span>
                    <strong className="text-navy-900 dark:text-white">{s.assigned_vendos_count || 0}</strong>
                  </div>
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold pt-1.5 border-t border-gray-100 dark:border-slate-800/80">
                    <span>Earned Incentives:</span>
                    <strong>{formatPeso(s.total_incentives_earned)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {staff.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
              No staff or harvesters registered yet. Click "Add Harvester / Staff" above.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT STAFF MEMBER */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-navy-900 dark:text-white mb-4">
              {editingStaff ? `Edit Harvester / Staff Member` : 'Add New Field Harvester / Staff'}
            </h2>
            <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Staff Code*</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStaff}
                  value={staffForm.staff_code}
                  onChange={(e) => setStaffForm({ ...staffForm, staff_code: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Full Name*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan dela Cruz"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Phone Number*</label>
                <input
                  type="text"
                  required
                  placeholder="0917-000-0000"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="staff@gartech.ph"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Role Type</label>
                <select
                  value={staffForm.role_type}
                  onChange={(e) => setStaffForm({ ...staffForm, role_type: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 cursor-pointer"
                >
                  <option value="FIELD_HARVESTER">Field Harvester</option>
                  <option value="ENCODER">Staff Encoder</option>
                  <option value="SUPERVISOR">Field Supervisor</option>
                  <option value="TECHNICIAN">Vendo Technician</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT LOGIN ACCOUNT */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-navy-900 dark:text-white mb-4">
              {editingUser ? `Edit Account: @${editingUser.username}` : 'Add New System Login Account'}
            </h2>
            <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Username*</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  placeholder="e.g. admin2, encoder2"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Full Name*</label>
                <input
                  type="text"
                  required
                  placeholder="Account Holder Name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Email Address*</label>
                <input
                  type="email"
                  required
                  placeholder="user@gartech.ph"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">System Role*</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold cursor-pointer"
                >
                  <option value="STAFF_ENCODER">Staff Encoder (Data Encoding & Reports)</option>
                  <option value="ADMIN">System Administrator (Full Control & Settings)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {editingUser ? 'Password (Leave blank to keep current)' : 'Password*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-slate-900 dark:bg-slate-800 hover:bg-black text-white cursor-pointer shadow-md"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODALS */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 dark:text-white">Delete Staff Member?</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{deletingStaff.full_name}</strong> ({deletingStaff.staff_code})?
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDeletingStaff(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStaffDelete}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-600/30"
              >
                Delete Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 dark:text-white">Delete User Account?</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete login account <strong className="text-slate-900 dark:text-white">@{deletingUser.username}</strong> ({deletingUser.full_name})?
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUserDelete}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-600/30"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
