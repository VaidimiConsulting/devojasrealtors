import React, { useEffect, useState } from 'react';
import { 
  Percent, CreditCard, Send, Wallet, 
  Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle, Building2, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';

const INR = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AccountsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/accounts/dashboard-stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy"></div>
      </div>
    );
  }

  const s = stats || {};
  const trendData = (s.revenueTrend || []).map((t) => ({
    month: t.month,
    revenue: parseFloat(t.total || 0)
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Accounts & Financial Dashboard</h1>
          <p className="text-gray-500 text-sm">Real-time collections, multi-level commission payouts, and cash flow</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/accounts/commission-slips"
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium text-sm rounded-lg hover:brightness-105 shadow-sm"
          >
            Commission Slips
          </Link>
          <Link
            to="/accounts/payments"
            className="px-4 py-2 bg-navy text-white font-medium text-sm rounded-lg hover:bg-navy-light shadow-sm"
          >
            Record Payment
          </Link>
        </div>
      </div>

      {/* Row 1: Core Property Sales & Outstandings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Property Sales"
          value={INR(s.totalPropertySales || s.totalRevenue)}
          icon={Building2}
          color="navy"
          subtitle="Completed deal bookings"
        />
        <StatCard
          title="Customer Outstandings"
          value={INR(s.outstandingCustomerPayments)}
          icon={CreditCard}
          color="red"
          subtitle="Pending customer receivables"
        />
      </div>

      {/* Row 2: Commission System Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Commission Generated"
          value={INR(s.totalCommissions)}
          icon={Percent}
          color="navy"
          subtitle="All accrued (pending + approved + paid)"
        />
        <StatCard
          title="Pending / Awaiting Approval"
          value={INR(s.pendingCommissions)}
          icon={Clock}
          color="gold"
          subtitle="Not yet approved by accounts"
        />
        <StatCard
          title="Commission Paid (Cash Out)"
          value={INR(s.totalCommissionPaid)}
          icon={Send}
          color="green"
          subtitle="Actual money disbursed (sum of paid_amount)"
        />
        <StatCard
          title="Commission Remaining"
          value={INR(s.commissionRemainingPayable)}
          icon={CheckCircle}
          color="red"
          subtitle="Generated − Paid (balance payable)"
        />
      </div>

      {/* Row 3: Income, Expenses & Wallets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Direct Income</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{INR(s.directIncome)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Other cash receipts</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownCircle size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-red-600 tracking-wider">Total Expenses</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{INR(s.totalExpense)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Office, salaries, marketing</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <ArrowUpCircle size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600 tracking-wider">Total Wallet Balance</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{INR(s.totalWalletBalance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Held across associate wallets</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      {/* Row 4: Monthly Revenue Chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Monthly Revenue Collection Trend</h3>
            <p className="text-xs text-gray-400">Total transaction values booked per calendar month</p>
          </div>
          <span className="text-xs text-gray-400 font-medium">Real-time DB</span>
        </div>
        {trendData.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No completed transaction data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v) => [INR(v), "Revenue"]} />
              <Bar dataKey="revenue" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 5: Recent Transactions and Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="font-semibold text-gray-800">Recent Property Transactions</h3>
              <Link to="/accounts/sales" className="text-xs text-navy hover:underline font-medium">View All</Link>
            </div>
            {(!s.recentTransactions || s.recentTransactions.length === 0) ? (
              <p className="text-sm text-gray-400 py-8 text-center">No recent transactions</p>
            ) : (
              <div className="divide-y divide-gray-100 text-sm">
                {s.recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{tx.plot?.title || `Deal #${tx.id}`}</p>
                      <p className="text-xs text-gray-400">
                        Buyer: {tx.buyer?.name || 'Client'} · Seller: {tx.sellerAssociate?.name || 'Associate'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{INR(tx.amount)}</p>
                      <Badge
                        variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="font-semibold text-gray-800">Recent Differential Commissions</h3>
              <Link to="/accounts/commissions" className="text-xs text-navy hover:underline font-medium">View All</Link>
            </div>
            {(!s.recentCommissions || s.recentCommissions.length === 0) ? (
              <p className="text-sm text-gray-400 py-8 text-center">No recent commissions</p>
            ) : (
              <div className="divide-y divide-gray-100 text-sm">
                {s.recentCommissions.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {c.earner?.name || c.associate?.name || 'Associate'}
                        <span className="text-xs text-navy font-bold ml-2">({c.earner?.login_id || c.associate?.login_id || 'ID'})</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.level === 0 ? 'Direct Seller' : `Upline (L${c.level})`} · Deal #{c.transaction_id}
                        {c.differential_percent ? ` · Diff: ${c.differential_percent}%` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">+{INR(c.amount)}</p>
                      <Badge
                        variant={
                          c.status === 'paid' ? 'success' :
                          c.status === 'approved' || c.status === 'credited' ? 'info' :
                          c.status === 'rejected' ? 'danger' : 'warning'
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsDashboard;
