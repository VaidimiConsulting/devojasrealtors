import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search, MapPin, CheckCircle, Home, Layers } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const emptyProject = {
  project_id: '',
  name: '',
  location: '',
  city: '',
  developer_name: 'Devojas Realtors Pvt Ltd',
  description: '',
  facilities: '',
  status: 'active'
};

const ProjectsManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(emptyProject);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects', { params: { search } });
      setProjects(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const openAdd = () => {
    setEditingProject(null);
    setForm({
      ...emptyProject,
      project_id: `PROJ-${Date.now().toString().slice(-4)}`
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingProject(p);
    setForm({
      project_id: p.project_id,
      name: p.name,
      location: p.location,
      city: p.city || '',
      developer_name: p.developer_name || '',
      description: p.description || '',
      facilities: p.facilities || '',
      status: p.status || 'active'
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, form);
      } else {
        await api.post('/projects', form);
      }
      setModalOpen(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects Management</h1>
          <p className="text-sm text-gray-500">
            Define townships, commercial corridors and residential development projects
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add New Project
        </button>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects by name, code or city..."
            className="input-field pl-9 text-sm"
          />
        </div>
        <span className="text-xs text-gray-400 font-semibold">{projects.length} Total Projects</span>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
          No projects found. Click "Add New Project" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map(p => {
            const counts = p.plot_counts || { total: 0, available: 0, booked: 0, sold: 0 };
            return (
              <div key={p.id} className="card hover:shadow-md transition-all space-y-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy/10 text-navy uppercase tracking-wider">
                      {p.project_id}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={13} className="text-gray-400" />
                      {p.location}{p.city ? `, ${p.city}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                    p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{p.description}</p>
                )}

                {/* Plot Inventory Summary */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Total</span>
                    <span className="font-extrabold text-navy text-sm">{counts.total}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Avail</span>
                    <span className="font-extrabold text-emerald-600 text-sm">{counts.available}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Booked</span>
                    <span className="font-extrabold text-amber-600 text-sm">{counts.booked}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Sold</span>
                    <span className="font-extrabold text-blue-600 text-sm">{counts.sold}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-400 font-medium">Developer: {p.developer_name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-navy hover:bg-navy/10 rounded-lg"
                      title="Edit Project"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete Project"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        title={editingProject ? 'Edit Project' : 'Add New Project'}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-bold">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Project ID / Code *</label>
              <input
                required
                value={form.project_id}
                onChange={e => setForm({ ...form, project_id: e.target.value })}
                placeholder="e.g. TEST-PROJ-001"
                className="input-field text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Project Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="input-field text-sm"
              >
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="hold">On Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Project Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sunrise Residency — TEST"
              className="input-field text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Location / Address *</label>
              <input
                required
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Sector 02, Highway Corridor"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">City</label>
              <input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Varanasi"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Developer / Company Name</label>
            <input
              value={form.developer_name}
              onChange={e => setForm({ ...form, developer_name: e.target.value })}
              placeholder="Devojas Realtors Pvt Ltd"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Facilities & Amenities</label>
            <textarea
              rows={2}
              value={form.facilities}
              onChange={e => setForm({ ...form, facilities: e.target.value })}
              placeholder="24/7 Security, 40ft Wide Roads, Underground Electricity, Parks, Club House"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed overview of the project..."
              className="input-field text-sm"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            {editingProject ? 'Update Project' : 'Save Project'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsManagement;
