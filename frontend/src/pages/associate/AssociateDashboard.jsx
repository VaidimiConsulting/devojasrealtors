import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Handshake, IndianRupee, Wallet, Copy, Check,
  User as UserIcon, Phone, Mail, Clock, MapPin, CreditCard,
  Hash, BadgeCheck, Calendar, TrendingUp, Network, Star, ChevronRight,
  CheckCircle2, AlertCircle, ShoppingCart, ArrowUpRight, Building2,
  FileText, ShieldCheck, RefreshCw, Trophy, Gift, Award
} from 'lucide-react';
import api from '../../api/axios';
import NetworkCounts from '../../components/NetworkCounts';
import MonthlyTargetCard from '../../components/MonthlyTargetCard';

const maskAadhar = (a) => (a ? `XXXX XXXX ${String(a).slice(-4)}` : '—');
const maskPan = (p) => (p ? `${p.slice(0, 2)}XXXXX${p.slice(-2)}` : '—');
const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const AssociateDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/associate/dashboard-stats');
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyReferral = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-navy border-t-gold rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm font-medium">Loading associate dashboard...</p>
        </div>
      </div>
    );
  }

  const profile = stats?.profile || {};
  const comm = stats?.commissions || {};
  const levelCounts = stats?.levelCounts || {};
  const recentBookings = stats?.recentBookings || [];
  const selfReward = stats?.selfReward || {};
  const totalEarnings = stats?.totalEarnings !== undefined
    ? Number(stats.totalEarnings)
    : (Number(stats?.totalCommissionEarned || 0) + Number(selfReward?.reward_amount || selfReward?.total_reward || 0));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy text-white uppercase tracking-wider">
              Associate Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold/20 text-gold-dark border border-gold/40">
              Commission Rate: {profile.commission_percent ?? profile.referral_commission_percent ?? 5}%
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Welcome, {profile.name} 👋
          </h1>
          <p className="text-xs text-gray-500">
            Associate ID: <b className="text-navy">{profile.login_id || stats.associateId}</b> · Referred By ID: <b className="text-navy">{stats.sponsoredBy?.login_id || stats.referredById || (profile.referred_by ? 'DEV-0001' : 'None (Company Root)')}</b> {stats.sponsoredBy?.name ? `(${stats.sponsoredBy.name})` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 p-2.5 rounded-xl shadow-sm flex items-center gap-3">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">My Referral Code</span>
              <span className="text-sm font-black text-navy tracking-wider">{stats.referralCode || profile.login_id}</span>
            </div>
            <button
              onClick={() => copyReferral(stats.referralCode || profile.login_id)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
              title="Copy referral ID"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            </button>
          </div>
          <button
            onClick={() => navigate('/associate/plot-purchasing')}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 py-2.5 px-3.5"
          >
            <Building2 size={15} /> Book Plot
          </button>
        </div>
      </div>

      {/* Network counts (direct / total downline) */}
      <NetworkCounts />
      <MonthlyTargetCard />

      {/* Row 1: Key Performance Metrics (Real DB Records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card space-y-2 border-l-4 border-navy">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Network Team</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-gray-900">
              {stats.totalTeamCount || stats.myTeamCount || 0}
            </span>
            <span className="text-xs font-bold text-navy bg-navy/5 px-2 py-0.5 rounded">
              {stats.myTeamCount || 0} Direct
            </span>
          </div>
          <span className="text-xs text-gray-500 block">Total downline network count</span>
        </div>

        <div className="card space-y-2 border-l-4 border-blue-600">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Personal Plot Sales</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-700">
              {fmt(stats.totalSalesValue || stats.selfBusiness)}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {stats.completedSales || 0} Deals
            </span>
          </div>
          <span className="text-xs text-gray-500 block">Deals directly closed</span>
        </div>

        <div className="card space-y-2 border-l-4 border-emerald-600">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Downline Volume</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-700">
              {fmt(stats.teamBusiness)}
            </span>
          </div>
          <span className="text-xs text-gray-500 block">Network sales volume</span>
        </div>

        <div className="card space-y-2 border-l-4 border-purple-600">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Available Plots</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-purple-900">
              {stats.availablePlotsCount || 0}
            </span>
            <button
              onClick={() => navigate('/associate/plots')}
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-0.5"
            >
              Browse <ArrowUpRight size={12} />
            </button>
          </div>
          <span className="text-xs text-gray-500 block">Ready for customer booking</span>
        </div>
      </div>

      {/* Row 2: Customer Bookings & Outstanding Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-slate-900 to-navy text-white p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Plot Booking Requests</span>
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-bold">
              {stats.totalBookings || 0} Total
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10 text-xs">
            <div>
              <p className="text-slate-400">Pending Review</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{stats.pendingBookings || 0}</p>
            </div>
            <div>
              <p className="text-slate-400">Approved Bookings</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{stats.approvedBookings || 0}</p>
            </div>
          </div>
        </div>

        <div className="card bg-white border border-gray-200 p-5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Payments Collected</span>
          <p className="text-2xl font-black text-emerald-700">{fmt(stats.paymentsCollected || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Directly received from closed deals</p>
        </div>

        <div className="card bg-white border border-gray-200 p-5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Customer Outstanding Balance</span>
          <p className="text-2xl font-black text-amber-700">{fmt(stats.outstandingBalance || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Pending customer installments/balance</p>
        </div>
      </div>

      {/* Self-Sale Slab Reward & Total Payout Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center shadow-sm">
              <Trophy size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                Self-Sale Slab Reward & Total Earnings
              </h2>
              <p className="text-xs text-gray-500">
                Formula: <span className="font-semibold text-navy">Total Earnings = Existing Eligible Commission + Earned Self-Sale Reward</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/associate/my-rewards')}
              className="text-xs font-bold text-navy hover:text-blue-700 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              <Award size={14} className="text-amber-500" /> My Milestone Rewards
            </button>
            <button
              onClick={() => navigate('/associate/payout-statements')}
              className="text-xs font-bold text-slate-700 hover:text-navy flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              <FileText size={14} /> Payout Statements
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Card 1: Self-Sale Slab Reward Card */}
          <div className="card bg-white border border-gray-200 p-5 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Personal Self-Sale Milestone</span>
                <h3 className="text-base font-black text-gray-900 mt-0.5 flex items-center gap-2">
                  <Gift size={18} className="text-amber-500" />
                  Slab Reward {selfReward.slab_number ? `(Slab ${selfReward.slab_number})` : ''}
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                selfReward.status === 'Earned'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : selfReward.status === 'Pending'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-300'
              }`}>
                {selfReward.status === 'Earned' && <CheckCircle2 size={13} className="text-emerald-600" />}
                {selfReward.status === 'Pending' && <Clock size={13} className="text-amber-600" />}
                Status: {selfReward.status || 'Not Eligible'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Personal Self-Sales</span>
                <span className="text-sm font-black text-blue-700 block mt-0.5">{fmt(selfReward.self_sales ?? stats.selfBusiness ?? 0)}</span>
                <span className="text-[9px] text-gray-400">Qualifying only</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Self-Sales Target</span>
                <span className="text-sm font-black text-gray-800 block mt-0.5">{fmt(selfReward.self_target_amount || 0)}</span>
                <span className="text-[9px] text-gray-400">Applicable slab</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Slab Reward</span>
                <span className="text-sm font-black text-emerald-600 block mt-0.5">{fmt(selfReward.reward_amount || selfReward.total_reward || 0)}</span>
                <span className="text-[9px] text-emerald-600 font-semibold">{selfReward.reward_amount > 0 ? 'Earned ✅' : '₹0'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Remaining Target</span>
                <span className="text-sm font-black text-amber-700 block mt-0.5">{fmt(selfReward.remaining_amount || 0)}</span>
                <span className="text-[9px] text-gray-400">To unlock</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">Reward Progress (Completed vs Target)</span>
                <span className="font-bold text-navy">{selfReward.progress_percent || 0}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, selfReward.progress_percent || 0)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500">
                {selfReward.remaining_amount > 0 ? (
                  <>Personal qualifying sales: <b>{fmt(selfReward.completed_amount || stats.selfBusiness || 0)}</b> of <b>{fmt(selfReward.self_target_amount || 0)}</b> ({fmt(selfReward.remaining_amount)} remaining for next milestone)</>
                ) : (
                  <span className="text-emerald-700 font-bold">✨ Milestone target reached! Reward earned exclusively from personal sales.</span>
                )}
              </p>
            </div>
          </div>

          {/* Card 2: Total Earnings / Payment Calculation Card */}
          <div className="card bg-gradient-to-br from-slate-900 via-navy to-slate-900 text-white p-5 space-y-4 shadow-lg border border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Earnings / Payment</span>
                <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
                  <Wallet size={18} className="text-gold" />
                  Commission + Slab Reward
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gold/20 text-gold border border-gold/40">
                Real-Time Total
              </span>
            </div>

            {/* Formula Equation Display */}
            <div className="grid grid-cols-3 gap-2 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Commission</span>
                <span className="text-sm font-black text-slate-100 block mt-0.5">{fmt(stats.totalCommissionEarned || 0)}</span>
                <span className="text-[9px] text-slate-400">Differential/Direct</span>
              </div>
              <div className="relative flex flex-col justify-center items-center">
                <span className="text-gold font-black text-sm absolute -left-2 top-3">+</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Reward</span>
                <span className="text-sm font-black text-emerald-400 block mt-0.5">{fmt(selfReward.reward_amount || selfReward.total_reward || 0)}</span>
                <span className="text-[9px] text-emerald-400 font-semibold">Self-Sale Reward</span>
              </div>
              <div className="relative flex flex-col justify-center items-center">
                <span className="text-gold font-black text-sm absolute -left-2 top-3">=</span>
                <span className="text-[10px] text-gold uppercase font-bold block">Total Earnings</span>
                <span className="text-base font-black text-gold block mt-0.5">{fmt(totalEarnings)}</span>
                <span className="text-[9px] text-amber-200">Gross Payment</span>
              </div>
            </div>

            {/* Status Breakdown (Pending / Approved / Paid) */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">Pending Review</span>
                <span className="font-bold text-amber-400">{fmt(comm.pending || stats.pendingCommission || 0)}</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">Approved Balance</span>
                <span className="font-bold text-blue-400">{fmt(comm.approved || stats.approvedCommission || stats.walletBalance || 0)}</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">Disbursed / Paid</span>
                <span className="font-bold text-emerald-400">{fmt(comm.paid || stats.paidCommission || 0)}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              * Net Payable = Existing Commission + Earned Self-Sale Reward - Applicable Deductions (TDS 5% + Processing 2%).
            </p>
          </div>

        </div>
      </div>

      {/* Row 3: Itemized Commission Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <IndianRupee size={18} className="text-gold" />
              Commission Ledger & Payout Status
            </h3>
            <p className="text-xs text-gray-500">
              Direct deal commissions and MLM upline differential balances calculated in real-time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              Total Earnings: {fmt(totalEarnings)}
            </span>
            <span className="text-xs font-bold text-navy bg-navy/5 px-3 py-1 rounded-lg">
              Wallet Balance: {fmt(stats.walletBalance)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase block">Total Earned</span>
            <span className="text-2xl font-black text-gray-900 block">
              {fmt(stats.totalCommissionEarned)}
            </span>
            <span className="text-[11px] text-gray-500 block">Cumulative differential earnings</span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
            <span className="text-xs font-bold text-amber-800 uppercase block">Pending Accounts Review</span>
            <span className="text-2xl font-black text-amber-700 block">
              {fmt(comm.pending || stats.pendingCommission || 0)}
            </span>
            <span className="text-[11px] text-amber-800 block">Awaiting verified payment audit</span>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
            <span className="text-xs font-bold text-blue-800 uppercase block">Approved Commission</span>
            <span className="text-2xl font-black text-blue-700 block">
              {fmt(comm.approved || stats.approvedCommission || stats.walletBalance || 0)}
            </span>
            <span className="text-[11px] text-blue-800 block">Credited & eligible for payout</span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-xs font-bold text-emerald-800 uppercase block">Paid Commission</span>
            <span className="text-2xl font-black text-emerald-700 block">
              {fmt(comm.paid || stats.paidCommission || 0)}
            </span>
            <span className="text-[11px] text-emerald-800 block">Disbursed to bank account</span>
          </div>
        </div>
      </div>

      {/* Row 4: Level-Wise Team Summary & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Level Summary */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Network size={16} className="text-navy" />
              Level-wise Team Summary
            </h3>
            <button
              onClick={() => navigate('/associate/team')}
              className="text-xs text-blue-600 hover:underline"
            >
              View Tree
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.keys(levelCounts).length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Users size={24} className="mx-auto mb-2 opacity-50" />
                <p>No downline members yet</p>
                <p className="text-[11px] mt-1">Share your referral link to build your team</p>
              </div>
            ) : (
              Object.entries(levelCounts).map(([lvl, count]) => (
                <div key={lvl} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-gray-700">Level {lvl} {lvl === '1' ? '(Direct Referrals)' : ''}</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-navy text-white text-[11px]">
                    {count} Members
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Bookings & Deals */}
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <FileText size={16} className="text-navy" />
              Recent Plot Bookings
            </h3>
            <button
              onClick={() => navigate('/associate/sales')}
              className="text-xs text-blue-600 hover:underline"
            >
              All Sales
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Building2 size={24} className="mx-auto mb-2 opacity-50" />
              <p>No recent bookings recorded</p>
              <button
                onClick={() => navigate('/associate/plot-purchasing')}
                className="btn-ghost text-xs mt-2"
              >
                Book Your First Plot
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-3 py-2">Booking Ref</th>
                    <th className="px-3 py-2">Plot Code</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-navy">{b.booking_ref}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{b.plot_code || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{b.applicant_name}</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(b.total_plot_price)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          b.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Profile Details & Sponsor Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center font-bold">
                <UserIcon size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">My Official Associate Profile</h3>
                <p className="text-xs text-gray-400">Verified KYC & MLM partner credentials</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase">
              {profile.status || 'Active'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">Associate Name</span>
                <span className="text-sm font-bold text-gray-900">{profile.name}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">Unique Associate ID</span>
                <span className="text-sm font-mono font-bold text-navy">{profile.login_id}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">Primary Mobile</span>
                <span className="text-sm font-bold text-gray-900">{profile.phone}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">Email Address</span>
                <span className="text-sm font-semibold text-gray-900">{profile.email || '—'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">PAN Card Number</span>
                <span className="text-sm font-mono font-bold text-gray-900">{maskPan(profile.pan_number)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">Aadhaar UIDAI</span>
                <span className="text-sm font-mono font-bold text-gray-900">{maskAadhar(profile.aadhar_number)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">KYC Verification</span>
                <span className="text-sm font-bold text-emerald-700 capitalize flex items-center gap-1">
                  <BadgeCheck size={14} /> {profile.kyc_status || 'Verified'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-medium">Member Since</span>
                <span className="text-sm font-semibold text-gray-900">
                  {profile.member_since ? new Date(profile.member_since).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor Card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold-dark flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">My Sponsor / Upline</h3>
              <p className="text-xs text-gray-400">Direct MLM referrer</p>
            </div>
          </div>

          {stats.sponsoredBy ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-gray-400 block font-medium">Referred By / Sponsor Name</span>
                <span className="text-sm font-bold text-gray-900">{stats.sponsoredBy.name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-gray-400 block font-medium">Referred By ID / Sponsor ID</span>
                <span className="text-sm font-mono font-bold text-navy">{stats.sponsoredBy.login_id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-gray-400 block font-medium">Contact Phone</span>
                <span className="text-sm font-bold text-gray-900">{stats.sponsoredBy.phone || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 text-center space-y-1">
              <p className="font-bold text-navy text-sm">Direct Company Root Leader</p>
              <p className="text-xs text-gray-500">No Upline Referrer (Root Associate)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssociateDashboard;
