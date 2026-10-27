import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Percent, IndianRupee, Eye, FileText, ArrowRight, X, Phone, Mail, Award, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AssociateAccounts = () => {
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssociate, setSelectedAssociate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [associateDetails, setAssociateDetails] = useState(null);

  const fetchAssociates = async (search = '') => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/associates', {
        params: { search: search || undefined }
      });
      setAssociates(res.data.data || []);
    } catch (err) {
      console.error('Failed to load associates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAssociates(searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const openDetailsModal = async (assoc) => {
    setSelectedAssociate(assoc);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/accounts/associates/${assoc.id}`);
      setAssociateDetails(res.data.data);
    } catch (err) {
      console.error('Failed to load associate details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Associate Accounts & Dues</h1>
          <p className="text-gray-500 text-sm">Associate commission ledgers, sales track record, and payout balances</p>
        </div>
        <Link
          to="/accounts/commission-slips"
          className="px-4 py-2 bg-navy text-white font-medium text-sm rounded-lg hover:bg-navy-light shadow-sm flex items-center gap-2"
        >
          <FileText size={16} /> Generate Commission Slip
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Associate Name, Login ID (e.g. DEV-0004), Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>
      </div>

      {/* Associates Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Associate Details</th>
              <th className="px-4 py-3">Sponsor / Upline</th>
              <th className="px-4 py-3 text-center">Commission %</th>
              <th className="px-4 py-3 text-right">Sales Count / Vol</th>
              <th className="px-4 py-3 text-right">Total Earned</th>
              <th className="px-4 py-3 text-right">Pending Dues</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-400">Loading associates...</td>
              </tr>
            ) : associates.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-400">No associates found matching "{searchTerm}"</td>
              </tr>
            ) : (
              associates.map((assoc) => (
                <tr key={assoc.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{assoc.name}</p>
                    <p className="text-xs text-navy font-mono">{assoc.login_id || 'ID Pending'}</p>
                    <p className="text-xs text-gray-400">{assoc.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    {(assoc.sponsor || assoc.referrer) ? (
                      <div>
                        <p className="font-medium text-gray-800 text-xs">{(assoc.sponsor || assoc.referrer).name}</p>
                        <p className="text-xs text-gray-400 font-mono">{(assoc.sponsor || assoc.referrer).login_id}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Direct / Root</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 rounded font-bold text-xs border border-amber-200">
                      {assoc.commission_percent ?? assoc.commissionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-gray-900">{assoc.salesCount ?? assoc.totalSalesCount ?? 0} deals</p>
                    <p className="text-xs text-gray-400">{INR(assoc.totalSalesVolume ?? assoc.salesVolume ?? 0)}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {INR(assoc.totalCommissionEarned ?? assoc.totalEarned ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${Number(assoc.pendingCommissions ?? assoc.pendingDues ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {INR(assoc.pendingCommissions ?? assoc.pendingDues ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDetailsModal(assoc)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-navy hover:text-white text-gray-700 text-xs font-medium rounded transition-all inline-flex items-center gap-1"
                    >
                      <Eye size={13} /> View Ledger
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Associate Account Details Modal */}
      {selectedAssociate && (
        <Modal
          isOpen={!!selectedAssociate}
          onClose={() => { setSelectedAssociate(null); setAssociateDetails(null); }}
          title={`Associate Statement: ${selectedAssociate.name} (${selectedAssociate.login_id || 'ID'})`}
          maxWidth="max-w-4xl"
        >
          {detailsLoading || !associateDetails ? (
            <div className="py-12 text-center text-gray-400">Loading ledger details...</div>
          ) : (
            <div className="space-y-5 text-sm">
              {/* Summary Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Assigned Rate</p>
                  <p className="font-bold text-navy text-lg">{selectedAssociate.commission_percent ?? selectedAssociate.commissionRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Total Sales Vol</p>
                  <p className="font-bold text-gray-800 text-lg">
                    {INR(associateDetails.summary?.totalSalesVolume ?? (selectedAssociate.totalSalesVolume ?? selectedAssociate.salesVolume))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Pending Dues</p>
                  <p className="font-bold text-amber-600 text-lg">
                    {INR(associateDetails.summary?.pendingAmount ?? (selectedAssociate.pendingCommissions ?? selectedAssociate.pendingDues))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Wallet Balance</p>
                  <p className="font-bold text-emerald-700 text-lg">
                    {INR(associateDetails.summary?.walletBalance ?? selectedAssociate.walletBalance)}
                  </p>
                </div>
              </div>

              {/* Personal Sales / Deals Closed */}
              {associateDetails.personalDeals && associateDetails.personalDeals.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Personal Deals Closed ({associateDetails.personalDeals.length})</h4>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 text-gray-600 uppercase sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Deal #</th>
                          <th className="p-2 text-left">Plot</th>
                          <th className="p-2 text-left">Buyer / Client</th>
                          <th className="p-2 text-right">Deal Amount</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {associateDetails.personalDeals.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="p-2 font-mono">#{d.transaction_ref || d.id}</td>
                            <td className="p-2 font-medium">{d.plot?.title || `Plot #${d.plot?.plot_number || d.plot_id}`}</td>
                            <td className="p-2 text-gray-600">{d.buyer?.name || '—'}</td>
                            <td className="p-2 text-right font-bold text-navy">{INR(d.amount)}</td>
                            <td className="p-2 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Milestone Slab Rewards */}
              {associateDetails.rewards && associateDetails.rewards.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Slab Milestone Rewards ({associateDetails.rewards.length})</h4>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 text-gray-600 uppercase sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Reward #</th>
                          <th className="p-2 text-left">Description</th>
                          <th className="p-2 text-right">Reward Amount</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {associateDetails.rewards.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="p-2 font-mono">#{r.id}</td>
                            <td className="p-2 text-gray-700">Self-Sale Milestone Reward</td>
                            <td className="p-2 text-right font-bold text-emerald-700">+{INR(r.reward_amount)}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Commission Ledger Table */}
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Commissions & Multi-Level Differentials</h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 text-gray-600 uppercase sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Deal #</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-right">Deal Base</th>
                        <th className="p-2 text-center">My %</th>
                        <th className="p-2 text-center">Downline %</th>
                        <th className="p-2 text-center">Diff %</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(!associateDetails.commissions || associateDetails.commissions.length === 0) ? (
                        <tr><td colSpan="8" className="p-4 text-center text-gray-400">No commission records found</td></tr>
                      ) : (
                        associateDetails.commissions.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="p-2 font-mono">#{c.transaction_id}</td>
                            <td className="p-2">
                              {c.level === 0 ? (
                                <span className="text-emerald-700 font-semibold">Direct Sale</span>
                              ) : (
                                <span className="text-blue-700 font-medium">Upline L{c.level}</span>
                              )}
                            </td>
                            <td className="p-2 text-right">{INR(c.base_amount || c.transaction?.amount)}</td>
                            <td className="p-2 text-center font-semibold">{c.upline_percent ?? c.percent}%</td>
                            <td className="p-2 text-center">{c.downline_percent !== null ? `${c.downline_percent}%` : '—'}</td>
                            <td className="p-2 text-center font-bold text-navy">{c.differential_percent !== null ? `${c.differential_percent}%` : `${c.percent}%`}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">+{INR(c.amount)}</td>
                            <td className="p-2 text-center">
                              <Badge variant={c.status === 'paid' ? 'success' : c.status === 'approved' || c.status === 'credited' ? 'info' : 'warning'}>
                                {c.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t">
                <Link
                  to={`/accounts/commission-slips?associate_id=${selectedAssociate.id}`}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg text-xs font-semibold hover:brightness-105"
                >
                  Open Printable Slip
                </Link>
                <button
                  onClick={() => setSelectedAssociate(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AssociateAccounts;
