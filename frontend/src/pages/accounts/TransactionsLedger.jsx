import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, ArrowUpRight, Search, Filter, 
  FileSpreadsheet, CreditCard, Building, Wallet 
} from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/Badge';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const TransactionsLedger = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // all, in, out
  const [modeFilter, setModeFilter] = useState('all'); // Cash, Bank, UPI, Cheque
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const [payRes, recRes, commRes] = await Promise.all([
        api.get('/accounts/payments/ledger'),
        api.get('/accounts/income-expenses'),
        api.get('/accounts/commissions')
      ]);

      const list = [];

      // 1. Customer Payments (Money Received)
      (payRes.data.data || []).forEach((p) => {
        list.push({
          id: `PAY-${p.id}`,
          date: p.paid_on || p.createdAt,
          type: 'IN',
          category: 'Customer Property Payment',
          description: `Payment for Deal #${p.transaction_id} — ${p.transaction?.plot?.title || 'Plot'}`,
          party: p.transaction?.buyer?.name || 'Customer',
          mode: p.payment_mode || 'Cash',
          ref: p.reference_no || p.receipt_no || '—',
          amount: parseFloat(p.amount || 0),
          status: p.status || 'verified'
        });
      });

      // 2. Direct Income & Expenses
      (recRes.data.data?.records || []).forEach((r) => {
        list.push({
          id: `REC-${r.id}`,
          date: r.record_date || r.createdAt,
          type: r.type === 'income' ? 'IN' : 'OUT',
          category: r.category || (r.type === 'income' ? 'Direct Income' : 'Expense'),
          description: r.title || r.description || 'Record entry',
          party: r.party_name || 'Internal',
          mode: r.payment_mode || 'Cash',
          ref: r.reference_no || '—',
          amount: parseFloat(r.amount || 0),
          status: 'recorded'
        });
      });

      // 3. Paid Commissions (Money Paid Out - using actual paid_amount)
      (commRes.data.data || []).filter(c => parseFloat(c.paid_amount || (c.status === 'paid' ? c.amount : 0)) > 0).forEach((c) => {
        const paid = parseFloat(c.paid_amount || (c.status === 'paid' ? c.amount : 0));
        list.push({
          id: `COMM-${c.id}`,
          date: c.updatedAt || c.createdAt,
          type: 'OUT',
          category: 'Associate Commission Payout',
          description: `Payout for Deal #${c.transaction_id} (Level ${c.level})`,
          party: c.associate?.name || `Associate #${c.user_id}`,
          mode: 'Bank Transfer',
          ref: `COMM-TX-${c.id}`,
          amount: paid,
          status: 'disbursed'
        });
      });

      // Sort descending by date
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(list);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const filtered = entries.filter((item) => {
    if (typeFilter === 'in' && item.type !== 'IN') return false;
    if (typeFilter === 'out' && item.type !== 'OUT') return false;
    if (modeFilter !== 'all' && !item.mode.toLowerCase().includes(modeFilter.toLowerCase())) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.description.toLowerCase().includes(term) ||
        item.party.toLowerCase().includes(term) ||
        item.ref.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalIn = filtered.filter(e => e.type === 'IN').reduce((s, e) => s + e.amount, 0);
  const totalOut = filtered.filter(e => e.type === 'OUT').reduce((s, e) => s + e.amount, 0);

  const handleExportCSV = () => {
    const headers = ['Entry ID', 'Date', 'Flow Type', 'Category', 'Description', 'Party', 'Payment Mode', 'Reference', 'Amount', 'Status'];
    const rows = filtered.map(e => [
      e.id,
      new Date(e.date).toLocaleDateString(),
      e.type,
      `"${e.category}"`,
      `"${e.description}"`,
      `"${e.party}"`,
      e.mode,
      `"${e.ref}"`,
      e.amount,
      e.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Transactions Ledger</h1>
          <p className="text-gray-500 text-sm">Unified money flow journal — money received, payouts, and bank/cash transfers</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <FileSpreadsheet size={15} /> Export Ledger CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-emerald-600">
          <p className="text-xs text-gray-400 uppercase">Filtered Money Received (Inflow)</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">+{INR(totalIn)}</p>
        </div>
        <div className="card border-l-4 border-red-500">
          <p className="text-xs text-gray-400 uppercase">Filtered Money Paid (Outflow)</p>
          <p className="text-xl font-bold text-red-600 mt-1">−{INR(totalOut)}</p>
        </div>
        <div className="card border-l-4 border-navy">
          <p className="text-xs text-gray-400 uppercase">Net Filtered Cash Flow</p>
          <p className={`text-xl font-bold mt-1 ${totalIn - totalOut >= 0 ? 'text-navy' : 'text-red-600'}`}>
            {INR(totalIn - totalOut)}
          </p>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 text-gray-400" size={17} />
          <input
            type="text"
            placeholder="Search by description, party name, receipt/ref number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* In / Out Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                typeFilter === 'all' ? 'bg-white shadow text-navy font-bold' : 'text-gray-500'
              }`}
            >
              All Flows
            </button>
            <button
              onClick={() => setTypeFilter('in')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                typeFilter === 'in' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500'
              }`}
            >
              Money In
            </button>
            <button
              onClick={() => setTypeFilter('out')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                typeFilter === 'out' ? 'bg-white shadow text-red-600 font-bold' : 'text-gray-500'
              }`}
            >
              Money Out
            </button>
          </div>

          {/* Mode Selector */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="p-2 border rounded-lg text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="all">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Flow & Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Particulars / Description</th>
              <th className="px-4 py-3">Party Name</th>
              <th className="px-4 py-3 text-center">Mode</th>
              <th className="px-4 py-3">Reference #</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">Loading transactions ledger...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">No transactions recorded for selected criteria</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        item.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {item.type === 'IN' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-xs">{item.type === 'IN' ? 'RECEIPT' : 'PAYOUT'}</p>
                        <p className="text-[11px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">
                    {item.category}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800 text-xs">
                    {item.party}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded border">
                      {item.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {item.ref}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold text-sm ${
                    item.type === 'IN' ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {item.type === 'IN' ? '+' : '−'}{INR(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-200">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionsLedger;
