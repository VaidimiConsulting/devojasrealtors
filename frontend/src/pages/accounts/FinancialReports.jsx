import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, FileSpreadsheet, Building2, Users, IndianRupee, 
  Calendar, CreditCard, ArrowDownCircle 
} from 'lucide-react';
import api from '../../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const FinancialReports = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, sales, commissions, outstandings, collections
  const [salesData, setSalesData] = useState([]);
  const [commissionData, setCommissionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [repRes, txRes, commRes] = await Promise.all([
          api.get('/accounts/reports'),
          api.get('/accounts/transactions'),
          api.get('/accounts/commissions')
        ]);
        setData(repRes.data.data);
        setSalesData(txRes.data.data || []);
        setCommissionData(commRes.data.data || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'sales') {
      headers = ['Deal ID', 'Date', 'Property Plot', 'Buyer', 'Seller Associate', 'Deal Value', 'Paid Amount', 'Outstanding', 'Payment Status', 'Deal Status'];
      rows = salesData.map(t => [
        t.id,
        t.deal_date || t.createdAt?.slice(0, 10),
        `"${t.plot?.title || 'Plot'}"`,
        `"${t.buyer?.name || 'Customer'}"`,
        `"${t.sellerAssociate?.name || t.seller?.name || 'Associate'}"`,
        t.amount,
        t.paid_amount,
        t.outstanding_amount,
        t.payment_status,
        t.status
      ]);
    } else if (activeTab === 'commissions') {
      headers = ['Comm ID', 'Deal ID', 'Associate Name', 'Role Level', 'Base Amount', 'Assigned %', 'Downline %', 'Diff %', 'Commission Amount', 'Status'];
      rows = commissionData.map(c => [
        c.id,
        c.transaction_id,
        `"${c.associate?.name || 'Associate'}"`,
        c.level === 0 ? 'Direct Seller' : `Upline L${c.level}`,
        c.base_amount || c.transaction?.amount,
        c.upline_percent ?? c.percent,
        c.downline_percent ?? 0,
        c.differential_percent ?? c.percent,
        c.amount,
        c.status
      ]);
    } else if (activeTab === 'outstandings') {
      headers = ['Deal ID', 'Property Plot', 'Buyer Name', 'Phone', 'Deal Value', 'Paid', 'Outstanding Balance'];
      rows = salesData.filter(t => (t.outstanding_amount || 0) > 0).map(t => [
        t.id,
        `"${t.plot?.title || 'Plot'}"`,
        `"${t.buyer?.name || 'Customer'}"`,
        `"${t.buyer?.phone || ''}"`,
        t.amount,
        t.paid_amount,
        t.outstanding_amount
      ]);
    } else {
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Tracked Sales Volume', salesData.reduce((s, t) => s + parseFloat(t.amount || 0), 0)],
        ['Total Realized Collections', salesData.reduce((s, t) => s + parseFloat(t.paid_amount || 0), 0)],
        ['Total Accrued Commissions', commissionData.reduce((s, c) => s + parseFloat(c.amount || 0), 0)]
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return <div className="text-center py-20 text-gray-400">Loading comprehensive financial reports...</div>;
  }

  const revenueData = (data.revenueTrend || []).map((r) => ({ month: r.month, Revenue: parseFloat(r.revenue || 0) }));
  const commissionTrendData = (data.commissionTrend || []).map((c) => ({ month: c.month, Commission: parseFloat(c.commission || 0) }));

  const outstandingsList = salesData.filter(t => parseFloat(t.outstanding_amount || 0) > 0);
  const totalOutstanding = outstandingsList.reduce((s, t) => s + parseFloat(t.outstanding_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Reports & Auditable Statements</h1>
          <p className="text-gray-500 text-sm">Monthly collection registers, sales reports, commission payout audits, and customer receivables</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <FileSpreadsheet size={15} /> Export {activeTab.toUpperCase()} CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: 'overview', label: 'Overview & Trends', icon: BarChart3 },
          { id: 'sales', label: 'Property-wise Sales Report', icon: Building2 },
          { id: 'commissions', label: 'Associate Commission Report', icon: Users },
          { id: 'outstandings', label: 'Customer Outstanding Report', icon: CreditCard }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Revenue Inflow Trend</h3>
              {revenueData.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">No completed transaction data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => INR(v)} />
                    <Bar dataKey="Revenue" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Commission Payout Trend</h3>
              {commissionTrendData.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">No commission records yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={commissionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => INR(v)} />
                    <Bar dataKey="Commission" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top 5 Earners */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Top 5 Associate Earners</h3>
            {(!data.topEarners || data.topEarners.length === 0) ? (
              <p className="text-sm text-gray-400 py-6 text-center">No commission earners data yet</p>
            ) : (
              <div className="space-y-2">
                {data.topEarners.map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border">
                    <span className="text-gray-800 font-semibold text-sm">
                      #{i + 1} {e.earner?.name || `Associate #${e.user_id}`}
                    </span>
                    <span className="font-bold text-navy text-sm">
                      {INR(e.dataValues?.total || e.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROPERTY-WISE SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-3">Deal ID & Date</th>
                <th className="p-3">Property Plot</th>
                <th className="p-3">Buyer / Customer</th>
                <th className="p-3">Seller Associate</th>
                <th className="p-3 text-right">Deal Value</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Outstanding</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesData.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold">#{t.id} ({t.deal_date || t.createdAt?.slice(0, 10)})</td>
                  <td className="p-3 font-medium">{t.plot?.title || 'Plot'}</td>
                  <td className="p-3">{t.buyer?.name || 'Customer'}</td>
                  <td className="p-3">{t.sellerAssociate?.name || t.seller?.name || 'Direct'}</td>
                  <td className="p-3 text-right font-bold">{INR(t.amount)}</td>
                  <td className="p-3 text-right font-semibold text-emerald-700">{INR(t.paid_amount)}</td>
                  <td className="p-3 text-right font-bold text-red-600">{INR(t.outstanding_amount)}</td>
                  <td className="p-3 text-center uppercase font-bold text-[10px]">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ASSOCIATE COMMISSION REPORT */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-3">Deal #</th>
                <th className="p-3">Associate</th>
                <th className="p-3">Role Level</th>
                <th className="p-3 text-right">Base Amount</th>
                <th className="p-3 text-center">My %</th>
                <th className="p-3 text-center">Downline %</th>
                <th className="p-3 text-center">Diff %</th>
                <th className="p-3 text-right">Commission Amount</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissionData.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono">#{c.transaction_id}</td>
                  <td className="p-3 font-semibold">{c.associate?.name || `Associate #${c.user_id}`}</td>
                  <td className="p-3">{c.level === 0 ? 'Direct Seller' : `Upline Level ${c.level}`}</td>
                  <td className="p-3 text-right">{INR(c.base_amount || c.transaction?.amount)}</td>
                  <td className="p-3 text-center font-bold">{c.upline_percent ?? c.percent}%</td>
                  <td className="p-3 text-center">{c.downline_percent !== null ? `${c.downline_percent}%` : '0%'}</td>
                  <td className="p-3 text-center font-bold text-navy">{c.differential_percent !== null ? `${c.differential_percent}%` : `${c.percent}%`}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">+{INR(c.amount)}</td>
                  <td className="p-3 text-center uppercase font-bold text-[10px]">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CUSTOMER OUTSTANDINGS */}
      {activeTab === 'outstandings' && (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex justify-between items-center">
            <div>
              <span className="text-xs uppercase font-bold text-red-700">Total Outstanding Customer Receivables</span>
              <p className="text-2xl font-black text-red-900 mt-1">{INR(totalOutstanding)}</p>
            </div>
            <span className="text-xs font-semibold text-red-800 bg-red-100 px-3 py-1 rounded-full">
              {outstandingsList.length} deals with pending dues
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b">
                <tr>
                  <th className="p-3">Deal #</th>
                  <th className="p-3">Property Plot</th>
                  <th className="p-3">Buyer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 text-right">Deal Price</th>
                  <th className="p-3 text-right">Paid So Far</th>
                  <th className="p-3 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {outstandingsList.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold">#{t.id}</td>
                    <td className="p-3 font-medium">{t.plot?.title || 'Plot'}</td>
                    <td className="p-3 font-semibold text-gray-900">{t.buyer?.name || 'Customer'}</td>
                    <td className="p-3 text-gray-500">{t.buyer?.phone || '—'}</td>
                    <td className="p-3 text-right">{INR(t.amount)}</td>
                    <td className="p-3 text-right text-emerald-700">{INR(t.paid_amount)}</td>
                    <td className="p-3 text-right font-black text-red-600">{INR(t.outstanding_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
