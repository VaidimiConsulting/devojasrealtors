import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Building2, PieChart, Download } from 'lucide-react';
import api from '../../api/axios';

const PlotReports = () => {
  const [reportData, setReportData] = useState({
    projects: [],
    totalRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    plotsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [projRes, txRes, plotRes] = await Promise.all([
          api.get('/projects'),
          api.get('/transactions'),
          api.get('/plots')
        ]);

        const projs = projRes.data.data || [];
        const txs = txRes.data.data || [];
        const plots = plotRes.data.data || [];

        const totalRevenue = txs.reduce((a, t) => a + parseFloat(t.amount || 0), 0);
        const totalCollected = txs.reduce((a, t) => a + parseFloat(t.paid_amount || 0), 0);
        const totalOutstanding = Math.max(0, totalRevenue - totalCollected);

        setReportData({
          projects: projs,
          totalRevenue,
          totalCollected,
          totalOutstanding,
          plotsCount: plots.length
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plot Sales & Inventory Reports</h1>
          <p className="text-sm text-gray-500">
            Comprehensive financial performance, project revenue realization and collection audit
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-navy space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Gross Sales Value</span>
          <span className="text-2xl font-black text-navy block">
            ₹{Number(reportData.totalRevenue).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-gray-500">Total contractual plot sales</span>
        </div>

        <div className="card border-l-4 border-emerald-500 space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Collections Realized</span>
          <span className="text-2xl font-black text-emerald-600 block">
            ₹{Number(reportData.totalCollected).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-emerald-700 font-semibold">Verified customer payments</span>
        </div>

        <div className="card border-l-4 border-red-500 space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Outstanding Dues</span>
          <span className="text-2xl font-black text-red-600 block">
            ₹{Number(reportData.totalOutstanding).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-red-700 font-semibold">Scheduled installments pending</span>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={18} className="text-navy" /> Project-wise Sales Realization
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Total Plots</th>
                <th className="py-3 px-4 text-center">Available</th>
                <th className="py-3 px-4 text-center">Booked / Sold</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">Loading project analytics...</td>
                </tr>
              ) : (
                reportData.projects.map(p => {
                  const counts = p.plot_counts || { total: 0, available: 0, booked: 0, sold: 0 };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-navy">{p.name} ({p.project_id})</td>
                      <td className="py-3 px-4 text-gray-600">{p.location}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{counts.total}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{counts.available}</td>
                      <td className="py-3 px-4 text-center font-bold text-navy">{counts.booked + counts.sold}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlotReports;
