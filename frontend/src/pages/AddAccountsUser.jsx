import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Phone, MapPin, CreditCard, Fingerprint, Lock, Eye, EyeOff, CheckCircle2, Copy, ArrowLeft, AlertCircle, Briefcase } from 'lucide-react';
import api from '../api/axios';

/**
 * AddAccountsUser — Admin Panel page to register a new Accounts staff user.
 * Generates a unique ACCOUNTS-XXXX login ID on the backend.
 * Password is hashed; plaintext is never stored.
 */
const AddAccountsUser = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    pan_number: '',
    aadhar_number: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { login_id, name, message }
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'pan_number') value = value.toUpperCase();
    if (name === 'aadhar_number') value = value.replace(/\D/g, '').slice(0, 12);
    if (name === 'phone') value = value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.name.trim()) { setError('Full Name is required.'); return; }
    if (!form.email.trim()) { setError('Email Address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!form.phone || form.phone.length < 10) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!form.address.trim()) { setError('Full Address is required.'); return; }
    if (!form.pan_number.trim()) { setError('PAN Number is required.'); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number.trim())) { setError('PAN Number must be in format ABCDE1234F.'); return; }
    if (!form.aadhar_number || form.aadhar_number.length !== 12) { setError('Aadhaar Number must be exactly 12 digits.'); return; }
    if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm_password) { setError('Password and Confirm Password do not match.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/users/register-accounts-user', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        address: form.address.trim(),
        pan_number: form.pan_number.trim(),
        aadhar_number: form.aadhar_number,
        password: form.password,
        confirm_password: form.confirm_password,
      });

      if (res.data.success) {
        setSuccess({
          login_id: res.data.login_id,
          name: res.data.data?.name,
          message: res.data.message,
          emailSent: res.data.emailSent,
          smsDelivery: res.data.smsDelivery
        });
      } else {
        setError(res.data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── Success Screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-600" size={40} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Account Created! 🎉</h2>
          <p className="text-slate-500 text-sm mb-6">{success.message}</p>

          {/* Credentials card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={18} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-900 uppercase tracking-wider">Login Credentials</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Accounts ID (Login)</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-xl text-blue-800 bg-white px-3 py-1.5 rounded-xl border border-blue-300 tracking-wider flex-1">
                    {success.login_id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(success.login_id)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    title="Copy Accounts ID"
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <strong>⚠️ Important:</strong> Share the Login ID and set password with the Accounts staff member. They can log in via the public website or admin panel using <strong>{success.login_id}</strong> and the password you set.
              </div>
            </div>
          </div>

          {/* Delivery status */}
          <div className={`flex items-center gap-3 rounded-xl p-3 mb-6 text-sm ${success.emailSent ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
            <span className="text-xl">{success.emailSent ? '✉️' : '📧'}</span>
            <div className="text-left">
              <p className="font-semibold">{success.emailSent ? 'Credentials emailed!' : 'Email in Mock Mode'}</p>
              <p className="text-xs opacity-75">{success.emailSent ? 'Login credentials sent to registered email.' : 'Configure SMTP in .env to enable email delivery.'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccess(null);
                setForm({ name: '', email: '', phone: '', address: '', pan_number: '', aadhar_number: '', password: '', confirm_password: '' });
                setError('');
              }}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              + Add Another
            </button>
            <button
              onClick={() => navigate('/users?role=accounts')}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md"
            >
              View All Accounts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Registration Form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Add Accounts User</h1>
            <p className="text-sm text-slate-500">Create a new Accounts staff member with secure login credentials</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Top gradient banner */}
          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />

          <div className="p-6 sm:p-8">
            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Briefcase size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-900">Accounts Role</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  This user will receive a unique <strong>ACCOUNTS-XXXX</strong> login ID and access to the Accounts Panel — including commission ledger, payout statements, and finance workflows. No commission percentage is assigned to Accounts staff.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Information */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={13} /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="accounts@example.com"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-phone"
                        name="phone"
                        type="text"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        className="input-field pl-10 font-mono"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Full Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                      <textarea
                        id="acc-address"
                        name="address"
                        required
                        rows={2}
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Full residential address"
                        className="input-field pl-10 resize-none"
                      />
                    </div>
                  </div>

                  {/* PAN */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-pan"
                        name="pan_number"
                        type="text"
                        required
                        value={form.pan_number}
                        onChange={handleChange}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="input-field pl-10 font-mono tracking-widest uppercase"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Format: 5 letters + 4 digits + 1 letter</p>
                  </div>

                  {/* Aadhaar */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-aadhar"
                        name="aadhar_number"
                        type="text"
                        required
                        value={form.aadhar_number}
                        onChange={handleChange}
                        placeholder="12-digit Aadhaar number"
                        maxLength={12}
                        className="input-field pl-10 font-mono tracking-widest"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">12 digits only, no spaces or dashes</p>
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Lock size={13} /> Login Credentials
                </h3>

                {/* Auto-generated ID info */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-black text-xs">ID</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-900">Accounts ID — Auto Generated</p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      A unique <strong>ACCOUNTS-0001</strong> style ID will be automatically assigned by the server. It will be shown after successful registration.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 6 characters"
                        className="input-field pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="acc-confirm-password"
                        name="confirm_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={form.confirm_password}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="input-field pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password strength hint */}
                {form.password && form.confirm_password && (
                  <div className={`mt-2 text-xs flex items-center gap-1.5 ${form.password === form.confirm_password ? 'text-emerald-600' : 'text-red-500'}`}>
                    {form.password === form.confirm_password
                      ? <><CheckCircle2 size={12} /> Passwords match</>
                      : <><AlertCircle size={12} /> Passwords do not match</>
                    }
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Create Accounts User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-400 mt-4">
          🔒 Password is securely hashed. Login credentials should be shared directly with the staff member.
        </p>
      </div>
    </div>
  );
};

export default AddAccountsUser;
