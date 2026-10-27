import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  X,
  LayoutGrid,
  CheckCircle2,
  BookmarkCheck,
  Clock3,
  AlertCircle,
  Radio
} from 'lucide-react';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) return envUrl.replace(/\/+$/, '');
  return 'http://localhost:5000/api';
};

const normalizeStatus = (status) => {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'available' || s === 'approved') return 'Available';
  if (s === 'booked' || s === 'sold') return 'Booked';
  if (s === 'pending' || s === 'under_negotiation') return 'Pending';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Available';
};

const getStatusBadge = (status) => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'Available':
      return {
        label: 'Available',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-500'
      };
    case 'Pending':
      return {
        label: 'Pending',
        classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dot: 'bg-amber-500'
      };
    case 'Booked':
    default:
      return {
        label: 'Booked',
        classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dot: 'bg-rose-500'
      };
  }
};

export default function PlotInventory() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchPlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = getApiBase();
      const url = `${base}/plots/public`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        setPlots(json.data);
        setIsLive(true);
      } else {
        throw new Error('Invalid response structure received from API');
      }
    } catch (err) {
      console.error('Plot inventory fetch error:', err);
      setError(err.message || 'Unable to load live plot inventory');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  // Overall Inventory Counters (computed from authoritative dataset, NOT overwritten by filter)
  const stats = useMemo(() => {
    const total = plots.length;
    const available = plots.filter((p) => normalizeStatus(p.status) === 'Available').length;
    const booked = plots.filter((p) => normalizeStatus(p.status) === 'Booked').length;
    const pending = plots.filter((p) => normalizeStatus(p.status) === 'Pending').length;
    return { total, available, booked, pending };
  }, [plots]);

  // Filtered dataset for table display
  const filteredPlots = useMemo(() => {
    let list = [...plots];

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => normalizeStatus(p.status).toLowerCase() === statusFilter.toLowerCase());
    }

    // Search filter (plot number, plot name/title, and location if present)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const plotNo = String(p.plot_number || '').toLowerCase();
        const title = String(p.title || '').toLowerCase();
        const location = String(p.location || '').toLowerCase();
        const block = String(p.block || '').toLowerCase();
        return (
          plotNo.includes(q) ||
          title.includes(q) ||
          location.includes(q) ||
          block.includes(q)
        );
      });
    }

    return list;
  }, [plots, statusFilter, search]);

  return (
    <div className="page-shell pb-20">
      {/* ── 1. Hero / Banner Section with Real-Estate Aerial Visual ── */}
      <section className="relative overflow-hidden bg-brand-navy pt-28 pb-16 sm:pt-36 sm:pb-24 text-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: "url('/assets/plot_inventory_hero.jpg')" }}
        />

        {/* Balanced Dark Navy Gradient Overlay allowing plot features to shine through */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071A18]/70 via-[#0F2C2A]/55 to-[#071514]/85 pointer-events-none" />

        {/* Hero Content Frame */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-3.5">
            <span className="inline-flex items-center gap-2 border border-brand-gold/50 bg-[#0F2C2A]/80 text-brand-goldLight text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase px-3.5 py-1 rounded-full backdrop-blur-md shadow-sm">
              LIVE PLOT INVENTORY
            </span>

            {/* Subtle live data indicator (only shown when fetch succeeds) */}
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-[#071A18]/85 border border-emerald-500/40 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Live Data
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
            Find Your Ideal Plot in Varanasi
          </h1>

          <p className="mt-3 text-xs sm:text-sm sm:leading-relaxed text-slate-100 max-w-2xl mx-auto font-medium drop-shadow-[0_1px_5px_rgba(0,0,0,0.5)]">
            Explore verified plot availability, layout dimensions, and real-time registry status directly from our central property management system.
          </p>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 space-y-6 relative z-20">

        {/* ── 2. Premium Inventory Summary (3 Authoritative Live Metrics) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center sm:text-left">
            {/* Total Plots */}
            <div className="px-2 sm:px-6 flex flex-col justify-center">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <LayoutGrid className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                <span>Total Plots</span>
              </div>
              <div className="mt-1 text-xl sm:text-3xl font-extrabold text-brand-navy">
                {loading ? '—' : stats.total}
              </div>
            </div>

            {/* Available Plots */}
            <div className="px-2 sm:px-6 flex flex-col justify-center">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 hidden sm:inline" />
                <span>Available</span>
              </div>
              <div className="mt-1 text-xl sm:text-3xl font-extrabold text-emerald-600">
                {loading ? '—' : stats.available}
              </div>
            </div>

            {/* Booked Plots */}
            <div className="px-2 sm:px-6 flex flex-col justify-center">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-rose-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <BookmarkCheck className="w-3.5 h-3.5 text-rose-500 hidden sm:inline" />
                <span>Booked</span>
              </div>
              <div className="mt-1 text-xl sm:text-3xl font-extrabold text-rose-600">
                {loading ? '—' : stats.booked}
              </div>
            </div>
          </div>

          {/* Pending indicator pill if pending records exist */}
          {stats.pending > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end text-[11px] text-amber-700 font-medium gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-amber-500" />
              <span>{stats.pending} plot(s) currently under pending verification.</span>
            </div>
          )}
        </div>

        {/* ── 3. Plot Search and Filter Toolbar ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by plot number or plot name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Buttons & Refresh */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'available', label: 'Available', count: stats.available },
                ...(stats.pending > 0 ? [{ key: 'pending', label: 'Pending', count: stats.pending }] : []),
                { key: 'booked', label: 'Booked', count: stats.booked }
              ].map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-brand-navy text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}

              {/* Refresh / Sync Live Button */}
              <button
                type="button"
                onClick={fetchPlots}
                disabled={loading}
                title="Fetch fresh data from backend"
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-brand-navy bg-slate-50 hover:bg-slate-100 border border-slate-200/80 active:scale-95 transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-brand-gold ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Live</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Serial-Wise Plot Inventory Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {loading ? (
            /* Loading State Skeleton */
            <div className="p-8 sm:p-12 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Syncing live plot inventory...</p>
                <p className="text-xs text-slate-400">Fetching real-time records from central registry</p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-serif">Unable to Load Plot Inventory</h3>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={fetchPlots}
                className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navyLight text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : filteredPlots.length === 0 ? (
            /* Empty State */
            <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-3">
              <p className="text-sm font-semibold text-slate-700">No plots found matching your criteria.</p>
              <p className="text-xs text-slate-400">
                {search || statusFilter !== 'all'
                  ? 'Try clearing your search query or choosing a different status filter.'
                  : 'Currently no plots are available in the public inventory.'}
              </p>
              {(search || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-xs font-bold text-brand-navy hover:text-brand-gold underline underline-offset-4"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            /* Professional Serial-Wise Table (Exact 5 Columns Requested) */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-16 sm:w-20 text-center">
                      S. No.
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-24 sm:w-32">
                      Plot No.
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6">
                      Plot Name
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-32 sm:w-44">
                      Area (sq. ft.)
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-28 sm:w-36 text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPlots.map((plot, index) => {
                    const badge = getStatusBadge(plot.status);
                    const plotNo = plot.plot_number || plot.id;
                    const plotName = plot.title || 'Residential Plot';
                    const area = plot.size_sqft ? Number(plot.size_sqft).toLocaleString('en-IN') : '—';

                    return (
                      <tr
                        key={plot.id || index}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* 1. S. No. */}
                        <td className="py-3.5 px-4 sm:px-6 text-center text-xs text-slate-400 font-mono font-medium">
                          {index + 1}
                        </td>

                        {/* 2. Plot No. */}
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                          {plotNo}
                        </td>

                        {/* 3. Plot Name */}
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-brand-navy">
                          <span>{plotName}</span>
                          {plot.block && (
                            <span className="ml-2 inline-block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                              (Block {plot.block})
                            </span>
                          )}
                        </td>

                        {/* 4. Area (sq. ft.) */}
                        <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                          {area}
                        </td>

                        {/* 5. Status */}
                        <td className="py-3.5 px-4 sm:px-6 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.classes}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer / Counter Info */}
          {!loading && !error && filteredPlots.length > 0 && (
            <div className="bg-slate-50/60 border-t border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Showing <strong>{filteredPlots.length}</strong> of <strong>{plots.length}</strong> live record(s)
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                * Authoritative real-time plot registry status
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
