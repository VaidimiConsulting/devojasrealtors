import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Target, TrendingUp } from 'lucide-react';
import api from '../api/axios';

const INR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * New Payout Statement - driven ENTIRELY by the saved commission ledger (backend: GET /payout-statements/ledger/:id).
 * Business Rules enforced here and verified by backend:
 *   - Self Commission = ₹0 (direct/own sales contribute to Self Business only)
 *   - Differential Commission = sum of approved unpaid differential (level > 0) entries from downline
 *   - Slab Reward = earned only when Self Business >= slab's Self Target
 *   - Gross = Differential + Eligible Reward
 */
const PayoutLedgerForm = ({ associates, onDone, onCancel }) => {
  const [associateId, setAssociateId]   = useState('');
  const [paymentDate, setPaymentDate]   = useState(new Date().toISOString().split('T')[0]);
  const [tds,  setTds]    = useState('5');
  const [proc, setProc]   = useState('2');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState(null);   // Set of commission ids (null = all)
  const [data, setData]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]   = useState(null);

  const load = useCallback(async (ids) => {
    if (!associateId) { setData(null); return; }
    setLoading(true); setError('');
    try {
      const params = {
        payment_date:       paymentDate,
        tds_percent:        tds  === '' ? 0 : tds,
        processing_percent: proc === '' ? 0 : proc
      };
      if (ids) params.ids = [...ids].join(',') || '0';
      const res = await api.get(`/payout-statements/ledger/${associateId}`, { params });
      setData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load ledger');
      setData(null);
    } finally { setLoading(false); }
  }, [associateId, paymentDate, tds, proc]);

  // associate / date / deductions changed → reload
  useEffect(() => { load(selected); /* eslint-disable-next-line */ }, [associateId, paymentDate, tds, proc]);
  useEffect(() => { setSelected(null); setDone(null); }, [associateId]);

  const toggle = (id) => {
    const all = data.entries.map(e => e.id);
    const cur = new Set(selected || all);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    setSelected(cur);
    load(cur);
  };
  const isChecked = (id) => (selected ? selected.has(id) : true);
  const ids = data ? (selected ? [...selected] : data.entries.map(e => e.id)) : [];

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || !data || !ids.length) return;
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/payout-statements', {
        associate_id: associateId, payment_date: paymentDate,
        commission_ids: ids, tds_percent: tds, processing_percent: proc, notes
      });
      setDone(res.data);
    } catch (err) { setError(err.response?.data?.message || 'Payout failed'); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="text-center space-y-4 py-6">
        <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
        <h3 className="font-bold text-lg text-slate-800">Payout created &amp; ledger settled</h3>
        <p className="text-sm text-slate-500">
          Payout reference <b className="font-mono">{done.payout_reference}</b> ·{' '}
          {done.settled_commission_ids.length} commission entries settled
        </p>
        <p className="text-sm">
          Gross {INR(done.data.total_amount)} · Net payable <b>{INR(done.data.net_payable)}</b>
        </p>
        {done.data.self_target_achieved && (
          <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 inline-block">
            🎁 Self Target achieved — Slab Reward included in gross
          </p>
        )}
        <button className="btn-primary px-6 py-2.5" onClick={onDone}>Close</button>
      </div>
    );
  }

  const a = data?.associate;
  const s = data?.summary;
  const si = data?.slab_info;

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Business rule reminder */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2.5 rounded-xl flex items-start gap-2">
        <Target size={13} className="mt-0.5 shrink-0 text-blue-600" />
        <span>
          <strong>Self Commission = ₹0.</strong> Differential commission comes from approved downline sales.
          Slab Reward is paid only when Self Business (own sales) ≥ slab Self Target.
          Team Business never counts toward Self Target.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Select Associate *</label>
          <select required value={associateId} onChange={e => setAssociateId(e.target.value)} className="input-field">
            <option value="">— Choose Associate —</option>
            {associates.map(x => <option key={x.id} value={x.id}>{x.name} ({x.login_id})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Payment Date *</label>
          <input required type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input-field" />
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading saved commission ledger…</p>}

      {a && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 font-bold uppercase">Associate</p>
            <p className="font-bold text-slate-800">{a.name}</p>
            <p className="font-mono text-xs text-slate-500">{a.login_id}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 font-bold uppercase">Sponsor / Upline</p>
            <p className="font-bold text-slate-800">{a.sponsor ? a.sponsor.name : 'Company (root)'}</p>
            <p className="font-mono text-xs text-slate-500">{a.sponsor?.login_id || ''}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-[11px] text-emerald-700 font-bold uppercase">Own Commission Rate</p>
            <p className="font-black text-emerald-800 text-xl">{a.own_commission_rate}%</p>
            <p className="text-[10px] text-emerald-700">saved master rate · read-only</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 font-bold uppercase">Approved Unpaid</p>
            <p className="font-bold text-slate-800">{INR(s?.approved_unpaid)}</p>
            <p className="text-xs text-slate-500">{data.entries.length} entries</p>
          </div>
        </div>
      )}

      {a?.rate_columns_differ && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
          ⚠ This associate has a different legacy "referral rate" ({a.legacy_referral_rate}%) stored.
          Payouts always use the saved commission rate ({a.own_commission_rate}%) and the per-sale ledger below.
        </div>
      )}

      {data && (
        data.entries.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
            No approved, unpaid commission entries for this associate.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="min-w-[980px] w-full text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 text-left">Sale ID</th>
                  <th className="px-3 py-2 text-left">Plot / Project</th>
                  <th className="px-3 py-2 text-left">Selling Associate</th>
                  <th className="px-3 py-2 text-right">Sale Value</th>
                  <th className="px-3 py-2 text-center">Seller %</th>
                  <th className="px-3 py-2 text-center">Own %</th>
                  <th className="px-3 py-2 text-center">Diff %</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map(r => (
                  <tr key={r.id} className={isChecked(r.id) ? '' : 'opacity-50'}>
                    <td className="px-3 py-2"><input type="checkbox" checked={isChecked(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="px-3 py-2 font-mono">{r.sale_id}</td>
                    <td className="px-3 py-2">{r.plot.project || '—'} · {r.plot.plot_number || '—'}</td>
                    <td className="px-3 py-2">{r.seller?.name || '—'} <span className="font-mono text-slate-400">{r.seller?.login_id}</span></td>
                    <td className="px-3 py-2 text-right">{INR(r.sale_amount)}</td>
                    <td className="px-3 py-2 text-center">{r.seller_rate}%</td>
                    <td className="px-3 py-2 text-center font-bold">{r.beneficiary_rate}%</td>
                    <td className="px-3 py-2 text-center font-bold text-blue-700">
                      {r.differential_rate}%
                      <div className="text-[9px] font-normal text-slate-400">{r.commission_type}</div>
                    </td>
                    <td className="px-3 py-2 text-right">{INR(r.amount)}</td>
                    <td className="px-3 py-2 text-right">{INR(r.paid_amount)}</td>
                    <td className="px-3 py-2 text-right font-bold">{INR(r.remaining_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {s && data.entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">TDS %</label>
                <input type="number" step="0.1" min="0" max="100" value={tds} onChange={e => setTds(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Processing %</label>
                <input type="number" step="0.1" min="0" max="100" value={proc} onChange={e => setProc(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field resize-none" rows={2} placeholder="Optional notes..." />
            </div>

            {/* Self Target status */}
            {si && (
              <div className={`border rounded-xl p-3 text-xs space-y-1 ${si.self_target_achieved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`font-bold uppercase tracking-wider ${si.self_target_achieved ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {si.self_target_achieved ? '✅ Self Target Achieved' : '⚠ Self Target Not Met'}
                </p>
                <p className="text-slate-600">
                  Self Business: <strong>{INR(si.self_business)}</strong> ·
                  Self Target: <strong>{INR(si.slab?.self_target_amount || 0)}</strong>
                </p>
                <p className="text-slate-600">
                  Team Business: {INR(si.team_business)} · Total Business: {INR(si.total_business)}
                </p>
                {si.slab ? (
                  <p className={`font-bold ${si.self_target_achieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {si.slab.slab_number && `Slab ${si.slab.slab_number} `}@ {si.slab.percentage}% ·
                    Reward: {INR(si.slab.reward_amount)} {si.self_target_achieved ? '(Eligible ✓)' : '(Not eligible — Self Target not met)'}
                  </p>
                ) : (
                  <p className="text-slate-500">No slab reached yet.</p>
                )}
                <p className="text-[10px] text-slate-400 italic">
                  Team Business ({INR(si.team_business)}) does not count toward Self Target.
                </p>
              </div>
            )}
          </div>

          {/* Live Payout Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden h-fit text-sm divide-y divide-slate-100">
            <div className="bg-slate-700 px-4 py-2">
              <p className="text-white text-xs font-bold">Payout Summary</p>
            </div>
            {[
              ['Self Business', INR(s.self_business)],
              ['Team Business', INR(s.team_business)],
              ['Total Business', INR(si?.total_business || 0), 'hl'],
              ['Self Commission', '₹0.00', null, 'text-slate-400 italic'],  // always ₹0
              ['Differential Commission (Downline)', INR(s.differential_commission)],
              ['Slab Reward', INR(s.slab_reward || 0), null, si?.self_target_achieved ? 'text-emerald-700 font-bold' : 'text-slate-400'],
              ['Gross Payable', INR(s.gross_payable), 'hl'],
              [`TDS (${s.tds_percent}%)`, `- ${INR(s.tds_amount)}`, 'neg'],
              [`Processing (${s.processing_percent}%)`, `- ${INR(s.processing_amount)}`, 'neg'],
            ].map(([l, v, t, extra]) => (
              <div key={l} className={`flex justify-between px-4 py-2.5 ${t === 'hl' ? 'bg-blue-50 font-bold' : t === 'neg' ? 'bg-red-50 text-red-600' : ''}`}>
                <span className="text-slate-500">{l}</span>
                <span className={`font-semibold ${extra || ''}`}>{v}</span>
              </div>
            ))}
            <div className="bg-blue-700 px-4 py-4 flex justify-between">
              <span className="text-blue-100 font-bold">NET PAYABLE</span>
              <span className="text-white font-black text-xl">{INR(s.net_payable)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
        <button
          type="submit"
          disabled={submitting || !data || !ids.length}
          className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? 'Settling…' : 'Settle Ledger & Create Statement'}
          {!submitting && <ChevronRight size={16} />}
        </button>
      </div>
    </form>
  );
};

export default PayoutLedgerForm;
