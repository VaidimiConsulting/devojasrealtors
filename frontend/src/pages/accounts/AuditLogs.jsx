import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, Filter, Search, User, Clock, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/Badge';

const AuditLogs = () => {
  const [data, setData] = useState({ auditLogs: [], rateChanges: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'rates'
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/accounts/audit-logs', { params });
      setData(res.data.data || { auditLogs: [], rateChanges: [] });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const auditLogs = data.auditLogs || [];
  const rateChanges = data.rateChanges || [];

  const filteredAudits = auditLogs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const action = log.action?.toLowerCase() || '';
    const performer = log.performer?.name?.toLowerCase() || '';
    const notes = log.notes?.toLowerCase() || '';
    return action.includes(term) || performer.includes(term) || notes.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Audit Logs & Traceability</h1>
          <p className="text-gray-500 text-sm">Strict audit trail of commission status approvals, percentage adjustments, and payment entries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'audit' ? 'bg-navy text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <ShieldCheck size={15} /> Financial & Commission Actions ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'rates' ? 'bg-navy text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <History size={15} /> Commission Rate Change History ({rateChanges.length})
        </button>
      </div>

      {/* TAB 1: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 text-gray-400" size={17} />
              <input
                type="text"
                placeholder="Search audit trail by action, user, remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="p-2 border rounded-lg text-xs font-semibold text-gray-700 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="COMMISSION_STATUS_UPDATE">Commission Status Updates</option>
              <option value="COMMISSION_BULK_UPDATE">Bulk Commission Updates</option>
              <option value="PAYMENT_RECORDED">Customer Payments Recorded</option>
              <option value="EXPENSE_RECORDED">Expenses Recorded</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Audit Details / Remarks</th>
                  <th className="p-3">Value Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12 text-gray-400">Loading audit trail...</td></tr>
                ) : filteredAudits.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-gray-400">No audit records found</td></tr>
                ) : (
                  filteredAudits.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at || log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 font-mono font-bold text-[10px] rounded border border-blue-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-gray-800">
                        {log.entity_type} #{log.entity_id}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-gray-900">{log.performer?.name || 'System'}</p>
                        <p className="text-gray-400 font-mono text-[10px]">{log.performer?.login_id || `User #${log.user_id}`}</p>
                      </td>
                      <td className="p-3 text-gray-700 max-w-sm">
                        {log.notes || '—'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-gray-600 max-w-xs truncate">
                        {log.new_values || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RATE CHANGE HISTORY */}
      {activeTab === 'rates' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-3">Effective Date</th>
                <th className="p-3">Associate</th>
                <th className="p-3 text-center">Previous %</th>
                <th className="p-3 text-center">New %</th>
                <th className="p-3">Reason / Justification</th>
                <th className="p-3">Changed By (Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rateChanges.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-400">No commission rate changes recorded</td></tr>
              ) : (
                rateChanges.map((rc) => (
                  <tr key={rc.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(rc.effective_date || rc.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-gray-900">{rc.associate?.name || `User #${rc.user_id}`}</p>
                      <p className="text-gray-400 font-mono text-[10px]">{rc.associate?.login_id || 'ID Pending'}</p>
                    </td>
                    <td className="p-3 text-center font-bold text-gray-500">
                      {rc.old_percentage !== null ? `${rc.old_percentage}%` : '—'}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700 bg-emerald-50/50">
                      {rc.new_percentage}%
                    </td>
                    <td className="p-3 text-gray-700 max-w-xs">
                      {rc.reason || 'Admin Rate Adjustment'}
                    </td>
                    <td className="p-3 font-medium text-gray-800">
                      {rc.adminUser?.name || 'Administrator'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
