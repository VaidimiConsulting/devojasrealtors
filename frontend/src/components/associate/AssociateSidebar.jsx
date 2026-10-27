import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Percent, Wallet, Search, User, Bell,
  Headphones, LogOut, Building2, Trophy, Network, ChevronDown,
  ChevronRight, FileText, Receipt, ShieldCheck, UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/associate', end: true },
  { title: 'Plot Purchasing', icon: Building2, path: '/associate/plot-purchasing' },
  { title: 'My Booking Requests', icon: FileText, path: '/associate/booking-forms' },
  { title: 'My Sales & Customers', icon: FileText, path: '/associate/sales' },
  { title: 'Plot Inventory', icon: Search, path: '/associate/plots' },
  { title: 'Add Associate', icon: UserPlus, path: '/associate/add-associate' },
  { title: 'MLM Tree Network', icon: Users, path: '/associate/team' },
  { title: 'Commission Details', icon: Percent, path: '/associate/commissions' },
  { title: 'Downline Commissions', icon: Network, path: '/associate/downline-commissions' },
  { title: 'Payouts & Receipts', icon: Receipt, path: '/associate/payout-statements' },
  { title: 'Wallet & Withdraw', icon: Wallet, path: '/associate/wallet' },
  { title: 'My Rewards', icon: Trophy, path: '/associate/my-reward' },
  { title: 'My Profile & KYC', icon: User, path: '/associate/profile' },
  { title: 'Notifications', icon: Bell, path: '/associate/notifications' },
  { title: 'Support Helpdesk', icon: Headphones, path: '/associate/support' },
];

const AssociateSidebar = ({ collapsed }) => {
  const { logout, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [showStatsDropdown, setShowStatsDropdown] = useState(false);

  useEffect(() => {
    api.get('/associate/dashboard-stats')
      .then(r => setStats(r.data?.data || null))
      .catch(() => {});
  }, []);

  const fmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN', { notation: 'compact', maximumFractionDigits: 1 })}` : '₹0';

  const associateId = user?.login_id || stats?.profile?.login_id || 'DEV-0002';
  const associateName = user?.name || stats?.profile?.name || 'Associate';

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col z-40 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #070f2b 0%, #0a1636 50%, #050d24 100%)',
        borderRight: '1px solid rgba(212,175,55,0.18)'
      }}
    >
      {/* Top Gold Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-90" />

      {/* Brand Logo Header */}
      <div
        className={`flex items-center border-b shrink-0 ${
          collapsed ? 'px-2 py-3.5 justify-center' : 'px-4 py-3 justify-center'
        }`}
        style={{ borderColor: 'rgba(212,175,55,0.18)' }}
      >
        <div className="relative shrink-0 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Devojas Realtors"
            className={`object-contain transition-all duration-200 ${
              collapsed ? 'max-w-[44px] max-h-[44px]' : 'max-w-[110px] max-h-[52px]'
            }`}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Compact Collapsible Associate Profile Header */}
      {!collapsed && user && (
        <div className="mx-2.5 mt-2.5">
          <button
            onClick={() => setShowStatsDropdown(!showStatsDropdown)}
            className="w-full px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.09] flex items-center gap-2.5 transition-all text-left group"
            title="Toggle Quick Business Stats"
          >
            {/* Small Profile Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs ring-1 ring-white/20">
              {associateName.charAt(0).toUpperCase()}
            </div>

            {/* Associate Name & ID */}
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-[12.5px] font-bold text-white truncate leading-tight group-hover:text-sky-300 transition-colors">
                {associateName}
              </p>
              <p className="text-[10px] text-sky-400 font-mono font-bold tracking-wider leading-tight">
                {associateId}
              </p>
            </div>

            {/* Dropdown Arrow */}
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                showStatsDropdown ? 'rotate-180 text-sky-400' : ''
              }`}
            />
          </button>

          {/* Smooth Collapsible Stats Panel */}
          {showStatsDropdown && stats && (
            <div className="mt-1.5 rounded-xl border border-[#1e2f5a] bg-[#0d1d47]/90 overflow-hidden shadow-lg animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-2 divide-x divide-[#1e2f5a]">
                <div className="p-2 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Team</p>
                  <p className="text-sm font-extrabold text-white">
                    {stats.totalTeamCount || stats.myTeamCount || 0}
                  </p>
                </div>
                <div className="p-2 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Self Biz</p>
                  <p className="text-xs font-bold text-amber-300">
                    {fmt(stats.selfBusiness || stats.totalSalesValue)}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#1e2f5a] grid grid-cols-2 divide-x divide-[#1e2f5a]">
                <div className="p-2 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Team Biz</p>
                  <p className="text-xs font-bold text-emerald-400">
                    {fmt(stats.teamBusiness)}
                  </p>
                </div>
                <div className="p-2 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total Biz</p>
                  <p className="text-xs font-bold text-sky-400">
                    {fmt(stats.totalBusiness)}
                  </p>
                </div>
              </div>
              {stats.sponsoredBy && (
                <div className="border-t border-[#1e2f5a] px-2.5 py-1.5 flex items-center gap-1.5 bg-[#081335]/70">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <ChevronRight size={10} className="text-amber-400" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[8.5px] text-slate-400 leading-tight">Sponsored by</p>
                    <p className="text-[10px] font-semibold text-slate-200 truncate leading-tight">
                      {stats.sponsoredBy.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Menu with 13-14px font & compact padding */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5 custom-sidebar-scroll">
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 leading-snug select-none ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 font-semibold shadow-xs shadow-blue-500/25 border-l-2 border-amber-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? item.title : undefined}
          >
            <item.icon
              size={16}
              className={`shrink-0 transition-colors ${
                collapsed ? 'mx-auto' : ''
              }`}
            />
            {!collapsed && (
              <span className="truncate flex-1 text-left tracking-normal">
                {item.title}
              </span>
            )}
            {!collapsed && item.title === 'Notifications' && stats?.unreadNotifications > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                {stats.unreadNotifications}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className="p-2 border-t border-white/[0.08] shrink-0 bg-black/10">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title="Logout"
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AssociateSidebar;
