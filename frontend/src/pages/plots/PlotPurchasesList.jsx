import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Printer, AlertCircle, RefreshCw, 
  CheckCircle2, Clock, MapPin, Building, User, Phone, 
  CreditCard, Calendar, ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Helper for safe currency formatting
const formatMoney = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

// Helper for safe date formatting
const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

// Error Boundary component to protect against any unexpected React render crash
class PurchasesErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('PlotPurchasesList render error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-8 bg-red-50 border border-red-200 rounded-2xl text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-900 mb-2">Display Error in Plot Purchases</h2>
          <p className="text-xs text-red-700 mb-4">
            {this.state.error?.message || 'An unexpected rendering error occurred while displaying purchase records.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PlotPurchasesListInner = ({ mode, hideHeader = false, onNewPurchase }) => {
  const { user } = useAuth();
  const isAssociate = mode === 'associate' || user?.role === 'associate';

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [pdfLoading, setPdfLoading] = useState(null);
  const [pdfError, setPdfError] = useState('');

  const fetchPurchases = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const endpoint = isAssociate ? '/associate/plot-purchases' : '/plots/purchases';
      let res;
      try {
        res = await api.get(endpoint);
      } catch (primaryErr) {
        // Fallback for associate or admin
        const altEndpoint = isAssociate ? '/plots/purchases' : '/transactions';
        res = await api.get(altEndpoint);
      }

      const raw = res.data?.data ?? res.data;
      const rawData = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.deals) ? raw.deals : (Array.isArray(raw?.sales) ? raw.sales : []));

      if (rawData.length > 0) {
        setPurchases(rawData);
      } else {
        // Fallback to /associate/sales or /transactions if primary returned empty
        try {
          const fallbackEndpoint = isAssociate ? '/associate/sales' : '/transactions';
          const fallbackRes = await api.get(fallbackEndpoint);
          const fbRaw = fallbackRes.data?.data ?? fallbackRes.data;
          const fallbackData = Array.isArray(fbRaw)
            ? fbRaw
            : (Array.isArray(fbRaw?.deals) ? fbRaw.deals : (Array.isArray(fbRaw?.sales) ? fbRaw.sales : []));
          setPurchases(fallbackData);
        } catch (_) {
          setPurchases([]);
        }
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load plot purchases.';
      setFetchError(msg);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [mode]);

  // Authenticated PDF download
  const handleDownloadPdf = async (txnId, txnRef) => {
    setPdfLoading(txnId);
    setPdfError('');
    try {
      let res;
      try {
        const primaryEndpoint = isAssociate 
          ? `/associate/transactions/${txnId}/receipt-pdf`
          : `/transactions/${txnId}/pdf`;
        res = await api.get(primaryEndpoint, { responseType: 'blob' });
      } catch (primaryErr) {
        const fallbackEndpoint = isAssociate
          ? `/transactions/${txnId}/pdf`
          : `/associate/transactions/${txnId}/receipt-pdf`;
        res = await api.get(fallbackEndpoint, { responseType: 'blob' });
      }
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Booking-Receipt-${txnRef || txnId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);
    } catch (err) {
      setPdfError(`Receipt generation failed for transaction #${txnId}: ${err.response?.data?.message || err.message}`);
    } finally {
      setPdfLoading(null);
    }
  };

  // Safe search filter — converts everything safely via String() to avoid .toLowerCase() crash on numbers/nulls
  const safeList = Array.isArray(purchases) ? purchases : [];
  const q = String(search || '').trim().toLowerCase();

  const filtered = safeList.filter(p => {
    if (!p) return false;
    if (!q) return true;
    const ref = String(p.transaction_ref || p.id || '').toLowerCase();
    const customer = String(p.customer_name || p.buyer?.name || '').toLowerCase();
    const phone = String(p.customer_phone || p.buyer?.phone || '').toLowerCase();
    const plotCode = String(p.plot?.plot_code || '').toLowerCase();
    const plotNo = String(p.plot?.plot_number || '').toLowerCase();
    const title = String(p.plot?.title || '').toLowerCase();
    const proj = String(p.plot?.project?.name || '').toLowerCase();
    const assoc = String(p.sellerAssociate?.name || '').toLowerCase();

    return (
      ref.includes(q) ||
      customer.includes(q) ||
      phone.includes(q) ||
      plotCode.includes(q) ||
      plotNo.includes(q) ||
      title.includes(q) ||
      proj.includes(q) ||
      assoc.includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="text-blue-600" size={24} />
              {isAssociate ? 'My Plot Purchases' : 'All Plot Purchases'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isAssociate 
                ? 'Authorized customer plot purchase transactions, payment records, plot specifications, and verified receipts'
                : 'Actual customer plot purchase transactions, payment records, plot specifications, and verified receipts'}
            </p>
          </div>
          <button
            onClick={fetchPurchases}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, customer name, phone, plot #, or project..."
            className="input-field pl-9 text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            {filtered.length} Saved {filtered.length === 1 ? 'Purchase' : 'Purchases'}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {fetchError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={fetchPurchases}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {pdfError && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-600" />
            <span>{pdfError}</span>
          </div>
          <button onClick={() => setPdfError('')} className="text-amber-800 font-bold hover:text-amber-900">✕</button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Txn / Purchase ID</th>
                <th className="py-3.5 px-4">Plot Code & Project</th>
                <th className="py-3.5 px-4">Sector & Plot #</th>
                <th className="py-3.5 px-4">Plot Area & Rate</th>
                <th className="py-3.5 px-4">Actual Customer / Buyer</th>
                <th className="py-3.5 px-4 text-right">Final Price</th>
                <th className="py-3.5 px-4 text-right">Amount Paid</th>
                <th className="py-3.5 px-4 text-right">Balance Pending</th>
                <th className="py-3.5 px-4 text-center">Payment Status</th>
                <th className="py-3.5 px-4 text-center">Receipts & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-blue-600" />
                      <span className="font-medium">Loading plot purchase records...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <Building size={32} className="mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="font-semibold text-gray-700 text-sm">No plot purchase records found.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search ? 'Try clearing your search term' : (isAssociate ? 'Your authorized customer purchases and bookings will appear here.' : 'Purchases saved through customer booking will appear here.')}
                    </p>
                    {isAssociate && onNewPurchase && (
                      <button
                        onClick={onNewPurchase}
                        className="mt-3 px-3 py-1.5 bg-navy text-white text-xs font-bold rounded-xl hover:bg-navy/90 inline-flex items-center gap-1"
                      >
                        Book a Plot
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const plot = p.plot || {};
                  const amount = Number(p.amount) || 0;
                  const paid = Number(p.paid_amount) || 0;
                  const pending = Math.max(0, amount - paid);
                  const isPaid = p.payment_status === 'paid' || (amount > 0 && paid >= amount);
                  const isPartiallyPaid = !isPaid && paid > 0;

                  // Authoritative Customer Name: Never show Admin/Super Admin when real customer is linked
                  const customerName = p.customer_name || (
                    p.buyer && p.buyer.id !== 1 && p.buyer.name !== 'Super Admin'
                      ? p.buyer.name
                      : 'Customer'
                  );
                  const customerPhone = p.customer_phone || (p.buyer?.phone && p.buyer.phone !== '9999999999' ? p.buyer.phone : '—');

                  // Plot area & rate
                  const sizeSqft = Number(plot.size_sqft) || 0;
                  const ratePerSqft = Number(plot.effective_rate || plot.rate_per_sqft) || (
                    sizeSqft > 0 && amount > 0 ? Math.round(amount / sizeSqft) : 0
                  );

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Transaction / Purchase ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-navy">
                        <span className="block">{p.transaction_ref || `TXN-${p.id}`}</span>
                        <span className="block text-[10px] text-gray-400 font-sans font-normal mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(p.deal_date || p.createdAt)}
                        </span>
                      </td>

                      {/* 2. Plot Code & Project */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block font-mono text-[11px]">
                          {plot.plot_code || `PLOT-${plot.id || p.plot_id}`}
                        </span>
                        <span className="text-[11px] text-blue-700 font-medium block">
                          {plot.project?.name || plot.title || 'Residential Township'}
                        </span>
                      </td>

                      {/* 3. Sector & Plot Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-800 block">
                          Plot #{plot.plot_number || plot.id || '—'}
                        </span>
                        <span className="text-[11px] text-gray-500 block">
                          Sector: {plot.sector_number || plot.block || '—'}
                        </span>
                      </td>

                      {/* 4. Plot Area & Rate per Sq. Ft. */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-800 block">
                          {sizeSqft > 0 ? `${sizeSqft.toLocaleString('en-IN')} Sq.ft.` : '—'}
                        </span>
                        <span className="text-[11px] text-gray-500 block">
                          {ratePerSqft > 0 ? `@ ₹${ratePerSqft.toLocaleString('en-IN')}/sqft` : 'Standard'}
                        </span>
                      </td>

                      {/* 5. Actual Customer / Buyer Name & Phone */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block flex items-center gap-1">
                          <User size={12} className="text-gray-400 shrink-0" />
                          <span>{customerName}</span>
                        </span>
                        <span className="text-[11px] text-gray-500 block flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-gray-400 shrink-0" />
                          <span>{customerPhone}</span>
                        </span>
                      </td>

                      {/* 6. Final Plot Price */}
                      <td className="py-3.5 px-4 text-right font-black text-gray-900">
                        ₹{formatMoney(amount)}
                      </td>

                      {/* 7. Amount Paid */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                        ₹{formatMoney(paid)}
                      </td>

                      {/* 8. Balance Pending */}
                      <td className="py-3.5 px-4 text-right font-bold">
                        {pending > 0 ? (
                          <span className="text-red-600 font-extrabold">₹{formatMoney(pending)}</span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-semibold">₹0 (Cleared)</span>
                        )}
                      </td>

                      {/* 9. Payment Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isPartiallyPaid
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          <span>{isPaid ? 'PAID' : (isPartiallyPaid ? 'PARTIALLY PAID' : 'UNPAID')}</span>
                        </span>
                      </td>

                      {/* 10. Receipts & Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDownloadPdf(p.id, p.transaction_ref)}
                          disabled={pdfLoading === p.id}
                          className="px-2.5 py-1 text-navy bg-navy/5 hover:bg-navy/15 rounded-lg inline-flex items-center gap-1.5 font-bold text-[11px] disabled:opacity-50 transition-colors border border-navy/20"
                          title="Download Booking Receipt PDF"
                        >
                          {pdfLoading === p.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Printer size={12} />
                          )}
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Export wrapped with error boundary
const PlotPurchasesList = (props) => (
  <PurchasesErrorBoundary>
    <PlotPurchasesListInner {...props} />
  </PurchasesErrorBoundary>
);

export default PlotPurchasesList;
