import React, { useEffect, useState } from 'react';
import { 
  Users, Network, RefreshCw, Printer, Search, ChevronDown, ChevronUp, 
  UserCheck, Shield, Sparkles, Building2, Phone, Mail, Award, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import NetworkTreeNode from '../components/NetworkTreeNode';
import Modal from '../components/Modal';

// Admin's full company-wide network tree
const MyTeamNetwork = () => {
  const [tree, setTree] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRootId, setSelectedRootId] = useState('');
  const [forceExpandAll, setForceExpandAll] = useState(null);
  
  // Modals state
  const [printNode, setPrintNode] = useState(null);
  const [detailNode, setDetailNode] = useState(null);
  const [sponsorEditNode, setSponsorEditNode] = useState(null);
  const [newSponsorId, setNewSponsorId] = useState('');
  const [savingSponsor, setSavingSponsor] = useState(false);
  const [sponsorFeedback, setSponsorFeedback] = useState(null);
  const [allAssociatesList, setAllAssociatesList] = useState([]);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedRootId) params.rootId = selectedRootId;
      const res = await api.get('/network/full', { params });

      // Strict recursive sanitizer: Admin & Associates only, never Clients
      const isAllowedRole = (r) => {
        const s = String(r || '').toLowerCase();
        return s === 'associate' || s === 'admin';
      };

      const sanitizeTreeNodes = (nodes) => {
        if (!Array.isArray(nodes)) return [];
        return nodes
          .filter(n => n && isAllowedRole(n.role))
          .map(n => ({
            ...n,
            children: sanitizeTreeNodes(n.children || [])
          }));
      };

      const cleanedTree = sanitizeTreeNodes(res.data.data || []);
      setTree(cleanedTree);
      setTotalCount(res.data.totalCount || 0);

      // Also fetch flat associate list for sponsor dropdown and branch focus
      const usersRes = await api.get('/users', { params: { role: 'associate' } });
      const onlyAssociates = (usersRes.data.data || []).filter(u => String(u.role || '').toLowerCase() === 'associate');
      setAllAssociatesList(onlyAssociates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, [selectedRootId]);

  const flattenTree = (node) => {
    let list = [node];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        list = list.concat(flattenTree(child));
      });
    }
    return list;
  };

  const handlePrint = (node) => setPrintNode(node);
  const handleViewDetails = (node) => setDetailNode(node);
  const handleEditSponsor = (node) => {
    setSponsorEditNode(node);
    setNewSponsorId(node.referred_by || '1');
    setSponsorFeedback(null);
  };

  const handleSaveSponsor = async (e) => {
    e.preventDefault();
    if (!sponsorEditNode) return;
    setSavingSponsor(true);
    setSponsorFeedback(null);

    try {
      const res = await api.put(`/network/user/${sponsorEditNode.id}/sponsor`, {
        new_sponsor_id: newSponsorId ? parseInt(newSponsorId, 10) : 1
      });

      setSponsorFeedback({
        type: 'success',
        message: res.data.message || 'Sponsor updated successfully!'
      });

      setTimeout(() => {
        setSponsorEditNode(null);
        fetchNetwork();
      }, 1500);
    } catch (err) {
      setSponsorFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update sponsor'
      });
    } finally {
      setSavingSponsor(false);
    }
  };

  const serial = { current: 1 };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Network size={24} className="text-gold" />
            Full Company Network Tree
          </h1>
          <p className="page-subtitle">Real-time MLM hierarchy, sponsor links, and team genealogy from actual database records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setForceExpandAll(true)} 
            className="btn-ghost flex items-center gap-1.5 text-xs text-blue-300 border border-[#1e2f5a] hover:bg-[#131f3e]"
          >
            <ChevronDown size={14} /> Expand All
          </button>
          <button 
            onClick={() => setForceExpandAll(false)} 
            className="btn-ghost flex items-center gap-1.5 text-xs text-slate-300 border border-[#1e2f5a] hover:bg-[#131f3e]"
          >
            <ChevronUp size={14} /> Collapse All
          </button>
          <button onClick={fetchNetwork} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Branch Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Associate Name, User ID (e.g. DEV-0002, DEV-0003), or Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Focus on specific Branch Root */}
        <div>
          <select
            value={selectedRootId}
            onChange={(e) => setSelectedRootId(e.target.value)}
            className="input w-full"
          >
            <option value="">🌳 View Entire Company (from Super Admin)</option>
            {allAssociatesList.map((a) => (
              <option key={a.id} value={a.id}>
                Focus: {a.name} ({a.login_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-r from-navy to-navy-light text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Users size={22} className="text-gold" />
          </div>
          <div>
            <p className="text-xs text-blue-100 uppercase tracking-wide">Total Associates</p>
            <p className="text-2xl font-black">{totalCount}</p>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-[#0d1d47] to-[#122b68] text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Network size={22} className="text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-300 uppercase tracking-wide">Active Branches</p>
            <p className="text-2xl font-black">{tree.length > 0 ? (tree[0]?.children?.length || tree.length) : 0}</p>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-[#0a1628] to-[#14234b] text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-300 uppercase tracking-wide">Standardized ID Series</p>
            <p className="text-base font-bold font-mono text-gold">DEV-0001 → DEV-0011+</p>
          </div>
        </div>
      </div>

      {/* Network Tree Display */}
      <div className="card border border-[#1e2f5a] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-[#1e2f5a] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <Network size={16} className="text-navy-dark" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Interactive MLM Hierarchy Tree</h3>
              <p className="text-[11px] text-slate-400">
                Click any card to expand/collapse. Gold-bordered nodes match your search.
              </p>
            </div>
          </div>
          {searchTerm && (
            <span className="text-xs bg-gold/20 text-gold px-3 py-1 rounded-full font-semibold border border-gold/30">
              Filtering for: "{searchTerm}"
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading network hierarchy...</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0d1d47] border border-[#1e2f5a] flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-300 font-bold text-base">No network tree records found</p>
            <p className="text-slate-500 text-sm mt-1">Make sure associates are registered with sponsors</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-12 pt-4">
            <div className="min-w-max p-4 flex justify-center">
              {tree.map((rootNode) => (
                <NetworkTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  depth={0}
                  serial={serial}
                  onPrint={handlePrint}
                  onViewDetails={handleViewDetails}
                  onEditSponsor={handleEditSponsor}
                  searchTerm={searchTerm}
                  forceExpandAll={forceExpandAll}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Modal title="Associate Network Profile" isOpen={!!detailNode} onClose={() => setDetailNode(null)} size="lg">
        {detailNode && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="w-14 h-14 rounded-full bg-navy text-gold flex items-center justify-center text-xl font-bold shrink-0">
                {detailNode.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{detailNode.name}</h3>
                <p className="text-sm font-mono font-semibold text-blue-700">{detailNode.login_id}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 bg-blue-100 text-blue-800">
                  {detailNode.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Associate ID</p>
                <p className="font-mono font-bold text-navy mt-0.5">{detailNode.login_id || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Referred By (Sponsor)</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {detailNode.id === 1 ? 'Super Admin (Root)' : (allAssociatesList.find(a => a.id === detailNode.referred_by)?.name || 'Super Admin')}
                  {detailNode.id !== 1 && (
                    <span className="block text-xs font-mono text-blue-700 font-bold">
                      ID: {allAssociatesList.find(a => a.id === detailNode.referred_by)?.login_id || 'DEV-0001'}
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Mobile</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailNode.phone || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Email</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailNode.email || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Commission Rate</p>
                <p className="font-bold text-emerald-700 mt-0.5">{detailNode.commission_percent || detailNode.referral_commission_percent || 5}%</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">KYC Status</p>
                <p className="font-bold text-slate-800 uppercase mt-0.5">{detailNode.kyc_status || 'not_submitted'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Direct Children</p>
                <p className="font-bold text-blue-800 mt-0.5">{detailNode.children?.length || 0} associates</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 uppercase font-semibold">Joined On</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {detailNode.createdAt ? new Date(detailNode.createdAt).toLocaleDateString('en-IN') : '—'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  const node = detailNode;
                  setDetailNode(null);
                  handleEditSponsor(node);
                }}
                className="btn-primary text-sm"
              >
                Change Sponsor
              </button>
              <button type="button" onClick={() => setDetailNode(null)} className="btn-ghost text-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Sponsor Modal */}
      <Modal title={`Change Sponsor / Placement for ${sponsorEditNode?.name || ''}`} isOpen={!!sponsorEditNode} onClose={() => setSponsorEditNode(null)}>
        {sponsorEditNode && (
          <form onSubmit={handleSaveSponsor} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
              <p className="font-bold">Associate to Reassign:</p>
              <p className="text-sm font-semibold mt-0.5">{sponsorEditNode.name} ({sponsorEditNode.login_id})</p>
              <p className="text-slate-500 mt-1">Current Sponsor ID: {sponsorEditNode.referred_by || '1 (Super Admin / Root)'}</p>
            </div>

            {sponsorFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                sponsorFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {sponsorFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {sponsorFeedback.message}
              </div>
            )}

            <div>
              <label className="label">Select New Sponsor *</label>
              <select
                required
                value={newSponsorId}
                onChange={(e) => setNewSponsorId(e.target.value)}
                className="select w-full"
              >
                <option value="1">Super Admin (DEV-0001) — Company Head</option>
                {allAssociatesList
                  .filter(a => a.id !== sponsorEditNode.id)
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.login_id}) — Rate: {a.commission_percent || 5}%
                    </option>
                  ))
                }
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Moving this associate will also reposition their entire downline branch beneath the new sponsor.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setSponsorEditNode(null)} className="btn-ghost text-sm">
                Cancel
              </button>
              <button type="submit" disabled={savingSponsor} className="btn-primary text-sm flex items-center gap-2">
                {savingSponsor ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
                {savingSponsor ? 'Updating...' : 'Save New Sponsor'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Print Modal */}
      <Modal title="Print Network Records" isOpen={!!printNode} onClose={() => setPrintNode(null)} size="3xl">
        {printNode && (() => {
          const flatList = flattenTree(printNode);
          return (
            <div>
              <div id="print-area" className="text-gray-800 bg-white p-4">
                <div className="text-center mb-6 border-b pb-4">
                  <h2 className="text-2xl font-bold uppercase text-navy">DEVOJAS REALTORS</h2>
                  <p className="text-gray-500 font-semibold mt-1">Associate Downline Report</p>
                </div>
                
                <div className="flex justify-between items-end mb-6 bg-gray-50 p-4 rounded-lg border">
                  <div>
                    <p className="text-sm text-gray-500">Root Associate</p>
                    <p className="text-lg font-bold text-navy uppercase">{printNode.name}</p>
                    <p className="font-mono text-sm">{printNode.login_id}</p>
                    <p className="text-sm">Phone: {printNode.phone || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Team Size</p>
                    <p className="text-2xl font-bold text-emerald-600">{flatList.length - 1}</p>
                    <p className="text-xs text-gray-400 mt-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="py-2 px-3 border border-gray-300">S.No</th>
                      <th className="py-2 px-3 border border-gray-300">Associate Name</th>
                      <th className="py-2 px-3 border border-gray-300">User ID</th>
                      <th className="py-2 px-3 border border-gray-300">Phone</th>
                      <th className="py-2 px-3 border border-gray-300">Role</th>
                      <th className="py-2 px-3 border border-gray-300">Joined On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatList.map((item, index) => (
                      <tr key={item.id} className={index === 0 ? "bg-blue-50 font-semibold" : ""}>
                        <td className="py-2 px-3 border border-gray-300 text-center">{index === 0 ? 'ROOT' : index}</td>
                        <td className="py-2 px-3 border border-gray-300 uppercase">{item.name}</td>
                        <td className="py-2 px-3 border border-gray-300 font-mono text-xs">{item.login_id}</td>
                        <td className="py-2 px-3 border border-gray-300">{item.phone}</td>
                        <td className="py-2 px-3 border border-gray-300 capitalize">{item.role}</td>
                        <td className="py-2 px-3 border border-gray-300">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4 pt-4 border-t print:hidden">
                <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                  <Printer size={16} /> Print / Save as PDF
                </button>
              </div>

              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #print-area, #print-area * { visibility: visible; }
                  #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                  .print\\:hidden { display: none !important; }
                }
              `}</style>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default MyTeamNetwork;
