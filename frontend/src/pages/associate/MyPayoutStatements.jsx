import React, { useEffect, useState } from 'react';
import { IndianRupee, Eye, X, Printer, TrendingUp, ArrowUpRight, ArrowDownRight, Award, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const printStatement = (s) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Payout Statement</title>
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
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8faff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px; }
  .info-item label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-item p { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px; }
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
  .sig-line { width: 200px; border-top: 1.5px solid #333; margin: 0 auto 6px; }
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
      <p>Payment Date: ${s.payment_date ? new Date(s.payment_date).toLocaleDateString('en-IN') : '—'}</p>
      <span class="status-tag">Status: ${String(s.status || 'pending').toUpperCase()}</span>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-item"><label>Associate Name</label><p>${s.associate?.name || '—'}</p></div>
    <div class="info-item"><label>Associate ID</label><p>${s.associate?.login_id || '—'}</p></div>
    <div class="info-item"><label>Referred By (Sponsor)</label><p>${s.associate?.referrer?.name ? `${s.associate.referrer.name} (${s.associate.referrer.login_id})` : (s.associate?.referred_by ? 'Super Admin (DEV-0001)' : 'Direct Company Root')}</p></div>
    <div class="info-item"><label>Mobile</label><p>${s.associate?.phone || '—'}</p></div>
    <div class="info-item"><label>Applicable Slab</label><p>Slab ${s.slab?.slab_number || '—'} @ ${s.slab_percent}%</p></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th style="text-align:right">Amount (₹)</th></tr></thead>
    <tbody>
      <tr><td>1</td><td class="label-col">Eligible Personal Sales (Self Business)</td><td class="amount-col">${Number(s.self_business||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>2</td><td class="label-col">Eligible Downline Sales (Team Business)</td><td class="amount-col">${Number(s.team_business||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr class="highlight"><td>3</td><td><strong>Total Business</strong></td><td class="amount-col"><strong>${Number(s.total_business||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>
      <tr><td>4</td><td class="label-col">Team Differential Commission</td><td class="amount-col">${Number(s.team_deposit||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>5</td><td class="label-col">Self-Sale Slab Reward</td><td class="amount-col">${Number(s.reward_amount||s.eligible_reward||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr class="highlight"><td>6</td><td><strong>Gross Payout (Commission + Reward)</strong></td><td class="amount-col"><strong>${Number(s.total_amount||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>
      <tr><td>7</td><td class="label-col">TDS Deduction (${s.tds_percent}%)</td><td class="amount-col" style="color:#dc2626">- ${Number(s.tds_amount||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      <tr class="net-row"><td colspan="2">NET PAYABLE AMOUNT</td><td style="text-align:right">₹${Number(s.net_payable||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    </tbody>
  </table>
  ${(s.reward_amount > 0 || s.eligible_reward > 0) ? `<p style="font-size:11px;color:#065f46;background:#d1fae5;padding:8px 12px;border-radius:6px;margin-bottom:16px;"><strong>🎁 Self-Sale Slab Reward Bonus:</strong> ₹${Number(s.reward_amount||s.eligible_reward||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Earned from personal sales target achievement)</p>` : ''}
  <div class="sig-area">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Associate Signature<br/>${s.associate?.name || ''}</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Accounts Department<br/>Devojas Realtors</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorised Signature<br/>Director</div></div>
  </div>
  <div class="footer">Devojas Realtors — Computer-generated payout statement.</div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`);
  win.document.close();
};

const MyPayoutStatements = () => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStmt, setViewStmt] = useState(null);

  useEffect(() => {
    api.get('/payout-statements')
      .then(r => setStatements(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Summary stats
  const totalNetPayable = statements.reduce((s, r) => s + parseFloat(r.net_payable || 0), 0);
  const totalBusiness = statements.reduce((s, r) => s + parseFloat(r.total_business || 0), 0);
  const totalTds = statements.reduce((s, r) => s + parseFloat(r.tds_amount || 0), 0);

  const statusColors = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    approved: 'bg-blue-50 text-blue-800 border-blue-200',
    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
    published: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <IndianRupee size={24} className="text-blue-600" />
          My Payout Statements
        </h1>
        <p className="page-subtitle">Your personal payout statements and settlement records generated by the accounts department</p>
      </div>

      {/* Summary Cards */}
      {!loading && statements.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <TrendingUp size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Business</p>
              <p className="text-xl font-black text-slate-800 font-mono">{INR(totalBusiness)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <ArrowUpRight size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Net Payable</p>
              <p className="text-xl font-black text-emerald-700 font-mono">{INR(totalNetPayable)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
              <ArrowDownRight size={22} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total TDS Deducted</p>
              <p className="text-xl font-black text-red-600 font-mono">{INR(totalTds)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto p-0 border border-slate-200">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Payment Date</th>
              <th>Status</th>
              <th>Self Business</th>
              <th>Team Business</th>
              <th>Team Differential</th>
              <th>Slab Reward</th>
              <th>Gross Payout</th>
              <th>TDS</th>
              <th>Net Payable</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="text-center py-12 text-slate-400">Loading payout statements...</td></tr>
            ) : statements.length === 0 ? (
              <tr><td colSpan="11" className="text-center py-12 text-slate-400">No payout statements recorded yet.</td></tr>
            ) : statements.map((s, i) => (
              <tr key={s.id}>
                <td className="text-slate-500 font-mono text-sm">{i + 1}</td>
                <td className="text-slate-700">{s.payment_date ? new Date(s.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColors[s.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {s.status || 'pending'}
                  </span>
                </td>
                <td className="text-slate-700 font-mono">{INR(s.self_business)}</td>
                <td className="text-slate-700 font-mono">{INR(s.team_business)}</td>
                <td className="text-sky-700 font-semibold font-mono">{INR(s.team_deposit)}</td>
                <td className="text-emerald-700 font-bold font-mono">
                  {s.self_target_achieved && parseFloat(s.reward_amount) > 0 ? INR(s.reward_amount) : '₹0.00'}
                </td>
                <td className="font-bold text-slate-800 font-mono">{INR(s.total_amount)}</td>
                <td className="text-red-600 font-mono">- {INR(s.tds_amount)}</td>
                <td>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full font-mono">{INR(s.net_payable)}</span>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setViewStmt(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => printStatement(s)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl" title="Print Statement">
                      <Printer size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && statements.length > 0 && (
            <tfoot>
              <tr className="bg-blue-50 font-bold">
                <td colSpan="3" className="px-4 py-3 text-blue-800 font-bold">TOTAL</td>
                <td className="px-4 py-3 text-slate-800 font-mono">{INR(statements.reduce((s,r)=>s+parseFloat(r.self_business||0),0))}</td>
                <td className="px-4 py-3 text-slate-800 font-mono">{INR(statements.reduce((s,r)=>s+parseFloat(r.team_business||0),0))}</td>
                <td className="px-4 py-3 text-sky-700 font-mono">{INR(statements.reduce((s,r)=>s+parseFloat(r.team_deposit||0),0))}</td>
                <td className="px-4 py-3 text-emerald-700 font-mono">{INR(statements.reduce((s,r)=>s+parseFloat(r.reward_amount||0),0))}</td>
                <td className="px-4 py-3 text-slate-800 font-mono">{INR(statements.reduce((s,r)=>s+parseFloat(r.total_amount||0),0))}</td>
                <td className="px-4 py-3 text-red-600 font-mono">- {INR(totalTds)}</td>
                <td className="px-4 py-3 text-blue-800 text-base font-black font-mono">{INR(totalNetPayable)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* View Modal */}
      {viewStmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setViewStmt(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-900">
              <div>
                <h2 className="text-white font-bold text-lg">Payout Statement PS-{viewStmt.id}</h2>
                <span className="text-[11px] text-blue-200 uppercase font-bold">Status: {viewStmt.status || 'pending'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printStatement(viewStmt)} className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setViewStmt(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
              </div>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-slate-500 text-xs">Associate ID</p>
                    <p className="font-mono font-bold text-blue-900 text-sm">{viewStmt.associate?.login_id || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-xs">Referred By ID</p>
                    <p className="font-mono font-bold text-slate-700 text-sm">
                      {viewStmt.associate?.referrer?.login_id || (viewStmt.associate?.referred_by ? 'DEV-0001' : 'None (Root)')}
                    </p>
                  </div>
                </div>
                <p className="text-slate-500 text-xs">Payment Date: <span className="font-bold text-blue-900">{viewStmt.payment_date ? new Date(viewStmt.payment_date).toLocaleDateString('en-IN') : '—'}</span></p>
                <p className="text-slate-400 text-xs mt-0.5">Applicable Slab {viewStmt.slab?.slab_number || '—'} @ {viewStmt.slab_percent}%</p>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y">
                {[
                  ['Eligible Self Business (Personal)', INR(viewStmt.self_business)],
                  ['Eligible Team Business (Downline)', INR(viewStmt.team_business)],
                  ['Total Business', INR(viewStmt.total_business), 'highlight'],
                  ['Self Commission (Personal Deals)', '₹0.00 (Rule)'],
                  ['Team Differential Commission', INR(viewStmt.team_deposit)],
                  ['Self-Sale Slab Reward', INR(viewStmt.reward_amount || viewStmt.eligible_reward || 0)],
                  ['Gross Payout (Diff + Reward)', INR(viewStmt.total_amount), 'highlight'],
                  [`TDS Deduction (${viewStmt.tds_percent}%)`, `- ${INR(viewStmt.tds_amount)}`, 'danger'],
                ].map(([label, value, type]) => (
                  <div key={label} className={`flex justify-between px-4 py-2.5 text-sm ${type === 'highlight' ? 'bg-blue-50 font-bold' : type === 'danger' ? 'bg-red-50' : ''}`}>
                    <span className="text-slate-500">{label}</span>
                    <span className={type === 'danger' ? 'text-red-600 font-semibold font-mono' : type === 'highlight' ? 'text-blue-800 font-bold font-mono' : 'font-semibold text-slate-800 font-mono'}>{value}</span>
                  </div>
                ))}
                <div className="bg-blue-700 px-4 py-3 flex justify-between">
                  <span className="text-blue-100 font-bold">NET PAYABLE AMOUNT</span>
                  <span className="text-white font-black text-lg font-mono">{INR(viewStmt.net_payable)}</span>
                </div>
              </div>
              {viewStmt.reward_amount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex justify-between text-sm">
                  <span className="text-emerald-700 font-medium">🎁 Slab Reward Bonus</span>
                  <span className="font-bold text-emerald-700 font-mono">{INR(viewStmt.reward_amount)}</span>
                </div>
              )}
              {viewStmt.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
                  <strong>Remarks:</strong> {viewStmt.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPayoutStatements;
