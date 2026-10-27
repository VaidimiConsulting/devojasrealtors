import React, { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';

const INR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_STYLE = {
  paid: 'bg-emerald-100 text-emerald-700', approved: 'bg-blue-100 text-blue-700', partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-gray-100 text-gray-600', credited: 'bg-gray-100 text-gray-600', rejected: 'bg-red-100 text-red-600',
  reversed: 'bg-red-100 text-red-600', disputed: 'bg-orange-100 text-orange-700'
};

/**
 * Shared Commission Management table. Reads ONLY the saved ledger (GET /commission-ledger) which the backend
 * scopes by role: Admin/Accounts = everything, Associate = own + downline. No amount is calculated here.
 */
const CommissionLedgerTable = ({ title = 'Commission & Sales Ledger', showBeneficiary = true, scope }) => {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ sale_amount: 0, commission: 0, paid: 0, remaining: 0 });
  const [pg, setPg] = useState({ page: 1, pages: 1, total: 0, limit: 25 });
  const [f, setF] = useState({ search: '', status: 'all', type: 'all', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 25 };
      if (scope) params.scope = scope;
      Object.entries(f).forEach(([k, v]) => { if (v && v !== 'all') params[k] = v; });
      const res = await api.get('/commission-ledger', { params });
      setRows(res.data.rows); setTotals(res.data.totals); setPg(res.data.pagination);
    } catch (e) { setError(e.response?.data?.message || 'Could not load commission ledger'); }
    finally { setLoading(false); }
  }, [f, page, scope]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const set = (k, v) => { setPage(1); setF(p => ({ ...p, [k]: v })); };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 space-y-3">
        <h2 className="font-bold text-gray-800">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="relative col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9 text-sm" placeholder="Search sale ID, plot, seller, associate…" value={f.search} onChange={e => set('search', e.target.value)} />
          </div>
          <select className="input-field text-sm" value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="all">All status</option>
            {['pending', 'approved', 'partial', 'paid', 'credited', 'rejected', 'reversed', 'disputed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field text-sm" value={f.type} onChange={e => set('type', e.target.value)}>
            <option value="all">Direct + Differential</option><option value="direct">Direct only</option><option value="differential">Differential only</option>
          </select>
          <input type="date" className="input-field text-sm" value={f.from} onChange={e => set('from', e.target.value)} title="From date" />
          <input type="date" className="input-field text-sm" value={f.to} onChange={e => set('to', e.target.value)} title="To date" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {[['Sales value (direct rows)', totals.sale_amount], ['Total commission', totals.commission], ['Paid', totals.paid], ['Remaining', totals.remaining]].map(([l, v]) => (
            <div key={l} className="bg-gray-50 rounded-xl px-3 py-2"><p className="text-[11px] text-gray-400 font-bold uppercase">{l}</p><p className="font-bold text-gray-800">{INR(v)}</p></div>
          ))}
        </div>
      </div>

      {error && <p className="px-5 py-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-[1500px] w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
            <tr>
              {['Deal / Sale ID', 'Plot Details', 'Selling Associate', 'Referred By', ...(showBeneficiary ? ['Beneficiary', 'Sponsor / Upline'] : []), 'Sale Amount', 'Seller Rate', 'Beneficiary Rate', 'Differential Rate', 'Calculated Commission', 'Paid', 'Remaining', 'Status', 'Payout / Receipt']
                .map(h => <th key={h} className={`px-3 py-3 text-left whitespace-nowrap ${h === 'Deal / Sale ID' ? 'sticky left-0 bg-gray-50 z-10' : ''}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={15} className="px-3 py-8 text-center text-gray-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={15} className="px-3 py-8 text-center text-gray-400">No commission records found.</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 align-top">
                <td className="px-3 py-2.5 font-mono font-semibold sticky left-0 bg-white">{r.sale_id}<div className="text-[10px] font-sans text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</div></td>
                <td className="px-3 py-2.5">{r.plot.project || '—'}<div className="text-gray-500">Plot {r.plot.plot_number || '—'}</div></td>
                <td className="px-3 py-2.5">{r.seller?.name || '—'}<div className="font-mono text-gray-400">{r.seller?.login_id}</div></td>
                <td className="px-3 py-2.5">{r.referred_by?.name || '—'}<div className="font-mono text-gray-400">{r.referred_by?.login_id}</div></td>
                {showBeneficiary && <>
                  <td className="px-3 py-2.5">{r.beneficiary.name}<div className="font-mono text-gray-400">{r.beneficiary.login_id}</div>
                    <span className={`inline-block mt-0.5 px-1.5 rounded text-[10px] font-bold ${r.commission_type === 'direct' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>{r.commission_type}</span></td>
                  <td className="px-3 py-2.5">{r.sponsor?.name || 'Company'}<div className="font-mono text-gray-400">{r.sponsor?.login_id}</div></td>
                </>}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{INR(r.sale_amount)}</td>
                <td className="px-3 py-2.5 text-center">{r.seller_rate}%</td>
                <td className="px-3 py-2.5 text-center font-semibold">{r.beneficiary_rate}%</td>
                <td className="px-3 py-2.5 text-center font-bold text-blue-700">{r.differential_rate}%</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold">{INR(r.amount)}<div className="text-[10px] font-normal text-gray-400">{r.calculation}</div></td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{INR(r.paid_amount)}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap font-bold">{INR(r.remaining_amount)}</td>
                <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500">{r.payout_refs.length ? [...new Set(r.payout_refs)].join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span>{pg.total} records</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span>Page {pg.page} / {pg.pages}</span>
          <button disabled={page >= pg.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

export default CommissionLedgerTable;
