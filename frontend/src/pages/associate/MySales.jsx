import React, { useState, useEffect } from 'react';
import { Search, Home, FileText, CheckCircle2, Clock, User, IndianRupee, ArrowRight, Printer } from 'lucide-react';
import api from '../../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const MySales = () => {
  const [data, setData] = useState({ sales: [], bookingForms: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals'); // 'deals' | 'bookings'
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const res = await api.get('/associate/sales');
        setData(res.data.data || { sales: [], bookingForms: [] });
      } catch (err) {
        console.error('Failed to load associate sales:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  const filteredSales = (data.sales || []).filter(s => {
    const q = search.toLowerCase();
    return (
      (s.transaction_ref && s.transaction_ref.toLowerCase().includes(q)) ||
      (s.plot?.title && s.plot.title.toLowerCase().includes(q)) ||
      (s.buyer?.name && s.buyer.name.toLowerCase().includes(q))
    );
  });

  const filteredBookings = (data.bookingForms || []).filter(b => {
    const q = search.toLowerCase();
    return (
      (b.booking_ref && b.booking_ref.toLowerCase().includes(q)) ||
      (b.applicant_name && b.applicant_name.toLowerCase().includes(q)) ||
      (b.plot?.title && b.plot.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Sales & Plot Bookings</h1>
          <p className="text-sm text-gray-500">
            Track customer deal closures, approval statuses, collections, and commission generation
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'deals' ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Closed Deals ({data.sales?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'bookings' ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Booking Forms ({data.bookingForms?.length || 0})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ref, customer, or plot..."
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {/* Deals View */}
      {activeTab === 'deals' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Deal Ref / Date</th>
                  <th className="py-3 px-4">Plot & Project</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Sale Price</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Deal Status</th>
                  <th className="py-3 px-4 text-right">My Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading sales records...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">No closed deals found yet.</td></tr>
                ) : (
                  filteredSales.map((s) => {
                    const myComm = s.commissions && s.commissions[0];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-navy font-mono block">{s.transaction_ref || `TX-${s.id}`}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(s.deal_date || s.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{s.plot?.title || `Plot #${s.plot_id}`}</span>
                          <span className="text-[10px] text-gray-400">{s.plot?.location}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{s.buyer?.name || 'Customer'}</span>
                          <span className="text-[10px] text-gray-400">{s.buyer?.phone}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-gray-900">
                          {INR(s.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                          {INR(s.paid_amount || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            s.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.payment_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            s.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-navy">
                          {myComm ? INR(myComm.amount) : 'Processing'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings View */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Applicant Name</th>
                  <th className="py-3 px-4">Plot Info</th>
                  <th className="py-3 px-4 text-right">Total Price</th>
                  <th className="py-3 px-4 text-right">Booking Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading booking forms...</td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No booking forms submitted yet.</td></tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy">
                        {b.booking_ref}
                        <span className="block text-[10px] text-gray-400 font-sans">
                          {new Date(b.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{b.applicant_name}</span>
                        <span className="text-[10px] text-gray-400">{b.applicant_phone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{b.plot?.title || `Plot #${b.plot_id}`}</span>
                        <span className="text-[10px] text-gray-400">{b.plot?.size_sqft} Sq.ft</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-gray-900">
                        {INR(b.total_plot_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {INR(b.booking_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-red-600">
                        {INR(b.remaining_balance)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySales;
