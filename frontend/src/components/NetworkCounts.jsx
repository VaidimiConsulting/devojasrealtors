import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Network } from 'lucide-react';
import api from '../api/axios';

/** Direct / Total downline / Active / Pending counts from the real parent-child links (backend computed). */
const NetworkCounts = ({ refreshKey = 0 }) => {
  const [c, setC] = useState(null);
  useEffect(() => {
    let live = true;
    api.get('/commission-ledger/network-counts').then(r => { if (live) setC(r.data.data); }).catch(() => {});
    return () => { live = false; };
  }, [refreshKey]);
  const items = [
    ['Direct Associates', c?.direct_associates, Users, 'text-blue-700 bg-blue-50 border-blue-200'],
    ['Total Downline', c?.total_downline, Network, 'text-indigo-700 bg-indigo-50 border-indigo-200'],
    ['Active Associates', c?.active_associates, UserCheck, 'text-emerald-700 bg-emerald-50 border-emerald-200'],
    ['Pending / Inactive', c?.pending_associates, UserX, 'text-amber-700 bg-amber-50 border-amber-200'],
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(([label, v, Icon, cls]) => (
        <div key={label} className={`rounded-2xl border p-4 flex items-center gap-3 ${cls}`}>
          <Icon size={22} />
          <div><p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p><p className="text-2xl font-black">{v ?? '—'}</p></div>
        </div>
      ))}
    </div>
  );
};
export default NetworkCounts;
