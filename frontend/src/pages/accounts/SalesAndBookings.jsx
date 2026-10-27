import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Eye, CheckCircle, Clock, XCircle, FileText, CreditCard, Receipt } from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const SalesAndBookings = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  // Payment Recording State
  const [receiveModalTx, setReceiveModalTx] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_mode: 'Cash',
    reference_no: '',
    note: ''
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentFilter !== 'all') params.payment_status = paymentFilter;
      const res = await api.get('/accounts/transactions', { params });
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, paymentFilter]);

  const openReceiveModal = (t) => {
    setReceiveModalTx(t);
    setPayForm({
      amount: t.outstanding_amount || t.amount || '',
      payment_mode: 'Cash',
      reference_no: '',
      note: `Payment for Deal #${t.id} - ${t.plot?.title || 'Plot'}`
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!receiveModalTx || !payForm.amount || Number(payForm.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setRecordingPayment(true);
    try {
      const res = await api.post('/accounts/payments/record', {
        transaction_id: receiveModalTx.id,
        amount: Number(payForm.amount),
        payment_mode: payForm.payment_mode,
        reference_no: payForm.reference_no,
        note: payForm.note
      });
      alert(res.data.message || 'Payment recorded successfully!');
      setReceiveModalTx(null);
      fetchTransactions();
      if (selectedTx && selectedTx.id === receiveModalTx.id) {
        // refresh selectedTx view
        const updatedTxRes = await api.get('/accounts/transactions');
        const found = (updatedTxRes.data.data || []).find(x => x.id === receiveModalTx.id);
        if (found) setSelectedTx(found);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const filtered = transactions.filter((t) => {
    const term = searchTerm.toLowerCase();
    const plotTitle = t.plot?.title?.toLowerCase() || '';
    const buyerName = t.buyer?.name?.toLowerCase() || '';
    const sellerName = t.sellerAssociate?.name?.toLowerCase() || '';
    const id = String(t.id);
    return plotTitle.includes(term) || buyerName.includes(term) || sellerName.includes(term) || id.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Property Sales & Bookings</h1>
          <p className="text-gray-500 text-sm">All property deals, booking statuses, customer payments and outstanding balances</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 text-gray-400" size={17} />
          <input
            type="text"
            placeholder="Search by Deal #, Plot name, Customer, Seller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded-lg text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="all">All Booking Statuses</option>
            <option value="pending">Pending Bookings</option>
            <option value="confirmed">Confirmed Deals</option>
            <option value="completed">Completed Sales</option>
            <option value="cancelled">Cancelled Deals</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="p-2 border rounded-lg text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partial Payment</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Deal ID & Date</th>
              <th className="px-4 py-3">Property / Plot</th>
              <th className="px-4 py-3">Buyer / Customer</th>
              <th className="px-4 py-3">Selling Associate</th>
              <th className="px-4 py-3 text-right">Deal Value</th>
              <th className="px-4 py-3 text-right">Amount Received</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-center">Payment Status</th>
              <th className="px-4 py-3 text-center">Deal Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-gray-400">Loading property sales...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-gray-400">No transactions found</td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-blue-700 font-mono">{t.transaction_ref || `#${t.id}`}</p>
                    {t.transaction_ref && <p className="text-[10px] text-gray-400 font-mono">Deal #{t.id}</p>}
                    <p className="text-xs text-gray-400">{t.deal_date ? new Date(t.deal_date).toISOString().slice(0, 10) : t.createdAt?.slice(0, 10)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{t.plot?.title || 'Plot Deal'}</p>
                    <p className="text-xs text-gray-400">{t.plot?.location || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.buyer?.name || 'Customer'}</p>
                    <p className="text-xs text-gray-400">{t.buyer?.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.sellerAssociate?.name || t.seller?.name || 'Direct'}</p>
                    <p className="text-xs text-navy font-mono">{t.sellerAssociate?.login_id || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {INR(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {INR(t.paid_amount || 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {INR(t.outstanding_amount || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.payment_status === 'paid' ? 'success' : t.payment_status === 'partial' ? 'warning' : 'danger'}>
                      {t.payment_status || 'unpaid'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.status === 'completed' ? 'success' : t.status === 'confirmed' ? 'info' : t.status === 'cancelled' ? 'danger' : 'warning'}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {Number(t.outstanding_amount || 0) > 0 && (
                        <button
                          onClick={() => openReceiveModal(t)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          title="Record Payment from Customer"
                        >
                          <CreditCard size={12} /> Receive
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTx(t)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-navy hover:text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title={`Deal #${selectedTx.id} — ${selectedTx.plot?.title || 'Property Details'}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border">
              <div>
                <span className="text-xs text-gray-400 uppercase">Total Deal Value</span>
                <p className="font-bold text-gray-900 text-base">{INR(selectedTx.amount)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase">Amount Received</span>
                <p className="font-bold text-emerald-700 text-base">{INR(selectedTx.paid_amount || 0)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase">Outstanding Due</span>
                <p className="font-bold text-red-600 text-base">{INR(selectedTx.outstanding_amount || 0)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase">Deal Status</span>
                <p className="font-bold text-navy text-base uppercase">{selectedTx.status}</p>
              </div>
            </div>

            {/* Payments History for this Deal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Receipt size={15} className="text-emerald-600" />
                  Payments Received for This Deal ({selectedTx.payments?.length || 0})
                </h4>
                {Number(selectedTx.outstanding_amount || 0) > 0 && (
                  <button
                    onClick={() => {
                      const current = selectedTx;
                      setSelectedTx(null);
                      openReceiveModal(current);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <CreditCard size={12} /> + Record Payment
                  </button>
                )}
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 uppercase text-gray-600">
                    <tr>
                      <th className="p-2">Receipt #</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(!selectedTx.payments || selectedTx.payments.length === 0) ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-gray-400">
                          No payments recorded yet for this deal. Click "+ Record Payment" or "Receive" to log customer receipts.
                        </td>
                      </tr>
                    ) : (
                      selectedTx.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono font-bold text-navy">{p.receipt_no || `#${p.id}`}</td>
                          <td className="p-2 text-gray-600">{p.paid_on ? new Date(p.paid_on).toLocaleDateString() : '—'}</td>
                          <td className="p-2 font-medium">{p.payment_mode}</td>
                          <td className="p-2 font-mono text-gray-500">{p.reference_no || '—'}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">+{INR(p.amount)}</td>
                          <td className="p-2 text-center">
                            <Badge variant={p.status === 'verified' ? 'success' : 'warning'}>{p.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commissions Generated for this Deal */}
            <div>
              <h4 className="font-bold text-gray-800 mb-2">Commissions Accrued for This Transaction</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 uppercase text-gray-600">
                    <tr>
                      <th className="p-2">Beneficiary</th>
                      <th className="p-2">Role</th>
                      <th className="p-2 text-center">Diff Rate</th>
                      <th className="p-2 text-right">Commission Amount</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(!selectedTx.commissions || selectedTx.commissions.length === 0) ? (
                      <tr><td colSpan="5" className="p-3 text-center text-gray-400">No commissions calculated yet</td></tr>
                    ) : (
                      selectedTx.commissions.map((c) => (
                        <tr key={c.id}>
                          <td className="p-2 font-medium">Associate #{c.user_id}</td>
                          <td className="p-2">{c.level === 0 ? 'Direct Seller' : `Upline Level ${c.level}`}</td>
                          <td className="p-2 text-center font-bold">{c.differential_percent !== null ? `${c.differential_percent}%` : `${c.percent}%`}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">+{INR(c.amount)}</td>
                          <td className="p-2 text-center"><Badge variant={c.status === 'paid' ? 'success' : 'info'}>{c.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              {Number(selectedTx.outstanding_amount || 0) > 0 && (
                <button
                  onClick={() => {
                    const current = selectedTx;
                    setSelectedTx(null);
                    openReceiveModal(current);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <CreditCard size={13} /> Receive Payment
                </button>
              )}
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receive Payment Modal */}
      {receiveModalTx && (
        <Modal
          isOpen={!!receiveModalTx}
          onClose={() => setReceiveModalTx(null)}
          title={`Receive Customer Payment — Deal #${receiveModalTx.id}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Customer / Buyer</p>
                <p className="font-bold text-gray-900">{receiveModalTx.buyer?.name || 'Customer'}</p>
                <p className="text-xs text-gray-500 font-mono">{receiveModalTx.buyer?.phone || ''}</p>
                <p className="text-xs text-navy font-semibold mt-1">{receiveModalTx.plot?.title || 'Plot Deal'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase">Outstanding Due</p>
                <p className="font-extrabold text-red-600 text-base">{INR(receiveModalTx.outstanding_amount || receiveModalTx.amount)}</p>
                <p className="text-[11px] text-gray-400">Total: {INR(receiveModalTx.amount)}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Received Payment Amount (₹) *</label>
              <input
                type="number"
                step="any"
                required
                max={receiveModalTx.outstanding_amount || undefined}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-navy focus:outline-none font-bold text-gray-800 text-base"
                placeholder="Enter amount received"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Remaining due after this payment: {INR(Math.max(0, (receiveModalTx.outstanding_amount || 0) - (Number(payForm.amount) || 0)))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Mode *</label>
                <select
                  value={payForm.payment_mode}
                  onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value })}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-navy focus:outline-none text-xs font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="Online / Bank Transfer">Online / Bank Transfer</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Demand Draft">Demand Draft (DD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Ref / UTR / Cheque #</label>
                <input
                  type="text"
                  value={payForm.reference_no}
                  onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-navy focus:outline-none text-xs"
                  placeholder="Optional reference ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={payForm.note}
                onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-navy focus:outline-none text-xs"
                placeholder="e.g. Advance token, Installment 1..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setReceiveModalTx(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recordingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow"
              >
                <CheckCircle size={14} />
                {recordingPayment ? 'Recording...' : 'Confirm & Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SalesAndBookings;
