import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, CheckCircle, AlertCircle, User, Home } from 'lucide-react';
import api from '../../api/axios';

const PlotTransfer = () => {
  const [plots, setPlots] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [targetClientId, setTargetClientId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plotRes, clientRes] = await Promise.all([
        api.get('/plots'),
        api.get('/users', { params: { role: 'client' } })
      ]);
      setPlots(plotRes.data.data || []);
      setClients(clientRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedPlot = plots.find(p => String(p.id) === String(selectedPlotId));

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!selectedPlotId || !targetClientId) {
      setError('Please select both the plot to transfer and the new client.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/plots/${selectedPlotId}`, {
        owner_id: targetClientId,
        allotment_status: 'transferred'
      });
      setMessage('Plot successfully transferred to new client.');
      setSelectedPlotId('');
      setTargetClientId('');
      setTransferReason('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete plot transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const bookedOrSoldPlots = plots.filter(p => ['booked', 'sold'].includes(p.status));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Plot Transfer Management</h1>
        <p className="text-sm text-gray-500">
          Transfer ownership of booked or allotted plots between clients with complete audit trail
        </p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-bold flex items-center gap-2">
          <CheckCircle size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-bold flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleTransfer} className="card space-y-5">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase">
            1. Select Plot to Transfer *
          </label>
          <select
            value={selectedPlotId}
            onChange={e => setSelectedPlotId(e.target.value)}
            className="input-field text-sm font-semibold"
            required
          >
            <option value="">-- Choose Booked / Allotted Plot --</option>
            {bookedOrSoldPlots.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.plot_code || `PLOT-${p.id}`}) — Current Client: {p.owner?.name || 'Unassigned'} — ₹{Number(p.price).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        {selectedPlot && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block font-semibold">Current Client</span>
              <span className="font-bold text-gray-900">{selectedPlot.owner?.name || 'Unassigned'}</span>
              <span className="text-[11px] text-gray-500 block">{selectedPlot.owner?.phone}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-semibold">Location / Project</span>
              <span className="font-bold text-gray-900">{selectedPlot.title}</span>
              <span className="text-[11px] text-gray-500 block">{selectedPlot.location}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-semibold">Plot Value</span>
              <span className="font-extrabold text-navy text-sm">₹{Number(selectedPlot.price).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase">
            2. Select New Client (Transferee) *
          </label>
          <select
            value={targetClientId}
            onChange={e => setTargetClientId(e.target.value)}
            className="input-field text-sm font-semibold"
            required
          >
            <option value="">-- Choose New Client --</option>
            {clients
              .filter(c => !selectedPlot || String(c.id) !== String(selectedPlot.owner_id))
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.login_id || `CLI-${c.id}`}) — {c.phone} — {c.email}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase">
            3. Transfer Reason / Reference Note
          </label>
          <textarea
            rows={2}
            value={transferReason}
            onChange={e => setTransferReason(e.target.value)}
            placeholder="Authorized ownership transfer upon verification of legal clearance..."
            className="input-field text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-2"
        >
          <ArrowLeftRight size={16} /> {submitting ? 'Executing Transfer...' : 'Confirm & Complete Plot Transfer'}
        </button>
      </form>
    </div>
  );
};

export default PlotTransfer;
