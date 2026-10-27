import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, User, CreditCard, CheckCircle2, AlertCircle, ArrowRight,
  RefreshCw, MapPin, Sparkles, Building2, IndianRupee
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const PlotSales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Form State
  const [form, setForm] = useState({
    // Plot Info
    plot_id: '',
    plot_code: '',
    project_id: '',
    project_name: '',
    sector_no: '',
    plot_no: '',
    plot_size: '',
    rate_per_sqft: '',
    basic_plot_price: 0,
    total_plot_price: 0,

    // Customer / Applicant Details
    applicant_name: '',
    applicant_phone: '',
    applicant_email: '',
    applicant_address: '',
    govt_id_type: 'Aadhaar',
    govt_id_number: '',
    nominee_name: '',
    nominee_relation: '',

    // Payment details
    payment_plan_type: 'booking_balance', // 'full', 'booking_balance'
    payment_mode: 'Bank Transfer',
    transaction_ref: '',
    booking_amount: 100000,
    remaining_balance: 0,

    // Notes
    declaration_accepted: true
  });

  // Fetch available plots
  useEffect(() => {
    const fetchPlots = async () => {
      setLoading(true);
      try {
        const res = await api.get('/plots/public');
        // Filter only available plots
        const avail = (res.data.data || []).filter(p => p.status === 'available');
        setPlots(avail);
      } catch (err) {
        console.error('Failed to load plots:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlots();
  }, []);

  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    const price = parseFloat(plot.price || 0);
    const basic = parseFloat(plot.basic_price || (plot.size_sqft * (plot.rate_per_sqft || 1500)) || price);
    const bookingAmt = Math.min(price * 0.1, 200000); // 10% or 2L
    const remaining = Math.max(0, price - bookingAmt);

    setForm(prev => ({
      ...prev,
      plot_id: plot.id,
      plot_code: plot.plot_code || `PLOT-${plot.id}`,
      project_id: plot.project_id || '',
      project_name: plot.project?.name || 'Devojas Project',
      sector_no: plot.sector_number || '',
      plot_no: plot.plot_number || '',
      plot_size: `${plot.size_sqft} Sq.ft`,
      rate_per_sqft: plot.rate_per_sqft || '',
      basic_plot_price: basic,
      total_plot_price: price,
      booking_amount: bookingAmt,
      remaining_balance: remaining,
      transaction_ref: `SALE-${Date.now().toString().slice(-5)}`
    }));
  };

  const handleBookingAmountChange = (amt) => {
    const val = parseFloat(amt || 0);
    const price = parseFloat(form.total_plot_price || 0);
    setForm(prev => ({
      ...prev,
      booking_amount: val,
      remaining_balance: Math.max(0, price - val)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!form.plot_id) {
      setErrorMessage('Please select an eligible plot to sell.');
      return;
    }
    if (!form.applicant_name || !form.applicant_phone) {
      setErrorMessage('Please provide customer name and contact phone.');
      return;
    }

    setSubmitting(true);
    try {
      // Associate is automatically bound to current logged-in associate (Req 3 Permission Rules)
      const payload = {
        ...form,
        associate_id: user.id,
        selling_associate_name: user.name,
        selling_associate_code: user.login_id,
        mark_confirmed: true // Trigger approval & differential commission calculation
      };

      const res = await api.post('/booking-forms', payload);
      if (res.data.success) {
        setSuccessResult(res.data.data);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit customer plot booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy/10 text-navy uppercase tracking-wider">
              Associate Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Eligible Selling Pricing
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Plot Purchasing & Customer Sales</h1>
          <p className="text-sm text-gray-500">
            Select an approved plot from inventory, enter customer details, and record a booking with instant commission generation
          </p>
        </div>

        <button
          onClick={() => navigate('/associate/sales')}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start"
        >
          View My Sales
        </button>
      </div>

      {/* Success Modal / Banner */}
      {successResult && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Customer Plot Sale & Booking Confirmed!
                </h3>
                <p className="text-xs text-emerald-700">
                  Booking Ref: <b>{successResult.bookingForm?.booking_ref}</b> · Txn Ref: <b>{successResult.transaction?.transaction_ref}</b>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSuccessResult(null);
                setSelectedPlot(null);
              }}
              className="text-xs bg-emerald-200 text-emerald-800 px-3 py-1 rounded-lg font-bold hover:bg-emerald-300"
            >
              New Sale
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-emerald-200 text-sm">
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Total Authorized Sale Price</span>
              <span className="text-base font-extrabold text-navy">
                {INR(successResult.bookingForm?.total_plot_price)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Booking Amount Received</span>
              <span className="text-base font-extrabold text-emerald-600">
                {INR(successResult.payment?.amount || successResult.bookingForm?.booking_amount)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Customer Balance</span>
              <span className="text-base font-extrabold text-red-600">
                {INR(successResult.bookingForm?.remaining_balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Step 1 Select Plot | Step 2 Customer Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1: Available Plots (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Building2 size={16} className="text-navy" />
              1. Select Eligible Plot
            </h2>
            <p className="text-xs text-gray-400">
              Only available inventory plots with approved selling prices can be booked.
            </p>

            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-gray-400 text-xs font-medium">
                  <RefreshCw className="animate-spin inline-block mr-1.5" size={14} /> Loading available plots...
                </div>
              ) : plots.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">
                  No plots available right now.
                </div>
              ) : (
                plots.map((p) => {
                  const isSelected = selectedPlot?.id === p.id;
                  const base = parseFloat(p.basic_price || p.price);
                  const price = parseFloat(p.price);
                  const diff = Math.max(0, price - base);

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlot(p)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-navy bg-navy/5 shadow-md ring-1 ring-navy'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{p.title}</h4>
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {p.location || 'Site'} · {p.size_sqft} Sq.ft
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                          Available
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold">Approved Base Price</span>
                          <span className="font-bold text-gray-700">{INR(base)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block font-semibold">Authorized Sale Price</span>
                          <span className="font-extrabold text-navy">{INR(price)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Customer Booking Form (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <User size={18} className="text-navy" />
                2. Customer Booking & Sale Details
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Selling associate: <b className="text-navy">{user?.name}</b> (<span className="font-mono">{user?.login_id}</span>) · Commission Rate: <b className="text-gold">{parseFloat(user?.commission_percent || 0)}%</b>
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Selected Plot Summary Header */}
            {selectedPlot ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{selectedPlot.title}</span>
                  <span className="font-mono text-navy font-bold">{form.plot_code}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Base Price</span>
                    <span className="font-bold text-gray-700">{INR(form.basic_plot_price)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Authorized Selling</span>
                    <span className="font-extrabold text-navy">{INR(form.total_plot_price)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Eligible Diff</span>
                    <span className="font-bold text-emerald-600">
                      {INR(Math.max(0, form.total_plot_price - form.basic_plot_price))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                👈 Please select a plot from the left panel to begin.
              </div>
            )}

            {/* Customer Inputs */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer / Buyer Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Customer Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.applicant_name}
                    onChange={e => setForm(f => ({ ...f, applicant_name: e.target.value }))}
                    placeholder="e.g. Ramesh Chandra"
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Customer Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.applicant_phone}
                    onChange={e => setForm(f => ({ ...f, applicant_phone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={form.applicant_email}
                    onChange={e => setForm(f => ({ ...f, applicant_email: e.target.value }))}
                    placeholder="customer@example.com"
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Aadhaar / Govt ID No</label>
                  <input
                    type="text"
                    value={form.govt_id_number}
                    onChange={e => setForm(f => ({ ...f, govt_id_number: e.target.value }))}
                    placeholder="e.g. 1234 5678 9012"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-gray-700 mb-1">Customer Address</label>
                <input
                  type="text"
                  value={form.applicant_address}
                  onChange={e => setForm(f => ({ ...f, applicant_address: e.target.value }))}
                  placeholder="Street, City, Pincode"
                  className="input-field text-xs"
                />
              </div>
            </div>

            {/* Payment Plan */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Plan & Initial Booking</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={form.payment_mode}
                    onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                    className="input-field text-xs font-semibold"
                  >
                    <option value="Bank Transfer">NEFT / Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Initial Booking Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.booking_amount}
                    onChange={e => handleBookingAmountChange(e.target.value)}
                    className="input-field text-xs font-extrabold text-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Customer Remaining Balance:</span>
                <span className="font-extrabold text-red-600 font-mono text-sm">
                  {INR(form.remaining_balance)}
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={submitting || !selectedPlot}
                className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Submitting Sale...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Submit Customer Plot Sale
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlotSales;
