import React, { useEffect, useState } from 'react';
import { Target, Gift } from 'lucide-react';
import api from '../api/axios';

const INR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Monthly business-volume target + admin-configured slab. Fresh each calendar month; past months stay viewable. */
const MonthlyTargetCard = () => {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get('/commission-ledger/monthly-target', { params: { month } }).then(r => setD(r.data.data)).catch(() => setD(null));
  }, [month]);
  const cur = d?.current_slab, next = d?.next_slab;
  const goal = next ? next.min_amount : (cur ? cur.max_amount : 0);
  const pct = goal > 0 ? Math.min(100, Math.round((d.total_business / goal) * 100)) : 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Target size={18} className="text-gold" /> Monthly Target & Slab</h3>
        <input type="month" value={month} max={monthKey(new Date())} onChange={e => e.target.value && setMonth(e.target.value)} className="input-field text-sm w-auto" />
      </div>
      {!d ? <p className="text-sm text-gray-400">Loading…</p> : (
        <>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-[11px] text-gray-400 font-bold uppercase">Self business</p><p className="font-bold">{INR(d.self_business)}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-[11px] text-gray-400 font-bold uppercase">Team business</p><p className="font-bold">{INR(d.team_business)}</p></div>
            <div className="bg-blue-50 rounded-xl p-3"><p className="text-[11px] text-blue-500 font-bold uppercase">Month total</p><p className="font-black text-blue-800">{INR(d.total_business)}</p></div>
          </div>
          <div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div>
            <p className="text-xs text-gray-500 mt-1.5">
              {cur ? <>Current slab <b>{cur.percentage}%</b> ({INR(cur.min_amount)} – {INR(cur.max_amount)})</> : 'No slab reached yet'}
              {next && <> · {INR(d.remaining_to_next)} more to reach next slab <b>{next.percentage}%</b></>}
            </p>
            {cur && cur.self_target_amount > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Self target for slab reward: <b>{INR(cur.self_target_amount)}</b> · Achieved: <b>{INR(d.self_business)}</b> ({d.self_target_achieved ? <span className="text-emerald-600 font-bold">Met ✅</span> : <span className="text-amber-600 font-bold">Pending ({INR(Math.max(0, cur.self_target_amount - d.self_business))} to unlock reward)</span>})
              </p>
            )}
          </div>
          {d.reward_eligible ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 text-emerald-800">
              <Gift size={16} /> Slab reward earned this month: <b>{INR(cur.reward_amount)}</b> <span className="text-xs text-emerald-600">(separate from sales commission)</span>
            </div>
          ) : cur && cur.reward_amount > 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs flex items-center gap-2 text-slate-600">
              <Gift size={15} className="text-slate-400" /> Potential slab reward: <b>{INR(cur.reward_amount)}</b> (unlocks when self target of {INR(cur.self_target_amount)} is reached)
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
export default MonthlyTargetCard;
