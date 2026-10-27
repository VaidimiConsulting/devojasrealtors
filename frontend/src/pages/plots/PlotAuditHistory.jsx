import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Clock, FileText, User, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

// Component Error Boundary
class AuditErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('PlotAuditHistory render error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-8 bg-red-50 border border-red-200 rounded-2xl text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-900 mb-2">Display Error in Audit History</h2>
          <p className="text-xs text-red-700 mb-4">
            {this.state.error?.message || 'An error occurred while loading audit records.'}
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

const PlotAuditHistoryInner = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  const fetchAudit = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get('/accounts/audit-logs');
      // Backend returns either { data: { auditLogs: [...], rateChanges: [...] } } or an array
      const raw = res.data?.data;
      let list = [];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (raw && Array.isArray(raw.auditLogs)) {
        list = raw.auditLogs;
      } else if (Array.isArray(res.data?.auditLogs)) {
        list = res.data.auditLogs;
      }
      setLogs(list);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setFetchError(err.response?.data?.message || err.message || 'Failed to load audit history.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const q = String(search || '').trim().toLowerCase();

  const filtered = safeLogs.filter(l => {
    if (!l) return false;
    if (!q) return true;
    const action = String(l.action || '').toLowerCase();
    const notes = String(l.notes || '').toLowerCase();
    const entity = String(l.entity_type || '').toLowerCase();
    const performer = String(l.performer?.name || '').toLowerCase();

    return (
      action.includes(q) ||
      notes.includes(q) ||
      entity.includes(q) ||
      performer.includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={24} className="text-navy" />
            Plot Purchase Audit History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Immutable audit trail of plot creation, price alterations, client bookings, and payment records
          </p>
        </div>
        <button
          onClick={fetchAudit}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, performer, or notes..."
            className="input-field pl-9 text-sm w-full"
          />
        </div>
        <span className="text-xs text-gray-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          {filtered.length} Audit {filtered.length === 1 ? 'Entry' : 'Entries'}
        </span>
      </div>

      {fetchError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{fetchError}</span>
          </div>
          <button onClick={fetchAudit} className="underline font-bold text-red-800 hover:text-red-900">
            Try Again
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">Audit Details & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-navy" />
                      <span className="font-medium">Loading audit history...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <ShieldCheck size={32} className="mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="font-semibold text-gray-600 text-sm">No audit records found.</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {search ? 'Try clearing your search query' : 'System audit events will be logged here automatically'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(l => {
                  const timestamp = l.created_at || l.createdAt;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-gray-500 font-mono">
                        {timestamp ? new Date(timestamp).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-navy/10 text-navy uppercase border border-navy/20">
                          {l.action || 'ACTION'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800 uppercase">
                        {l.entity_type || 'SYSTEM'} #{l.entity_id || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <span className="font-bold block">{l.performer ? l.performer.name : 'System Admin'}</span>
                        {l.performer?.login_id && (
                          <span className="text-[10px] text-gray-400 block">{l.performer.login_id}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {l.notes || '—'}
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

const PlotAuditHistory = () => (
  <AuditErrorBoundary>
    <PlotAuditHistoryInner />
  </AuditErrorBoundary>
);

export default PlotAuditHistory;
