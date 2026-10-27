import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu, Bell, ChevronDown, User, ShieldCheck, Network, Building2,
  Wallet, LogOut, Users, Award, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const fmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN', { notation: 'compact', maximumFractionDigits: 1 })}` : '₹0';

const AssociateNavbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/associate/notifications');
      setNotifications(res.data?.data || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      // quiet fail
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/associate/dashboard-stats');
      setStats(res.data?.data || null);
    } catch (err) {
      // quiet fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchStats();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowProfile(false);
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNav = (path) => {
    setShowProfile(false);
    navigate(path);
  };

  const profileUser = stats?.profile || user || {};
  const associateId = profileUser?.login_id || user?.login_id || 'DEV-0002';
  const associateName = profileUser?.name || user?.name || 'Associate';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-40 shadow-xs">
      {/* Left: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-navy bg-navy/5 border border-navy/15 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
            Associate Portal
          </span>
          <span className="text-sm font-semibold text-slate-700 hidden md:inline-block">
            Devojas Realtors
          </span>
        </div>
      </div>

      {/* Right: Notifications & Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
            className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-96 overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Notifications</span>
                <Link
                  to="/associate/notifications"
                  onClick={() => setShowNotifs(false)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  View All
                </Link>
              </div>
              <div className="overflow-y-auto max-h-72 divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 p-6 text-center">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 hover:bg-slate-50 transition-colors text-xs ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Container */}
        <div className="relative" ref={profileRef}>
          {/* Collapsed State: Avatar + Name + ID + Arrow */}
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
            className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border transition-all duration-150 select-none ${
              showProfile
                ? 'bg-slate-100 border-slate-300 shadow-inner'
                : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
            }`}
            aria-expanded={showProfile}
            title="Associate Profile & Business Stats"
          >
            {/* Small Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 via-navy to-sky-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0 overflow-hidden ring-1 ring-blue-500/30">
              {profileUser?.profile_image ? (
                <img src={profileUser.profile_image} alt={associateName} className="w-full h-full object-cover" />
              ) : (
                associateName.charAt(0).toUpperCase()
              )}
            </div>

            {/* Associate Name & ID */}
            <div className="text-left hidden sm:flex flex-col min-w-0 max-w-[140px]">
              <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                {associateName}
              </span>
              <span className="text-[10px] font-bold text-blue-700 tracking-wider font-mono">
                {associateId}
              </span>
            </div>

            {/* Animated Dropdown Arrow */}
            <ChevronDown
              size={15}
              className={`text-slate-500 transition-transform duration-200 shrink-0 ${
                showProfile ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Expanded Profile Dropdown */}
          {showProfile && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-92 bg-white rounded-2xl shadow-2xl border border-slate-200/95 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
              style={{
                boxShadow: '0 20px 40px -12px rgba(11,20,55,0.25), 0 0 1px 1px rgba(0,0,0,0.05)'
              }}
            >
              {/* Dropdown Header: Navy Branding with Gold Accent */}
              <div
                className="p-4 text-white relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0b1437 0%, #0d1b4b 60%, #172554 100%)'
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-white flex items-center justify-center text-base font-black shadow-md shrink-0 border-2 border-white/20">
                    {profileUser?.profile_image ? (
                      <img src={profileUser.profile_image} alt={associateName} className="w-full h-full object-cover" />
                    ) : (
                      associateName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-extrabold text-white truncate leading-tight">
                        {associateName}
                      </h4>
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-sky-300 font-semibold mt-0.5">
                      ID: {associateId}
                    </p>
                    <p className="text-[10px] text-slate-300 truncate">
                      {user?.email || 'Registered Associate'}
                    </p>
                  </div>
                </div>

                {/* Sponsor Information */}
                {stats?.sponsoredBy && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Sponsored by:</span>
                    <span className="font-semibold text-amber-300 truncate max-w-[160px]">
                      {stats.sponsoredBy.name} ({stats.sponsoredBy.login_id || 'DEV-0001'})
                    </span>
                  </div>
                )}
              </div>

              {/* Real DB Business Statistics Grid (4 Key Metrics) */}
              <div className="p-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    My Real-time Business Stats
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Live Records
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Team Members */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-medium">Team Members</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      {stats?.totalTeamCount ?? stats?.myTeamCount ?? 0}
                    </p>
                    <span className="text-[9px] text-blue-600 font-medium block">
                      {stats?.myTeamCount ?? 0} Direct Sponsors
                    </span>
                  </div>

                  {/* Self Business */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-medium">Self Business</p>
                    <p className="text-sm font-extrabold text-amber-600 mt-0.5">
                      {fmt(stats?.selfBusiness || stats?.totalSalesValue)}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Direct deals
                    </span>
                  </div>

                  {/* Team Business */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-medium">Team Business</p>
                    <p className="text-sm font-extrabold text-emerald-600 mt-0.5">
                      {fmt(stats?.teamBusiness)}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Downline volume
                    </span>
                  </div>

                  {/* Total Business */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-medium">Total Business</p>
                    <p className="text-sm font-extrabold text-blue-600 mt-0.5">
                      {fmt(stats?.totalBusiness)}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      Overall volume
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Quick Links */}
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => handleNav('/associate/profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition-colors text-left"
                >
                  <User size={15} className="text-blue-600 shrink-0" />
                  <span>My Profile & KYC Verification</span>
                </button>

                <button
                  onClick={() => handleNav('/associate/team')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition-colors text-left"
                >
                  <Network size={15} className="text-indigo-600 shrink-0" />
                  <span>MLM Tree Network & Downline</span>
                </button>

                <button
                  onClick={() => handleNav('/associate/plot-purchasing')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition-colors text-left"
                >
                  <Building2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Plot Purchasing & Booking</span>
                </button>

                <button
                  onClick={() => handleNav('/associate/wallet')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition-colors text-left"
                >
                  <Wallet size={15} className="text-amber-600 shrink-0" />
                  <span>Wallet & Commission Payouts</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => { setShowProfile(false); logout(); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors"
                >
                  <LogOut size={14} />
                  <span>Logout from Associate Panel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AssociateNavbar;
