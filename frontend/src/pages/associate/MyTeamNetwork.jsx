import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Network, RefreshCw, X, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import NetworkTreeNode from '../../components/NetworkTreeNode';
import AssociateRegistrationForm from '../../components/AssociateRegistrationForm';
import NetworkCounts from '../../components/NetworkCounts';
import { useAuth } from '../../context/AuthContext';

const emptyForm = {
  name: '', phone: '', email: '',
  pan_number: '', aadhar_number: '',
  password: ''
};

const AssociateMyTeamNetwork = () => {
  const { user } = useAuth();
  const [tree, setTree] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const res = await api.get('/associate/network');
      const sanitizeNode = (node) => {
        if (!node) return null;
        const role = String(node.role || '').toLowerCase();
        if (role && role !== 'associate' && role !== 'admin') return null;
        return {
          ...node,
          children: (node.children || [])
            .map(sanitizeNode)
            .filter(Boolean)
        };
      };
      setTree(sanitizeNode(res.data.data));
      setTotalCount(res.data.totalCount || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchNetwork(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/associate/team', form);
      setSuccess(`${form.name} has been added to your team!`);
      setForm(emptyForm);
      setModalOpen(false);
      fetchNetwork();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const serial = { current: 1 };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Network size={24} className="text-gold" />
            Team Network
          </h1>
          <p className="page-subtitle">Your downline tree — see everyone in your network</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchNetwork} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-gold flex items-center gap-2">
            <Plus size={16} />
            Add Associate
          </button>
        </div>
      </div>

      <NetworkCounts refreshKey={String(modalOpen)} />

      {/* Success toast */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium">
          <span className="text-base">✅</span> {success}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-white">{totalCount}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Network Members</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-gold">{tree?.children?.length || 0}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Direct Members</p>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <p className="text-3xl font-bold text-blue-400">{Math.max(0, totalCount - (tree?.children?.length || 0))}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Indirect Members</p>
        </div>
      </div>

      {/* Tree View */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
            <Network size={16} className="text-navy-dark" />
          </div>
          <h3 className="font-bold text-white">Network Tree</h3>
          <span className="ml-2 text-[10px] text-slate-500 bg-[#0d1d47] border border-[#1e2f5a] px-2.5 py-1 rounded-full font-medium">
            Click any node to expand/collapse
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : !tree ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0d1d47] border border-[#1e2f5a] flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">Unable to load network</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8 pt-4">
            <div className="min-w-max p-4 flex justify-center">
              <NetworkTreeNode node={tree} depth={0} serial={serial} isHorizontal={true} />
            </div>
          </div>
        )}
      </div>

      {/* ── ADD MEMBER MODAL ────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-[#1e2f5a] overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #131f3e 0%, #0d1d47 100%)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2f5a]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                  <Plus size={16} className="text-navy-dark" />
                </div>
                <div>
                  <p className="font-bold text-white">Add Associate</p>
                  <p className="text-[10px] text-slate-500">They will be placed under you in your network</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Shared registration form (same as public signup) – sponsor locked to logged-in associate */}
            <div className="overflow-y-auto p-6 bg-white">
              <AssociateRegistrationForm
                endpoint="/associate/team"
                sponsorValue={user?.login_id || ''}
                sponsorLocked
                sponsorLabel="Sponsor (You)"
                intro="The new associate will be registered directly under you. Commission is set by Admin."
                submitLabel="Register Associate"
                doneLabel="Done"
                onRegistered={() => fetchNetwork()}
                onSuccess={() => setModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssociateMyTeamNetwork;
