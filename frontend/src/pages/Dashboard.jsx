import React, { useEffect, useState } from 'react';
import {
  Home, Users, Receipt, TrendingUp, Percent, AlertCircle, IndianRupee,
  Activity, Clock, CheckCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import StatCard from '../components/StatCard';

const INR = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Only use customer sale transactions in the trend chart (already filtered on backend)
  const trendData = (stats?.salesTrend || []).map((s) => ({ month: s.month, revenue: parseFloat(s.total) }));

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Live overview of your real estate business</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <Activity size={14} className="animate-pulse" />
          Live — updates every 20s
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Revenue (Customer Sales)"
          value={INR(stats.totalRevenue)}
          icon={IndianRupee}
          color="green"
          subtitle="Completed customer sales"
        />
        <StatCard
          title="Total Plots"
          value={stats.totalPlots}
          icon={Home}
          color="navy"
          subtitle={`${stats.availablePlots} available · ${stats.soldPlots} sold`}
        />
        <StatCard
          title="Total Users"
          value={stats.totalClients + stats.totalAssociates}
          icon={Users}
          color="blue"
          subtitle={`${stats.totalClients} clients · ${stats.totalAssociates} associates`}
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={Receipt}
          color="navy"
          subtitle={`${stats.completedTransactions} completed`}
        />
        <StatCard
          title="Pending KYC"
          value={stats.pendingKyc}
          icon={AlertCircle}
          color="red"
          subtitle="Needs review"
        />
      </div>

      {/* Admin's Own Commission Breakdown */}
      <div className="card">
        <div className="mb-4">
          <h3 className="font-bold text-slate-900 text-base">My Commission (Super Admin)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your own commission rows from the commission ledger. Network-wide totals are in the Accounts panel.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Generated */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Percent size={16} className="text-slate-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Commission Generated</span>
            </div>
            <span className="text-2xl font-black text-gray-900 block">{INR(stats.commissionGenerated)}</span>
            <span className="text-[11px] text-gray-500 block">Total accrued in ledger (pending + paid)</span>
          </div>

          {/* Commission Paid */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Commission Paid</span>
            </div>
            <span className="text-2xl font-black text-emerald-700 block">{INR(stats.totalCommissionPaid)}</span>
            <span className="text-[11px] text-emerald-800 block">Actual money disbursed (sum of paid_amount)</span>
          </div>

          {/* Commission Pending */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Commission Pending</span>
            </div>
            <span className="text-2xl font-black text-amber-700 block">{INR(stats.commissionPending)}</span>
            <span className="text-[11px] text-amber-800 block">Generated − Paid (balance yet to be disbursed)</span>
          </div>
        </div>
      </div>

      {/* Sales Chart + Quick Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Sales Trend</h3>
              <p className="text-sm text-slate-400 mt-0.5">Monthly completed customer sales only</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              Revenue (₹)
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <TrendingUp size={24} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No sales trend data yet</p>
              <p className="text-xs text-slate-400 mt-1">Chart will populate as completed customer deals close</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `₹${v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontSize: '13px' }}
                  formatter={(v) => [INR(v), 'Revenue']}
                  cursor={{ fill: '#eff6ff' }}
                />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Summary Panel */}
        <div className="card space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Quick Summary</h3>
            <p className="text-sm text-slate-400 mt-0.5">Business at a glance</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Available Plots', value: stats.availablePlots, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Sold Plots', value: stats.soldPlots, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Pending Plots', value: (stats.totalPlots - stats.availablePlots - stats.soldPlots), color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Total Clients', value: stats.totalClients, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Associates', value: stats.totalAssociates, color: 'text-sky-600', bg: 'bg-sky-50' },
              { label: 'Pending KYC Reviews', value: stats.pendingKyc, color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-blue-200 transition-all">
                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg ${item.bg} ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
