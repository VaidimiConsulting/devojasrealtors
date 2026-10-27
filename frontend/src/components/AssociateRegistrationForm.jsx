import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, CreditCard, Fingerprint, Lock, Eye, EyeOff, Users, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';

/**
 * ONE shared Associate Registration form.
 * Used by: public signup (Login page), Admin "Add Associate", Associate "Add Associate".
 *
 *  endpoint      – API to POST to (public: /auth/register-associate, admin: /users/register-associate, associate: /associate/team)
 *  sponsorValue  – value shown in the Sponsor field
 *  sponsorLocked – associate panel: read-only (the backend ALSO forces the sponsor from the login session)
 *  sponsorRequired – public signup requires a sponsor; Admin may leave it blank
 *  onSuccess(data) – called when the user clicks the final button on the success screen
 */
const AssociateRegistrationForm = ({
  endpoint = '/auth/register-associate',
  sponsorValue = '',
  sponsorLocked = false,
  sponsorRequired = false,
  sponsorLabel = 'Sponsor Code',
  intro = 'Create your associate account. Commission is fixed at 5% (Admin can change it later).',
  submitLabel = 'Create Associate Account',
  doneLabel = 'Go to Login',
  onSuccess,
  onRegistered,
}) => {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', pan_number: '', aadhar_number: '',
    address: '', password: '', confirm_password: '', sponsor_code: sponsorValue || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'pan_number') value = value.toUpperCase();
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // duplicate-submit guard
    setError('');
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '').slice(-10)) ) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm_password) { setError('Password and Confirm Password do not match'); return; }
    if (sponsorRequired && !String(form.sponsor_code).trim()) { setError('Sponsor Code is required'); return; }

    setLoading(true);
    try {
      const payload = { ...form };
      if (sponsorLocked) delete payload.sponsor_code; // server decides the sponsor from the session
      const { data } = await api.post(endpoint, payload);
      setResult(data);
      if (onRegistered) onRegistered(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const loginId = result.data?.login_id || result.user?.login_id;
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="mx-auto text-green-500" size={44} />
        <h2 className="text-lg font-bold text-gray-800">Associate Registered Successfully!</h2>
        <p className="text-sm text-gray-500">
          {result.message || 'Please save the login details below.'}
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
          <Row label="Associate / Login ID" value={loginId} />
          <Row label="Name" value={result.data?.name} />
          <Row label="Referral Code" value={result.data?.referral_code || result.user?.referral_code} />
          {result.data?.sponsor && (
            <Row label="Sponsor" value={`${result.data.sponsor.name} (${result.data.sponsor.login_id})`} />
          )}
          <Row label="Status" value={result.data?.status || result.user?.status} />
          <Row label="Commission" value={`${parseFloat(result.data?.commission_percent ?? 5)}%`} />
        </div>
        <button onClick={() => onSuccess && onSuccess(loginId)} className="btn-primary w-full py-2.5">
          {doneLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-gray-500 mb-4 -mt-2">{intro}</p>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <IconInput icon={User} name="name" placeholder="Full Name *" value={form.name} onChange={handleChange} required />
        <IconInput icon={Phone} name="phone" placeholder="Phone Number *" value={form.phone} onChange={handleChange} required maxLength={10} />
        <IconInput icon={Mail} name="email" type="email" placeholder="Email (optional but recommended)" value={form.email} onChange={handleChange} />
        <IconInput icon={MapPin} name="address" placeholder="Address (optional)" value={form.address} onChange={handleChange} />

        <div className="pt-1 border-t border-gray-100" />
        <IconInput icon={CreditCard} name="pan_number" placeholder="PAN Number *" value={form.pan_number} onChange={handleChange} required maxLength={10} />
        <IconInput icon={Fingerprint} name="aadhar_number" placeholder="Aadhar Number *" value={form.aadhar_number} onChange={handleChange} required maxLength={12} />

        <div className="pt-1 border-t border-gray-100" />
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input-field pl-10 pr-10"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password (min 6 characters) *"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <IconInput icon={Lock} name="confirm_password" type="password" placeholder="Confirm Password *" value={form.confirm_password} onChange={handleChange} required />

        <div className="pt-1 border-t border-gray-100" />
        <IconInput
          icon={Users}
          name="sponsor_code"
          placeholder={`${sponsorLabel}${sponsorRequired ? ' *' : ' (optional)'}`}
          value={form.sponsor_code}
          onChange={handleChange}
          readOnly={sponsorLocked}
          required={sponsorRequired}
          title={sponsorLocked ? 'New associates are always registered directly under you' : undefined}
          style={sponsorLocked ? { opacity: 0.8, cursor: 'not-allowed' } : undefined}
        />

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60 mt-2">
          {loading ? 'Registering...' : submitLabel}
        </button>
      </form>
    </>
  );
};

const IconInput = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
    <input className="input-field pl-10" {...props} />
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="font-semibold text-gray-800">{value || '-'}</span>
  </div>
);

export default AssociateRegistrationForm;
