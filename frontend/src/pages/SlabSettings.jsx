import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Target, RotateCcw, Award, CheckCircle, AlertCircle, Info } from 'lucide-react';
import api from '../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const formatLakhCrore = (num) => {
  const n = Number(num);
  if (!n || isNaN(n) || n <= 0) return '';
  if (n >= 10000000) {
    const cr = n / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (n >= 100000) {
    const lk = n / 100000;
    return `₹${lk % 1 === 0 ? lk : lk.toFixed(2)} Lakh`;
  }
  if (n >= 1000) {
    const th = n / 1000;
    return `₹${th % 1 === 0 ? th : th.toFixed(1)}k`;
  }
  return `₹${n.toLocaleString('en-IN')}`;
};

const SlabSettings = () => {
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [savingId, setSavingId] = useState(null);

  const fetchSlabs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/slabs');
      setSlabs(res.data.data || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load slabs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlabs();
  }, []);

  const showNotification = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3500);
  };

  const updateField = (id, field, value) => {
    setSlabs(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const saveSlab = async (slab) => {
    setSavingId(slab.id);
    try {
      await api.put(`/slabs/${slab.id}`, {
        min_amount:         slab.min_amount,
        max_amount:         slab.max_amount,
        percentage:         slab.percentage,
        reward_amount:      slab.reward_amount,
        self_target_amount: slab.self_target_amount
      });
      showNotification('success', `Slab ${slab.slab_number} updated & persisted successfully!`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || `Failed to update Slab ${slab.slab_number}`);
    } finally {
      setSavingId(null);
    }
  };

  const addSlab = async () => {
    try {
      const nextNumber = slabs.length > 0 ? Math.max(...slabs.map(s => Number(s.slab_number) || 0)) + 1 : 1;
      const res = await api.post('/slabs', {
        slab_number: nextNumber,
        min_amount: 0,
        max_amount: 0,
        percentage: 0,
        reward_amount: 0,
        self_target_amount: 0
      });
      setSlabs([...slabs, res.data.data]);
      showNotification('success', `New Slab ${nextNumber} added. Please configure its values and save.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to add slab');
    }
  };

  const deleteSlab = async (id, num) => {
    if (!window.confirm(`Are you sure you want to delete Slab ${num}?`)) return;
    try {
      await api.delete(`/slabs/${id}`);
      showNotification('success', `Slab ${num} deleted successfully.`);
      fetchSlabs();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete slab');
    }
  };

  const restoreStandard = async () => {
    if (!window.confirm('Reset all slabs to the standard 12 company slabs (₹0-10L 5% up to ₹75-100Cr 18%) with configured Self Targets & Rewards?')) return;
    try {
      const res = await api.post('/slabs/reset-standard');
      setSlabs(res.data.data || []);
      showNotification('success', 'Standard 12 slabs restored successfully with exact Self Targets and Rewards.');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to reset slabs');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target size={26} className="text-blue-700" />
            MLM Slab &amp; Self Target Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure business volume ranges, commission percentages, database-persisted Self Targets, and Slab Rewards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={restoreStandard}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm"
            title="Reset to 12 Standard MLM Slabs"
          >
            <RotateCcw size={16} /> Restore Standard 12 Slabs
          </button>
          <button
            onClick={addSlab}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus size={16} /> Add New Slab
          </button>
        </div>
      </div>

      {/* Notifications */}
      {msg.text && (
        <div className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-2.5 shadow-sm transition-all ${
          msg.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
        }`}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} className="text-emerald-600" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Business Rules Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-2 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-950 uppercase tracking-wide">
          <Info size={16} className="text-blue-700" />
          MLM Payout &amp; Reward Principles
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700 mt-2">
          <div className="bg-white/80 border border-blue-100 rounded-xl p-3 shadow-xs">
            <span className="font-bold text-blue-900 block mb-1">1. Self Commission = ₹0</span>
            Personal sales contribute to <strong>Self Business</strong> &amp; <strong>Total Business</strong> for slab qualification, but do NOT generate direct self commission.
          </div>
          <div className="bg-white/80 border border-blue-100 rounded-xl p-3 shadow-xs">
            <span className="font-bold text-blue-900 block mb-1">2. Team Differential Commission</span>
            Differential Commission = <code>Sale Value × (Upline Rate − Downline Rate) ÷ 100</code> on all eligible downline sales.
          </div>
          <div className="bg-white/80 border border-blue-100 rounded-xl p-3 shadow-xs">
            <span className="font-bold text-blue-900 block mb-1">3. Self Target Milestone Reward</span>
            Slab is selected by <strong>Total Business</strong>. Reward is unlocked <strong>ONLY</strong> when personal <strong>Self Business ≥ Self Target</strong>. Team sales never count toward Self Target.
          </div>
        </div>
      </div>

      {/* Main Slabs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3.5">Slab #</th>
                <th className="text-left px-4 py-3.5">Min Business (₹)</th>
                <th className="text-left px-4 py-3.5">Max Business (₹)</th>
                <th className="text-center px-4 py-3.5">Commission %</th>
                <th className="text-left px-4 py-3.5 bg-blue-50/60 text-blue-900 border-x border-blue-100">
                  <span className="flex items-center gap-1.5">
                    <Target size={14} className="text-blue-700" />
                    Self Target (₹)
                  </span>
                </th>
                <th className="text-left px-4 py-3.5 bg-emerald-50/60 text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <Award size={14} className="text-emerald-700" />
                    Slab Reward (₹)
                  </span>
                </th>
                <th className="text-right px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400">Loading slab settings...</td>
                </tr>
              ) : slabs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400">
                    No slabs configured yet.{' '}
                    <button onClick={restoreStandard} className="text-blue-600 font-bold underline ml-1">
                      Load standard 12 slabs
                    </button>
                  </td>
                </tr>
              ) : (
                slabs.map((slab) => (
                  <tr key={slab.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-xs font-black mr-2">
                        {slab.slab_number}
                      </span>
                      Slab {slab.slab_number}
                    </td>

                    {/* Min Business */}
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        value={slab.min_amount}
                        onChange={(e) => updateField(slab.id, 'min_amount', e.target.value)}
                        className="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {formatLakhCrore(slab.min_amount) || '₹0'}
                      </p>
                    </td>

                    {/* Max Business */}
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        value={slab.max_amount}
                        onChange={(e) => updateField(slab.id, 'max_amount', e.target.value)}
                        className="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {formatLakhCrore(slab.max_amount) || 'No limit'}
                      </p>
                    </td>

                    {/* Commission % */}
                    <td className="px-4 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={slab.percentage}
                          onChange={(e) => updateField(slab.id, 'percentage', e.target.value)}
                          className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <span className="font-bold text-slate-600">%</span>
                      </div>
                    </td>

                    {/* Self Target (₹) */}
                    <td className="px-4 py-2.5 bg-blue-50/30 border-x border-blue-100">
                      <input
                        type="number"
                        min="0"
                        value={slab.self_target_amount ?? ''}
                        onChange={(e) => updateField(slab.id, 'self_target_amount', e.target.value)}
                        className="w-36 px-2.5 py-1.5 border border-blue-300 bg-white rounded-lg text-sm font-mono text-blue-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Own sales target"
                      />
                      <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                        {formatLakhCrore(slab.self_target_amount) || '₹0'} personal sales
                      </p>
                    </td>

                    {/* Slab Reward (₹) */}
                    <td className="px-4 py-2.5 bg-emerald-50/30">
                      <input
                        type="number"
                        min="0"
                        value={slab.reward_amount}
                        onChange={(e) => updateField(slab.id, 'reward_amount', e.target.value)}
                        className="w-36 px-2.5 py-1.5 border border-emerald-300 bg-white rounded-lg text-sm font-mono text-emerald-950 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="Reward bonus"
                      />
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        {formatLakhCrore(slab.reward_amount) || '₹0'} bonus
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => saveSlab(slab)}
                          disabled={savingId === slab.id}
                          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors font-semibold"
                          title="Save this slab to database"
                        >
                          <Save size={17} className={savingId === slab.id ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => deleteSlab(slab.id, slab.slab_number)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete slab"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Reference Table */}
      {!loading && slabs.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award size={18} className="text-blue-700" />
              Active MLM Slab Configuration Matrix (12 Slabs)
            </h3>
            <span className="text-xs text-slate-500 font-mono">{slabs.length} configured slabs in database</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 text-left">
                  <th className="py-2 pr-4 font-bold">Slab</th>
                  <th className="py-2 pr-4 font-bold">Total Business Range</th>
                  <th className="py-2 pr-4 font-bold text-center">Comm. %</th>
                  <th className="py-2 pr-4 font-bold text-right">Self Target (Own Sales Only)</th>
                  <th className="py-2 text-right font-bold">Slab Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slabs.map((s) => (
                  <tr key={s.id} className="hover:bg-white transition-colors">
                    <td className="py-2 pr-4 font-bold text-slate-800">Slab {s.slab_number}</td>
                    <td className="py-2 pr-4 text-slate-600 font-mono">
                      {INR(s.min_amount)} – {Number(s.max_amount) >= 1000000000 ? 'Above' : INR(s.max_amount)}
                      <span className="text-slate-400 ml-2">({formatLakhCrore(s.min_amount)} – {formatLakhCrore(s.max_amount)})</span>
                    </td>
                    <td className="py-2 pr-4 text-center font-bold text-blue-700">{s.percentage}%</td>
                    <td className="py-2 pr-4 text-right font-bold text-indigo-700">
                      {INR(s.self_target_amount)} <span className="text-indigo-400 font-normal">({formatLakhCrore(s.self_target_amount)})</span>
                    </td>
                    <td className="py-2 text-right font-bold text-emerald-700">
                      {INR(s.reward_amount)} <span className="text-emerald-400 font-normal">({formatLakhCrore(s.reward_amount)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabSettings;
