import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Check, X, Star } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';

const emptyForm = {
  title: '', location: '', city: '', size_sqft: '', price: '',
  block: '', plot_number: '', dimensions: '', road_width: '', facing: '', is_corner: false, status: 'pending'
};

// Admin directly sets plot status here — this is what shows LIVE on the public website
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'available', label: 'Available' },
  { value: 'booked', label: 'Booked' },
  { value: 'under_negotiation', label: 'Under Negotiation' },
  { value: 'sold', label: 'Sold' },
  { value: 'rejected', label: 'Rejected' }
];

const Plots = () => {
  const [searchParams] = useSearchParams();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');

  const statusFilter = searchParams.get('status');

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/plots', { params });
      setPlots(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlots(); }, [statusFilter, search]);

  const openAddModal = () => { setEditingPlot(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEditModal = (plot) => {
    setEditingPlot(plot);
    setForm({
      title: plot.title, location: plot.location,
      city: plot.city || '', size_sqft: plot.size_sqft, price: plot.price,
      block: plot.block || '', plot_number: plot.plot_number || '', dimensions: plot.dimensions || '',
      road_width: plot.road_width || '', facing: plot.facing || '', is_corner: plot.is_corner || false,
      status: plot.status || 'pending'
    });
    setError(''); setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingPlot) await api.put(`/plots/${editingPlot.id}`, form);
      else await api.post('/plots', form);
      setModalOpen(false);
      fetchPlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/plots/${deleteTarget.id}`);
      if (res.data.soft_deleted) {
        alert(res.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
    setDeleteTarget(null);
    fetchPlots();
  };

  const handleApproval = async (id, status) => {
    await api.put(`/plots/${id}/approval`, { status });
    fetchPlots();
  };

  const toggleFeatured = async (id) => {
    await api.put(`/plots/${id}/feature`);
    fetchPlots();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Plot Management</h1>
          <p className="text-gray-500 text-sm">Add, approve and manage plot listings</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Plot
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plots..." className="input-field pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-400 col-span-full text-center py-10">Loading...</p>
        ) : plots.length === 0 ? (
          <p className="text-gray-400 col-span-full text-center py-10">No plots found</p>
        ) : (
          plots.map((p) => (
            <div key={p.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{p.title}</h3>
                  <p className="text-xs text-gray-400">{p.location}{p.city ? `, ${p.city}` : ''}</p>
                </div>
                {p.is_featured && <Star size={16} className="text-gold fill-gold" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{p.size_sqft} sqft</span>
                <span className="font-bold text-navy">₹{Number(p.price).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge status={p.status} />
                {p.plot_number && <span className="text-xs text-gray-400">Plot No. {p.plot_number}</span>}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Change Status (live on website)</label>
                <select
                  value={p.status}
                  onChange={async (e) => { await api.put(`/plots/${p.id}`, { status: e.target.value }); fetchPlots(); }}
                  className="input-field py-1.5 text-sm"
                >
                  {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => handleApproval(p.id, 'approved')} className="btn-success flex items-center gap-1 flex-1 justify-center">
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => handleApproval(p.id, 'rejected')} className="btn-danger flex items-center gap-1 flex-1 justify-center">
                      <X size={14} /> Reject
                    </button>
                  </>
                )}
                <button onClick={() => toggleFeatured(p.id)} className="p-2 text-gold hover:bg-gold/10 rounded-lg">
                  <Star size={16} className={p.is_featured ? 'fill-gold' : ''} />
                </button>
                <button onClick={() => openEditModal(p)} className="p-2 text-navy hover:bg-blue-50 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setDeleteTarget(p)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal title={editingPlot ? 'Edit Plot' : 'Add New Plot'} isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
              <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Size (sqft)</label>
              <input required type="number" value={form.size_sqft} onChange={(e) => setForm({ ...form, size_sqft: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Price (₹)</label>
              <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" />
            </div>
          </div>

          {/* Website display fields — optional, used by the public marketing site */}
          <div className="border-t pt-4 mt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Website Display Details (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Block</label>
                <input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} className="input-field" placeholder="e.g. Block A" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Plot Number</label>
                <input value={form.plot_number} onChange={(e) => setForm({ ...form, plot_number: e.target.value })} className="input-field" placeholder="e.g. 12" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status (shown live on website)</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                  {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Dimensions</label>
                <input value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className="input-field" placeholder="e.g. 40x60 ft" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Road Width</label>
                <input value={form.road_width} onChange={(e) => setForm({ ...form, road_width: e.target.value })} className="input-field" placeholder="e.g. 30 ft" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Facing</label>
                <input value={form.facing} onChange={(e) => setForm({ ...form, facing: e.target.value })} className="input-field" placeholder="e.g. East" />
              </div>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input type="checkbox" checked={form.is_corner} onChange={(e) => setForm({ ...form, is_corner: e.target.checked })} /> Corner Plot
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">{editingPlot ? 'Update Plot' : 'Create Plot'}</button>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete this plot?" message={`"${deleteTarget?.title}" will be permanently removed.`} />
    </div>
  );
};

export default Plots;
