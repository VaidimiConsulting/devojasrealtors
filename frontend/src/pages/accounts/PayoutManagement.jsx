import React, { useEffect, useState, useCallback } from 'react';
import {
  IndianRupee, Plus, Edit2, Trash2, Eye, X, AlertCircle, CheckCircle2,
  ChevronRight, Calculator, User, Calendar, FileText, TrendingUp, Printer,
  Target, Award, ShieldAlert, ChevronDown, ChevronUp, Users, RefreshCw, Check
} from 'lucide-react';
import api from '../../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatLakhCrore = (num) => {
  const n = Number(num);
  if (!n || isNaN(n) || n <= 0) return '';
  if (n >= 10000000) {
    const cr = n / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (n >= 100000) {
    const lk = n / 100000;
    return `₹${lk % 1 === 0 ? lk : lk.toFixed(2)} Lakh`;
  }
  if (n >= 1000) {
    const th = n / 1000;
    return `₹${th % 1 === 0 ? th : th.toFixed(1)}k`;
  }
  return `₹${n.toLocaleString('en-IN')}`;
};

const emptyForm = {
  associate_id: '',
  payment_date: new Date().toISOString().split('T')[0],
  effective_commission_percent: '',
  self_business: '',
  team_business: '',
  differential_commission: '',
  other_earnings: '0',
  tds_percent: '5',
  notes: '',
  status: 'pending'
};

