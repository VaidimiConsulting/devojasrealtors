import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Plus, Search, Filter, Printer, CheckCircle, FileText, ArrowDownCircle } from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const CustomerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('all');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    transaction_id: '',
    amount: '',
    payment_mode: 'Cash',
    reference_no: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (modeFilter !== 'all') params.payment_mode = modeFilter;
      const [payRes, txRes] = await Promise.all([
        api.get('/accounts/payments/ledger', { params }),
        api.get('/accounts/transactions')
      ]);
      setPayments(payRes.data.data || []);
      setTransactions(txRes.data.data || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [modeFilter]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.transaction_id || !formData.amount) {
      alert('Please select a deal transaction and specify the received amount.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/accounts/payments/record', formData);
      alert(res.data.message || 'Payment recorded successfully!');
      setIsRecordModalOpen(false);
      setFormData({ transaction_id: '', amount: '', payment_mode: 'Cash', reference_no: '', note: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Payments & Receipts</h1>
          <p className="text-gray-500 text-sm">Record customer deposits, verify transaction receipts, and print payment vouchers</p>
        </div>
        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="px-4 py-2 bg-navy hover:bg-navy-light text-white font-medium text-sm rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={16} /> Record Customer Payment
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-emerald-600">
          <p className="text-xs text-gray-400 uppercase">Total Realized Collections</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{INR(totalCollected)}</p>
        </div>
        <div className="card border-l-4 border-navy">
          <p className="text-xs text-gray-400 uppercase">Total Receipts Issued</p>
          <p className="text-xl font-bold text-navy mt-1">{payments.length} receipts</p>
        </div>
        <div className="card border-l-4 border-amber-500">
          <p className="text-xs text-gray-400 uppercase">Payment Modes Tracked</p>
          <p className="text-xl font-bold text-gray-800 mt-1">Cash, Bank, UPI, Cheque</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {['all', 'Cash', 'Bank Transfer', 'UPI', 'Cheque'].map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                modeFilter === mode ? 'bg-navy text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode === 'all' ? 'All Payment Modes' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Receipt # & Date</th>
              <th className="px-4 py-3">Deal / Plot</th>
              <th className="px-4 py-3">Customer / Buyer</th>
              <th className="px-4 py-3 text-right">Amount Received</th>
              <th className="px-4 py-3 text-center">Payment Mode</th>
              <th className="px-4 py-3">Reference / Tx No</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Print Voucher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">Loading payment ledger...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-12 text-gray-400">No payment receipts found</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono font-bold text-navy">{p.receipt_no || `REC-${p.id}`}</p>
                    <p className="text-xs text-gray-400">{p.paid_on ? new Date(p.paid_on).toLocaleDateString() : 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{p.transaction?.plot?.title || `Deal #${p.transaction_id}`}</p>
                    <p className="text-xs text-gray-400">Deal #{p.transaction_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.transaction?.buyer?.name || 'Customer'}</p>
                    <p className="text-xs text-gray-400">{p.transaction?.buyer?.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    +{INR(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded border">
                      {p.payment_mode || 'Cash'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.reference_no || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.status === 'verified' ? 'success' : 'warning'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedReceipt(p)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-navy hover:text-white rounded text-xs font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <Printer size={13} /> View Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Customer Payment Modal */}
      {isRecordModalOpen && (
        <Modal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          title="Record Customer Payment Deposit"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Property Deal</label>
              <select
                value={formData.transaction_id}
                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                required
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
              >
                <option value="">-- Choose Transaction Deal --</option>
                {transactions.map((t) => (
                  <option key={t.id} value={t.id}>
                    Deal #{t.id} — {t.plot?.title || 'Plot'} — Client: {t.buyer?.name || 'Customer'} (Total: {INR(t.amount)}, Outstanding: {INR(t.outstanding_amount)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Amount Received (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 500000"
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Mode</label>
                <select
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Demand Draft">Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reference / UTR / Cheque No</label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  placeholder="e.g. UTR12345678"
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Remarks</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Optional notes regarding this deposit..."
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-navy focus:outline-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg text-xs font-semibold"
              >
                {submitting ? 'Recording...' : 'Generate Receipt & Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official Printable Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={`Official Receipt: ${selectedReceipt.receipt_no || `REC-${selectedReceipt.id}`}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm text-gray-800">
            {/* Receipt Box */}
            <div className="border-2 border-navy rounded-xl p-6 bg-white space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-navy uppercase">DEVOJAS REALTORS PVT. LTD.</h3>
                  <p className="text-xs text-gray-500">Official Payment Receipt & Acknowledgment</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-navy text-white text-xs font-mono font-bold rounded">
                    {selectedReceipt.receipt_no || `REC-${selectedReceipt.id}`}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    Date: {new Date(selectedReceipt.paid_on || selectedReceipt.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 uppercase font-semibold">Received From (Customer):</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    {selectedReceipt.transaction?.buyer?.name || 'Customer'}
                  </p>
                  <p className="text-gray-500">{selectedReceipt.transaction?.buyer?.phone || ''}</p>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-semibold">Towards Property:</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    {selectedReceipt.transaction?.plot?.title || `Deal #${selectedReceipt.transaction_id}`}
                  </p>
                  <p className="text-gray-500">Deal Transaction #{selectedReceipt.transaction_id}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 uppercase font-semibold">Payment Mode:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedReceipt.payment_mode || 'Cash'}</p>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-semibold">Reference / UTR:</span>
                  <p className="font-mono text-gray-900 mt-0.5">{selectedReceipt.reference_no || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-200 flex justify-between items-center">
                <span className="text-emerald-800 font-bold uppercase text-xs">Amount Received:</span>
                <span className="text-emerald-900 font-black text-xl">{INR(selectedReceipt.amount)}</span>
              </div>

              {selectedReceipt.note && (
                <p className="text-xs text-gray-500 italic">Notes: {selectedReceipt.note}</p>
              )}

              <div className="pt-6 border-t flex justify-between items-end text-xs text-gray-400">
                <span>Verified by Accounts Department</span>
                <div className="text-center">
                  <div className="w-36 border-b border-gray-400 mb-1"></div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerPayments;
