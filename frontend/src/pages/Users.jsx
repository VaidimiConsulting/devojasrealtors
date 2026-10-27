import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, ShieldCheck, ShieldX, Ban, CheckCircle, LogIn, CheckSquare, XSquare, Key, Copy, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import AssociateRegistrationForm from '../components/AssociateRegistrationForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';

const emptyForm = { name: '', email: '', phone: '', password: '', role: 'client', referred_by: '', pan_number: '', aadhar_number: '', referral_commission_percent: '', login_id: '' };

const roleLabels = { client: 'Client', associate: 'Associate', accounts: 'Accounts', admin: 'Admin' };

const Users = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [fixedAssociates, setFixedAssociates] = useState([]);
  const [resetCreds, setResetCreds] = useState(null);
  const [fixedEditModal, setFixedEditModal] = useState(null); // { loginId, userId, index }
  const [fixedForm, setFixedForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [fixedSaving, setFixedSaving] = useState(false);
  const [fixedGenPwd, setFixedGenPwd] = useState(null); // newly generated password to show
  // Admin Reset Password state
  const [resetPwdTarget, setResetPwdTarget] = useState(null); // user object
  const [resetPwdInput, setResetPwdInput] = useState('');
  const [resetPwdResult, setResetPwdResult] = useState(null); // { password, login_id }
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [resetPwdShowPwd, setResetPwdShowPwd] = useState(false);

  const currentRole = searchParams.get('role') || '';
  const currentKyc = searchParams.get('kyc_status') || '';
  const currentStatus = searchParams.get('status') || '';

  const activeTab = currentStatus === 'pending_approval' ? 'pending' : (currentKyc ? 'kyc' : (currentRole || 'all'));

  const [netCounts, setNetCounts] = useState({});
  const fetchUsers = async () => {
    setLoading(true);
    try {
      api.get('/commission-ledger/network-counts').then(r => setNetCounts(Object.fromEntries((r.data.data || []).map(x => [x.id, x])))).catch(() => {});
      const params = {};
      if (currentRole) params.role = currentRole;
      if (currentKyc) params.kyc_status = currentKyc;
      if (currentStatus) params.status = currentStatus;
      if (search) params.search = search;
      const res = await api.get('/users', { params });
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssociates = async () => {
    try {
      const res = await api.get('/users', { params: { role: 'associate' } });
      setAssociates(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchFixedAssociates = async () => {
    try {
      const res = await api.get('/users/fixed-associates');
      setFixedAssociates(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, [currentRole, currentKyc, currentStatus, search]);
  useEffect(() => { fetchAssociates(); fetchFixedAssociates(); }, []);

  const handleResetFixedPassword = async (id) => {
    try {
      const res = await api.post(`/users/${id}/reset-fixed-associate`);
      setFixedGenPwd(res.data.newPassword);
      fetchFixedAssociates();
    } catch (err) { alert(err.response?.data?.message || 'Error generating password'); }
  };

  const openFixedEditModal = (i) => {
    const fa = fixedAssociates[i]; // direct index into sorted fixedAssociates array
    setFixedGenPwd(null);
    setFixedForm({
      name: fa?.name || '',
      email: fa?.email || '',
      phone: fa?.phone || '',
      address: fa?.address || ''
    });
    setFixedEditModal({ loginId: fa?.login_id || `fixed-${i+1}`, userId: fa?.id || null, index: i + 1 });
  };

  const handleFixedSave = async (e) => {
    e.preventDefault();
    if (!fixedEditModal) return;
    setFixedSaving(true);
    try {
      if (fixedEditModal.userId) {
        // Update existing
        await api.put(`/users/${fixedEditModal.userId}`, { ...fixedForm, role: 'associate' });
      } else {
        // Create new fixed associate via seed route
        await api.get('/seed-fixed-associates');
      }
      await fetchFixedAssociates();
      const updatedUser = fixedAssociates.find(u => u.id === fixedEditModal.userId);
      setFixedEditModal(prev => ({ ...prev, userId: updatedUser?.id || prev.userId }))
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving');
    } finally {
      setFixedSaving(false);
    }
  };

  // Admin Reset Password for any user
  const openResetPwdModal = (user) => {
    setResetPwdTarget(user);
    setResetPwdInput('');
    setResetPwdResult(null);
    setResetPwdShowPwd(false);
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdTarget) return;
    setResetPwdLoading(true);
    try {
      const res = await api.post(`/users/${resetPwdTarget.id}/admin-reset-password`, {
        new_password: resetPwdInput.trim() || undefined
      });
      setResetPwdResult({ password: res.data.newPassword, login_id: res.data.login_id });
      fetchUsers();
      fetchFixedAssociates();
    } catch (err) {
      alert(err.response?.data?.message || 'Error resetting password');
    } finally {
      setResetPwdLoading(false);
    }
  };

  const setTab = (tab) => {
    if (tab === 'all') setSearchParams({});
    else if (tab === 'kyc') setSearchParams({ kyc_status: 'pending' });
    else if (tab === 'pending') setSearchParams({ status: 'pending_approval' });
    else setSearchParams({ role: tab });
  };

  const openAddModal = () => {
    setEditingUser(null);
    // Jis tab se "Add User" click hua ho (Client / Associate / Accounts),
    // us tab ka role form me already filled aa jaye.
    // For Client / Accounts / Associate
    const prefillRole = ['associate', 'client', 'accounts'].includes(currentRole) ? currentRole : 'client';
    setForm({
      ...emptyForm,
      role: prefillRole,
      referral_commission_percent: prefillRole === 'associate' ? 5 : form.referral_commission_percent || 5
    });
    setError('');
    setCreatedCreds(null);
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    const savedComm = user.commission_percent !== null && user.commission_percent !== undefined
      ? parseFloat(user.commission_percent)
      : (user.referral_commission_percent !== null && user.referral_commission_percent !== undefined
          ? parseFloat(user.referral_commission_percent)
          : 5.0);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      login_id: user.login_id || '',
      password: '',
      confirm_password: '',
      role: user.role,
      status: user.status || 'active',
      referred_by: user.referred_by || '',
      pan_number: user.pan_number || '',
      aadhar_number: user.aadhar_number || '',
      commission_percent: savedComm,
      referral_commission_percent: savedComm
    });
    setError('');
    setShowEditPassword(false);
    setModalOpen(true);
  };

  const getAddButtonTitle = () => {
    if (currentRole === 'associate') return 'Add New Associate';
    if (currentRole === 'client') return 'Add New Client';
    if (currentRole === 'accounts') return 'Add Accounts User';
    return 'Add New User';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (editingUser) {
      if (form.password && form.password.trim()) {
        if (form.password.trim().length < 6) {
          setError('New password must be at least 6 characters.');
          return;
        }
        if (form.confirm_password && form.password.trim() !== form.confirm_password.trim()) {
          setError('Password and Confirm Password do not match.');
          return;
        }
      }

      if (form.role === 'associate') {
        const commVal = parseFloat(form.commission_percent);
        if (isNaN(commVal) || commVal < 0 || commVal > 100) {
          setError('Commission percentage must be a valid number between 0% and 100%.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload = {
          ...form,
          commission_percent: form.role === 'associate' ? parseFloat(form.commission_percent) : form.commission_percent,
          referral_commission_percent: form.role === 'associate' ? parseFloat(form.commission_percent) : form.referral_commission_percent
        };
        const res = await api.put(`/users/${editingUser.id}`, payload);
        setModalOpen(false);
        const msg = res.data?.message || `${editingUser.name} updated successfully.`;
        setDeleteMessage(`✅ ${msg}`);
        setDeleteMessageType('success');
        setTimeout(() => setDeleteMessage(''), 6000);
        fetchUsers();
        fetchAssociates();
      } else {
        const res = await api.post('/users', form);
        
        // Show credentials for all users so admin has them
        setCreatedCreds({
          referral_code: res.data.data.referral_code,
          loginId: res.data.data.login_id || res.data.data.email || res.data.data.phone,
          email: res.data.data.email,
          phone: res.data.data.phone,
          generatedPassword: res.data.generatedPassword || form.password || '123456',
          emailSent: res.data.emailSent || false,
          role: res.data.data.role
        });
        fetchUsers();
        fetchAssociates();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };


  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteMessageType, setDeleteMessageType] = useState('success');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;
    setDeleteTarget(null);

    // Optimistically remove from state so the row disappears immediately
    setUsers(prev => prev.filter(u => u.id !== targetId));

    try {
      const res = await api.delete(`/users/${targetId}`);
      setDeleteMessage(`✅ ${res.data.message || `${targetName} deleted successfully.`}`);
      setDeleteMessageType('success');
      setTimeout(() => setDeleteMessage(''), 6000);
      fetchUsers();
      fetchAssociates();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete operation failed.';
      setDeleteMessage(`❌ ${msg}`);
      setDeleteMessageType('error');
      setTimeout(() => setDeleteMessage(''), 8000);
      fetchUsers();
    }
  };



  const handleKyc = async (id, status) => {
    await api.put(`/users/${id}/kyc`, { kyc_status: status });
    fetchUsers();
  };

  const handleApproveAssociate = async (id) => {
    try {
      await api.post(`/users/${id}/approve`);
      fetchUsers();
    } catch (err) { alert(err.response?.data?.message || 'Error approving'); }
  };

  const handleRejectAssociate = async (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      await api.post(`/users/${id}/reject`, { rejection_reason: reason });
      fetchUsers();
    } catch (err) { alert(err.response?.data?.message || 'Error rejecting'); }
  };

  const handleImpersonate = async (id, role) => {
    try {
      const res = await api.post(`/users/${id}/impersonate`);
      const { token } = res.data;
      const adminPanelUrl = window.location.origin;
      let impersonationUrl;
      if (role === 'associate') {
        impersonationUrl = `${adminPanelUrl}/associate?impersonation_token=${token}`;
      } else if (role === 'client') {
        impersonationUrl = `${adminPanelUrl}/client?impersonation_token=${token}`;
      } else if (role === 'accounts') {
        impersonationUrl = `${adminPanelUrl}/accounts?impersonation_token=${token}`;
      } else {
        impersonationUrl = `${adminPanelUrl}/?impersonation_token=${token}`;
      }
      window.open(impersonationUrl, '_blank');
    } catch (err) { alert(err.response?.data?.message || 'Error impersonating'); }
  };

  const toggleStatus = async (id) => {
    await api.put(`/users/${id}/status`);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage associates, clients, and accounts users with role-specific access</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> {getAddButtonTitle()}
        </button>
      </div>

      {/* Delete/Action notification toast */}
      {deleteMessage && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          deleteMessageType === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
          deleteMessageType === 'info'    ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                                           'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {deleteMessage}
        </div>
      )}

      {/* Tabs */}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setTab('associate')}
          className={`px-4 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'associate'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>All Associates</span>
          {activeTab === 'associate' && <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">Active</span>}
        </button>
        <button
          onClick={() => setTab('client')}
          className={`px-4 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'client'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>All Clients</span>
          {activeTab === 'client' && <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">Active</span>}
        </button>
        <button
          onClick={() => setTab('accounts')}
          className={`px-4 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>All Accounts</span>
          {activeTab === 'accounts' && <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">Active</span>}
        </button>
        <button
          onClick={() => setTab('kyc')}
          className={`px-4 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'kyc'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Pending KYC</span>
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Pending Approvals</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone or login ID..."
          className="input-field pl-10"
        />
      </div>

      {/* Fixed Associates Section */}
      {(activeTab === 'associate' || activeTab === 'all') && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-md mb-6">
          <div className="p-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-amber-900">🏅 Fixed Associate Accounts</h2>
              <p className="text-sm text-amber-700">Pre-defined system accounts (Fixed Associates)</p>
            </div>
            <span className="text-xs bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-bold">
              {fixedAssociates.length} / 6 Active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Login ID</th>
                  <th className="px-4 py-3 font-semibold">Password</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold text-center">Commission</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Render fixedAssociates directly by their sorted order */}
                {fixedAssociates.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-8 text-slate-400 italic text-sm">No fixed associates found. They may not have been seeded yet.</td></tr>
                ) : (
                  fixedAssociates.map((fa, idx) => (
                    <tr key={fa.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs items-center justify-center">{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{fa.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{fa.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 text-xs">{fa.login_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        {fa.plain_password ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-300 text-xs shadow-sm">
                            <Key size={11} className="text-amber-600" />
                            {fa.plain_password}
                          </span>
                        ) : (
                          <span className="italic text-slate-400 text-xs font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {fa.email || <span className="italic text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-green-100 text-green-800 font-bold text-xs px-3 py-1 rounded-full border border-green-200">
                          {fa.commission_percent != null ? `${Number(fa.commission_percent).toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          fa.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>{fa.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openFixedEditModal(idx)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-sm"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => openResetPwdModal(fa)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-sm flex items-center gap-1"
                            title="Reset Password"
                          >
                            <Key size={12} /> Reset Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-amber-50 rounded-b-2xl border-t border-amber-100">
            <p className="text-xs text-amber-700">
              💡 <strong>Tip:</strong> Agar koi ID nahi dikh rahi, to browser mein <code className="bg-amber-100 px-1 rounded">https://api.devojasrealtors.in/api/seed-fixed-associates</code> kholen.
            </p>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto p-0 border border-slate-200">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name & ID</th>
              <th>Phone / Email</th>
              <th>Referred By / Sponsor</th>
              <th>Role</th>
              <th>Network (Direct / Total)</th>
              <th>KYC / Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-12 text-slate-400 text-base">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-slate-400 text-base">No users found in this tab</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="font-bold text-slate-900 text-base">{u.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {u.login_id && (
                        <span className="inline-block text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {u.login_id}
                        </span>
                      )}
                      {u.plain_password && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 shadow-sm"
                          title="Password"
                        >
                          <Key size={11} className="text-amber-600" />
                          <span>{u.plain_password}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="text-slate-800 font-medium text-sm">{u.email || '—'}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{u.phone}</div>
                  </td>
                  <td>
                    {u.referrer ? (
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">{u.referrer.name}</div>
                        <span className="font-mono text-xs text-blue-700 font-bold">{u.referrer.login_id}</span>
                      </div>
                    ) : u.referred_by ? (
                      <span className="font-mono text-xs text-slate-500">ID: {u.referred_by}</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">{u.role === 'admin' ? 'Root Head' : 'Direct Company'}</span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      u.role === 'associate' ? 'bg-blue-100 text-blue-800' :
                      u.role === 'client' ? 'bg-emerald-100 text-emerald-800' :
                      u.role === 'accounts' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {u.role}
                    </span>
                    {Number(u.commission_percent || 0) > 0 && (
                      <div className="mt-1">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Rate: {parseFloat(u.commission_percent)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    {u.role === 'associate' && netCounts[u.id]
                      ? <span className="text-xs font-semibold text-slate-700">{netCounts[u.id].direct_associates} / {netCounts[u.id].total_downline}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td>
                    <Badge status={u.kyc_status} />
                    <div className="mt-1"><Badge status={u.status} /></div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      {u.kyc_status === 'pending' && (
                        <>
                          <button onClick={() => handleKyc(u.id, 'approved')} title="Approve KYC" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl">
                            <ShieldCheck size={18} />
                          </button>
                        </>
                      )}
                      {u.status === 'pending_approval' && (
                        <>
                          <button onClick={() => handleApproveAssociate(u.id)} title="Approve User" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl">
                            <CheckSquare size={18} />
                          </button>
                        </>
                      )}
                      {u.role === 'associate' && u.status === 'active' && (
                        <button onClick={() => handleImpersonate(u.id, 'associate')} title="Login as Associate" className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200">
                          <LogIn size={18} />
                        </button>
                      )}
                      {(u.role === 'client' || u.role === 'accounts') && u.status === 'active' && (
                        <button onClick={() => handleImpersonate(u.id)} title={`Login as ${u.role}`} className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl border border-purple-200">
                          <LogIn size={18} />
                        </button>
                      )}
                      <button onClick={() => toggleStatus(u.id)} title={u.status === 'active' ? 'Block user' : 'Unblock user'} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl">
                        {u.status === 'active' ? <Ban size={18} /> : <CheckCircle size={18} />}
                      </button>
                      {(u.role === 'associate' || u.role === 'accounts') && (
                        <button onClick={() => openResetPwdModal(u)} title="Reset Password" className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl border border-purple-200">
                          <Key size={18} />
                        </button>
                      )}
                      <button onClick={() => openEditModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={editingUser ? (editingUser.role === 'associate' ? `Edit Associate: ${editingUser.name}` : `Edit ${editingUser.name}`) : getAddButtonTitle()}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setCreatedCreds(null); }}
      >
        {!editingUser && form.role === 'associate' ? (
          <AssociateRegistrationForm
            endpoint="/users/register-associate"
            sponsorLabel="Sponsor / Upline Associate ID"
            intro="Registers a new associate using the standard registration form. Leave Sponsor blank to place directly under the company."
            submitLabel="Register Associate"
            doneLabel="Done"
            onRegistered={() => fetchUsers()}
            onSuccess={() => { setModalOpen(false); setCreatedCreds(null); }}
          />
        ) : createdCreds ? (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto text-emerald-500" size={44} />
            <h3 className="text-xl font-bold text-slate-900">{createdCreds.role ? createdCreds.role.charAt(0).toUpperCase() + createdCreds.role.slice(1) : 'User'} Account Created!</h3>
            <p className="text-sm text-slate-500">
              {createdCreds.emailSent ? 'Login details have also been emailed to the user.' : 'Email not configured — share these details with the user manually.'}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3 text-base">
              {createdCreds.role === 'associate' ? (
                <>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Associate / Login ID</span><span className="font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{createdCreds.loginId}</span></div>
                  {createdCreds.referral_code && (
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">My Referral Code</span><span className="font-bold font-mono text-slate-800">{createdCreds.referral_code}</span></div>
                  )}
                </>
              ) : (
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Login ID</span><span className="font-bold text-blue-600">{createdCreds.loginId}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Password</span><span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{createdCreds.generatedPassword}</span></div>
              {createdCreds.role === 'associate' && (
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Starting Commission</span><span className="font-bold text-slate-900">5%</span></div>
              )}
            </div>
            <button className="btn-primary w-full text-base py-3" onClick={() => setModalOpen(false)}>Done</button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-200 font-medium">{error}</div>}
          
          {/* Header indicator banner */}
          {editingUser ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500">Associate ID:</span>
                <span className="font-mono font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded text-xs">{editingUser.login_id || `ID: ${editingUser.id}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500">Role:</span>
                <span className="bg-blue-600 text-white font-bold text-xs uppercase px-2.5 py-0.5 rounded-full tracking-wider">{roleLabels[form.role] || form.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500">Status:</span>
                <Badge status={form.status || editingUser.status} />
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Selected Role:</span>
              <span className="bg-blue-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full tracking-wider">
                {roleLabels[form.role] || form.role}
              </span>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              {form.role === 'associate' ? 'Associate Name *' : 'Full Name *'}
            </label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Enter full legal name" />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              Unique ID / Login ID {form.role === 'associate' ? '(e.g. DEV-XXXX or custom)' : '(optional)'}
            </label>
            <input
              value={form.login_id || ''}
              onChange={(e) => setForm({ ...form, login_id: e.target.value })}
              className="input-field font-mono font-bold text-blue-900 bg-slate-50"
              placeholder={form.role === 'associate' ? 'e.g. DEV-0012 (auto DEV-XXXX if blank)' : 'Auto-generated if left blank'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Phone Number *</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="10-digit mobile number" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="associate@example.com" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">
              Sponsor / Upline (Referral ID) {form.role === 'associate' ? '(Leave as "No Upline" for Top Level Root)' : ''}
            </label>
            <select value={form.referred_by || ''} onChange={(e) => setForm({ ...form, referred_by: e.target.value })} className="input-field">
              <option value="">No Upline / Direct Company (Root Leader - Super Admin DEV-0001)</option>
              {associates.filter(a => a.id !== editingUser?.id).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.login_id || a.referral_code}) — Rate: {a.commission_percent || 0}%</option>
              ))}
            </select>
          </div>

          {/* EDITABLE COMMISSION PERCENTAGE FIELD */}
          {form.role === 'associate' && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <span>Commission Percentage (%) *</span>
                </label>
                {editingUser && (
                  <span className="text-xs bg-amber-200/90 text-amber-950 px-2.5 py-0.5 rounded-full font-bold">
                    Currently Saved: {parseFloat(editingUser.commission_percent || 0).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required={form.role === 'associate'}
                  value={form.commission_percent ?? ''}
                  onChange={(e) => setForm({ ...form, commission_percent: e.target.value, referral_commission_percent: e.target.value })}
                  className="input-field text-base font-bold text-slate-900 pr-10 border-amber-300 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  placeholder="e.g. 8.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">%</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                💡 <strong>Future Sales & Calculations:</strong> This percentage will apply to all future eligible sales and calculations for this associate according to the MLM differential rules. Historical transactions and payouts remain preserved.
              </p>
            </div>
          )}

          {/* ACCOUNT STATUS (Editable by Admin) */}
          {editingUser && (
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Account Status</label>
              <select
                value={form.status || 'active'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-field font-medium"
              >
                <option value="active">Active (Permitted to Log In & Transact)</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="blocked">Blocked / Suspended</option>
              </select>
            </div>
          )}

          {/* Profile fields: PAN & Aadhar */}
          {form.role === 'associate' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">PAN Number <span className="text-red-500">*</span></label>
                <input required value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })} className="input-field font-mono" placeholder="ABCDE1234F" maxLength={10} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Aadhar Number <span className="text-red-500">*</span></label>
                <input required value={form.aadhar_number} onChange={(e) => setForm({ ...form, aadhar_number: e.target.value.replace(/\D/g, '') })} className="input-field font-mono" placeholder="12-digit UIDAI" maxLength={12} />
              </div>
            </div>
          )}

          {/* Only show role dropdown if on generic All Users tab and creating */}
          {activeTab === 'all' && !editingUser && (
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Role</label>
              <select
                value={form.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setForm({
                    ...form,
                    role: newRole,
                    referral_commission_percent: newRole === 'associate' ? (form.referral_commission_percent || 5) : form.referral_commission_percent
                  });
                }}
                className="input-field"
              >
                <option value="client">Client</option>
                <option value="associate">Associate</option>
                <option value="accounts">Accounts</option>
              </select>
            </div>
          )}

            {/* Password Management */}
            {editingUser ? (
              <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Password Management (Reset / Set New)
                  </label>
                  <span className="text-[11px] text-slate-400">Leave blank to keep existing password</span>
                </div>
                {editingUser.plain_password && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 text-xs text-amber-900">
                      <Key size={14} className="text-amber-600" />
                      <span className="font-semibold">Current Password:</span>
                      <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950">
                        {editingUser.plain_password}
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Active Password
                    </span>
                  </div>
                )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={form.password || ''}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="input-field text-sm pr-9"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={form.confirm_password || ''}
                      onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                      className="input-field text-sm pr-9"
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    openResetPwdModal(editingUser);
                  }}
                  className="text-xs text-purple-700 hover:text-purple-900 font-semibold underline flex items-center gap-1"
                >
                  <Key size={13} /> Or use Quick Random Password Generator
                </button>
              </div>
            </div>
          ) : (
            !editingUser && form.role !== 'associate' && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Account Password *</label>
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Minimum 6 characters" />
              </div>
            )
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <span>Saving Changes...</span>
            ) : (
              <span>{editingUser ? 'Save Changes' : 'Create User'}</span>
            )}
          </button>
        </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this user?"
        message={`"${deleteTarget?.name}" will be permanently removed.`}
      />

      {/* ✅ Credentials Modal — shows after new user is created */}
      <Modal title="✅ User Created Successfully" isOpen={!!createdCreds} onClose={() => { setCreatedCreds(null); setModalOpen(false); }}>
        {createdCreds && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Login ID</span>
                <span className="font-bold font-mono text-navy bg-white px-3 py-1 rounded-lg border">{createdCreds.loginId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Password</span>
                <span className="font-bold font-mono text-navy bg-white px-3 py-1 rounded-lg border">{createdCreds.generatedPassword}</span>
              </div>
              {createdCreds.referral_code && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Referral Code</span>
                  <span className="font-bold font-mono text-navy bg-white px-3 py-1 rounded-lg border">{createdCreds.referral_code}</span>
                </div>
              )}
              {createdCreds.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Mobile</span>
                  <span className="font-medium">{createdCreds.phone}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`flex items-center gap-2 rounded-lg p-3 border col-span-2 ${ createdCreds.emailSent ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700' }`}>
                <span className="text-2xl">{createdCreds.emailSent ? '✉️' : '📧'}</span>
                <div>
                  <p className="font-semibold">{createdCreds.emailSent ? 'Email Sent!' : 'Email (Mock Mode)'}</p>
                  <p className="text-xs">
                    {createdCreds.emailSent
                      ? `Credentials email delivered to ${createdCreds.email}`
                      : createdCreds.email
                        ? `Email will be sent when SMTP is configured in .env`
                        : `No email provided — please share credentials manually`}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">Please note down or share these credentials with the user manually if SMS/Email is in mock mode.</p>

            <button
              onClick={() => { setCreatedCreds(null); setModalOpen(false); }}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
      {/* Fixed Associate Edit / Setup Modal */}
      {fixedEditModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => { setFixedEditModal(null); setFixedGenPwd(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md z-[210] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">🏅 Fixed Associate Setup</h3>
                <p className="text-amber-100 text-xs mt-0.5">Login ID: <span className="font-mono font-bold">{fixedEditModal.loginId}</span> &nbsp;|&nbsp; Commission: <span className="font-bold">{[30,29,28,27,26,25][fixedEditModal.index-1]}%</span></p>
              </div>
              <button onClick={() => { setFixedEditModal(null); setFixedGenPwd(null); }} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Show generated password prominently */}
              {fixedGenPwd && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">✅ New Password Generated!</p>
                  <p className="text-2xl font-mono font-bold text-emerald-800">{fixedGenPwd}</p>
                  <p className="text-xs text-emerald-600 mt-1">Share this with the associate</p>
                </div>
              )}

              {/* Credentials Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Login ID</span>
                  <span className="font-mono font-bold text-blue-700">{fixedEditModal.loginId}</span>
                </div>
              </div>

              <form onSubmit={handleFixedSave} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Full Name *</label>
                  <input required value={fixedForm.name} onChange={e => setFixedForm({...fixedForm, name: e.target.value})} className="input-field" placeholder="e.g. Rajesh Kumar" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Email</label>
                  <input type="email" value={fixedForm.email} onChange={e => setFixedForm({...fixedForm, email: e.target.value})} className="input-field" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Phone *</label>
                  <input required value={fixedForm.phone} onChange={e => setFixedForm({...fixedForm, phone: e.target.value})} className="input-field" placeholder="10-digit mobile" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Address</label>
                  <input value={fixedForm.address} onChange={e => setFixedForm({...fixedForm, address: e.target.value})} className="input-field" placeholder="Full address" />
                </div>
                <button disabled={fixedSaving} type="submit" className="btn-primary w-full py-3">
                  {fixedSaving ? 'Saving...' : '💾 Save Details'}
                </button>
              </form>

              {/* Generate Password Button */}
              {fixedEditModal.userId && (
                <button
                  onClick={() => handleResetFixedPassword(fixedEditModal.userId)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors"
                >
                  🔑 Generate New Password
                </button>
              )}
              {!fixedEditModal.userId && (
                <p className="text-xs text-slate-400 text-center">Save details first to enable password generation</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetPwdTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div onClick={() => { setResetPwdTarget(null); setResetPwdResult(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm z-[310] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-700 to-purple-500 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Key size={18} /> Reset Password</h3>
                <p className="text-purple-100 text-xs mt-0.5">{resetPwdTarget.name} &nbsp;·&nbsp; <span className="font-mono font-bold">{resetPwdTarget.login_id}</span></p>
              </div>
              <button onClick={() => { setResetPwdTarget(null); setResetPwdResult(null); }} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {resetPwdResult ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">✅ Password Reset Successfully!</p>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <span className="text-xl font-mono font-bold text-emerald-800">
                        {resetPwdShowPwd ? resetPwdResult.password : '••••••••'}
                      </span>
                      <button onClick={() => setResetPwdShowPwd(v => !v)} className="text-emerald-600 hover:text-emerald-800">
                        {resetPwdShowPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(resetPwdResult.password); }}
                        className="text-emerald-600 hover:text-emerald-800"
                        title="Copy password"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-emerald-600 mt-2">User must change this on next login</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Login ID</span>
                      <span className="font-mono font-bold text-blue-700">{resetPwdResult.login_id}</span>
                    </div>
                  </div>
                  <button onClick={() => { setResetPwdTarget(null); setResetPwdResult(null); }} className="btn-primary w-full">Done</button>
                </div>
              ) : (
                <form onSubmit={handleAdminResetPassword} className="space-y-4">
                  <p className="text-sm text-slate-600">Enter a new temporary password or leave blank to auto-generate a secure one.</p>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">New Password (optional)</label>
                    <div className="relative">
                      <input
                        type={resetPwdShowPwd ? 'text' : 'password'}
                        value={resetPwdInput}
                        onChange={e => setResetPwdInput(e.target.value)}
                        className="input-field pr-10"
                        placeholder="Leave blank to auto-generate"
                        minLength={4}
                      />
                      <button type="button" onClick={() => setResetPwdShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {resetPwdShowPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    ⚠️ The temporary password will be shown once. The user must change it at next login.
                  </div>
                  <button disabled={resetPwdLoading} type="submit" className="btn-primary w-full">
                    {resetPwdLoading ? 'Resetting...' : '🔑 Reset Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
