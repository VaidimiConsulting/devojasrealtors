import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, ArrowRight, FileText, TrendingUp
} from 'lucide-react';
import api from '../../api/axios';

const PlotDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPlots: 0,
    availablePlots: 0,
    bookedPlots: 0,
    soldPlots: 0,
    totalBookedValue: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [plotsRes, bookingRes] = await Promise.all([
          api.get('/plots'),
          api.get('/booking-forms')
        ]);

        const plots = plotsRes.data.data || [];
        const bookings = bookingRes.data.data || [];

        const totalPlots = plots.length;
        const availablePlots = plots.filter(p => p.status === 'available').length;
        const bookedPlots = plots.filter(p => p.status === 'booked').length;
        const soldPlots = plots.filter(p => p.status === 'sold').length;

        // Total Booked Deal Volume from active qualifying bookings (excluding cancelled/rejected)
        const totalBookedValue = bookings
          .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
          .reduce((acc, b) => acc + parseFloat(b.total_plot_price || 0), 0);

        setStats({
          totalPlots,
          availablePlots,
          bookedPlots,
          soldPlots,
          totalBookedValue
        });

        setRecentBookings(bookings.slice(0, 6));
      } catch (err) {
        console.error('Error fetching plot dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plot Management Dashboard</h1>
          <p className="text-sm text-gray-500">
            Real estate inventory overview and recent booking activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/plots/purchasing')}
            className="btn-primary flex items-center gap-2"
          >
            <ShoppingCart size={16} /> Plot Purchasing / Booking
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card border-l-4 border-navy space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Total Inventory</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-navy">{stats.totalPlots}</span>
          </div>
          <span className="text-xs text-gray-400 block">Total registered plot units</span>
        </div>

        <div className="card border-l-4 border-emerald-500 space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Available Units</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-600">{stats.availablePlots}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Ready for Sale
            </span>
          </div>
          <span className="text-xs text-gray-400 block">Open for client booking</span>
        </div>

        <div className="card border-l-4 border-amber-500 space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Booked / Token</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600">{stats.bookedPlots}</span>
            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
              In Progress
            </span>
          </div>
          <span className="text-xs text-gray-400 block">Token amount received</span>
        </div>

        <div className="card border-l-4 border-blue-600 space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Confirmed Sold</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-700">{stats.soldPlots}</span>
            <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
              Transferred
            </span>
          </div>
          <span className="text-xs text-gray-400 block">Full payment completed</span>
        </div>
      </div>

      {/* Financial Summary Banner */}
      <div className="bg-gradient-to-r from-navy via-slate-900 to-blue-950 p-6 sm:p-7 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp size={13} />
              Booked Deal Volume
            </span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
            ₹{Number(stats.totalBookedValue).toLocaleString('en-IN')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Total sales and contract value across active plot bookings and confirmed customer deals
          </p>
        </div>

        <div className="flex items-center sm:self-center">
          <button
            onClick={() => navigate('/accounts/sales')}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 whitespace-nowrap shadow-md shadow-gold/10 hover:shadow-gold/20"
          >
            <span>Accounts Ledger</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-navy" /> Recent Plot Bookings
          </h3>
          <button
            onClick={() => navigate('/booking-forms')}
            className="text-xs text-navy font-bold hover:underline"
          >
            All Applications
          </button>
        </div>

        <div className="space-y-2">
          {recentBookings.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No recent bookings recorded.</p>
          ) : (
            recentBookings.map(b => (
              <div
                key={b.id}
                className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs transition-all"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-gray-900 block">
                    {b.applicant_name} · Plot {b.plot_no || b.plot_code}
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    Ref: {b.booking_ref || `BK-${b.id}`} · {b.project_name || 'Project Site'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-navy block">
                    ₹{Number(b.total_plot_price || 0).toLocaleString('en-IN')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlotDashboard;
