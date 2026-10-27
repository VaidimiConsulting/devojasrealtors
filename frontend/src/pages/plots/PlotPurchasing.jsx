import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Home, User, Users, CreditCard, FileCheck, CheckCircle2, 
  AlertCircle, ArrowRight, Printer, Download, Sparkles, RefreshCw, Plus
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PlotPurchasesList from './PlotPurchasesList';

// mode='admin'     : Admin customer booking (select any selling associate)
// mode='associate' : SAME form, booking workflow only; seller & Associate ID are the logged-in associate
const PlotPurchasing = ({ mode = 'admin', initialTab = 'form' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isAssociate = mode === 'associate';
  const { user } = useAuth();

  const isListInitial = initialTab === 'list' || 
    searchParams.get('tab') === 'list' || 
    searchParams.get('tab') === 'purchases' || 
    location.pathname.includes('/plot-purchases');

  const [activeTab, setActiveTab] = useState(isListInitial ? 'list' : 'form');

  useEffect(() => {
    if (searchParams.get('tab') === 'list' || searchParams.get('tab') === 'purchases' || location.pathname.includes('/plot-purchases')) {
      setActiveTab('list');
    }
  }, [searchParams, location.pathname]);

  // Master Data
  const [plots, setPlots] = useState([]);
  const [clients, setClients] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected State
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [selectedAssociateId, setSelectedAssociateId] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Section C Upline Data (fetched dynamically)
  const [uplineData, setUplineData] = useState(null);
  const [loadingUpline, setLoadingUpline] = useState(false);

  // Form State
  const [form, setForm] = useState({
    // Section A
    project_id: '',
    project_name: '',
    plot_id: '',
    plot_code: '',
    sector_no: '',
    plot_no: '',
    plot_size: '',
    size_unit: 'Sq.ft.',
    rate_per_sqft: '',
    basic_plot_price: '',
    is_corner: false,
    corner_percent: 0,
    corner_charge_amount: 0,
    is_park_facing: false,
    park_facing_percent: 0,
    park_facing_charge_amount: 0,
    other_approved_charges: 0,
    discount_amount: 0,
    total_plot_price: 0,

    // Section B
    client_id: '',
    client_code: '',
    applicant_name: '',
    father_husband_name: '',
    applicant_phone: '',
    applicant_email: '',
    applicant_address: '',
    permanent_address: '',
    govt_id_type: 'Aadhaar',
    govt_id_number: '',
    nominee_name: '',
    nominee_relation: '',
    applicant_date: new Date().toISOString().split('T')[0],
    applicant_place: 'Head Office',

    // Section C
    associate_id: '',
    selling_associate_name: '',
    selling_associate_code: '',
    selling_associate_ref_id: '',
    direct_sponsor_id: '',
    direct_sponsor_name: '',
    direct_sponsor_code: '',
    direct_sponsor_ref_id: '',
    referral_chain_info: '',

    // Section D
    payment_plan_type: 'booking_balance', // 'full', 'booking_balance', 'emi'
    payment_mode: 'NEFT / Bank Transfer',
    check_no: '',
    upi_id: '',
    bank_name: '',
    transaction_ref: `SALE-${Date.now().toString().slice(-6)}`,
    booking_amount: 200000,
    down_payment_amt: 0,
    remaining_balance: 1800000,
    emi_duration_months: 12,
    emi_amount: 150000,
    installment_frequency: 'monthly',
    first_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // Section E
    declaration_accepted: true,
    authorized_officer_name: 'Authorized Officer',
    mark_confirmed: true
  });

  // Fetch Master Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAssociate) {
          const plotRes = await api.get('/associate/plots');
          setPlots(plotRes.data.data || []);
        } else {
          const [plotRes, clientRes, assocRes] = await Promise.all([
            api.get('/plots'),
            api.get('/users', { params: { role: 'client' } }),
            api.get('/users', { params: { role: 'associate', status: 'active' } })
          ]);
          setPlots(plotRes.data.data || []);
          setClients(clientRes.data.data || []);
          setAssociates(assocRes.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching master data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Available plots — strictly available or approved status only
  const availableInventoryPlots = plots.filter(p =>
    p && ['available', 'approved'].includes(String(p.status || '').toLowerCase())
  );

  const [plotNumberWarning, setPlotNumberWarning] = useState('');

  // When Plot is selected — ALWAYS calculate price from size × rate, never from stored basic_price
  const handlePlotSelect = (plotId) => {
    setSelectedPlotId(plotId);
    setPlotNumberWarning('');
    if (!plotId) {
      setForm(prev => ({
        ...prev,
        plot_id: '',
        plot_code: '',
        plot_no: '',
        basic_plot_price: 0,
        total_plot_price: 0,
        remaining_balance: 0
      }));
      return;
    }

    const plot = plots.find(p => String(p.id) === String(plotId));
    if (!plot) return;

    const size = parseFloat(plot.size_sqft || plot.area_sqft || 0);
    // Primary: use stored rate_per_sqft; fallback: derive from price / size
    const rate = parseFloat(plot.rate_per_sqft) ||
      (size > 0 && plot.price ? Math.round(parseFloat(plot.price) / size) : 0);
    // Base price = size × rate (authoritative); fallback to stored price if both size and rate are 0
    const basic = (size > 0 && rate > 0) ? size * rate : parseFloat(plot.price || 0);
    const cornerCharge = plot.is_corner ? basic * 0.1 : 0;
    const parkCharge = plot.is_park_facing ? basic * 0.1 : 0;
    const total = basic + cornerCharge + parkCharge;

    setForm(prev => {
      const bookingAmt = parseFloat(prev.booking_amount || 0);
      return {
        ...prev,
        plot_id: plot.id,
        plot_code: plot.plot_code || `PLOT-${plot.id}`,
        project_id: plot.project_id || '',
        project_name: plot.project?.name || plot.title || '',
        sector_no: plot.sector_number || plot.block || prev.sector_no || '',
        plot_no: plot.plot_number || plot.plot_code || String(plot.id),
        plot_size: String(size),
        rate_per_sqft: String(rate),
        basic_plot_price: basic,
        is_corner: Boolean(plot.is_corner),
        corner_percent: plot.is_corner ? 10 : 0,
        corner_charge_amount: cornerCharge,
        is_park_facing: Boolean(plot.is_park_facing),
        park_facing_percent: plot.is_park_facing ? 10 : 0,
        park_facing_charge_amount: parkCharge,
        other_approved_charges: 0,
        discount_amount: 0,
        total_plot_price: total,
        remaining_balance: Math.max(0, total - bookingAmt)
      };
    });
  };

  const handlePlotNumberInput = (typedPlotNo) => {
    setForm(prev => ({ ...prev, plot_no: typedPlotNo }));
    setPlotNumberWarning('');
    if (!typedPlotNo || !typedPlotNo.trim()) return;
    const cleanTyped = typedPlotNo.trim().toLowerCase();

    const matchedAvailable = availableInventoryPlots.find(p =>
      (p.plot_number && String(p.plot_number).trim().toLowerCase() === cleanTyped) ||
      (p.plot_code && String(p.plot_code).trim().toLowerCase() === cleanTyped)
    );
    if (matchedAvailable) {
      if (String(matchedAvailable.id) !== String(selectedPlotId)) handlePlotSelect(matchedAvailable.id);
      return;
    }

    const matchedAny = plots.find(p =>
      (p.plot_number && String(p.plot_number).trim().toLowerCase() === cleanTyped) ||
      (p.plot_code && String(p.plot_code).trim().toLowerCase() === cleanTyped)
    );
    if (matchedAny) {
      setPlotNumberWarning(`Plot #${typedPlotNo} is currently "${matchedAny.status?.toUpperCase() || 'UNAVAILABLE'}". Only Available plots can be booked.`);
    } else {
      setPlotNumberWarning(`Plot #${typedPlotNo} not found in inventory. Select from the dropdown above.`);
    }
  };

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => String(c.id) === String(clientId));
    if (!client) return;
    setForm(prev => ({
      ...prev,
      client_id: client.id,
      client_code: client.login_id || `CLI-${client.id}`,
      applicant_name: client.name || '',
      applicant_phone: client.phone || '',
      applicant_email: client.email || '',
      applicant_address: client.address || 'Registered Address',
      permanent_address: client.address || 'Registered Address'
    }));
    if (client.referred_by) handleAssociateSelect(client.referred_by);
  };

  const handleAssociateSelect = async (assocId) => {
    setSelectedAssociateId(assocId);
    if (!assocId) { setUplineData(null); return; }
    setLoadingUpline(true);
    try {
      const res = await api.get(`/booking-forms/associate-details/${assocId}`);
      if (res.data.success) {
        const d = res.data.data;
        setUplineData(d);
        const uplineSummary = (d.uplineChain || []).map(u => `${u.name} (${u.commission_percent}%)`).join(' -> ');
        setForm(prev => ({
          ...prev,
          associate_id: d.associate.id,
          selling_associate_name: d.associate.name,
          selling_associate_code: d.associate.login_id,
          selling_associate_ref_id: d.associate.login_id,
          referral_id: d.directSponsor?.login_id || 'DIRECT',
          direct_sponsor_id: d.directSponsor?.id || '',
          direct_sponsor_name: d.directSponsor?.name || 'Root / None',
          direct_sponsor_code: d.directSponsor?.login_id || '—',
          direct_sponsor_ref_id: d.directSponsor?.login_id || '—',
          referral_chain_info: uplineSummary
            ? `${d.associate.name} (${d.associate.commission_percent}%) -> ${uplineSummary}`
            : `${d.associate.name} (${d.associate.commission_percent}%)`
        }));
      }
    } catch (err) {
      console.error('Failed to load associate upline:', err);
    } finally {
      setLoadingUpline(false);
    }
  };

  useEffect(() => {
    if (isAssociate && user?.id) handleAssociateSelect(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssociate, user?.id]);

  // Live price recalculation — base is always size × rate
  const recalculatePrice = (updates) => {
    const updated = { ...form, ...updates };
    const size = parseFloat(updated.plot_size || 0);
    const rate = parseFloat(updated.rate_per_sqft || 0);
    const basic = size * rate; // authoritative base

    const cornerCharge = updated.is_corner && updated.corner_percent
      ? basic * (parseFloat(updated.corner_percent) / 100)
      : 0;
    const parkCharge = updated.is_park_facing && updated.park_facing_percent
      ? basic * (parseFloat(updated.park_facing_percent) / 100)
      : 0;
    const other = parseFloat(updated.other_approved_charges || 0);
    const discount = parseFloat(updated.discount_amount || 0);
    const total = Math.max(0, basic + cornerCharge + parkCharge + other - discount);

    const paid = updated.payment_plan_type === 'full'
      ? total
      : parseFloat(updated.booking_amount || 0) + parseFloat(updated.down_payment_amt || 0);
    const balance = Math.max(0, total - paid);

    setForm({
      ...updated,
      booking_amount: updated.payment_plan_type === 'full' ? total : updated.booking_amount,
      basic_plot_price: basic,
      corner_charge_amount: cornerCharge,
      park_facing_charge_amount: parkCharge,
      total_plot_price: total,
      remaining_balance: balance
    });
  };

  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Authenticated receipt download
  const handleDownloadReceipt = async (paymentId, txnId) => {
    setDownloadingReceipt(true);
    try {
      const endpoint = paymentId
        ? `/accounts/payments/${paymentId}/receipt-pdf`
        : `/accounts/transactions/${txnId}/receipt-pdf`;
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Official-Receipt-${paymentId || txnId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Blob download failed, trying token fallback:', err);
      const token = localStorage.getItem('token');
      const target = paymentId ? `payments/${paymentId}` : `transactions/${txnId}`;
      window.open(`/api/accounts/${target}/receipt-pdf?token=${encodeURIComponent(token || '')}`, '_blank');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Authenticated Booking Details PDF — uses JWT via axios (avoids blank page from bare window.open)
  const handleDownloadBookingPdf = async (txnId, txnRef) => {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/transactions/${txnId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Booking-Details-${txnRef || txnId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);
    } catch (err) {
      setErrorMessage(`PDF download failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Submit Booking Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    let effectivePlotId = form.plot_id;
    if (!effectivePlotId && form.plot_no && form.plot_no.trim()) {
      const cleanNo = form.plot_no.trim().toLowerCase();
      const matched = availableInventoryPlots.find(p =>
        (p.plot_number && String(p.plot_number).trim().toLowerCase() === cleanNo) ||
        (p.plot_code && String(p.plot_code).trim().toLowerCase() === cleanNo)
      );
      if (matched) {
        effectivePlotId = matched.id;
        setForm(prev => ({ ...prev, plot_id: matched.id }));
      }
    }

    if (!effectivePlotId) {
      setErrorMessage(form.plot_no
        ? `Plot #${form.plot_no} is not available. Please select an available plot from the dropdown.`
        : 'Please select an available plot from inventory to book.');
      return;
    }
    if (!form.applicant_name || !form.applicant_phone) {
      setErrorMessage('Please provide applicant name and contact phone.');
      return;
    }
    if (!form.associate_id) {
      setErrorMessage('Please assign a selling associate for MLM referral and commission calculation.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        booking_amount: form.payment_plan_type === 'full' ? form.total_plot_price : form.booking_amount,
        remaining_balance: form.payment_plan_type === 'full' ? 0 : form.remaining_balance
      };
      const res = await api.post('/booking-forms', payload);
      if (res.data.success) {
        setSuccessResult(res.data.data);
        try {
          const pr = await api.get(isAssociate ? '/associate/plots' : '/plots');
          setPlots(pr.data.data || []);
          setSelectedPlotId('');
        } catch (_) { /* non-fatal */ }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit plot purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy/10 text-navy uppercase tracking-wider">
              {isAssociate ? 'Associate Operations' : 'Inventory & Real Estate Operations'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {activeTab === 'list' ? 'Plot Purchases List' : (isAssociate ? 'Associate Plot Booking' : 'Customer Plot Sale & Booking')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            {activeTab === 'list'
              ? (isAssociate ? 'My Plot Purchases List' : 'All Plot Purchases List')
              : (isAssociate ? 'Plot Purchasing & Customer Booking' : 'Plot Sale / Customer Booking')}
          </h1>
          <p className="text-sm text-gray-500">
            {activeTab === 'list'
              ? 'Authorized customer plot purchase transactions, payment records, plot specifications, and verified receipts.'
              : 'Book or sell available plots directly to customers. Associates earn differential MLM commissions on verified sales.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'list' ? (
            <button
              type="button"
              onClick={() => { setActiveTab('form'); setSearchParams({}); }}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>New Plot Purchase / Booking</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setActiveTab('list'); setSearchParams({ tab: 'list' }); }}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <FileCheck size={16} />
              <span>Plot Purchases List</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">Transaction & Plot Booking Confirmed!</h3>
                <p className="text-xs text-emerald-700">
                  Booking Ref: <b>{successResult.bookingForm?.booking_ref}</b> · Txn Ref: <b>{successResult.transaction?.transaction_ref}</b>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('list'); setSearchParams({ tab: 'list' }); }}
                className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg font-bold hover:bg-navy/90 flex items-center gap-1 shadow-sm"
              >
                <FileCheck size={13} />
                <span>View in Purchases List</span>
              </button>
              <button
                onClick={() => setSuccessResult(null)}
                className="text-xs bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-300"
              >
                New Booking
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-emerald-200 text-sm">
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Total Plot Price</span>
              <span className="text-base font-extrabold text-navy">
                ₹{Number(successResult.bookingForm?.total_plot_price || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Booking Amount Received</span>
              <span className="text-base font-extrabold text-emerald-600">
                ₹{Number(successResult.payment?.amount || successResult.bookingForm?.booking_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Remaining Balance</span>
              <span className="text-base font-extrabold text-red-600">
                ₹{Number(successResult.bookingForm?.remaining_balance || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-semibold">Receipt Number</span>
              <span className="text-base font-extrabold text-navy">
                {successResult.payment?.receipt_no || 'REC-VERIFIED'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {(successResult.payment?.id || successResult.transaction?.id) && (
              <button
                type="button"
                disabled={downloadingReceipt}
                onClick={() => handleDownloadReceipt(successResult.payment?.id, successResult.transaction?.id)}
                className="btn-primary text-xs flex items-center gap-2 font-bold"
              >
                <Download size={15} />
                {downloadingReceipt ? 'Generating Receipt...' : 'Download Official Payment Receipt (PDF)'}
              </button>
            )}
            {successResult.transaction?.id && (
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={() => handleDownloadBookingPdf(successResult.transaction.id, successResult.transaction.transaction_ref)}
                className="btn-secondary text-xs flex items-center gap-2 font-bold"
              >
                <Printer size={15} />
                {downloadingPdf ? 'Generating...' : 'Download Booking Details PDF'}
              </button>
            )}
            <button
              onClick={() => navigate(isAssociate ? '/associate/commissions' : '/commissions')}
              className="text-xs bg-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-navy/90"
            >
              Verify Differential Commissions →
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'list' ? (
        <PlotPurchasesList
          mode={mode}
          hideHeader={true}
          onNewPurchase={() => { setActiveTab('form'); setSearchParams({}); }}
        />
      ) : (
        <>
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CUSTOMER BOOKING FORM */}
          <form onSubmit={handleSubmit} className="space-y-8">

        {/* ================================================================== */}
        {/* SECTION A: PLOT PRICE DETAILS                                       */}
        {/* ================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-blue-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-bold text-sm text-gold">A</span>
              <div>
                <h2 className="text-base font-bold">Section A — Plot Price Details</h2>
                <p className="text-xs text-blue-200">Choose available plot from inventory — price calculated as Size × Rate</p>
              </div>
            </div>
            <Home size={20} className="text-gold opacity-80" />
          </div>

          <div className="p-6 space-y-5">
            {/* Plot Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Available Plot <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {availableInventoryPlots.length} Available
                </span>
              </div>
              <select
                value={selectedPlotId}
                onChange={(e) => handlePlotSelect(e.target.value)}
                className="input-field text-sm font-bold text-navy bg-white border-2 border-emerald-400 focus:border-navy shadow-sm"
                required
              >
                <option value="">-- Choose Available Plot ({availableInventoryPlots.length} available) --</option>
                {availableInventoryPlots.length === 0 && <option disabled value="">No available plots found in inventory</option>}
                {availableInventoryPlots.map(p => {
                  const label = p.plot_number ? `Plot #${p.plot_number}` : (p.plot_code || `Plot #${p.id}`);
                  const proj = p.project?.name ? `[${p.project.name}] ` : '';
                  const size = `${p.size_sqft || '—'} Sq.ft`;
                  const rate = p.rate_per_sqft && parseFloat(p.rate_per_sqft) > 0
                    ? ` @ ₹${Number(p.rate_per_sqft).toLocaleString('en-IN')}/sqft`
                    : '';
                  const calcPrice = p.size_sqft && p.rate_per_sqft && parseFloat(p.rate_per_sqft) > 0
                    ? parseFloat(p.size_sqft) * parseFloat(p.rate_per_sqft)
                    : parseFloat(p.price || 0);
                  return (
                    <option key={p.id} value={p.id}>
                      {proj}{label} · {size}{rate} · ₹{Number(calcPrice).toLocaleString('en-IN')} (AVAILABLE)
                    </option>
                  );
                })}
              </select>
              {selectedPlotId && (
                <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>
                    Selected: <b>Plot #{form.plot_no || selectedPlotId}</b>
                    {form.plot_size && form.rate_per_sqft && (
                      <> · {form.plot_size} Sq.ft × ₹{Number(form.rate_per_sqft).toLocaleString('en-IN')} = </>
                    )}
                    <b>₹{Number(form.total_plot_price || 0).toLocaleString('en-IN')}</b>
                  </span>
                </p>
              )}
              {plotNumberWarning && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                  <span>{plotNumberWarning}</span>
                </p>
              )}
            </div>

            {/* Plot Spec Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sector Number</label>
                <input
                  type="text"
                  value={form.sector_no}
                  onChange={e => setForm({ ...form, sector_no: e.target.value })}
                  placeholder="e.g. 02"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Plot Number</label>
                <input
                  type="text"
                  value={form.plot_no}
                  onChange={e => handlePlotNumberInput(e.target.value)}
                  placeholder="e.g. 104"
                  className="input-field text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Plot Area (Sq.ft.) *</label>
                <input
                  type="number"
                  value={form.plot_size}
                  onChange={e => recalculatePrice({ plot_size: e.target.value })}
                  placeholder="e.g. 200"
                  className="input-field text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Rate per Sq.ft. (₹) *</label>
                <input
                  type="number"
                  value={form.rate_per_sqft}
                  onChange={e => recalculatePrice({ rate_per_sqft: e.target.value })}
                  placeholder="e.g. 10000"
                  className="input-field text-sm font-bold text-navy"
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                <span>Price Calculation Breakdown</span>
                <span>Base = Size × Rate per Sq.ft.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-400 block font-medium">Base Plot Price (Size × Rate)</span>
                  <span className="text-base font-extrabold text-navy">
                    ₹{Number(form.basic_plot_price || 0).toLocaleString('en-IN')}
                  </span>
                  {form.plot_size && form.rate_per_sqft && parseFloat(form.rate_per_sqft) > 0 && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {form.plot_size} Sq.ft × ₹{Number(form.rate_per_sqft).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-1">
                    <input
                      type="checkbox"
                      checked={form.is_corner}
                      onChange={e => recalculatePrice({ is_corner: e.target.checked, corner_percent: e.target.checked ? 10 : 0 })}
                    />
                    Corner Plot (+10%)
                  </label>
                  <span className="text-xs font-bold text-gray-600 block">
                    + ₹{Number(form.corner_charge_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-1">
                    <input
                      type="checkbox"
                      checked={form.is_park_facing}
                      onChange={e => recalculatePrice({ is_park_facing: e.target.checked, park_facing_percent: e.target.checked ? 10 : 0 })}
                    />
                    Park Facing (+10%)
                  </label>
                  <span className="text-xs font-bold text-gray-600 block">
                    + ₹{Number(form.park_facing_charge_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block">Other Approved Charges (₹)</label>
                    <input
                      type="number"
                      value={form.other_approved_charges}
                      onChange={e => recalculatePrice({ other_approved_charges: e.target.value })}
                      className="input-field py-1 text-xs w-36"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block">Approved Discount (₹)</label>
                    <input
                      type="number"
                      value={form.discount_amount}
                      onChange={e => recalculatePrice({ discount_amount: e.target.value })}
                      className="input-field py-1 text-xs w-36 text-red-600"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block uppercase font-bold tracking-wider">Final Plot Price</span>
                  <span className="text-2xl font-black text-navy">
                    ₹{Number(form.total_plot_price || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION B: CLIENT / APPLICANT DETAILS                              */}
        {/* ================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-blue-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-bold text-sm text-gold">B</span>
              <div>
                <h2 className="text-base font-bold">Section B — Client / Applicant Details</h2>
                <p className="text-xs text-blue-200">Select registered client or register new applicant</p>
              </div>
            </div>
            <User size={20} className="text-gold opacity-80" />
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between bg-blue-50/60 p-3 rounded-xl border border-blue-200">
              <span className="text-xs font-bold text-blue-900">Applicant Source:</span>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="clientSource" checked={!isNewClient} onChange={() => setIsNewClient(false)} />
                  Select Existing Client
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="clientSource" checked={isNewClient}
                    onChange={() => { setIsNewClient(true); setSelectedClientId(''); }} />
                  Create New Client Record
                </label>
              </div>
            </div>

            {!isNewClient && (
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1 uppercase tracking-wide">Choose Existing Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="input-field text-sm font-semibold"
                >
                  <option value="">-- Choose Existing Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.login_id || `CLI-${c.id}`}) — {c.phone} — {c.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Applicant Full Name *</label>
                <input type="text" required value={form.applicant_name}
                  onChange={e => setForm({ ...form, applicant_name: e.target.value })}
                  placeholder="e.g. Ravindra Prajapati" className="input-field text-sm font-semibold" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Father's / Husband's Name</label>
                <input type="text" value={form.father_husband_name}
                  onChange={e => setForm({ ...form, father_husband_name: e.target.value })}
                  placeholder="Father's / Husband's Name" className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Mobile Number *</label>
                <input type="text" required value={form.applicant_phone}
                  onChange={e => setForm({ ...form, applicant_phone: e.target.value })}
                  placeholder="9700000050" className="input-field text-sm font-semibold" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Email Address</label>
                <input type="email" value={form.applicant_email}
                  onChange={e => setForm({ ...form, applicant_email: e.target.value })}
                  placeholder="client@example.com" className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Nominee Name</label>
                <input type="text" value={form.nominee_name}
                  onChange={e => setForm({ ...form, nominee_name: e.target.value })}
                  placeholder="Nominee Full Name" className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Nominee Relationship</label>
                <input type="text" value={form.nominee_relation}
                  onChange={e => setForm({ ...form, nominee_relation: e.target.value })}
                  placeholder="e.g. Spouse / Son" className="input-field text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-gray-700 block mb-1">Current & Permanent Address</label>
                <input type="text" value={form.applicant_address}
                  onChange={e => setForm({ ...form, applicant_address: e.target.value, permanent_address: e.target.value })}
                  placeholder="Address, Sector, City" className="input-field text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION C: ASSOCIATE & REFERRAL INFORMATION                        */}
        {/* ================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-blue-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-bold text-sm text-gold">C</span>
              <div>
                <h2 className="text-base font-bold">Section C — Associate and Referral Information</h2>
                <p className="text-xs text-blue-200">Traces selling associate, direct sponsor, and active upline chain</p>
              </div>
            </div>
            <Users size={20} className="text-gold opacity-80" />
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                Sold By / Selling Associate *
                {isAssociate && <span className="text-gray-400 normal-case font-medium ml-1">(you - from your login)</span>}
              </label>
              {isAssociate ? (
                <input readOnly className="input-field text-sm font-semibold bg-gray-50 cursor-not-allowed"
                  value={user ? `${user.name} (${user.login_id})` : ''} />
              ) : (
                <select required value={selectedAssociateId}
                  onChange={(e) => handleAssociateSelect(e.target.value)}
                  className="input-field text-sm font-semibold">
                  <option value="">-- Choose Selling Associate --</option>
                  {associates.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.login_id}) — Rate: {a.commission_percent}%
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">Associate ID *</label>
                <input readOnly required className="input-field text-sm font-mono bg-gray-50 cursor-not-allowed"
                  value={form.selling_associate_code || ''} placeholder="Auto-filled from selling associate" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">Referred By / Referral ID *</label>
                <input required className="input-field text-sm font-mono"
                  value={form.referral_id || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, referral_id: e.target.value.trim() }))}
                  placeholder="Associate Referral ID (e.g. DEV-0002)" />
                <p className="text-[11px] text-gray-400 mt-1">
                  Pre-filled with seller's sponsor. Use DIRECT only for root associate's own sale.
                </p>
              </div>
            </div>

            {loadingUpline && (
              <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-navy" />
                Retrieving sponsor hierarchy and upline verification...
              </div>
            )}

            {uplineData && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-400 block font-semibold">Selling Associate</span>
                    <span className="text-sm font-bold text-navy block">{uplineData.associate.name}</span>
                    <span className="text-xs text-gold font-bold">
                      ID: {uplineData.associate.login_id} · Rate: {uplineData.associate.commission_percent}%
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-400 block font-semibold">Direct Sponsor</span>
                    <span className="text-sm font-bold text-gray-800 block">
                      {uplineData.directSponsor ? uplineData.directSponsor.name : 'None (Root)'}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">
                      {uplineData.directSponsor
                        ? `ID: ${uplineData.directSponsor.login_id} · Rate: ${uplineData.directSponsor.commission_percent}%`
                        : 'Root Leader'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-400 block font-semibold">Upline Chain Status</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-1">
                      Verified & Active
                    </span>
                    <span className="text-xs text-gray-500 block mt-1">
                      {uplineData.uplineChain?.length || 0} upline tiers eligible
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs">
                  <span className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wider">
                    Sponsor Path & Differential Spread:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg font-bold">
                      {uplineData.associate.name} ({uplineData.associate.commission_percent}%)
                    </span>
                    {uplineData.uplineChain?.map(u => (
                      <React.Fragment key={u.id}>
                        <ArrowRight size={12} className="text-gray-400" />
                        <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-lg font-semibold">
                          {u.name} ({u.commission_percent}%)
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION D: PAYMENT PLAN OPTION                                     */}
        {/* ================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-blue-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-bold text-sm text-gold">D</span>
              <div>
                <h2 className="text-base font-bold">Section D — Payment Plan Option</h2>
                <p className="text-xs text-blue-200">Choose booking terms and record initial verified payment</p>
              </div>
            </div>
            <CreditCard size={20} className="text-gold opacity-80" />
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'full', label: '100% Full Payment', desc: 'Full plot value received immediately' },
                { id: 'booking_balance', label: 'Booking + Balance', desc: 'Booking token received, balance in future' },
                { id: 'emi', label: 'Down Payment + EMI Plan', desc: 'Down payment + monthly installments' }
              ].map(plan => (
                <label
                  key={plan.id}
                  onClick={() => recalculatePrice({ payment_plan_type: plan.id })}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    form.payment_plan_type === plan.id
                      ? 'border-navy bg-navy/5 text-navy font-bold'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input type="radio" name="payment_plan" checked={form.payment_plan_type === plan.id}
                    onChange={() => {}} className="mr-2" />
                  <span>{plan.label}</span>
                  <p className="text-xs text-gray-500 font-normal mt-1">{plan.desc}</p>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Payment Mode *</label>
                <select value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                  className="input-field text-sm">
                  <option value="NEFT / Bank Transfer">NEFT / Bank Transfer</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Cheque">Bank Cheque / DD</option>
                  <option value="UPI">UPI Payment</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  {form.payment_plan_type === 'full' ? 'Full Plot Amount (₹) *' : 'Booking Amount Received (₹) *'}
                </label>
                <input type="number" required
                  value={form.payment_plan_type === 'full' ? form.total_plot_price : form.booking_amount}
                  onChange={e => recalculatePrice({ booking_amount: e.target.value })}
                  className="input-field text-sm font-bold text-emerald-700" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Remaining Balance (₹)</label>
                <input type="number" readOnly
                  value={form.payment_plan_type === 'full' ? 0 : form.remaining_balance}
                  className="input-field text-sm font-black bg-gray-50 text-red-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Transaction Ref / Cheque No.</label>
                <input type="text" value={form.transaction_ref}
                  onChange={e => setForm({ ...form, transaction_ref: e.target.value })}
                  placeholder="UTR / Cheque Ref" className="input-field text-sm font-mono" />
              </div>
            </div>

            {form.payment_plan_type === 'emi' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">EMI Tenure (Months)</label>
                  <input type="number" value={form.emi_duration_months}
                    onChange={e => setForm({ ...form, emi_duration_months: e.target.value })}
                    className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monthly EMI Amount (₹)</label>
                  <input type="number" value={form.emi_amount}
                    onChange={e => setForm({ ...form, emi_amount: e.target.value })}
                    className="input-field text-sm font-bold" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">First Installment Due Date</label>
                  <input type="date" value={form.first_due_date}
                    onChange={e => setForm({ ...form, first_due_date: e.target.value })}
                    className="input-field text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECTION E: TERMS, DECLARATION & CONFIRMATION                        */}
        {/* ================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-blue-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center font-bold text-sm text-gold">E</span>
              <div>
                <h2 className="text-base font-bold">Section E — Terms, Declaration and Signatures</h2>
                <p className="text-xs text-blue-200">Company approved terms and authorized officer approval</p>
              </div>
            </div>
            <FileCheck size={20} className="text-gold opacity-80" />
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-gray-600 space-y-1.5">
              <p className="font-bold text-gray-800">Approved Terms & Declarations:</p>
              <p>• Date of booking refers to when the formal application is approved by the authorized officer.</p>
              <p>• Applicable Government taxes / Stamp duty shall be payable extra in accordance with prevailing laws.</p>
              <p>• Booking receipt represents confirmation of specific payment received and does not grant legal conveyance until full consideration is settled.</p>
              <p>• Verified sale milestones trigger company differential commission for eligible sponsor uplines.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Execution Place</label>
                <input type="text" value={form.applicant_place}
                  onChange={e => setForm({ ...form, applicant_place: e.target.value })}
                  className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Authorized Officer Name</label>
                <input type="text" value={form.authorized_officer_name}
                  onChange={e => setForm({ ...form, authorized_officer_name: e.target.value })}
                  className="input-field text-sm font-semibold" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Approval Date</label>
                <input type="date" value={form.applicant_date}
                  onChange={e => setForm({ ...form, applicant_date: e.target.value })}
                  className="input-field text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" required checked={form.declaration_accepted}
                  onChange={e => setForm({ ...form, declaration_accepted: e.target.checked })} />
                Applicant & Company Declaration Accepted. Verified payment generates receipt and records transaction in ledger.
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-left">
            <span className="text-xs text-gray-400 block font-semibold uppercase">Total Plot Consideration</span>
            <span className="text-2xl font-black text-navy">
              ₹{Number(form.total_plot_price || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isAssociate) {
                  setActiveTab('list');
                  setSearchParams({ tab: 'list' });
                } else {
                  navigate('/booking-forms');
                }
              }}
              className="btn-secondary px-6"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-8 py-3 text-base flex items-center gap-2 font-bold shadow-lg shadow-navy/20"
            >
              {submitting ? (
                <><RefreshCw size={18} className="animate-spin" /> Processing Purchase...</>
              ) : (
                <><Sparkles size={18} className="text-gold" /> Confirm Plot Purchase & Generate Receipt</>
              )}
            </button>
          </div>
        </div>

      </form>
    </>
  )}
</div>
  );
};

export default PlotPurchasing;
