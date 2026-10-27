import React, { useState, useEffect } from 'react';
import { XCircle, Search, RefreshCw, AlertTriangle, CheckCircle, IndianRupee } from 'lucide-react';
import api from '../../api/axios';

const PlotCancellations = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundAmt, setRefundAmt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/booking-forms');
      setBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.put(`/booking-forms/${selectedBooking.id}/status`, {
        status: 'cancelled',
        cancellation_reason: cancelReason,
        refund_amount: refundAmt
      });
      setMessage(`Booking #${selectedBooking.booking_ref || selectedBooking.id} cancelled. Plot released to available inventory.`);
      setSelectedBooking(null);
      setCancelReason('');
      setRefundAmt(0);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return (
      (b.booking_ref && b.booking_ref.toLowerCase().includes(q)) ||
      (b.applicant_name && b.applicant_name.toLowerCase().includes(q)) ||
      (b.plot_code && b.plot_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Cancellation and Refunds</h1>
        <p className="text-sm text-gray-500">
          Process booking cancellations, record refunds, and safely return plots to available inventory
        </p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-bold flex items-center gap-2">
          <CheckCircle size={18} /> {message}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search booking ref or applicant..."
            className="input-field pl-9 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Plot & Project</th>
                <th className="py-3 px-4 text-right">Total Price</th>
                <th className="py-3 px-4 text-right">Booking Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">Loading bookings...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">No booking records found.</td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy">
                      {b.booking_ref || `BK-${b.id}`}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {b.applicant_name}
                      <span className="block text-[11px] text-gray-400 font-normal">{b.applicant_phone}</span>
                    </td>
                    <td className="py-3 px-4">
                      {b.project_name} · Plot {b.plot_no || b.plot_code}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      ₹{Number(b.total_plot_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      ₹{Number(b.booking_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.status !== 'cancelled' ? (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setRefundAmt(b.booking_amount || 0);
                          }}
                          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold border border-red-200"
                        >
                          Cancel / Refund
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px] italic">Refunded ₹{Number(b.refund_amount || 0).toLocaleString('en-IN')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle size={18} /> Cancel Booking & Process Refund
              </h3>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><b>Booking:</b> {selectedBooking.booking_ref || `BK-${selectedBooking.id}`}</p>
              <p><b>Client:</b> {selectedBooking.applicant_name}</p>
              <p><b>Plot:</b> Plot {selectedBooking.plot_no} · {selectedBooking.project_name}</p>
              <p><b>Amount Received:</b> ₹{Number(selectedBooking.booking_amount || 0).toLocaleString('en-IN')}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Approved Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmt}
                onChange={e => setRefundAmt(e.target.value)}
                className="input-field text-sm font-bold text-red-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Cancellation Reason</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Client requested cancellation due to personal reasons..."
                className="input-field text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCancelBooking}
                className="btn-danger text-xs flex items-center gap-1.5"
              >
                <XCircle size={14} /> Confirm Cancellation & Release Plot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotCancellations;
