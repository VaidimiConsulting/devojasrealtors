import { useState } from 'react';
import { X, User, Lock, Phone, Mail, CreditCard, MapPin, Hash, Eye, EyeOff, IdCard, ArrowLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../services/authService';

/**
 * AuthModal — Login + Associate Signup
 * Modes:
 *   'login'  → Default: email/phone/login_id + password
 *   'signup' → Full associate registration form
 *   'success' → Post-signup pending approval screen
 */
export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Login form state
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });

  // Signup form state
  const [signupRole, setSignupRole] = useState('associate'); // 'associate' | 'client'
  const [signupForm, setSignupForm] = useState({
    name: '', phone: '', email: '',
    pan_number: '', aadhar_number: '',
    address: '', sponsor_code: '',
    password: '', confirm_password: ''
  });

  if (!isOpen) return null;

  const resetAndClose = () => {
    setMode('login');
    setError('');
    setLoginForm({ identifier: '', password: '' });
    setSignupForm({ name: '', phone: '', email: '', pan_number: '', aadhar_number: '', address: '', sponsor_code: '', password: '', confirm_password: '' });
    setSuccessData(null);
    onClose();
  };

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.login(loginForm.identifier, loginForm.password);
      if (result.success) {
        const role = result.user?.role;
        if (role === 'client') {
          onAuthSuccess && onAuthSuccess(result.user);
          resetAndClose();
        } else {
          // Associate, Admin, Accounts → redirect to their respective panels with SSO token
          const adminPanelUrl = import.meta.env.VITE_ADMIN_PANEL_URL || 'http://localhost:5173';
          // Determine destination path based on role
          const rolePathMap = { admin: '/', associate: '/associate', accounts: '/accounts' };
          const destPath = rolePathMap[role] || '/';
          window.location.href = `${adminPanelUrl}${destPath}?ssoToken=${result.token}`;
        }
      } else {
        setError(result.message || 'Login failed.');
      }
    } catch (err) {
      // Properly extract backend error message
      const msg = err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── SIGNUP ────────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (signupForm.password !== signupForm.confirm_password) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/^\d{10}$/.test(signupForm.phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(signupForm.pan_number)) {
      setError('Please enter a valid PAN number (e.g. ABCDE1234F).');
      return;
    }
    if (!/^\d{12}$/.test(signupForm.aadhar_number)) {
      setError('Please enter a valid 12-digit Aadhar number.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.signupAssociate(signupForm);
      if (result.success) {
        setSuccessData(result.data);
        setMode('success');
      } else {
        setError(result.message);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-9 pr-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-all";
  const labelClass = "block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={resetAndClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 max-w-md w-full z-[110] max-h-[95vh] flex flex-col">
        {/* Gold top bar */}
        <div className="h-[4px] bg-gradient-to-r from-brand-gold via-yellow-400 to-brand-goldLight shrink-0" />

        {/* Close Button */}
        <button onClick={resetAndClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-all z-10">
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8">

          {/* ─── SUCCESS MODE ─────────────────────────────────────────────── */}
          {mode === 'success' && successData && (
            <div className="py-6 flex flex-col items-center text-center space-y-5">
              <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-brand-navy font-serif">Registration Successful!</h3>
                <p className="text-sm text-gray-500 mt-2">Your application is under review by the admin team.</p>
              </div>

              {/* Credentials card */}
              <div className="w-full bg-brand-navy/5 border border-brand-navy/15 rounded-2xl p-4 text-left space-y-3">
                <p className="text-xs font-bold text-brand-navy uppercase tracking-wider">Your Account Details</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Associate ID (Login ID)</span>
                  <span className="text-sm font-bold text-brand-navy bg-brand-gold/20 px-3 py-1 rounded-full">{successData.login_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Name</span>
                  <span className="text-sm font-semibold">{successData.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Referral Code</span>
                  <span className="text-sm font-mono font-semibold">{successData.referral_code}</span>
                </div>
                {successData.sponsor && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Sponsored By</span>
                    <span className="text-sm font-semibold">{successData.sponsor.name} ({successData.sponsor.login_id})</span>
                  </div>
                )}
              </div>

              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-left">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800">
                  <strong>Account Ready:</strong> Your Associate ID is <strong>{successData.login_id}</strong>. You can now log in using your Associate ID, mobile number, or email with your password.
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => {
                    setLoginForm({ identifier: successData.login_id || signupForm.phone, password: signupForm.password });
                    setMode('login');
                    setError('');
                  }}
                  className="w-full bg-brand-navy text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-navyLight transition-all flex items-center justify-center gap-2"
                >
                  Proceed to Login
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={resetAndClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ─── LOGIN MODE ───────────────────────────────────────────────── */}
          {mode === 'login' && (
            <>
              <h3 className="text-2xl font-bold text-brand-navy font-serif mb-1">Welcome Back</h3>
              <p className="text-xs text-gray-500 mb-6">Login with your email, phone, or associate ID.</p>

              {error && <div className="bg-rose-50 text-rose-600 text-xs px-3 py-2 rounded-lg mb-4 flex items-start gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{error}</div>}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>Email / Phone / Associate ID</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text" required
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                      placeholder="Enter email, phone or DEV-XXXX"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="Enter your password"
                      className={`${inputClass} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-brand-navy hover:bg-brand-navyLight text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {loading ? 'Logging in...' : 'Login'}
                  {!loading && <ChevronRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-xs text-gray-500">
                  New Associate?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); }} className="text-brand-gold font-bold hover:underline">
                    Register here
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ─── SIGNUP MODE ──────────────────────────────────────────────── */}
          {mode === 'signup' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setMode('login'); setError(''); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all text-gray-500">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="text-xl font-bold text-brand-navy font-serif">Associate Sign Up</h3>
                  <p className="text-xs text-gray-500">Create your associate account and start earning.</p>
                </div>
              </div>

              {error && <div className="bg-rose-50 text-rose-600 text-xs px-3 py-2 rounded-lg mb-4 flex items-start gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{error}</div>}

              <form onSubmit={handleSignup} className="space-y-4">

                {/* Full Name */}
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" required value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                      placeholder="Enter your full name" className={inputClass} />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className={labelClass}>Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="tel" required value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      placeholder="10-digit mobile number" maxLength={10} className={inputClass} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelClass}>Email (Optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="email" value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      placeholder="your@email.com (leave blank if none)" className={inputClass} />
                  </div>
                </div>

                {/* PAN + Aadhar — Associate only */}
                {signupRole === 'associate' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>PAN Number *</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" required value={signupForm.pan_number}
                          onChange={(e) => setSignupForm({ ...signupForm, pan_number: e.target.value.toUpperCase() })}
                          placeholder="ABCDE1234F" maxLength={10} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Aadhar Number *</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" required value={signupForm.aadhar_number}
                          onChange={(e) => setSignupForm({ ...signupForm, aadhar_number: e.target.value.replace(/\D/g, '') })}
                          placeholder="12-digit number" maxLength={12} className={inputClass} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Commission Percentage - Read Only */}
                {signupRole === 'associate' && (
                  <div>
                    <label className={labelClass}>Commission Percentage (Auto-filled)</label>
                    <div className="relative">
                      <input type="text" readOnly value="5%"
                        className={`${inputClass} bg-gray-100 cursor-not-allowed`} />
                    </div>
                  </div>
                )}

                {/* Address */}
                <div>
                  <label className={labelClass}>Full Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea required value={signupForm.address}
                      onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                      placeholder="House no, colony, city, state, pin code"
                      rows={2}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Sponsor Code — Associate only */}
                {signupRole === 'associate' && (
                  <div>
                    <label className={labelClass}>Sponsored By (Referral Code / Associate ID) *</label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" required value={signupForm.sponsor_code}
                        onChange={(e) => setSignupForm({ ...signupForm, sponsor_code: e.target.value })}
                        placeholder="e.g. DEV-0001 or AMITSH123" className={inputClass} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Ask your sponsor for their Associate ID or Referral Code</p>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className={labelClass}>Create Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} required value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={labelClass}>Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} required value={signupForm.confirm_password}
                      onChange={(e) => setSignupForm({ ...signupForm, confirm_password: e.target.value })}
                      placeholder="Re-enter password"
                      className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700">After registration, your account will be reviewed by admin. You will receive your <strong>Associate ID</strong> immediately but login will be enabled only after approval.</p>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-gold to-yellow-500 hover:from-yellow-500 hover:to-brand-gold text-brand-navy font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {loading ? 'Submitting...' : 'Submit Registration'}
                  {!loading && <ChevronRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="text-xs text-gray-500 text-center mt-4">
                Already registered?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-brand-gold font-bold hover:underline">Login here</button>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
