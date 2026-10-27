/**
 * DAILY RECORDS — Accounts Panel
 * Complete Daily Records & Reporting System.
 *
 * Sections:
 *  1. Date selector + Generate / Refresh
 *  2. Summary cards (from real DB)
 *  3. Bookings / Plot Sales table
 *  4. Payment Collections table
 *  5. EMI Collections table
 *  6. Manual Expenses / Other Records (existing daily_records entries)
 *  7. Cash & Bank Reconciliation
 *  8. Remarks + Save Draft / Submit
 *  9. Report History (bottom)
 */
import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar, RefreshCw, FileText, CheckCircle2, XCircle, Clock,
  IndianRupee, TrendingUp, TrendingDown, Building2, CreditCard,
  AlertTriangle, ChevronDown, ChevronUp, Printer, Send, Save,
  User, Eye, X, Plus, BarChart3
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDT = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const inr = (v) => '₹' + parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

const STATUS_COLORS = {
  draft:     { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  submitted: { bg: '#fef9c3', text: '#92400e', border: '#fbbf24' },
  approved:  { bg: '#dcfce7', text: '#15803d', border: '#22c55e' },
  rejected:  { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const icons = { draft: Clock, submitted: Send, approved: CheckCircle2, rejected: XCircle };
  const Icon = icons[status] || Clock;
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Icon size={11} /> {status}
    </span>
  );
};

// ─── Shared light-mode card style ─────────────────────────────────────────────
const card = { background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const th = { padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color = '#3b82f6', count, isOpen, onToggle, extra }) => (
  <div
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', cursor: 'pointer', userSelect: 'none', borderBottom: isOpen ? '1px solid #f1f5f9' : 'none' }}
    onClick={onToggle}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Icon size={18} color={color} />
      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '14px' }}>{title}</span>
      {count !== undefined && (
        <span style={{ background: `${color}20`, color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>{count}</span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {extra}
      {isOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
    </div>
  </div>
);

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SumCard = ({ label, value, icon: Icon, color, sub }) => (
  <div style={{ ...card, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{value}</p>
      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{label}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: '10px', color, fontWeight: 600 }}>{sub}</p>}
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DailyRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [reportDate, setReportDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Section visibility
  const [open, setOpen] = useState({ bookings: true, payments: true, emi: true, expenses: false, recon: true, history: false });
  const toggle = (k) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));

  // History
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histFilters, setHistFilters] = useState({ status: 'all', from: '', to: '' });

  // Admin view report modal
  const [viewReport, setViewReport] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const printRef = useRef(null);

  // ── Load summary ──────────────────────────────────────────────────────────
  const loadSummary = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await api.get(`/daily-reports/summary?date=${reportDate}`);
      if (res.data.success) {
        setData(res.data.data);
        setRemarks(res.data.data.existing_report?.remarks || '');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  // ── Load history ──────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const params = new URLSearchParams();
      if (histFilters.status !== 'all') params.set('status', histFilters.status);
      if (histFilters.from) params.set('from', histFilters.from);
      if (histFilters.to)   params.set('to',   histFilters.to);
      const res = await api.get(`/daily-reports?${params}`);
      if (res.data.success) setHistory(res.data.data);
    } catch (e) { console.error(e); }
    finally { setHistLoading(false); }
  };

  useEffect(() => { loadSummary(); }, [reportDate]);
  useEffect(() => { if (open.history) loadHistory(); }, [open.history, histFilters]);

  const summary = data?.summary;
  const existingReport = data?.existing_report;

  // ── Save Draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!summary) { alert('Generate the report first.'); return; }
    setSaving(true);
    try {
      await api.post('/daily-reports/draft', { report_date: reportDate, remarks, summary });
      await loadSummary();
      alert('Draft saved!');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!summary) { alert('Generate the report first.'); return; }
    setSubmitting(true);
    try {
      await api.post('/daily-reports/submit', { report_date: reportDate, remarks, summary });
      setShowSubmitConfirm(false);
      await loadSummary();
      alert('Daily Report submitted to Admin for review!');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally { setSubmitting(false); }
  };

  // ── Admin Approve / Reject ────────────────────────────────────────────────
  const handleApprove = async (id) => {
    if (!window.confirm('Approve this report?')) return;
    try {
      await api.put(`/daily-reports/${id}/approve`);
      await loadHistory();
      if (viewReport?.report?.id === id) { loadViewReport(id); }
      alert('Report approved!');
    } catch (e) { alert(e.response?.data?.message || e.message); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert('Enter rejection reason'); return; }
    try {
      await api.put(`/daily-reports/${rejectModal}/reject`, { reason: rejectReason });
      setRejectModal(null); setRejectReason('');
      loadHistory();
      if (viewReport?.report?.id === rejectModal) loadViewReport(rejectModal);
      alert('Report rejected.');
    } catch (e) { alert(e.response?.data?.message || e.message); }
  };

  const loadViewReport = async (id) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/daily-reports/${id}`);
      if (res.data.success) setViewReport(res.data.data);
    } catch (e) { alert(e.response?.data?.message || e.message); }
    finally { setViewLoading(false); }
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const el = document.getElementById('daily-report-print-area');
    if (!el) return;
    const w = window.open('', '_blank', 'width=1100,height=900');
    w.document.write(`<html><head><title>Daily Report - ${reportDate}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px; }
      h1 { font-size: 22px; margin: 0 0 4px; } p { margin: 3px 0; font-size: 12px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11px; }
      th { background: #0b1437; color: #D4AF37; padding: 8px 10px; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) { background: #f8fafc; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
      .sum-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
      .sum-label { font-size: 10px; color: #64748b; } .sum-value { font-size: 15px; font-weight: 800; }
      .section-title { font-size: 14px; font-weight: 700; color: #0b1437; border-bottom: 2px solid #D4AF37; padding-bottom: 4px; margin: 18px 0 8px; }
      @media print { body { padding: 20px; } }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const canSubmit = !existingReport || ['draft', 'rejected'].includes(existingReport?.status);
  const reportStatus = existingReport?.status;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 800, color: '#0f172a' }}>Daily Records & Report</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            Review daily bookings, payments, EMI, and expenses — then submit to Admin
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
            <Calendar size={15} color="#D4AF37" />
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#0f172a', background: 'transparent' }} />
          </div>
          {/* Refresh */}
          <button onClick={loadSummary} disabled={loading}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {/* Print */}
          {data && (
            <button onClick={handlePrint}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
              <Printer size={14} /> Print
            </button>
          )}
        </div>
      </div>

      {/* ── Report Status Banner ── */}
      {existingReport && (
        <div style={{ ...card, padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderLeft: `4px solid ${STATUS_COLORS[existingReport.status]?.border || '#e2e8f0'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusBadge status={existingReport.status} />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Report #{existingReport.id} </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>submitted {fmtDT(existingReport.submitted_at)}</span>
              {existingReport.reject_reason && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#b91c1c', background: '#fee2e2', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                  ❌ Rejected: {existingReport.reject_reason}
                </div>
              )}
            </div>
          </div>
          {existingReport.reviewed_at && (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Reviewed by {existingReport.reviewer?.name} {fmtDT(existingReport.reviewed_at)}</span>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ ...card, padding: '40px', textAlign: 'center', color: '#94a3b8', marginBottom: '16px' }}>
          <RefreshCw size={28} style={{ margin: '0 auto 10px' }} />
          <p style={{ margin: 0 }}>Fetching records for {fmt(reportDate)}…</p>
        </div>
      )}

      {data && !loading && (
        // ──────────────────────────────────────────────────────────────────
        // PRINT AREA — all sections inside this div
        // ──────────────────────────────────────────────────────────────────
        <div id="daily-report-print-area">
          {/* Report header for print */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
                📅 Report Date: {fmt(reportDate)}
              </h2>
            </div>
            {existingReport && <StatusBadge status={existingReport.status} />}
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <SumCard label="New Bookings" value={summary.new_bookings} icon={Building2} color="#3b82f6" />
            <SumCard label="Total Sales Value" value={inr(summary.sales_value)} icon={TrendingUp} color="#8b5cf6" sub="Deal value, not cash" />
            <SumCard label="Total Collections" value={inr(summary.total_collections)} icon={IndianRupee} color="#22c55e" sub={`Booking: ${inr(summary.booking_collections)}`} />
            <SumCard label="EMI Collected" value={inr(summary.emi_collections)} icon={CreditCard} color="#D4AF37" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <SumCard label="Cash Collections" value={inr(summary.cash_collections)} icon={IndianRupee} color="#f59e0b" />
            <SumCard label="Bank/UPI Collections" value={inr(summary.bank_collections)} icon={CreditCard} color="#06b6d4" />
            <SumCard label="Expenses / Outgoings" value={inr(summary.total_expenses)} icon={TrendingDown} color="#ef4444" />
            <SumCard label="Overdue EMI / Pending Issues" value={`${summary.overdue_emi_count} overdue · ${summary.pending_count} failed`} icon={AlertTriangle} color="#f97316"
              sub={summary.overdue_emi_count > 0 ? 'Action needed' : '✓ All clear'} />
          </div>

          {/* ── BOOKINGS / PLOT SALES ── */}
          <div style={{ ...card, marginBottom: '14px', overflow: 'hidden' }}>
            <SectionHeader icon={Building2} title="Bookings & Plot Sales" color="#3b82f6"
              count={data.transactions.length} isOpen={open.bookings} onToggle={() => toggle('bookings')} />
            {open.bookings && (
              data.transactions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No bookings/sales on {fmt(reportDate)}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Txn #', 'Date', 'Client', 'Phone', 'Plot No.', 'Block', 'Size (sqft)', 'Total Price', 'Paid Amount', 'Bal. Due', 'Associate', 'Status'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t) => {
                        const bal = parseFloat(t.amount) - parseFloat(t.paid_amount || 0);
                        return (
                          <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background=''}>
                            <td style={{ ...td, fontWeight: 700, color: '#D4AF37' }}>#{t.id}</td>
                            <td style={td}>{fmt(t.deal_date)}</td>
                            <td style={td}><div style={{ fontWeight: 600 }}>{t.buyer?.name || '—'}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>{t.buyer?.login_id}</div></td>
                            <td style={td}>{t.buyer?.phone || '—'}</td>
                            <td style={td}>{t.plot?.plot_number || '—'}</td>
                            <td style={td}>{t.plot?.block || '—'}</td>
                            <td style={td}>{t.plot?.size_sqft || '—'}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{inr(t.amount)}</td>
                            <td style={{ ...td, color: '#15803d', fontWeight: 700 }}>{inr(t.paid_amount)}</td>
                            <td style={{ ...td, color: bal > 0 ? '#ef4444' : '#15803d', fontWeight: 700 }}>{inr(bal)}</td>
                            <td style={td}>{t.sellerAssociate?.name || '—'}<div style={{ fontSize: '10px', color: '#94a3b8' }}>{t.sellerAssociate?.login_id}</div></td>
                            <td style={td}><span style={{ fontSize: '11px', fontWeight: 600, color: t.payment_status === 'paid' ? '#15803d' : '#92400e', background: t.payment_status === 'paid' ? '#dcfce7' : '#fef9c3', padding: '2px 8px', borderRadius: '10px' }}>{t.payment_status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td colSpan="7" style={{ ...td, textAlign: 'right', color: '#64748b' }}>TOTALS</td>
                        <td style={{ ...td, color: '#8b5cf6', fontWeight: 800 }}>{inr(summary.sales_value)}</td>
                        <td colSpan="4" style={td}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── PAYMENT COLLECTIONS ── */}
          <div style={{ ...card, marginBottom: '14px', overflow: 'hidden' }}>
            <SectionHeader icon={CreditCard} title="Payment Collections" color="#22c55e"
              count={data.payments.length} isOpen={open.payments} onToggle={() => toggle('payments')} />
            {open.payments && (
              data.payments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No payment records on {fmt(reportDate)}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Pay #', 'Receipt No.', 'Date', 'Client', 'Txn #', 'Plot', 'Amount', 'Mode', 'Ref/UTR', 'Status', 'Recorded By'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => {
                        const isSuccess = ['verified', 'pending'].includes(p.status);
                        return (
                          <tr key={p.id} style={{ background: isSuccess ? '' : '#fff5f5' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = isSuccess ? '' : '#fff5f5'}>
                            <td style={{ ...td, fontWeight: 700, color: '#D4AF37' }}>#{p.id}</td>
                            <td style={{ ...td, fontSize: '11px' }}>{p.receipt_no || '—'}</td>
                            <td style={td}>{fmt(p.paid_on)}</td>
                            <td style={td}><div style={{ fontWeight: 600 }}>{p.transaction?.buyer?.name || '—'}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>{p.transaction?.buyer?.login_id}</div></td>
                            <td style={td}>#{p.transaction_id}</td>
                            <td style={td}>{p.transaction?.plot?.plot_number || '—'}</td>
                            <td style={{ ...td, fontWeight: 800, color: '#15803d' }}>{inr(p.amount)}</td>
                            <td style={td}>{p.payment_mode || '—'}</td>
                            <td style={{ ...td, fontSize: '11px', color: '#64748b' }}>{p.reference_no || '—'}</td>
                            <td style={td}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: isSuccess ? '#dcfce7' : '#fee2e2', color: isSuccess ? '#15803d' : '#b91c1c' }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={td}>{p.recordedByUser?.name || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td colSpan="6" style={{ ...td, textAlign: 'right', color: '#64748b' }}>SUCCESSFUL TOTAL</td>
                        <td style={{ ...td, color: '#22c55e', fontWeight: 800 }}>{inr(summary.booking_collections)}</td>
                        <td colSpan="4" style={td}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── EMI COLLECTIONS ── */}
          <div style={{ ...card, marginBottom: '14px', overflow: 'hidden' }}>
            <SectionHeader icon={FileText} title="EMI Collections" color="#D4AF37"
              count={data.emi_installments.length} isOpen={open.emi} onToggle={() => toggle('emi')} />
            {open.emi && (
              data.emi_installments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No EMI payments received on {fmt(reportDate)}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Plan #', 'Inst. #', 'Client', 'Plot', 'Due Date', 'Sched. Amt', 'Paid Today', 'Prev. Paid', 'Bal. Due', 'Paid On', 'Status'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.emi_installments.map((i) => {
                        const paidToday = parseFloat(i.paid_amount || 0);
                        const bal = parseFloat(i.amount) - paidToday;
                        const isOverdue = new Date(i.due_date) < new Date(i.paid_on);
                        return (
                          <tr key={i.id} style={{ background: isOverdue ? '#fffbeb' : '' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = isOverdue ? '#fffbeb' : ''}>
                            <td style={{ ...td, fontWeight: 700, color: '#D4AF37' }}>#{i.emi_plan_id}</td>
                            <td style={td}>{i.month_number}</td>
                            <td style={td}><div style={{ fontWeight: 600 }}>{i.emiPlan?.transaction?.buyer?.name || '—'}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>{i.emiPlan?.transaction?.buyer?.login_id}</div></td>
                            <td style={td}>{i.emiPlan?.transaction?.plot?.plot_number || '—'}</td>
                            <td style={{ ...td, color: isOverdue ? '#b91c1c' : '#374151' }}>{fmt(i.due_date)}{isOverdue && <span style={{ fontSize: '9px', color: '#b91c1c', marginLeft: '4px' }}>LATE</span>}</td>
                            <td style={td}>{inr(i.amount)}</td>
                            <td style={{ ...td, color: '#15803d', fontWeight: 800 }}>{inr(paidToday)}</td>
                            <td style={td}>—</td>
                            <td style={{ ...td, color: bal > 0 ? '#ef4444' : '#94a3b8' }}>{bal > 0 ? inr(bal) : '—'}</td>
                            <td style={td}>{fmt(i.paid_on)}</td>
                            <td style={td}><span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: i.status === 'paid' ? '#dcfce7' : '#fef9c3', color: i.status === 'paid' ? '#15803d' : '#92400e' }}>{i.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td colSpan="6" style={{ ...td, textAlign: 'right', color: '#64748b' }}>TOTAL EMI COLLECTED</td>
                        <td style={{ ...td, color: '#D4AF37', fontWeight: 800 }}>{inr(summary.emi_collections)}</td>
                        <td colSpan="4" style={td}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── EXPENSES / MANUAL RECORDS ── */}
          <div style={{ ...card, marginBottom: '14px', overflow: 'hidden' }}>
            <SectionHeader icon={TrendingDown} title="Expenses & Manual Records" color="#ef4444"
              count={data.daily_records.length} isOpen={open.expenses} onToggle={() => toggle('expenses')} />
            {open.expenses && (
              data.daily_records.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No manual records for {fmt(reportDate)}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['#', 'Title', 'Type', 'Category', 'Amount', 'Mode', 'Party', 'Ref No.', 'Recorded By'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily_records.map((r) => (
                        <tr key={r.id}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={{ ...td, color: '#D4AF37', fontWeight: 700 }}>#{r.id}</td>
                          <td style={td}><div style={{ fontWeight: 600 }}>{r.title}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.description}</div></td>
                          <td style={td}><span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: r.type === 'income' ? '#dcfce7' : '#fee2e2', color: r.type === 'income' ? '#15803d' : '#b91c1c' }}>{r.type}</span></td>
                          <td style={td}>{r.category}</td>
                          <td style={{ ...td, fontWeight: 700, color: r.type === 'expense' ? '#ef4444' : '#15803d' }}>{inr(r.amount)}</td>
                          <td style={td}>{r.payment_mode}</td>
                          <td style={td}>{r.party_name || '—'}</td>
                          <td style={td}>{r.reference_no || '—'}</td>
                          <td style={td}>{r.creator?.name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan="4" style={{ ...td, textAlign: 'right', color: '#64748b', fontWeight: 700 }}>TOTAL EXPENSES</td>
                        <td style={{ ...td, color: '#ef4444', fontWeight: 800 }}>{inr(summary.total_expenses)}</td>
                        <td colSpan="4" style={td}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── CASH & BANK RECONCILIATION ── */}
          <div style={{ ...card, marginBottom: '14px', overflow: 'hidden' }}>
            <SectionHeader icon={BarChart3} title="Cash & Bank Reconciliation" color="#06b6d4" isOpen={open.recon} onToggle={() => toggle('recon')} />
            {open.recon && (
              <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                {/* Cash */}
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '16px' }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#15803d', fontSize: '13px' }}>💵 Cash Reconciliation</p>
                  {[
                    ['Opening Cash Balance', '* Not tracked in system', '#94a3b8'],
                    ['Cash Receipts Today', inr(summary.cash_collections), '#15803d'],
                    ['Cash Expenses Today', inr(data.daily_records.filter(r => r.type === 'expense' && r.payment_mode === 'Cash').reduce((s, r) => s + parseFloat(r.amount), 0)), '#ef4444'],
                    ['Closing Cash Balance', '= Opening + Receipts − Expenses', '#0f172a'],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>{l}</span>
                      <span style={{ fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  ))}
                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#94a3b8' }}>* Opening balance not tracked. Reconciliation requires manual ledger data.</p>
                </div>
                {/* Bank/UPI */}
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '16px' }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#1d4ed8', fontSize: '13px' }}>🏦 Bank/UPI Reconciliation</p>
                  {[
                    ['Opening Bank Balance', '* Not tracked in system', '#94a3b8'],
                    ['Bank/UPI Receipts Today', inr(summary.bank_collections), '#1d4ed8'],
                    ['Bank Payments/Expenses', inr(data.daily_records.filter(r => r.type === 'expense' && r.payment_mode !== 'Cash').reduce((s, r) => s + parseFloat(r.amount), 0)), '#ef4444'],
                    ['Closing Bank Balance', '= Opening + Receipts − Payments', '#0f172a'],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>{l}</span>
                      <span style={{ fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  ))}
                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#94a3b8' }}>* Bank opening balance not tracked. Add a ledger module to enable full reconciliation.</p>
                </div>
                {/* Reconciliation Summary */}
                <div style={{ gridColumn: '1/-1', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>📊 Day Summary</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { l: 'Total Collected', v: inr(summary.total_collections), c: '#22c55e' },
                      { l: 'Cash', v: inr(summary.cash_collections), c: '#f59e0b' },
                      { l: 'Bank/UPI', v: inr(summary.bank_collections), c: '#3b82f6' },
                      { l: 'Expenses', v: inr(summary.total_expenses), c: '#ef4444' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ textAlign: 'center', background: '#fff', border: `1px solid ${c}33`, borderRadius: '10px', padding: '10px' }}>
                        <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#64748b' }}>{l}</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: c }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        // end print area
      )}

      {/* ── REMARKS & ACTIONS ── */}
      {data && !loading && (
        <div style={{ ...card, padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Remarks & Reconciliation Notes</h3>
          <textarea
            rows={3}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Add any reconciliation notes, discrepancies, or remarks for Admin review…"
            disabled={existingReport?.status === 'approved'}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#0f172a', background: existingReport?.status === 'approved' ? '#f8fafc' : '#fff' }}
          />
          {existingReport?.reject_reason && (
            <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#b91c1c', fontSize: '13px' }}>
              <strong>Admin Rejection Reason:</strong> {existingReport.reject_reason}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            {existingReport?.status !== 'approved' && (
              <button onClick={handleSaveDraft} disabled={saving}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 20px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
              </button>
            )}
            {canSubmit && (
              <button onClick={() => setShowSubmitConfirm(true)}
                style={{ background: 'linear-gradient(135deg, #D4AF37, #c9a227)', color: '#0b1437', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}>
                <Send size={14} /> Submit to Admin
              </button>
            )}
            {existingReport?.status === 'approved' && (
              <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> This report has been approved by Admin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REPORT HISTORY ── */}
      <div style={{ ...card, overflow: 'hidden', marginBottom: '20px' }}>
        <SectionHeader icon={FileText} title="Report History" color="#8b5cf6" isOpen={open.history} onToggle={() => toggle('history')}
          extra={
            <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
              <select value={histFilters.status} onChange={e => setHistFilters(f => ({ ...f, status: e.target.value }))}
                style={{ fontSize: '12px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', outline: 'none' }}>
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <input type="date" value={histFilters.from} onChange={e => setHistFilters(f => ({ ...f, from: e.target.value }))}
                style={{ fontSize: '12px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }} />
              <input type="date" value={histFilters.to} onChange={e => setHistFilters(f => ({ ...f, to: e.target.value }))}
                style={{ fontSize: '12px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }} />
            </div>
          }
        />
        {open.history && (
          histLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading history…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No reports found for these filters.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Report #', 'Date', 'Submitted By', 'Submitted At', 'Bookings', 'Sales Value', 'Collections', 'EMI', 'Expenses', 'Status', 'Actions'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ ...td, fontWeight: 700, color: '#D4AF37' }}>#{r.id}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{fmt(r.report_date)}</td>
                      <td style={td}>{r.submitter?.name || '—'}</td>
                      <td style={td}>{fmtDT(r.submitted_at)}</td>
                      <td style={td}>{r.snap_new_bookings}</td>
                      <td style={td}>{inr(r.snap_sales_value)}</td>
                      <td style={{ ...td, color: '#22c55e', fontWeight: 700 }}>{inr(r.snap_total_collections)}</td>
                      <td style={{ ...td, color: '#D4AF37' }}>{inr(r.snap_emi_collections)}</td>
                      <td style={{ ...td, color: '#ef4444' }}>{inr(r.snap_expenses)}</td>
                      <td style={td}><StatusBadge status={r.status} /></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => loadViewReport(r.id).then(() => {})}
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={11} /> View
                          </button>
                          {isAdmin && r.status === 'submitted' && (
                            <>
                              <button onClick={() => handleApprove(r.id)}
                                style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                                ✓ Approve
                              </button>
                              <button onClick={() => { setRejectModal(r.id); setRejectReason(''); }}
                                style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                                ✕ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SUBMIT CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {showSubmitConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px', fontWeight: 800 }}>Submit Daily Report</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
              You are about to submit the daily report for <strong>{fmt(reportDate)}</strong> to Admin for review.
              {existingReport?.status === 'rejected' && ' This will replace your previously rejected submission.'}
            </p>
            {summary && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                {[
                  ['New Bookings', summary.new_bookings],
                  ['Total Sales Value', inr(summary.sales_value)],
                  ['Total Collections', inr(summary.total_collections)],
                  ['EMI Collections', inr(summary.emi_collections)],
                  ['Expenses', inr(summary.total_expenses)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>{l}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowSubmitConfirm(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', background: submitting ? '#fef9c3' : 'linear-gradient(135deg, #D4AF37, #c9a227)', color: '#0b1437', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '14px' }}>
                {submitting ? 'Submitting…' : '✓ Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW REPORT MODAL (with live detail)
      ═══════════════════════════════════════════════════════════════ */}
      {viewReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ background: '#0b1437', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#D4AF37" />
                <span style={{ color: 'white', fontWeight: 700 }}>Report #{viewReport.report?.id} — {fmt(viewReport.report?.report_date)}</span>
                <StatusBadge status={viewReport.report?.status} />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {isAdmin && viewReport.report?.status === 'submitted' && (
                  <>
                    <button onClick={() => handleApprove(viewReport.report.id)}
                      style={{ background: '#22c55e', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                      ✓ Approve
                    </button>
                    <button onClick={() => { setRejectModal(viewReport.report.id); setRejectReason(''); }}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                      ✕ Reject
                    </button>
                  </>
                )}
                <button onClick={() => setViewReport(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              {viewLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</div>
              ) : (
                <>
                  {/* Snapshot summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { l: 'Bookings', v: viewReport.report?.snap_new_bookings, c: '#3b82f6' },
                      { l: 'Sales Value', v: inr(viewReport.report?.snap_sales_value), c: '#8b5cf6' },
                      { l: 'Collections', v: inr(viewReport.report?.snap_total_collections), c: '#22c55e' },
                      { l: 'EMI', v: inr(viewReport.report?.snap_emi_collections), c: '#D4AF37' },
                      { l: 'Cash', v: inr(viewReport.report?.snap_cash_collections), c: '#f59e0b' },
                      { l: 'Bank/UPI', v: inr(viewReport.report?.snap_bank_collections), c: '#06b6d4' },
                      { l: 'Expenses', v: inr(viewReport.report?.snap_expenses), c: '#ef4444' },
                      { l: 'Pending/Failed', v: viewReport.report?.snap_pending_count, c: '#f97316' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ background: `${c}10`, border: `1px solid ${c}30`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#64748b' }}>{l}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: c }}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Remarks */}
                  {viewReport.report?.remarks && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Accounts Remarks</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>{viewReport.report.remarks}</p>
                    </div>
                  )}

                  {/* Reject reason */}
                  {viewReport.report?.reject_reason && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
                      <strong>Rejection Reason:</strong> {viewReport.report.reject_reason}
                    </div>
                  )}

                  {/* Transactions count */}
                  <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 6px' }}>
                    Live data: {viewReport.transactions?.length || 0} bookings · {viewReport.payments?.length || 0} payments · {viewReport.emi_installments?.length || 0} EMI installments · {viewReport.daily_records?.length || 0} manual records
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          REJECT REASON MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px', fontWeight: 800 }}>Reject Report #{rejectModal}</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>Please provide a reason for rejection. This will be visible to the Accounts team.</p>
            <textarea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason…"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Cancel</button>
              <button onClick={handleReject}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                ✕ Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
