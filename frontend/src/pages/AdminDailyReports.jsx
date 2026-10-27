/**
 * ADMIN — Daily Reports Review Page
 * Admin can view all submitted Accounts daily reports, approve or reject them.
 */
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  FileText, CheckCircle2, XCircle, Clock, Send, Eye,
  Calendar, Search, RefreshCw, X, AlertTriangle,
  IndianRupee, Building2, CreditCard, TrendingDown, BarChart3
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

const th = { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const card = { background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminDailyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', from: '', to: '', accounts_user: '', search: '' });
  const [accountsUsers, setAccountsUsers] = useState([]);

  // View modal
  const [viewReport, setViewReport] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      if (filters.accounts_user) params.set('accounts_user', filters.accounts_user);
      const res = await api.get(`/daily-reports?${params}`);
      if (res.data.success) setReports(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAccountsUsers = async () => {
    try {
      const res = await api.get('/daily-reports/accounts-users');
      if (res.data.success) setAccountsUsers(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadReports(); loadAccountsUsers(); }, []);
  useEffect(() => { loadReports(); }, [filters.status, filters.from, filters.to, filters.accounts_user]);

  const loadViewReport = async (id) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/daily-reports/${id}`);
      if (res.data.success) setViewReport(res.data.data);
    } catch (e) { alert(e.response?.data?.message || e.message); }
    finally { setViewLoading(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this daily report?')) return;
    try {
      await api.put(`/daily-reports/${id}/approve`);
      loadReports();
      if (viewReport?.report?.id === id) loadViewReport(id);
      alert('Report approved!');
    } catch (e) { alert(e.response?.data?.message || e.message); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert('Enter rejection reason'); return; }
    try {
      await api.put(`/daily-reports/${rejectModal}/reject`, { reason: rejectReason });
      setRejectModal(null); setRejectReason('');
      loadReports();
      if (viewReport?.report?.id === rejectModal) loadViewReport(rejectModal);
      alert('Report rejected.');
    } catch (e) { alert(e.response?.data?.message || e.message); }
  };

  // Search filter
  const filtered = reports.filter(r => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return String(r.id).includes(q) ||
      r.submitter?.name?.toLowerCase().includes(q) ||
      r.report_date?.includes(q);
  });

  // Stats
  const pending = reports.filter(r => r.status === 'submitted').length;
  const approved = reports.filter(r => r.status === 'approved').length;
  const rejected = reports.filter(r => r.status === 'rejected').length;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 800, color: '#0f172a' }}>Daily Reports — Admin Review</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            Review, approve, or reject Accounts-submitted daily reports
          </p>
        </div>
        <button onClick={loadReports} disabled={loading}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { l: 'Total Reports', v: reports.length, icon: FileText, c: '#3b82f6' },
          { l: 'Pending Review', v: pending, icon: Clock, c: '#f59e0b' },
          { l: 'Approved', v: approved, icon: CheckCircle2, c: '#22c55e' },
          { l: 'Rejected', v: rejected, icon: XCircle, c: '#ef4444' },
        ].map(({ l, v, icon: Icon, c }) => (
          <div key={l} style={{ ...card, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={19} color={c} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{v}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '7px 12px', flex: 1, minWidth: '180px' }}>
          <Search size={14} color="#94a3b8" />
          <input placeholder="Search report ID, name, date…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#1e293b', width: '100%' }} />
        </div>
        {/* Status */}
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff' }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {/* Accounts User */}
        <select value={filters.accounts_user} onChange={e => setFilters(f => ({ ...f, accounts_user: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff' }}>
          <option value="">All Accounts Users</option>
          {accountsUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.login_id})</option>)}
        </select>
        {/* Date Range */}
        <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff' }} />
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
        <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff' }} />
      </div>

      {/* ── Reports Table ── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={17} color="#D4AF37" />
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Reports ({filtered.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw size={28} style={{ margin: '0 auto 10px' }} />
            <p style={{ margin: 0 }}>Loading reports…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No reports found.</p>
          </div>
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
                {filtered.map((r) => (
                  <tr key={r.id}
                    style={{ background: r.status === 'submitted' ? '#fffbeb' : '' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = r.status === 'submitted' ? '#fffbeb' : ''}>
                    <td style={{ ...td, fontWeight: 700, color: '#D4AF37' }}>#{r.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmt(r.report_date)}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{r.submitter?.name || '—'}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.submitter?.login_id}</div>
                    </td>
                    <td style={td}>{fmtDT(r.submitted_at)}</td>
                    <td style={td}>{r.snap_new_bookings}</td>
                    <td style={td}>{inr(r.snap_sales_value)}</td>
                    <td style={{ ...td, color: '#22c55e', fontWeight: 700 }}>{inr(r.snap_total_collections)}</td>
                    <td style={{ ...td, color: '#D4AF37' }}>{inr(r.snap_emi_collections)}</td>
                    <td style={{ ...td, color: '#ef4444' }}>{inr(r.snap_expenses)}</td>
                    <td style={td}><StatusBadge status={r.status} /></td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button onClick={() => { setViewReport(null); loadViewReport(r.id); }}
                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Eye size={11} /> View
                        </button>
                        {r.status === 'submitted' && (
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
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW REPORT DETAIL MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {(viewReport || viewLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ background: '#0b1437', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#D4AF37" />
                <span style={{ color: 'white', fontWeight: 700 }}>
                  {viewReport ? `Report #${viewReport.report?.id} — ${fmt(viewReport.report?.report_date)}` : 'Loading…'}
                </span>
                {viewReport && <StatusBadge status={viewReport.report?.status} />}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {viewReport?.report?.status === 'submitted' && (
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
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={24} style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0 }}>Loading report details…</p>
                </div>
              ) : viewReport ? (
                <>
                  {/* Meta info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Report Info</p>
                      {[
                        ['Report Date', fmt(viewReport.report?.report_date)],
                        ['Submitted By', `${viewReport.report?.submitter?.name} (${viewReport.report?.submitter?.login_id})`],
                        ['Submitted At', fmtDT(viewReport.report?.submitted_at)],
                      ].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ color: '#64748b' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Review Info</p>
                      {[
                        ['Status', <StatusBadge status={viewReport.report?.status} />],
                        ['Reviewed By', viewReport.report?.reviewer ? `${viewReport.report.reviewer.name} (${viewReport.report.reviewer.login_id})` : '—'],
                        ['Reviewed At', fmtDT(viewReport.report?.reviewed_at)],
                      ].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ color: '#64748b' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary snapshot */}
                  <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '13px', fontWeight: 700 }}>Summary Snapshot (at time of submission)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { l: 'Bookings', v: viewReport.report?.snap_new_bookings, c: '#3b82f6' },
                      { l: 'Sales Value', v: inr(viewReport.report?.snap_sales_value), c: '#8b5cf6' },
                      { l: 'Collections', v: inr(viewReport.report?.snap_total_collections), c: '#22c55e' },
                      { l: 'EMI Collections', v: inr(viewReport.report?.snap_emi_collections), c: '#D4AF37' },
                      { l: 'Cash', v: inr(viewReport.report?.snap_cash_collections), c: '#f59e0b' },
                      { l: 'Bank/UPI', v: inr(viewReport.report?.snap_bank_collections), c: '#06b6d4' },
                      { l: 'Expenses', v: inr(viewReport.report?.snap_expenses), c: '#ef4444' },
                      { l: 'Pending/Failed', v: viewReport.report?.snap_pending_count, c: '#f97316' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ background: `${c}10`, border: `1px solid ${c}30`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#64748b' }}>{l}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: c }}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Remarks */}
                  {viewReport.report?.remarks && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Accounts Remarks</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>{viewReport.report.remarks}</p>
                    </div>
                  )}

                  {/* Reject reason */}
                  {viewReport.report?.reject_reason && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', color: '#b91c1c', fontSize: '13px' }}>
                      <strong>Rejection Reason:</strong> {viewReport.report.reject_reason}
                    </div>
                  )}

                  {/* Live data counts */}
                  <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 6px' }}>
                    Live data for {fmt(viewReport.report?.report_date)}: &nbsp;
                    <strong>{viewReport.transactions?.length || 0}</strong> bookings ·
                    <strong> {viewReport.payments?.length || 0}</strong> payments ·
                    <strong> {viewReport.emi_installments?.length || 0}</strong> EMI installments ·
                    <strong> {viewReport.daily_records?.length || 0}</strong> manual records
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>
                    Note: Live figures are current database values. Snapshot figures above were captured at submission time.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          REJECT MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px', fontWeight: 800 }}>Reject Report #{rejectModal}</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>This reason will be shown to the Accounts team so they can resubmit.</p>
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
