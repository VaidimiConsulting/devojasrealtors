import React, { useState, useEffect } from 'react';
import { FileCheck, Search, CheckCircle, Clock, AlertTriangle, Printer, Home } from 'lucide-react';
import api from '../../api/axios';

const PlotAllotment = () => {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plots');
      setPlots(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
  }, []);

  const handleAllotmentChange = async (plotId, newStatus) => {
    try {
      await api.put(`/plots/${plotId}`, { allotment_status: newStatus });
      fetchPlots();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update allotment status');
    }
  };

  const filtered = plots.filter(p => {
    const matchSearch = (p.title && p.title.toLowerCase().includes(search.toLowerCase())) ||
                        (p.plot_code && p.plot_code.toLowerCase().includes(search.toLowerCase())) ||
                        (p.owner?.name && p.owner.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || p.allotment_status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plot Allotment Management</h1>
          <p className="text-sm text-gray-500">
            Issue provisional and confirmed allotment letters, track possession milestones and customer allotment records
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plot or assigned client..."
            className="input-field pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'none', 'provisional', 'allotted'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                filterStatus === st ? 'bg-navy text-white shadow-sm' : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Plot Code & Title</th>
                <th className="py-3 px-4">Project & Sector</th>
                <th className="py-3 px-4">Size & Price</th>
                <th className="py-3 px-4">Assigned Client</th>
                <th className="py-3 px-4">Booking Date</th>
                <th className="py-3 px-4 text-center">Allotment Status</th>
                <th className="py-3 px-4 text-center">Action / Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">Loading allotments...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">No plots found matching filter.</td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-navy block">{p.plot_code || `PLOT-${p.id}`}</span>
                      <span className="text-[11px] text-gray-600 font-medium">{p.title}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-gray-900 block">{p.project?.name || 'Sunrise Residency'}</span>
                      <span className="text-[11px] text-gray-500">Sector {p.sector_number || '02'} · Plot No. {p.plot_number || p.id}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-navy block">{p.size_sqft} Sq.ft</span>
                      <span className="text-[11px] text-gray-600 font-bold">₹{Number(p.price).toLocaleString('en-IN')}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {p.owner ? (
                        <>
                          <span className="font-bold text-gray-900 block">{p.owner.name}</span>
                          <span className="text-[11px] text-gray-500">{p.owner.phone}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned (Available)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">
                      {p.booking_date ? new Date(p.booking_date).toLocaleDateString('en-IN') : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        p.allotment_status === 'allotted' ? 'bg-emerald-100 text-emerald-800' :
                        p.allotment_status === 'provisional' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.allotment_status || 'none'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={p.allotment_status || 'none'}
                        onChange={(e) => handleAllotmentChange(p.id, e.target.value)}
                        className="input-field py-1 text-xs w-36 font-semibold"
                      >
                        <option value="none">None</option>
                        <option value="provisional">Provisional</option>
                        <option value="allotted">Confirmed Allotted</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlotAllotment;
