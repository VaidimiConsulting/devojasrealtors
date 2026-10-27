import React, { useEffect, useState } from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';

const emptyForm = { plot_id: '', buyer_id: '', seller_id: '', seller_associate_id: '', buyer_associate_id: '', amount: '' };

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [plots, setPlots] = useState([]);
  const [clients, setClients] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewTx, setViewTx] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [txRes, plotRes, clientRes, assocRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/plots', { params: { status: 'available' } }),
        api.get('/users', { params: { role: 'client' } }),
        api.get('/users', { params: { role: 'associate' } })
      ]);
      setTransactions(txRes.data.data);
      setPlots(plotRes.data.data);
      setClients(clientRes.data.data);
      setAssociates(assocRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAddModal = () => { setForm(emptyForm); setError(''); setModalOpen(true); };

  const handlePlotChange = (plotId) => {
    const plot = plots.find((p) => p.id === parseInt(plotId));
    setForm({ ...form, plot_id: plotId, seller_id: plot?.owner_id || '', amount: plot?.price || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/transactions', form);
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/transactions/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
          <p className="text-gray-500 text-sm">Deal history — commissions auto-calculated & credited on creation</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Deal
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Plot</th>
              <th className="text-left px-4 py-3">Buyer</th>
              <th className="text-left px-4 py-3">Seller</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-gray-400">No transactions yet</td></tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{tx.plot?.title}</div>
                    <div className="text-xs font-mono text-blue-700 font-semibold">{tx.transaction_ref || `#${tx.id}`}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{tx.buyer?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.seller?.name}</td>
                  <td className="px-4 py-3 font-semibold text-navy">₹{Number(tx.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><Badge status={tx.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewTx(tx)} className="p-1.5 text-navy hover:bg-blue-50 rounded-lg">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => setDeleteTarget(tx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Transaction Modal */}
      <Modal title="Create New Deal" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Select Plot</label>
            <select required value={form.plot_id} onChange={(e) => handlePlotChange(e.target.value)} className="input-field">
              <option value="">Choose available plot...</option>
              {plots.map((p) => <option key={p.id} value={p.id}>{p.title} — ₹{Number(p.price).toLocaleString('en-IN')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Buyer (Client)</label>
            <select required value={form.buyer_id} onChange={(e) => setForm({ ...form, buyer_id: e.target.value })} className="input-field">
              <option value="">Select buyer...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Seller's Associate</label>
              <select value={form.seller_associate_id} onChange={(e) => setForm({ ...form, seller_associate_id: e.target.value })} className="input-field">
                <option value="">None</option>
                {associates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Buyer's Associate</label>
              <select value={form.buyer_associate_id} onChange={(e) => setForm({ ...form, buyer_associate_id: e.target.value })} className="input-field">
                <option value="">None</option>
                {associates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Final Deal Amount (₹)</label>
            <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" />
          </div>
          <p className="text-xs text-gray-400">Commission % set in Commission Settings will auto-apply and credit wallets instantly.</p>
          <button type="submit" className="btn-primary w-full">Complete Deal & Distribute Commission</button>
        </form>
      </Modal>

      {/* View Transaction Modal */}
      <Modal title="Transaction Details" isOpen={!!viewTx} onClose={() => setViewTx(null)}>
        {viewTx && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-400">Plot</p><p className="font-medium">{viewTx.plot?.title}</p></div>
              <div><p className="text-gray-400">Amount</p><p className="font-medium">₹{Number(viewTx.amount).toLocaleString('en-IN')}</p></div>
              <div><p className="text-gray-400">Buyer</p><p className="font-medium">{viewTx.buyer?.name}</p></div>
              <div><p className="text-gray-400">Seller</p><p className="font-medium">{viewTx.seller?.name}</p></div>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Commission Breakdown</p>
              <div className="space-y-2">
                {viewTx.commissions?.length === 0 && <p className="text-gray-400 text-xs">No commissions for this deal</p>}
                {viewTx.commissions?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="capitalize text-gray-600">{c.role_level.replace('_', ' ')} ({c.percent}%)</span>
                    <span className="font-semibold text-navy">₹{Number(c.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete this transaction?" message="This will remove the deal record permanently." />
    </div>
  );
};

export default Transactions;
