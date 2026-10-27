import React, { useState } from 'react';
import { User, Lock, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';

const Profile = () => {
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [kycUrl, setKycUrl] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put('/associate/profile', profileForm);
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.put('/associate/change-password', passwordForm);
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed' });
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/associate/kyc', { document_url: kycUrl });
      setMsg({ type: 'success', text: 'KYC submitted for review!' });
      setKycUrl('');
    } catch (err) {
      setMsg({ type: 'error', text: 'KYC submission failed' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Profile & KYC</h1>
        <p className="text-gray-500 text-sm">Manage your account details and verification</p>
      </div>

      {msg.text && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <User size={20} className="text-navy" />
          <h3 className="font-semibold text-gray-800">Profile Information</h3>
        </div>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Associate ID (My ID)</label>
              <input value={user?.login_id || user?.associateId || '—'} disabled className="input-field bg-gray-50 font-mono font-bold text-navy" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Referred By ID (Upline ID)</label>
              <input value={user?.referredById || user?.sponsor?.login_id || (user?.referred_by ? 'DEV-0001' : 'None (Company Root)')} disabled className="input-field bg-gray-50 font-mono font-bold text-slate-700" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Referred By (Sponsor Name)</label>
            <input value={user?.referredByName || user?.sponsor?.name || (user?.referred_by ? 'Super Admin' : 'Direct Company Root')} disabled className="input-field bg-gray-50 text-slate-700" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
            <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email (cannot be changed)</label>
            <input value={user?.email} disabled className="input-field bg-gray-50 text-gray-400" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
            <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">My Referral Code</label>
            <input value={user?.referral_code || user?.login_id || ''} disabled className="input-field bg-gray-50 text-gray-400" />
          </div>
          <button type="submit" className="btn-primary">Update Profile</button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={20} className="text-navy" />
          <h3 className="font-semibold text-gray-800">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Current Password</label>
            <input required type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">New Password</label>
            <input required type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary">Change Password</button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={20} className="text-navy" />
          <h3 className="font-semibold text-gray-800">KYC Verification</h3>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Current Status:</span>
          <Badge status={user?.kyc_status || 'not_submitted'} />
        </div>
        <form onSubmit={handleKycSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Document Link (Aadhar/PAN)</label>
            <input required value={kycUrl} onChange={(e) => setKycUrl(e.target.value)} className="input-field" placeholder="Paste document image URL" />
          </div>
          <button type="submit" className="btn-gold">Submit for Verification</button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
