import React, { useState, useEffect } from 'react';
import {
  Building2, Search, IndianRupee, CheckCircle2, AlertCircle, RefreshCw,
  Download, FileText, User, Phone, Mail, MapPin, Calendar, CreditCard
} from 'lucide-react';
import api from '../../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AssociatePlotPurchasing = () => {
  const [tab, setTab] = useState('browse'); // 'browse' | 'purchase' | 'history'
  const [plots, setPlots] = useState([]);
  const [projects, setProjects] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlot, setSelectedPlot] = useState(null);

  const [form, setForm] = useState({
    // Customer Details
    applicant_name: '',
    applicant_phone: '',
    applicant_email: '',
    applicant_address: '',
    referral_id: '',
    father_husband_name: '',
    govt_id_type: 'Aadhaar',
    govt_id_number: '',
    nominee_name: '',
    nominee_relation: '',
    // Payment Details
    payment_plan_type: 'booking_balance',
    payment_mode: 'NEFT / Bank Transfer',
    booking_amount: '',
    total_plot_price: '',
    transaction_ref: `ASC-SALE-${Date.now().toString().slice(-4)}`,
    notes: '',
    declaration_accepted: true,
    mark_confirmed: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plotsRes, projectsRes] = await Promise.all([
        api.get('/associate/plots'),
        api.get('/projects').catch(() => ({ data: { data: [] } }))
      ]);
      setPlots(plotsRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const res = await api.get('/associate/sales');
      setPurchases(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPurchaseHistory();
  }, []);

  const availablePlots = plots.filter(p =>
    p.status === 'available' && (
      !searchQuery ||
      p.plot_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    setForm(prev => ({
      ...prev,
      total_plot_price: plot.price || plot.basic_price || '',
      booking_amount: Math.round((plot.price || plot.basic_price || 0) * 0.1)
    }));
    setTab('purchase');
    setSuccessResult(null);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlot) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      // Use the booking form API since associates submit booking forms
      const payload = {
        plot_id: selectedPlot.id,
        applicant_name: form.applicant_name,
        applicant_phone: form.applicant_phone,
        applicant_email: form.applicant_email,
        applicant_address: form.applicant_address,
        referral_id: form.referral_id || '',
        father_husband_name: form.father_husband_name,
        govt_id_type: form.govt_id_type,
        govt_id_number: form.govt_id_number,
        nominee_name: form.nominee_name,
        nominee_relation: form.nominee_relation,
        payment_plan_type: form.payment_plan_type,
        payment_mode: form.payment_mode,
        booking_amount: form.booking_amount,
        total_plot_price: form.total_plot_price,
        transaction_ref: form.transaction_ref,
        notes: form.notes,
        declaration_accepted: form.declaration_accepted
      };

      const res = await api.post('/booking-forms', payload);
      setSuccessResult(res.data);
      fetchPurchaseHistory();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = async (txnId) => {
    try {
      const res = await api.get(`/associate/transactions/${txnId}/receipt-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${txnId}.pdf`;
      link.click();
    } catch {
      alert('Receipt not available. Please contact accounts.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Building2 size={24} className="text-blue-600" />
          Plot Purchasing & Customer Booking
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Browse available plots, submit customer bookings, and track your sales
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'browse', label: 'Browse Available Plots' },
          { key: 'purchase', label: selectedPlot ? `Book: ${selectedPlot.plot_code}` : 'Submit Booking' },
          { key: 'history', label: `My Sales (${purchases.length})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Browse Plots */}
      {tab === 'browse' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by plot code, location, project..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-9 w-full"
              />
            </div>
            <button onClick={fetchData} className="btn-ghost flex items-center gap-2">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Loading plots...
            </div>
          ) : availablePlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 size={32} className="mb-3 opacity-40" />
              <p className="font-medium">No available plots found</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Try a different search term' : 'No plots are currently available for booking'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlots.map(plot => (
                <div key={plot.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-300 transition-all">
                  {plot.image_url && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={plot.image_url}
                        alt={plot.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {!plot.image_url && (
                    <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                      <Building2 size={32} className="text-blue-400 opacity-50" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{plot.plot_code}</p>
                        <p className="text-xs text-gray-500">{plot.title || plot.location}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                        Available
                      </span>
                    </div>
                    {plot.project && (
                      <p className="text-xs text-blue-600 mb-2">📍 {plot.project.name}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                      <div><span className="text-gray-400">Size:</span> {plot.size_sqft} sq.ft.</div>
                      <div><span className="text-gray-400">Facing:</span> {plot.facing || '—'}</div>
                      {plot.block && <div><span className="text-gray-400">Block:</span> {plot.block}</div>}
                      {plot.plot_number && <div><span className="text-gray-400">Plot#:</span> {plot.plot_number}</div>}
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-gray-400">Plot Price</p>
                      <p className="text-lg font-black text-emerald-700">{INR(plot.price || plot.basic_price)}</p>
                      {plot.basic_price && plot.price !== plot.basic_price && (
                        <p className="text-xs text-gray-400">Base: {INR(plot.basic_price)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectPlot(plot)}
                      className="w-full btn-primary text-sm"
                    >
                      Book This Plot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Purchase / Booking Form */}
      {tab === 'purchase' && (
        <div className="space-y-5">
          {!selectedPlot ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              Please select a plot from the <button onClick={() => setTab('browse')} className="underline font-semibold">Browse Plots</button> tab first.
            </div>
          ) : successResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-emerald-800 text-lg mb-1">Booking Submitted Successfully!</h3>
              <p className="text-emerald-700 text-sm mb-4">
                Booking for <strong>{selectedPlot.plot_code}</strong> has been submitted for admin review.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => { setSelectedPlot(null); setSuccessResult(null); setTab('browse'); fetchData(); }}
                  className="btn-ghost"
                >
                  Browse More Plots
                </button>
                <button
                  onClick={() => setTab('history')}
                  className="btn-primary"
                >
                  View My Sales
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selected Plot Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Building2 size={20} className="text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-blue-900">{selectedPlot.plot_code} — {selectedPlot.title || selectedPlot.location}</p>
                    <p className="text-sm text-blue-700">
                      {selectedPlot.size_sqft} sq.ft. | Price: {INR(selectedPlot.price || selectedPlot.basic_price)}
                      {selectedPlot.project && ` | ${selectedPlot.project.name}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => setTab('browse')} className="ml-auto text-xs text-blue-600 underline">
                    Change Plot
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {errorMessage}
                </div>
              )}

              {/* Customer Details */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <User size={16} className="text-blue-600" /> Customer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Customer Name *</label>
                    <input required className="input" value={form.applicant_name}
                      onChange={e => setForm(p => ({ ...p, applicant_name: e.target.value }))}
                      placeholder="Full name as per ID"
                    />
                  </div>
                  <div>
                    <label className="label">Father / Husband Name</label>
                    <input className="input" value={form.father_husband_name}
                      onChange={e => setForm(p => ({ ...p, father_husband_name: e.target.value }))}
                      placeholder="Father / Husband name"
                    />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input required className="input" value={form.applicant_phone}
                      onChange={e => setForm(p => ({ ...p, applicant_phone: e.target.value }))}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <label className="label">Referred By / Referral ID</label>
                    <input className="input" value={form.referral_id}
                      onChange={e => setForm(p => ({ ...p, referral_id: e.target.value }))}
                      placeholder="Associate ID (blank = you)"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={form.applicant_email}
                      onChange={e => setForm(p => ({ ...p, applicant_email: e.target.value }))}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Address</label>
                    <input className="input" value={form.applicant_address}
                      onChange={e => setForm(p => ({ ...p, applicant_address: e.target.value }))}
                      placeholder="Current residential address"
                    />
                  </div>
                  <div>
                    <label className="label">ID Type</label>
                    <select className="select" value={form.govt_id_type}
                      onChange={e => setForm(p => ({ ...p, govt_id_type: e.target.value }))}>
                      <option>Aadhaar</option>
                      <option>PAN</option>
                      <option>Voter ID</option>
                      <option>Passport</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">ID Number</label>
                    <input className="input" value={form.govt_id_number}
                      onChange={e => setForm(p => ({ ...p, govt_id_number: e.target.value }))}
                      placeholder="Government ID number"
                    />
                  </div>
                  <div>
                    <label className="label">Nominee Name</label>
                    <input className="input" value={form.nominee_name}
                      onChange={e => setForm(p => ({ ...p, nominee_name: e.target.value }))}
                      placeholder="Nominee full name"
                    />
                  </div>
                  <div>
                    <label className="label">Nominee Relation</label>
                    <input className="input" value={form.nominee_relation}
                      onChange={e => setForm(p => ({ ...p, nominee_relation: e.target.value }))}
                      placeholder="e.g. Spouse, Son, Daughter"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-600" /> Payment Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Payment Plan</label>
                    <select className="select" value={form.payment_plan_type}
                      onChange={e => setForm(p => ({ ...p, payment_plan_type: e.target.value }))}>
                      <option value="booking_balance">Booking + Balance</option>
                      <option value="full">Full Payment</option>
                      <option value="emi">EMI Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Mode</label>
                    <select className="select" value={form.payment_mode}
                      onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}>
                      <option>NEFT / Bank Transfer</option>
                      <option>Cheque</option>
                      <option>UPI</option>
                      <option>Cash</option>
                      <option>RTGS</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Total Plot Price (₹) *</label>
                    <input required type="number" className="input" value={form.total_plot_price}
                      onChange={e => setForm(p => ({ ...p, total_plot_price: e.target.value }))}
                      placeholder="Total agreed sale price"
                    />
                  </div>
                  <div>
                    <label className="label">Booking Amount (₹) *</label>
                    <input required type="number" className="input" value={form.booking_amount}
                      onChange={e => setForm(p => ({ ...p, booking_amount: e.target.value }))}
                      placeholder="Amount being paid now"
                    />
                  </div>
                  <div>
                    <label className="label">Transaction Reference</label>
                    <input className="input" value={form.transaction_ref}
                      onChange={e => setForm(p => ({ ...p, transaction_ref: e.target.value }))}
                      placeholder="Bank ref / cheque no."
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes / Remarks</label>
                  <textarea className="input" rows={2} value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any additional notes for the booking"
                  />
                </div>
              </div>

              {/* Declaration */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.declaration_accepted}
                    onChange={e => setForm(p => ({ ...p, declaration_accepted: e.target.checked }))}
                    className="mt-0.5"
                    required
                  />
                  <span className="text-xs text-gray-600">
                    I confirm that all the above information is correct and the customer has agreed to the plot booking terms.
                    This booking is subject to admin verification and approval.
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting ? 'Submitting...' : 'Submit Booking'}
                </button>
                <button type="button" onClick={() => setTab('browse')} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab: Purchase History */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">My Sales & Bookings</h3>
            <button onClick={fetchPurchaseHistory} className="btn-ghost flex items-center gap-2 text-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText size={32} className="mb-3 opacity-40" />
              <p className="font-medium">No sales or bookings yet</p>
              <p className="text-sm mt-1">Your submitted bookings will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-gray-600 uppercase text-xs tracking-wider border-b">
                    <tr>
                      <th className="px-4 py-3">Plot</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchases.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{deal.plot?.plot_code || `Plot #${deal.plot_id}`}</div>
                          <div className="text-xs text-gray-400">{deal.plot?.title || deal.plot?.location || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-700">{deal.buyer?.name || '—'}</div>
                          <div className="text-xs text-gray-400">{deal.buyer?.phone || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{INR(deal.amount)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{INR(deal.paid_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            deal.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            deal.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {deal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {deal.deal_date ? new Date(deal.deal_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {deal.status === 'completed' && (
                            <button
                              onClick={() => downloadReceipt(deal.id)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Download size={12} /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssociatePlotPurchasing;
