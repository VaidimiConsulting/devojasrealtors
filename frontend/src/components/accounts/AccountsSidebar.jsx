import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Percent, FileText, Building2, CreditCard, 
  Receipt, TrendingUp, BarChart3, ShieldCheck, Send,
  Wallet, Headphones, Settings, LogOut, FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const menuSections = [
  {
    category: 'Core Management',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, path: '/accounts' },
      { title: 'Associate Accounts', icon: Users, path: '/accounts/associates' },
      { title: 'Commission Rules', icon: Percent, path: '/accounts/commissions' },
      { title: 'Commission Slips', icon: FileText, path: '/accounts/commission-slips' }
    ]
  },
  {
    category: 'Sales & Realization',
    items: [
      { title: 'Sales & Bookings', icon: Building2, path: '/accounts/sales' },
      { title: 'Payments & Receipts', icon: CreditCard, path: '/accounts/payments' },
      { title: 'Transactions Ledger', icon: Receipt, path: '/accounts/transactions-ledger' },
      { title: 'Payout Requests', icon: Send, path: '/accounts/payouts' }
    ]
  },
  {
    category: 'Financials & Auditing',
    items: [
      { title: 'Income & Expenses', icon: TrendingUp, path: '/accounts/income-expenses' },
      { title: 'Financial Reports', icon: BarChart3, path: '/accounts/reports' },
      { title: 'Audit Trail Logs', icon: ShieldCheck, path: '/accounts/audit-logs' },
      { title: 'All Wallets', icon: Wallet, path: '/accounts/wallets' }
    ]
  },
  {
    category: 'Operations & Settings',
    items: [
      { title: 'EMI Statements', icon: FileSpreadsheet, path: '/accounts/emi-statements' },
      { title: 'Daily Records', icon: FileText, path: '/accounts/daily-records' },
      { title: 'Support & Tickets', icon: Headphones, path: '/accounts/support' },
      { title: 'Account Settings', icon: Settings, path: '/accounts/settings' }
    ]
  }
];

const AccountsSidebar = ({ collapsed }) => {
  const { logout, user } = useAuth();

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-navy text-white flex flex-col z-40 transition-all duration-300 print:hidden ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0b1437 0%, #0d1b4b 40%, #091230 100%)',
        borderRight: '1px solid rgba(212,175,55,0.18)'
      }}
    >
      {/* Top gold accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, #D4AF37, #FFD700, #D4AF37, transparent)' }} />

      {/* Logo */}
      <div className={`flex items-center gap-3 border-b shrink-0 ${collapsed ? 'px-3 py-4 justify-center' : 'px-5 py-4'} justify-center`} style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
        <div className="relative shrink-0 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Devojas Realtors"
            className="relative w-auto h-auto max-w-[120px] max-h-[68px] object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* User Info Chip */}
      {!collapsed && user && (
        <div className="m-3 p-3 rounded-xl bg-white/5 border border-amber-500/20 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-navy to-amber-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">{user.name}</p>
            <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
              ACCOUNTS · {user.login_id || 'DEV-0005'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {section.category}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.title}
                to={item.path}
                end={item.path === '/accounts'}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold shadow-md shadow-blue-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <item.icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout button */}
      <div className="p-3 border-t border-navy-light/40">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-red-500/80 transition-colors"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AccountsSidebar;
