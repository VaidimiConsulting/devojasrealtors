import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Search, ChevronDown, ChevronUp, AlertTriangle, History, TrendingUp, IndianRupee } from 'lucide-react';
import api from '../api/axios';
import CommissionLedgerTable from '../components/CommissionLedgerTable';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const roleLevelLabel = (role_level = '') => {
  if (role_level.includes('associate')) return 'Closing Associate';
  if (role_level.includes('referrer')) return 'Upline / Override';
  return role_level.replace(/_/g, ' ');
};

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const Commissions = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [associates, setAssociates] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commLoading, setCommLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editPercent, setEditPercent] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editWarnings, setEditWarnings] = useState([]);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [commFilter, setCommFilter] = useState({ user_id: '', status: '', is_flagged: '' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAssociates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/commissions/associates', {
        params: searchDebounced ? { search: searchDebounced } : {}
      });
      setAssociates(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async () => {
    setCommLoading(true);
    try {
      const params = {};
      if (commFilter.user_id) params.user_id = commFilter.user_id;
      if (commFilter.status) params.status = commFilter.status;
      if (commFilter.is_flagged !== '') params.is_flagged = commFilter.is_flagged;
      const res = await api.get('/commissions', { params });
      setCommissions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCommLoading(false);
    }
  };

  useEffect(() => { fetchAssociates(); }, [searchDebounced]);
  useEffect(() => { fetchCommissions(); }, [commFilter]);

  const openEditModal = (assoc) => {
    setEditTarget(assoc);
    setEditPercent(assoc.commission_percent ?? '');
    setEditReason('');
    setEditMsg('');
    setEditErr('');
    setEditWarnings([]);
  };

  const handleUpdateCommission = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditMsg('');
    setEditErr('');
    setEditWarnings([]);
    try {
      const res = await api.put(`/commissions/associates/${editTarget.id}`, {
        commission_percent: editPercent,
        reason: editReason || 'Admin updated commission percentage'
      });
      setEditMsg(res.data.message || 'Commission updated successfully!');
      if (res.data.warnings && res.data.warnings.length > 0) {
        setEditWarnings(res.data.warnings);
      }
      fetchAssociates();
      setTimeout(() => {
        if (!res.data.warnings || res.data.warnings.length === 0) {
          setEditTarget(null);
        }
      }, 2000);
    } catch (err) {
      setEditErr(err.response?.data?.message || 'Error updating commission');
    } finally {
      setEditSaving(false);
    }
  };

  const openHistory = async (assoc) => {
    setHistoryTarget(assoc);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/commissions/associates/${assoc.id}/history`);
      setHistory(res.data.data || []);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleExpandRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalCredited = commissions.filter(c => c.status === 'credited').reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const flaggedCount = commissions.filter(c => c.is_flagged).length;
  const pendingCount = commissions.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Commission Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          Set per-associate commission percentages, view payout history and MLM differential breakdown.
        </p>
      </div>

      {/* Saved sales & commission ledger (same data Accounts and Associates see) */}
      <CommissionLedgerTable title="Sales & Commission Ledger (all associates)" />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
            <IndianRupee size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Credited</p>
            <p className="text-lg font-bold text-gray-800">{INR(totalCredited)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Flagged Entries</p>
            <p className="text-lg font-bold text-amber-700">{flaggedCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <TrendingUp size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
            <p className="text-lg font-bold text-blue-700">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Associate Commission Rates Table */}
      <div className="card overflow-x-auto p-0">
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">Associate & Admin Commission Rates</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Each associate has an individual commission %. Uplines earn the <strong>differential</strong> (their % minus downline %).
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 text-sm py-2"
            />
          </div>
        </div>

        {/* Quick Hierarchy Select Pills */}
        <div className="px-5 py-3 bg-slate-50 border-b flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase mr-1">Quick Filter:</span>
          <button
            type="button"
            onClick={() => setSearch('')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              !search ? 'bg-navy text-white shadow-sm' : 'bg-white border text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Associates ({associates.length})
          </button>
          <button
            type="button"
            onClick={() => setSearch('Super Admin')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              search === 'Super Admin' ? 'bg-purple-700 text-white shadow-sm' : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            👑 Super Admin (10%)
          </button>
          <button
            type="button"
            onClick={() => setSearch('Ram')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              search === 'Ram' ? 'bg-blue-700 text-white shadow-sm' : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            👤 Ram (7% — Level 1)
          </button>
          <button
            type="button"
            onClick={() => setSearch('Mohan')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              search === 'Mohan' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            👤 Mohan (5% — Level 2)
          </button>
          <button
            type="button"
            onClick={() => setSearch('Sohan')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              search === 'Sohan' ? 'bg-amber-700 text-white shadow-sm' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            👤 Sohan (4% — Level 2 Sibling)
          </button>
          <button
            type="button"
            onClick={() => setSearch('Rohan')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              search === 'Rohan' ? 'bg-rose-700 text-white shadow-sm' : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            👤 Rohan (3% — Level 3)
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Associate / User</th>
              <th className="text-left px-4 py-3">Sponsor / Upline</th>
              <th className="text-center px-4 py-3">Commission %</th>
              <th className="text-center px-4 py-3">Downlines</th>
              <th className="text-left px-4 py-3">Set By</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-10 text-gray-400">Loading associates...</td></tr>
            ) : associates.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-gray-400">No associates found</td></tr>
            ) : (
              associates.map(a => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{a.name}</span>
                      {a.role === 'admin' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 uppercase tracking-wide border border-purple-200">
                          👑 Admin Top Rate
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                          Associate
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">{a.login_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    {a.role === 'admin' ? (
                      <span className="text-purple-700 text-xs font-bold">Top Pool / Root Hierarchy</span>
                    ) : a.sponsor ? (
                      <div>
                        <div className="text-sm font-medium text-gray-800">{a.sponsor.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{a.sponsor.login_id}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">No sponsor</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      a.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                      a.commission_percent >= 10 ? 'bg-blue-100 text-blue-800' :
                      a.commission_percent >= 5 ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {parseFloat(a.commission_percent || 0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-600 font-semibold">{a.direct_downlines_count || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.commission_set_by === 'admin' ? 'bg-blue-50 text-blue-700' :
                      a.commission_set_by === 'upline' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {a.commission_set_by || 'system'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openHistory(a)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View history"
                      >
                        <History size={16} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openEditModal(a)}
                          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                        >
                          <Save size={13} /> Set %
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Commission Payout Breakdown */}
      <div className="card overflow-x-auto p-0">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Commission Payout Breakdown (All Deals)</h3>
          <p className="text-xs text-gray-400 mt-0.5">Full MLM chain breakdown — closing associate + upline differentials per transaction.</p>
        </div>
        <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap gap-3">
          <select className="input-field text-sm py-1.5 w-auto" value={commFilter.status} onChange={e => setCommFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="credited">Credited</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <select className="input-field text-sm py-1.5 w-auto" value={commFilter.is_flagged} onChange={e => setCommFilter(f => ({ ...f, is_flagged: e.target.value }))}>
            <option value="">All Entries</option>
            <option value="true">Flagged Only</option>
            <option value="false">Clean Only</option>
          </select>
          <button onClick={() => setCommFilter({ user_id: '', status: '', is_flagged: '' })} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            <RefreshCw size={13} /> Reset Filters
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 w-8"></th>
              <th className="text-left px-4 py-3">Earner</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Base Amount</th>
              <th className="text-center px-4 py-3">Own %</th>
              <th className="text-center px-4 py-3">Downline %</th>
              <th className="text-center px-4 py-3">Diff %</th>
              <th className="text-right px-4 py-3">Earned</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {commLoading ? (
              <tr><td colSpan="9" className="text-center py-10 text-gray-400">Loading commissions...</td></tr>
            ) : commissions.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-10 text-gray-400">No commission records found</td></tr>
            ) : (
              commissions.map(c => (
                <React.Fragment key={c.id}>
                  <tr
                    className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${c.is_flagged ? 'bg-amber-50/40' : ''}`}
                    onClick={() => toggleExpandRow(c.id)}
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {expandedRows.has(c.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{c.earner?.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{c.earner?.login_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.role_level?.includes('associate') ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {roleLevelLabel(c.role_level)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">{INR(c.base_amount)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">{c.upline_percent ?? c.percent}%</td>
                    <td className="px-4 py-3 text-center text-gray-500">{c.level === 0 ? '—' : `${c.downline_percent}%`}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${c.differential_percent > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {c.differential_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-navy">{INR(c.amount)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge status={c.status} />
                      {c.is_flagged && (
                        <div className="mt-1">
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">FLAGGED</span>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(c.id) && (
                    <tr className="bg-blue-50/40 border-t border-blue-100">
                      <td colSpan="9" className="px-8 py-3 text-xs text-gray-600">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div><span className="text-gray-400 block">Transaction #</span><span className="font-semibold">{c.transaction_id}</span></div>
                          <div><span className="text-gray-400 block">Plot</span><span className="font-semibold">{c.transaction?.plot?.title || '—'}</span></div>
                          <div><span className="text-gray-400 block">Downline Associate</span><span className="font-semibold">{c.downlineAssociate?.name || (c.level === 0 ? 'Self (Closing)' : '—')}</span></div>
                          <div><span className="text-gray-400 block">MLM Level</span><span className="font-semibold">{c.level === 0 ? 'Closing (L0)' : `Upline L${c.level}`}</span></div>
                          {c.flag_reason && (
                            <div className="col-span-4">
                              <span className="text-amber-700 font-medium">Flag Reason: {c.flag_reason}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Commission Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Update Commission %</h3>
                <p className="text-sm text-gray-500">{editTarget.name} · {editTarget.login_id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">✕</button>
            </div>
            <form onSubmit={handleUpdateCommission} className="p-6 space-y-4">
              {editMsg && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">{editMsg}</div>}
              {editErr && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{editErr}</div>}
              {editWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-800">Hierarchy Warnings:</p>
                  {editWarnings.map((w, i) => <p key={i} className="text-xs text-amber-700">{w}</p>)}
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400 text-xs block">Current %</span>
                  <span className="font-bold text-gray-800 text-base">{editTarget.commission_percent}%</span>
                </div>
                {editTarget.sponsor && (
                  <div>
                    <span className="text-gray-400 text-xs block">Sponsor %</span>
                    <span className="font-bold text-gray-800 text-base">{editTarget.sponsor.commission_percent}%</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">New Commission %</label>
                <input
                  required type="number" step="0.5" min="0" max="100"
                  value={editPercent} onChange={e => setEditPercent(e.target.value)}
                  className="input-field" placeholder="e.g. 8.5"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Upline differential = upline % − this associate's %. Negative differential will be flagged for review.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Reason (for audit log)</label>
                <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)}
                  className="input-field" placeholder="e.g. Promoted to Senior level" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Save size={15} /> {editSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Commission Change History</h3>
                <p className="text-sm text-gray-500">{historyTarget.name} · {historyTarget.login_id}</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {historyLoading ? (
                <p className="text-center text-gray-400 py-8">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No history records yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map(h => (
                    <div key={h.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 line-through">{h.previous_percent}%</span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className={`font-bold text-sm ${h.new_percent > h.previous_percent ? 'text-emerald-700' : 'text-red-600'}`}>
                            {h.new_percent}%
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(h.effective_date).toLocaleDateString('en-IN')}</span>
                      </div>
                      {h.reason && <p className="text-xs text-gray-600">{h.reason}</p>}
                      {h.adminUser && <p className="text-xs text-gray-400 mt-1">Changed by: {h.adminUser.name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;
