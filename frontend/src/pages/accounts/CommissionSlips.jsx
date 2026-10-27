import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Download, FileSpreadsheet, Search, Calendar, Building, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

const INR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CommissionSlips = () => {
  const [searchParams] = useSearchParams();
  const initialAssociateId = searchParams.get('associate_id') || '';

  const [associates, setAssociates] = useState([]);
  const [selectedAssociateId, setSelectedAssociateId] = useState(initialAssociateId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slipData, setSlipData] = useState(null);
  const [loading, setLoading] = useState(false);
  const slipRef = useRef();

  // Load associates for selector
  useEffect(() => {
    api.get('/accounts/associates')
      .then((res) => {
        const list = res.data.data || [];
        setAssociates(list);
        if (!selectedAssociateId && list.length > 0) {
          setSelectedAssociateId(list[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch slip data when associate or date changes
  const fetchSlip = async () => {
    if (!selectedAssociateId) return;
    setLoading(true);
    try {
      const params = { associate_id: selectedAssociateId };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.get('/accounts/commission-slips', { params });
      setSlipData(res.data.data);
    } catch (err) {
      console.error('Failed to load slip:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssociateId) {
      fetchSlip();
    }
  }, [selectedAssociateId]);

  const handlePrint = () => {
    const originalTitle = document.title;
    if (header.slip_id) {
      document.title = `${header.slip_id}_${header.associate_name || 'Commission'}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleExportCSV = () => {
    if (!slipData || !slipData.items || slipData.items.length === 0) return;
    const headers = [
      'Tx ID', 'Property Name', 'Plot No', 'Customer Name', 'Booking Ref',
      'Sale Date', 'Commissionable Amount', 'Assigned %', 'Downline %', 'Diff %',
      'Gross Commission', 'Adjustments', 'Net Payable', 'Amount Paid', 'Outstanding', 'Status'
    ];
    const rows = slipData.items.map(it => [
      it.transaction_id,
      `"${it.property_name}"`,
      `"${it.plot_number}"`,
      `"${it.customer_name}"`,
      it.booking_reference,
      it.sale_date,
      it.commissionable_amount,
      it.assigned_rate,
      it.downline_rate,
      it.differential_rate,
      it.gross_commission,
      it.approved_adjustments,
      it.net_payable,
      it.amount_paid,
      it.outstanding_amount,
      it.payment_status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${slipData.header.slip_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const header = slipData?.header || {};
  const items = slipData?.items || [];
  const summary = slipData?.summary || {};

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
      {/* Scoped Print Style to isolate receipt and eliminate margins / clipping */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm 8mm 8mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything except the receipt */
          body * {
            visibility: hidden;
          }
          #commission-slip-receipt, #commission-slip-receipt * {
            visibility: visible;
          }
          #commission-slip-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
            background: #ffffff !important;
          }
          .slip-table-container {
            overflow: visible !important;
            width: 100% !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
          }
          .slip-table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            font-size: 10.5px !important;
          }
          .slip-table th, .slip-table td {
            padding: 5px 5px !important;
            white-space: normal !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Control Bar (Hidden on print) */}
      <div className="print:hidden bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Individual Commission Slip Generator</h1>
            <p className="text-gray-500 text-sm">Printable and auditable multi-level differential commission statements</p>
          </div>
          {slipData && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select Associate</label>
            <select
              value={selectedAssociateId}
              onChange={(e) => setSelectedAssociateId(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
            >
              {associates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.login_id || `DEV-${a.id}`}) — {a.commission_percent ?? a.commissionRate}%
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-navy focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchSlip}
              className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Filter Statement
            </button>
          </div>
        </div>
      </div>

      {/* Printable Slip Container */}
      {loading ? (
        <div className="bg-white rounded-xl p-16 text-center text-gray-400">Generating commission slip...</div>
      ) : !slipData ? (
        <div className="bg-white rounded-xl p-16 text-center text-gray-400">
          Select an associate to generate their individual commission slip.
        </div>
      ) : (
        <div
          id="commission-slip-receipt"
          ref={slipRef}
          className="bg-white p-8 sm:p-10 rounded-xl border border-gray-200 shadow-sm text-gray-800 print:shadow-none print:border-none print:p-0 max-w-5xl mx-auto print:max-w-none print:w-full print:m-0"
        >
          {/* Section 7 Header */}
          <div className="border-b-2 border-navy pb-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Devojas Realtors"
                  className="w-auto h-12 max-h-12 object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <h2 className="text-xl font-black text-navy uppercase tracking-wider">{header.company_name || 'DEVOJAS REALTORS PVT. LTD.'}</h2>
                  <p className="text-xs text-gray-500 font-medium">Real Estate MLM Differential Commission Statement</p>
                </div>
              </div>

              <div className="text-right sm:text-right">
                <span className="inline-block px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded font-mono font-bold text-xs uppercase">
                  {header.slip_id}
                </span>
                <p className="text-xs text-gray-500 mt-1">Issue Date: <strong>{header.issue_date}</strong></p>
                <p className="text-xs text-gray-500">Period: <strong>{header.commission_period}</strong></p>
              </div>
            </div>

            {/* Associate Details Box */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border text-xs">
              <div>
                <span className="text-gray-400 uppercase font-semibold">Associate Name</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{header.associate_name}</p>
              </div>
              <div>
                <span className="text-gray-400 uppercase font-semibold">Associate ID / Code</span>
                <p className="font-bold text-navy font-mono text-sm mt-0.5">{header.associate_id}</p>
              </div>
              <div>
                <span className="text-gray-400 uppercase font-semibold">Assigned Commission Rate</span>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">{header.assigned_rate}%</p>
              </div>
              <div>
                <span className="text-gray-400 uppercase font-semibold">Contact & PAN</span>
                <p className="font-medium text-gray-700 mt-0.5">{header.phone || 'N/A'}</p>
                <p className="text-gray-400 font-mono">{header.pan ? `PAN: ${header.pan}` : ''}</p>
              </div>
            </div>
          </div>

          {/* Section 7 Transaction-wise Table */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
              Transaction-wise Differential Commission Breakdown
            </h3>
            <div className="overflow-x-auto border rounded-lg slip-table-container print:overflow-visible print:border-gray-300 print:w-full">
              <table className="w-full text-xs text-left slip-table">
                <thead className="bg-gray-100 text-gray-700 uppercase font-semibold tracking-wider border-b">
                  <tr>
                    <th className="p-2.5">Deal / Ref</th>
                    <th className="p-2.5">Property & Customer</th>
                    <th className="p-2.5 text-right">Commissionable Amount</th>
                    <th className="p-2.5 text-center">My %</th>
                    <th className="p-2.5 text-center">Downline %</th>
                    <th className="p-2.5 text-center">Diff %</th>
                    <th className="p-2.5 text-right">Gross Comm</th>
                    <th className="p-2.5 text-right">Paid</th>
                    <th className="p-2.5 text-right">Outstanding</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-6 text-center text-gray-400">
                        No transactions found for this associate within the selected period.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50">
                        <td className="p-2.5 font-mono">
                          <p className="font-bold text-blue-700">{row.transaction_ref || `#${row.transaction_id}`}</p>
                          <p className="text-gray-400 text-[10px]">{row.booking_reference}</p>
                        </td>
                        <td className="p-2.5">
                          <p className="font-semibold text-gray-800">{row.property_name}</p>
                          <p className="text-gray-500 text-[10px]">Client: {row.customer_name}</p>
                          {row.level > 0 && (
                            <p className="text-blue-600 text-[10px]">Via Downline: {row.downline_name}</p>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                          {INR(row.commissionable_amount)}
                        </td>
                        <td className="p-2.5 text-center font-bold text-gray-800">
                          {row.assigned_rate}%
                        </td>
                        <td className="p-2.5 text-center text-gray-500">
                          {row.downline_rate ? `${row.downline_rate}%` : '0%'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-navy bg-blue-50/50">
                          {row.differential_rate}%
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {INR(row.gross_commission)}
                        </td>
                        <td className="p-2.5 text-right font-medium text-blue-700 whitespace-nowrap">
                          {INR(row.amount_paid)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-amber-600 whitespace-nowrap">
                          {INR(row.outstanding_amount)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                            row.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            row.payment_status === 'approved' || row.payment_status === 'credited' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {row.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7 Summary Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4 pt-4 border-t-2 border-gray-200 print:break-inside-avoid">
            {/* Differential Formula Policy Notice */}
            <div className="bg-gray-50 p-4 rounded-lg border text-xs space-y-2">
              <h4 className="font-bold text-gray-800 uppercase tracking-wider">Formula Reconciliation & Rules</h4>
              <p className="text-gray-600 leading-relaxed">
                • <strong>Direct Sale:</strong> Commissionable Amount × Seller Commission Rate ÷ 100
              </p>
              <p className="text-gray-600 leading-relaxed">
                • <strong>Upline Differential:</strong> Commissionable Amount × MAX(0, Upline Rate − Next Downline Rate) ÷ 100
              </p>
              <p className="text-gray-600 leading-relaxed">
                • All payout figures are computed on transaction receipts verified by Accounts Department. Reopening this slip does not duplicate ledger entries.
              </p>
            </div>

            {/* Summary Totals Table */}
            <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-100 text-xs space-y-2">
              <h4 className="font-bold text-navy uppercase tracking-wider mb-2">Statement Summary</h4>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-gray-600">Total Commissionable Volume:</span>
                <span className="font-bold text-gray-900 whitespace-nowrap">{INR(summary.total_commissionable_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-gray-600">Total Direct Seller Commission:</span>
                <span className="font-bold text-gray-900 whitespace-nowrap">{INR(summary.total_seller_commission)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-gray-600">Total Upline Differential Commission:</span>
                <span className="font-bold text-gray-900 whitespace-nowrap">{INR(summary.total_upline_commission)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-gray-600">Approved Adjustments / TDS:</span>
                <span className="font-medium text-gray-600 whitespace-nowrap">{INR(summary.total_adjustments || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100 font-bold">
                <span className="text-navy">Total Approved Commission:</span>
                <span className="text-navy whitespace-nowrap">{INR(summary.total_approved_commission)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-emerald-700 font-bold">Total Disbursed / Paid:</span>
                <span className="text-emerald-700 font-bold whitespace-nowrap">{INR(summary.total_paid)}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-black">
                <span className="text-amber-700 uppercase">Remaining Payable Balance:</span>
                <span className="text-amber-700 whitespace-nowrap">{INR(summary.remaining_payable_balance)}</span>
              </div>
            </div>
          </div>

          {/* Signature Footer */}
          <div className="mt-12 pt-6 border-t flex justify-between items-end text-xs text-gray-500 print:mt-8 print:break-inside-avoid">
            <div>
              <p>Generated by: Accounts Department</p>
              <p>System Timestamp: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-gray-400 mb-1"></div>
              <p className="font-semibold text-gray-700">Authorized Financial Signatory</p>
              <p className="text-[10px] text-gray-400">{header.company_name || 'DEVOJAS REALTORS PVT. LTD.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionSlips;
