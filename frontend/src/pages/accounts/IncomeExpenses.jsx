import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Plus, Filter, Calendar, 
  ArrowUpCircle, ArrowDownCircle, PieChart, Tag, Trash2, Edit2
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const CATEGORIES = [
  'Office Expenses',
  'Marketing & Advertising',
  'Salaries & Vendor Payments',
  'Bills & Vouchers',
  'Travel & Conveyance',
  'Legal & Professional Fees',
  'General Overhead'
];

const IncomeExpenses = () => {
  const [data, setData] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0, categoryBreakdown: {}, records: [] });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense'); // 'income' or 'expense'

  // Form
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Office Expenses',
    payment_mode: 'Cash',
    reference_no: '',
    party_name: '',
    party_phone: '',
    record_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const res = await api.get('/accounts/income-expenses', { params });
      setData(res.data.data || {});
    } catch (err) {
      console.error('Failed to load income/expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, categoryFilter]);

  const handleOpenAddModal = (type) => {
    setModalType(type);
    setFormData({
      title: '',
      amount: '',
      category: type === 'expense' ? 'Office Expenses' : 'Direct Income',
      payment_mode: 'Cash',
      reference_no: '',
      party_name: '',
      party_phone: '',
      record_date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.record_date) {
      alert('Please fill in title, amount, and record date.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/accounts/expenses', {
        ...formData,
        type: modalType
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const records = data.records || [];
  const catBreakdown = data.categoryBreakdown || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Income & Expense Management</h1>
          <p className="text-gray-500 text-sm">Track operational overheads, vendor payouts, marketing bills, and monthly P&L</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('income')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Add Income
          </button>
          <button
            onClick={() => handleOpenAddModal('expense')}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-emerald-500">
          <p className="text-xs text-gray-400 uppercase">Total Other Income</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">+{INR(data.totalIncome)}</p>
        </div>
        <div className="card border-l-4 border-red-500">
          <p className="text-xs text-gray-400 uppercase">Total Tracked Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">−{INR(data.totalExpense)}</p>
        </div>
        <div className="card border-l-4 border-navy">
          <p className="text-xs text-gray-400 uppercase">Net Balance</p>
          <p className={`text-2xl font-bold mt-1 ${data.netProfit >= 0 ? 'text-navy' : 'text-red-600'}`}>
            {INR(data.netProfit)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Badges */}
      {Object.keys(catBreakdown).length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-navy" /> Expense Category Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(catBreakdown).map(([cat, amt]) => (
              <div key={cat} className="p-3 bg-gray-50 rounded-lg border">
                <span className="text-xs text-gray-500 font-medium truncate block">{cat}</span>
                <p className="font-bold text-red-600 text-base mt-1">{INR(amt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5">
          {['all', 'income', 'expense'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                typeFilter === t ? 'bg-navy text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? 'All Records' : t === 'income' ? 'Direct Income' : 'Expenses'}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-2 border rounded-lg text-xs font-semibold text-gray-700 focus:outline-none"
        >
          <option value="all">All Expense Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Title & Particulars</th>
              <th className="px-4 py-3">Party / Vendor</th>
              <th className="px-4 py-3 text-center">Payment Mode</th>
              <th className="px-4 py-3">Ref #</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">Loading records...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">No records found for current filters</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">
                    {r.record_date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800 text-xs">
                    {r.category || 'General'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-xs">{r.title}</p>
                    {r.description && <p className="text-[11px] text-gray-400 truncate max-w-xs">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {r.party_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded border">
                      {r.payment_mode || 'Cash'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {r.reference_no || '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold text-sm ${
                    r.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {r.type === 'income' ? '+' : '−'}{INR(r.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Record Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Add New ${modalType === 'expense' ? 'Company Expense' : 'Direct Income Record'}`}
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title / Purpose</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Office Electricity Bill, Staff Salary, Hoarding Ads..."
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 15000"
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                >
                  {modalType === 'expense' ? (
                    CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                  ) : (
                    <>
                      <option value="Direct Income">Direct Income</option>
                      <option value="Consultancy Fee">Consultancy Fee</option>
                      <option value="Rental Income">Rental Income</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Record Date</label>
                <input
                  type="date"
                  required
                  value={formData.record_date}
                  onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Mode</label>
                <select
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Party / Vendor Name</label>
                <input
                  type="text"
                  value={formData.party_name}
                  onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                  placeholder="e.g. Electric Dept, Vendor Co."
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reference / Bill No</label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  placeholder="e.g. BILL-9921"
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description / Notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes or voucher remarks..."
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-navy focus:outline-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg text-xs font-semibold"
              >
                {submitting ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default IncomeExpenses;