const printStatement = (s) => {
  const win = window.open('', '_blank', 'width=900,height=750');
  const sponsorName = s.associate?.referrer?.name || s.associate?.sponsor?.name || 'Company / Direct Root';
  const sponsorId = s.associate?.referrer?.login_id || s.associate?.sponsor?.login_id || 'ROOT';
  const effectiveRate = s.effective_commission_percent || s.slab_percent || s.associate?.commission_percent || 0;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Payout Statement — ${s.associate?.name || ''} (${s.associate?.login_id || ''})</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Roboto', sans-serif; background: #fff; color: #222; }
  .page { width: 794px; margin: 0 auto; padding: 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; }
  .company h1 { font-size: 22px; font-weight: 900; color: #1e3a8a; }
  .company p { font-size: 10px; color: #555; }
  .title { text-align: right; }
  .title h2 { font-size: 18px; font-weight: 800; color: #1e3a8a; }
  .title p { font-size: 11px; color: #888; }
  .status-tag { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; border-radius: 4px; background: #e0e7ff; color: #3730a3; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; background: #f8faff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px; }
  .info-item label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
  .info-item p { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px; }
  .rule-badge { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 11px; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1e3a8a; color: #fff; font-size: 11px; padding: 8px 12px; text-align: left; }
  td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8faff; }
  .highlight td { background: #dbeafe !important; font-weight: 700; }
  .net-row td { background: #1e3a8a !important; color: #fff; font-weight: 900; font-size: 14px; }
  .label-col { color: #64748b; }
  .amount-col { text-align: right; font-weight: 600; }
  .sig-area { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-box { text-align: center; }
  .sig-line { width: 180px; border-top: 1.5px solid #333; margin: 0 auto 6px; }
  .sig-label { font-size: 11px; color: #555; }
  .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company">
      <img src="${window.location.origin}/logo.png" style="height:60px;object-fit:contain;" onerror="this.style.display='none'" />
      <h1>DEVOJAS REALTORS</h1>
      <p>Transforming Dreams into Reality</p>
    </div>
    <div class="title">
      <h2>PAYOUT STATEMENT</h2>
      <p>Statement Reference: PS-${s.id || 'NEW'}</p>
      <p>Payment Date: ${s.payment_date ? new Date(s.payment_date).toLocaleDateString('en-IN') : '—'}</p>
      <span class="status-tag">Status: ${String(s.status || 'pending').toUpperCase()}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Associate Name</label><p>${s.associate?.name || '—'}</p></div>
    <div class="info-item"><label>Associate ID</label><p>${s.associate?.login_id || '—'}</p></div>
    <div class="info-item"><label>Sponsor / Upline</label><p>${sponsorName} (${sponsorId})</p></div>
    <div class="info-item"><label>Mobile</label><p>${s.associate?.phone || '—'}</p></div>
    <div class="info-item"><label>Statement Comm. %</label><p>${effectiveRate}%</p></div>
    <div class="info-item"><label>Applicable Slab</label><p>${s.slab?.slab_number ? `Slab ${s.slab.slab_number}` : (s.slab_percent ? `${s.slab_percent}%` : 'Slab 1')}</p></div>
  </div>

  <div class="rule-badge">
    <strong>MLM Commission Rule:</strong> Self Commission is fixed at ₹0.00. Personal sales count toward Self Business for slab target qualification. Payout consists of Eligible Team Differential Commission plus Slab Reward unlocked when personal Self Business meets the slab's Self Target. Only TDS is deducted.
  </div>

  <table>
    <thead><tr><th>#</th><th>Description</th><th>Notes / Status</th><th style="text-align:right">Amount (₹)</th></tr></thead>
    <tbody>
      <tr><td>1</td><td class="label-col">Eligible Self Business</td><td style="color:#64748b">Personal deals closed</td><td class="amount-col">${Number(s.self_business||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>2</td><td class="label-col">Eligible Team Business</td><td style="color:#64748b">Downline deals closed</td><td class="amount-col">${Number(s.team_business||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr class="highlight"><td>3</td><td><strong>Total Business</strong></td><td>Qualifies for slab tier</td><td class="amount-col"><strong>${Number(s.total_business||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>
      <tr><td>4</td><td class="label-col">Self Commission</td><td style="color:#64748b;font-style:italic">Fixed MLM rule: ₹0 on own sales</td><td class="amount-col font-bold">₹0.00</td></tr>
      <tr><td>5</td><td class="label-col">Team Differential Commission</td><td style="color:#1e40af">Earned from downline sales</td><td class="amount-col">${Number(s.team_deposit||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>6</td><td class="label-col">Self Target Status</td><td>${s.self_target_achieved ? '<strong style="color:#059669">Achieved ✓</strong>' : '<span style="color:#d97706">Not Achieved</span>'} (Target: ₹${Number(s.self_target_amount||0).toLocaleString('en-IN')})</td><td class="amount-col font-semibold" style="color:${s.self_target_achieved ? '#059669' : '#94a3b8'}">${s.self_target_achieved ? `+ ${Number(s.reward_amount||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}</td></tr>
      <tr class="highlight"><td>7</td><td><strong>Gross Payout</strong></td><td>Team Differential + Total Reward</td><td class="amount-col"><strong>${Number(s.total_amount||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>
      <tr><td>8</td><td class="label-col">TDS Deduction (${s.tds_percent}%)</td><td style="color:#dc2626">Tax deduction at source</td><td class="amount-col" style="color:#dc2626">- ${Number(s.tds_amount||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr class="net-row"><td colspan="3">NET PAYABLE AMOUNT</td><td style="text-align:right">₹${Number(s.net_payable||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    </tbody>
  </table>

  ${s.notes ? `<p style="font-size:11px;color:#555;margin-bottom:16px;"><strong>Remarks / Settlement Notes:</strong> ${s.notes}</p>` : ''}

  <div class="sig-area">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Associate Signature<br/>${s.associate?.name || ''}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Accounts Department<br/>Devojas Realtors</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Authorised Director<br/>Devojas Realtors</div>
    </div>
  </div>

  <div class="footer">Devojas Realtors · Real Estate MLM Software · Generated on ${new Date().toLocaleString('en-IN')}</div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`);
  win.document.close();
};

const PayoutManagement = () => {
  const [statements, setStatements] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStmt, setEditingStmt] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedAssociate, setSelectedAssociate] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());
  const [showLedgerEntries, setShowLedgerEntries] = useState(false);

  // Live calculation preview state
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [viewStmt, setViewStmt] = useState(null);

  const fetchStatements = async () => {
    setLoading(true);
    try {
      const [stmtsRes, assocsRes] = await Promise.all([
        api.get('/payout-statements'),
        api.get('/payout-statements/associates')
      ]);
      setStatements(stmtsRes.data.data || []);
      setAssociates(assocsRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  // Request live calculation preview from backend
  const requestBackendPreview = useCallback(async (formData, entryIds) => {
    setPreviewLoading(true);
    try {
      const payload = {
        associate_id: formData.associate_id,
        payment_date: formData.payment_date,
        self_business: formData.self_business,
        team_business: formData.team_business,
        effective_commission_percent: formData.effective_commission_percent,
        differential_commission: formData.differential_commission,
        other_earnings: formData.other_earnings || 0,
        tds_percent: formData.tds_percent,
        commission_ids: entryIds ? Array.from(entryIds) : []
      };
      const res = await api.post('/payout-statements/preview', payload);
      setPreview(res.data.data);
    } catch (err) {
      console.error('Error fetching calculation preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // When associate changes in New statement mode: load associate ledger & monthly business
  const handleAssociateSelect = async (assocId) => {
    const assoc = associates.find(a => String(a.id) === String(assocId));
    setSelectedAssociate(assoc || null);

    if (!assocId) {
      setLedgerEntries([]);
      setSelectedEntryIds(new Set());
      setForm(prev => ({ ...prev, associate_id: '' }));
      setPreview(null);
      return;
    }

    try {
      const res = await api.get(`/payout-statements/ledger/${assocId}`, {
        params: { payment_date: form.payment_date }
      });
      const data = res.data.data;
      const entries = data.entries || [];
      const allIds = new Set(entries.map(e => e.id));

      setLedgerEntries(entries);
      setSelectedEntryIds(allIds);

      const newForm = {
        ...form,
        associate_id: String(assocId),
        effective_commission_percent: String(data.associate?.own_commission_rate ?? assoc?.commission_percent ?? 5),
        self_business: String(data.summary?.self_business ?? 0),
        team_business: String(data.summary?.team_business ?? 0),
        differential_commission: String(data.summary?.differential_commission ?? 0),
        status: 'pending'
      };
      setForm(newForm);
      requestBackendPreview(newForm, allIds);
    } catch (err) {
      console.error('Failed to load associate ledger:', err);
      const fallbackRate = assoc?.commission_percent ?? 5;
      const newForm = {
        ...form,
        associate_id: String(assocId),
        effective_commission_percent: String(fallbackRate),
        self_business: '0',
        team_business: '0',
        differential_commission: '0',
        status: 'pending'
      };
      setForm(newForm);
      requestBackendPreview(newForm, new Set());
    }
  };

  // Open New Payout Statement modal
  const openNewStatement = () => {
    setEditingStmt(null);
    setSelectedAssociate(null);
    setLedgerEntries([]);
    setSelectedEntryIds(new Set());
    setShowLedgerEntries(false);
    setError('');
    const fresh = { ...emptyForm, payment_date: new Date().toISOString().split('T')[0], status: 'pending' };
    setForm(fresh);
    setPreview(null);
    setModalOpen(true);
  };

  // Open Edit Payout Statement modal
  const openEditStatement = async (s) => {
    setEditingStmt(s);
    const assoc = s.associate || associates.find(a => String(a.id) === String(s.associate_id)) || null;
    setSelectedAssociate(assoc);
    setLedgerEntries([]);
    setSelectedEntryIds(new Set());
    setShowLedgerEntries(false);
    setError('');

    const initialForm = {
      associate_id: String(s.associate_id),
      payment_date: s.payment_date || new Date().toISOString().split('T')[0],
      effective_commission_percent: String(s.effective_commission_percent || s.slab_percent || assoc?.commission_percent || 5),
      self_business: String(s.self_business ?? 0),
      team_business: String(s.team_business ?? 0),
      differential_commission: String(s.team_deposit ?? 0),
      other_earnings: '0',
      tds_percent: String(s.tds_percent ?? 5),
      notes: s.notes || '',
      status: s.status || 'pending'
    };
    setForm(initialForm);
    setModalOpen(true);
    requestBackendPreview(initialForm, new Set());
  };

  // Handle generic form input changes and trigger live calculation
  const handleInputChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);

    // If effective_commission_percent changed, recalculate differential commission
    if (field === 'effective_commission_percent' && form.associate_id && ledgerEntries.length > 0) {
      const eff = parseFloat(value) || 0;
      let newDiff = 0;
      ledgerEntries.forEach(e => {
        if (selectedEntryIds.has(e.id) && e.commission_type === 'differential') {
          const diffRate = Math.max(0, eff - parseFloat(e.seller_rate || 0));
          newDiff += Math.round((parseFloat(e.sale_amount) * diffRate / 100) * 100) / 100;
        }
      });
      updated.differential_commission = String(Math.round(newDiff * 100) / 100);
      setForm(updated);
    }

    requestBackendPreview(updated, selectedEntryIds);
  };

  // Toggle ledger entry selection
  const toggleEntryCheckbox = (id) => {
    const nextSet = new Set(selectedEntryIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedEntryIds(nextSet);

    let sBiz = 0;
    let tBiz = 0;
    let diff = 0;
    const eff = parseFloat(form.effective_commission_percent) || 0;

    ledgerEntries.forEach(e => {
      if (nextSet.has(e.id)) {
        if (e.commission_type === 'direct') {
          sBiz += parseFloat(e.sale_amount || 0);
        } else {
          tBiz += parseFloat(e.sale_amount || 0);
          const diffRate = Math.max(0, eff - parseFloat(e.seller_rate || 0));
          diff += Math.round((parseFloat(e.sale_amount) * diffRate / 100) * 100) / 100;
        }
      }
    });

    const updated = {
      ...form,
      self_business: String(sBiz),
      team_business: String(tBiz),
      differential_commission: String(diff)
    };
    setForm(updated);
    requestBackendPreview(updated, nextSet);
  };

  // Submit Payout Statement (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        associate_id: form.associate_id,
        payment_date: form.payment_date,
        effective_commission_percent: form.effective_commission_percent,
        self_business: form.self_business,
        team_business: form.team_business,
        differential_commission: form.differential_commission,
        other_earnings: form.other_earnings || 0,
        tds_percent: form.tds_percent,
        notes: form.notes,
        status: form.status || 'pending',
        commission_ids: Array.from(selectedEntryIds)
      };

      if (editingStmt) {
        await api.put(`/payout-statements/${editingStmt.id}`, payload);
      } else {
        await api.post('/payout-statements', payload);
      }

      setModalOpen(false);
      fetchStatements();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving statement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payout statement?')) return;
    try {
      await api.delete(`/payout-statements/${id}`);
      fetchStatements();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting payout statement');
    }
  };

  // Quick action: update statement status (e.g. approve or mark as paid)
  const handleStatusChange = async (stmtId, newStatus) => {
    try {
      await api.put(`/payout-statements/${stmtId}`, { status: newStatus });
      fetchStatements();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const sponsorDisplay = selectedAssociate?.referrer?.name || selectedAssociate?.sponsor?.name || 'Company / Direct Root (Level 0)';
  const sponsorIdDisplay = selectedAssociate?.referrer?.login_id || selectedAssociate?.sponsor?.login_id || 'ROOT';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee size={26} className="text-blue-700" />
            Payout Requests &amp; Settlement Statements
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Accounts Panel — Verified MLM differential commission, exact self-target slab rewards, and automatic TDS deductions.
          </p>
        </div>
        <button onClick={openNewStatement} className="btn-primary flex items-center gap-2 shadow-sm">
          <Plus size={18} /> New Payout Request / Statement
        </button>
      </div>

      {/* Critical Business Rule Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3 shadow-sm">
        <Target size={18} className="text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-blue-950 uppercase tracking-wide">
            Payout Formula &amp; Self-Sale Reward Rules
          </p>
          <p className="text-slate-700 leading-relaxed">
            <strong>Self Commission = ₹0.</strong> Personal sales count strictly toward <strong>Self Business</strong>.
            Slab Reward is awarded only if <strong>Self Business ≥ Self Target</strong> for the applicable slab. Team sales never count toward self target.
            <strong> Gross Payout = Team Differential Commission + Total Reward.</strong> Only <strong>TDS</strong> is deducted. No processing fees apply.
          </p>
        </div>
      </div>

      {/* Payout Statements Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-left">S.No</th>
                <th className="px-4 py-3.5 text-left">Associate &amp; Sponsor</th>
                <th className="px-4 py-3.5 text-left">Status</th>
                <th className="px-4 py-3.5 text-left">Self Business</th>
                <th className="px-4 py-3.5 text-left">Team Business</th>
                <th className="px-4 py-3.5 text-center">Applicable Slab</th>
                <th className="px-4 py-3.5 text-center">Self Target Status</th>
                <th className="px-4 py-3.5 text-right">Team Differential</th>
                <th className="px-4 py-3.5 text-right">Slab Reward</th>
                <th className="px-4 py-3.5 text-right">Gross Payout</th>
                <th className="px-4 py-3.5 text-right">TDS</th>
                <th className="px-4 py-3.5 text-right">Net Payable</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="13" className="text-center py-16 text-slate-400">Loading payout statements...</td></tr>
              ) : statements.length === 0 ? (
                <tr>
                  <td colSpan="13" className="text-center py-16 text-slate-400">
                    No payout statements recorded yet.{' '}
                    <button onClick={openNewStatement} className="text-blue-700 font-bold underline ml-1">
                      Create first statement
                    </button>
                  </td>
                </tr>
              ) : (
                statements.map((s, idx) => {
                  const sponsor = s.associate?.referrer?.name || s.associate?.sponsor?.name || 'Company (Root)';
                  const sponsorId = s.associate?.referrer?.login_id || s.associate?.sponsor?.login_id || 'ROOT';
                  const statusColors = {
                    pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    approved: 'bg-blue-50 text-blue-800 border-blue-200',
                    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    rejected: 'bg-red-50 text-red-800 border-red-200',
                    published: 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  };

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{s.associate?.name || '—'}</div>
                        <div className="text-xs text-blue-700 font-mono">{s.associate?.login_id}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>Sponsor:</span>
                          <span className="text-slate-600 font-medium">{sponsor}</span>
                          <span className="font-mono text-[10px]">({sponsorId})</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase ${statusColors[s.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {s.status || 'pending'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {INR(s.self_business)}
                      </td>

                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {INR(s.team_business)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-100">
                          {s.slab?.slab_number ? `Slab ${s.slab.slab_number}` : 'Slab 1'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {s.self_target_achieved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Achieved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
                            Not Achieved
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-800 font-mono">
                        {INR(s.team_deposit)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">
                        {s.self_target_achieved && parseFloat(s.reward_amount) > 0 ? INR(s.reward_amount) : '₹0.00'}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                        {INR(s.total_amount)}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-red-600 font-mono">
                        - {INR(s.tds_amount)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="inline-block px-3 py-1 bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs font-mono">
                          {INR(s.net_payable)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewStmt(s)}
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Statement Breakdown"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => printStatement(s)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Print Formal Statement"
                          >
                            <Printer size={16} />
                          </button>
                          {s.status !== 'paid' && (
                            <>
                              <button
                                onClick={() => openEditStatement(s)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit Statement / Status"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(s.id, 'paid')}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Mark as Paid"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Statement"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── NEW / EDIT PAYOUT STATEMENT MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl z-10 max-h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
              <div className="flex items-center gap-3">
                <Calculator size={22} className="text-blue-300" />
                <div>
                  <h2 className="font-bold text-lg">
                    {editingStmt ? `Edit Payout Request / Statement PS-${editingStmt.id}` : 'New Payout Request Form'}
                  </h2>
                  <p className="text-xs text-blue-200">
                    Accounts Panel Payout Request · Self-Sale Reward Formula · TDS Deduction · No Processing Fee
                  </p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-white/80 hover:text-white rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* LEFT: FORM INPUTS (7 cols) */}
                  <div className="lg:col-span-7 space-y-5">

                    {/* Section 1: Associate & Hierarchy */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={14} className="text-blue-700" />
                          Associate Selection &amp; Hierarchy
                        </span>
                        {editingStmt && (
                          <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            Editing PS-{editingStmt.id}
                          </span>
                        )}
                      </div>

                      {!editingStmt ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Select Associate / Associate ID *</label>
                          <select
                            required
                            value={form.associate_id}
                            onChange={(e) => handleAssociateSelect(e.target.value)}
                            className="input-field text-sm"
                          >
                            <option value="">— Choose Associate —</option>
                            {associates.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.login_id}) · Master Rate: {a.commission_percent ?? a.referral_commission_percent ?? 5}%
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {/* Associate & Sponsor Information Card */}
                      {selectedAssociate && (
                        <div className="grid grid-cols-2 gap-3 bg-white border border-slate-200 rounded-xl p-3 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold uppercase block text-[10px]">Associate</span>
                            <span className="font-bold text-slate-900 block text-sm">{selectedAssociate.name}</span>
                            <span className="font-mono text-blue-700 text-xs font-bold">{selectedAssociate.login_id}</span>
                            <span className="text-slate-500 block">{selectedAssociate.phone || 'No phone'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase block text-[10px]">Sponsor / Upline</span>
                            <span className="font-bold text-slate-900 block text-sm">{sponsorDisplay}</span>
                            <span className="font-mono text-slate-600 text-xs">{sponsorIdDisplay}</span>
                            <span className="text-emerald-700 font-semibold block mt-0.5">
                              Master Rate: {selectedAssociate.commission_percent ?? selectedAssociate.referral_commission_percent ?? 0}%
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date *</label>
                          <input
                            required
                            type="date"
                            value={form.payment_date}
                            onChange={(e) => handleInputChange('payment_date', e.target.value)}
                            className="input-field text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Request Status</label>
                          <select
                            value={form.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="input-field text-sm capitalize"
                          >
                            <option value="pending">Pending (Review)</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid (Execute Settlement)</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Statement Commission % (Optional Override) */}
                    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-blue-700" />
                          Statement Commission Rate (%) *
                        </label>
                        {selectedAssociate && (
                          <span className="text-[11px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full font-bold">
                            Profile Rate: {selectedAssociate.commission_percent ?? selectedAssociate.referral_commission_percent ?? 0}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          required
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={form.effective_commission_percent}
                          onChange={(e) => handleInputChange('effective_commission_percent', e.target.value)}
                          className="input-field text-base font-bold text-blue-900 w-32 border-blue-300 focus:ring-blue-500"
                          placeholder="e.g. 5"
                        />
                        <span className="font-bold text-slate-600">%</span>
                        {selectedAssociate && (
                          <button
                            type="button"
                            onClick={() => handleInputChange('effective_commission_percent', String(selectedAssociate.commission_percent || 5))}
                            className="text-xs text-blue-700 hover:underline font-semibold ml-2"
                          >
                            Reset to Profile Rate
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Statement-specific commission rate applied to downline differential calculations for this payout.
                      </p>
                    </div>

                    {/* Section 3: Business Volumes */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Business Volumes (Personal &amp; Team)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Self Business (Personal Sales) (₹) *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            step="1"
                            value={form.self_business}
                            onChange={(e) => handleInputChange('self_business', e.target.value)}
                            className="input-field text-sm font-mono font-bold"
                            placeholder="e.g. 750000"
                          />
                          <p className="text-[11px] text-blue-700 font-semibold mt-1">
                            {formatLakhCrore(form.self_business) || '₹0'} personal sales
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Team Business (Downline Sales) (₹) *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            step="1"
                            value={form.team_business}
                            onChange={(e) => handleInputChange('team_business', e.target.value)}
                            className="input-field text-sm font-mono font-bold"
                            placeholder="e.g. 15000000"
                          />
                          <p className="text-[11px] text-slate-500 font-medium mt-1">
                            {formatLakhCrore(form.team_business) || '₹0'} downline sales
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Team Differential Commission */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Team Differential Commission
                      </span>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Total Team Differential Commission (₹) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.differential_commission}
                          onChange={(e) => handleInputChange('differential_commission', e.target.value)}
                          className="input-field text-sm font-mono font-bold text-slate-800"
                          placeholder="e.g. 390000"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Fetched from verified MLM downline commission ledger.
                        </p>
                      </div>

                      {/* Optional Expandable Linked Downline Sales */}
                      {ledgerEntries.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowLedgerEntries(!showLedgerEntries)}
                            className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1.5"
                          >
                            {showLedgerEntries ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showLedgerEntries ? 'Hide' : 'View & Select'} Linked Downline Sales ({ledgerEntries.length} entries)
                          </button>

                          {showLedgerEntries && (
                            <div className="mt-3 border border-slate-200 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
                              <table className="min-w-full text-[11px]">
                                <thead className="bg-slate-100 text-slate-500 sticky top-0 uppercase">
                                  <tr>
                                    <th className="p-2 text-center">✓</th>
                                    <th className="p-2 text-left">Plot / Ref</th>
                                    <th className="p-2 text-left">Seller</th>
                                    <th className="p-2 text-right">Sale (₹)</th>
                                    <th className="p-2 text-center">Seller %</th>
                                    <th className="p-2 text-center">Diff %</th>
                                    <th className="p-2 text-right">Diff (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {ledgerEntries.map(e => {
                                    const isDiff = e.commission_type === 'differential';
                                    const eff = parseFloat(form.effective_commission_percent) || 0;
                                    const diffRate = isDiff ? Math.max(0, eff - parseFloat(e.seller_rate || 0)) : 0;
                                    const diffAmt = isDiff ? Math.round((parseFloat(e.sale_amount) * diffRate / 100) * 100) / 100 : 0;
                                    const checked = selectedEntryIds.has(e.id);

                                    return (
                                      <tr key={e.id} className={checked ? 'bg-white' : 'bg-slate-50 opacity-50'}>
                                        <td className="p-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleEntryCheckbox(e.id)}
                                          />
                                        </td>
                                        <td className="p-2 font-mono">{e.plot?.plot_number || e.sale_id}</td>
                                        <td className="p-2">{e.seller?.name || 'Direct'}</td>
                                        <td className="p-2 text-right font-mono">{INR(e.sale_amount)}</td>
                                        <td className="p-2 text-center">{e.seller_rate}%</td>
                                        <td className="p-2 text-center font-bold text-blue-700">{diffRate}%</td>
                                        <td className="p-2 text-right font-mono font-bold text-slate-800">{INR(diffAmt)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Section 5: TDS & Remarks (Processing Fee REMOVED) */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Deductions &amp; Remarks (TDS Only)
                      </span>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">TDS (%) *</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={form.tds_percent}
                          onChange={(e) => handleInputChange('tds_percent', e.target.value)}
                          className="input-field text-sm w-36 font-bold"
                          placeholder="5"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Tax Deduction at Source. No processing fee or other deduction is applied.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Settlement Notes</label>
                        <textarea
                          rows={2}
                          value={form.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          className="input-field text-sm resize-none"
                          placeholder="Optional settlement notes..."
                        />
                      </div>
                    </div>

                  </div>

                  {/* RIGHT: LIVE CALCULATION PREVIEW (5 cols, sticky) */}
                  <div className="lg:col-span-5">
                    <div className="bg-white border-2 border-blue-200 rounded-3xl overflow-hidden shadow-lg sticky top-0 divide-y divide-slate-100">

                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-slate-800 to-blue-900 p-4 text-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                            <Calculator size={16} /> Live Calculation Preview
                          </span>
                          {previewLoading && (
                            <RefreshCw size={14} className="animate-spin text-blue-300" />
                          )}
                        </div>
                        <div className="mt-2 text-sm font-semibold">
                          {selectedAssociate?.name || 'Select an Associate'}
                        </div>
                        <div className="text-xs text-blue-200 font-mono">
                          {selectedAssociate?.login_id} · Sponsor: {sponsorDisplay}
                        </div>
                      </div>

                      {/* Business Volumes Preview */}
                      <div className="p-4 space-y-2 bg-slate-50/50 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Self Business (Personal Sales):</span>
                          <span className="font-bold text-slate-800 font-mono">{INR(preview?.self_business ?? form.self_business)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Team Business (Downline Sales):</span>
                          <span className="font-bold text-slate-800 font-mono">{INR(preview?.team_business ?? form.team_business)}</span>
                        </div>
                        <div className="flex justify-between items-center text-blue-900 font-bold pt-1 border-t border-slate-200">
                          <span>Total Business (Self + Team):</span>
                          <span className="text-sm font-black font-mono">{INR(preview?.total_business ?? ((parseFloat(form.self_business)||0)+(parseFloat(form.team_business)||0)))}</span>
                        </div>
                      </div>

                      {/* Slab & Self Target Achievement */}
                      <div className="p-4 space-y-2.5 bg-white">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase">Applicable Slab:</span>
                          <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {preview?.slab?.slab_number ? `Slab ${preview.slab.slab_number} @ ${preview.slab.percentage}%` : 'Slab 1 @ 5%'}
                          </span>
                        </div>

                        {/* Self Target Status Card */}
                        <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          preview?.self_target_achieved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <Target size={14} className={preview?.self_target_achieved ? 'text-emerald-700' : 'text-amber-700'} />
                              Self Target: {INR(preview?.self_target_amount || 0)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              preview?.self_target_achieved ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                            }`}>
                              {preview?.self_target_achieved ? 'Achieved ✓' : 'Not Achieved'}
                            </span>
                          </div>
                          <p className="text-[11px] leading-tight">
                            {preview?.self_target_achieved ? (
                              <span className="text-emerald-700 font-medium">
                                Personal sales ({INR(preview.self_business)}) met Self Target ({INR(preview.self_target_amount)}). Fixed reward unlocked!
                              </span>
                            ) : (
                              <span className="text-amber-800">
                                Personal sales ({INR(preview?.self_business || form.self_business || 0)}) are below Self Target ({INR(preview?.self_target_amount || 0)}). Team sales do not count.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Exact Earnings Breakdown */}
                      <div className="p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="flex items-center gap-1">
                            Self Commission (Personal Sales)
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">Rule: ₹0</span>
                          </span>
                          <span className="font-bold text-slate-400 font-mono">₹0.00</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-700">
                          <span>Total Team Differential Commission:</span>
                          <span className="font-bold text-slate-900 font-mono">{INR(preview?.differential_commission ?? form.differential_commission)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Award size={13} className="text-emerald-600" />
                            Total Reward (Slab Reward):
                          </span>
                          <span className={`font-bold font-mono ${preview?.self_target_achieved ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {INR(preview?.slab_reward || 0)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                          <span>Gross Payout:</span>
                          <span className="font-black text-blue-900 font-mono">{INR(preview?.gross_payout || 0)}</span>
                        </div>
                      </div>

                      {/* Deductions Breakdown (TDS Only) */}
                      <div className="p-4 space-y-2 text-xs bg-slate-50/50">
                        <div className="flex justify-between items-center text-red-600">
                          <span>TDS Deduction ({preview?.tds_percent ?? form.tds_percent}%):</span>
                          <span className="font-semibold font-mono">- {INR(preview?.tds_amount || 0)}</span>
                        </div>
                      </div>

                      {/* Net Payable Banner */}
                      <div className="bg-blue-700 p-5 text-white">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs uppercase tracking-wider text-blue-200 font-bold block">
                              Net Payable
                            </span>
                            <span className="text-[11px] text-blue-200">Gross Payout − TDS</span>
                          </div>
                          <span className="text-2xl font-black font-mono">
                            {INR(preview?.net_payable || 0)}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.associate_id}
                    className="btn-primary px-8 py-2.5 font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Generating Statement…' : (editingStmt ? 'Update Statement' : 'Generate Payout Request / Statement')}
                    {!submitting && <ChevronRight size={18} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATEMENT DETAILS VIEW MODAL ─── */}
      {viewStmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setViewStmt(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
              <div>
                <h2 className="font-bold text-lg">Payout Statement PS-{viewStmt.id}</h2>
                <span className="text-xs text-blue-200 uppercase font-bold">Status: {viewStmt.status || 'pending'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printStatement(viewStmt)}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setViewStmt(null)} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 text-xs">
              {/* Associate Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-blue-950 text-base">{viewStmt.associate?.name}</p>
                    <p className="text-blue-700 font-mono font-bold">{viewStmt.associate?.login_id} · {viewStmt.associate?.phone}</p>
                  </div>
                  <span className="bg-blue-700 text-white font-mono text-xs px-2.5 py-1 rounded-lg font-bold">
                    Rate: {viewStmt.effective_commission_percent || viewStmt.slab_percent}%
                  </span>
                </div>
                <p className="text-slate-500 pt-1">
                  Sponsor: <strong>{viewStmt.associate?.referrer?.name || viewStmt.associate?.sponsor?.name || 'Company (Root)'}</strong>
                </p>
                <p className="text-slate-500">
                  Payment Date: {viewStmt.payment_date ? new Date(viewStmt.payment_date).toLocaleDateString('en-IN') : '—'}
                </p>
              </div>

              {/* Financial Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                <div className="flex justify-between p-3">
                  <span className="text-slate-500">Eligible Self Business (Personal Sales)</span>
                  <span className="font-mono font-bold text-slate-800">{INR(viewStmt.self_business)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-500">Eligible Team Business (Downline Sales)</span>
                  <span className="font-mono font-bold text-slate-800">{INR(viewStmt.team_business)}</span>
                </div>
                <div className="flex justify-between p-3 bg-blue-50/50 font-bold text-blue-900">
                  <span>Total Business</span>
                  <span className="font-mono text-sm">{INR(viewStmt.total_business)}</span>
                </div>
                <div className="flex justify-between p-3 text-slate-400">
                  <span>Self Commission (Personal Sales)</span>
                  <span className="font-mono font-bold italic">₹0.00 (Rule)</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-700 font-semibold">Total Team Differential Commission</span>
                  <span className="font-mono font-bold text-slate-900">{INR(viewStmt.team_deposit)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-700">Self Target Status &amp; Reward</span>
                  <span className="font-semibold text-emerald-700">
                    {viewStmt.self_target_achieved ? `Achieved ✓ (+ ${INR(viewStmt.reward_amount)})` : 'Not Achieved (₹0.00)'}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-blue-50 font-bold text-blue-950">
                  <span>Gross Payout (Team Diff + Reward)</span>
                  <span className="font-mono text-sm">{INR(viewStmt.total_amount)}</span>
                </div>
                <div className="flex justify-between p-3 text-red-600">
                  <span>TDS Deduction ({viewStmt.tds_percent}%)</span>
                  <span className="font-mono font-semibold">- {INR(viewStmt.tds_amount)}</span>
                </div>
                <div className="flex justify-between p-4 bg-blue-700 text-white font-bold">
                  <span className="text-sm">NET PAYABLE AMOUNT</span>
                  <span className="font-mono text-xl font-black">{INR(viewStmt.net_payable)}</span>
                </div>
              </div>

              {viewStmt.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
                  <strong>Remarks / Settlement Notes:</strong> {viewStmt.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutManagement;
