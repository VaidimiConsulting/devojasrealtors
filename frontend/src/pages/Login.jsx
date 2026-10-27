import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, User, Phone, CreditCard, Fingerprint, Copy, CheckCircle2, MapPin, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AssociateRegistrationForm from '../components/AssociateRegistrationForm';

// Role → dashboard path mapping (shared across the app)
const ROLE_DASHBOARD_MAP = {
  admin: '/',
  associate: '/associate',
  client: '/client',
  accounts: '/accounts',
};

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── If user is already logged in, redirect to their correct panel ──
  useEffect(() => {
    if (user && user.role) {
      const role = user.role.toLowerCase();
      const dashboard = ROLE_DASHBOARD_MAP[role];
      if (dashboard) {
        navigate(dashboard, { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy-dark to-gray-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mb-3">
            <Building2 className="text-gold" size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">DEVOJAS REALTORS</h1>
          <p className="text-sm text-gray-400">{mode === 'login' ? 'Panel Login' : 'Associate Sign Up'}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${mode === 'login' ? 'bg-white shadow text-navy' : 'text-gray-500'}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${mode === 'signup' ? 'bg-white shadow text-navy' : 'text-gray-500'}`}
            onClick={() => setMode('signup')}
          >
            Sign Up as Associate
          </button>
        </div>

        {mode === 'login' ? (
          <LoginForm navigate={navigate} switchToSignup={() => setMode('signup')} />
        ) : (
          <AssociateSignupForm
            onDone={(loginId) => {
              setMode('login');
            }}
          />
        )}
      </div>
    </div>
  );
};

// -------------------- LOGIN --------------------
const LoginForm = ({ navigate, switchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Clear any stale session before logging in
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const result = await login(email.trim(), password);
      const role = result?.user?.role?.toLowerCase();

      const dashboard = ROLE_DASHBOARD_MAP[role];

      if (!dashboard) {
        setError(`Invalid user role received: ${result?.user?.role}`);
        return;
      }

      navigate(dashboard, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Email or Phone</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-10"
              placeholder="Email, phone or Login ID"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-10 pr-11 h-11 text-sm sm:text-base border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-gray-500">
        New Associate?{' '}
        <button onClick={switchToSignup} className="text-navy font-semibold hover:underline">
          Sign up here
        </button>
      </p>
    </>
  );
};

// -------------------- ASSOCIATE SIGNUP (shared registration form) --------------------
const AssociateSignupForm = ({ onDone }) => (
  <AssociateRegistrationForm
    endpoint="/auth/register-associate"
    sponsorRequired
    submitLabel="Create Associate Account"
    doneLabel="Go to Login"
    onSuccess={onDone}
  />
);

export default Login;
