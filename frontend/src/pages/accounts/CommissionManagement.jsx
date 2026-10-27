import React, { useState, useEffect } from "react";
import {
  Percent,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Search,
  Eye,
  Filter,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  User,
  CreditCard,
  Calendar,
  FileText,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import api from "../../api/axios";
import CommissionLedgerTable from "../../components/CommissionLedgerTable";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";

const INR = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CommissionManagement = () => {
  // Main Navigation Tabs
  const [activeTab, setActiveTab] = useState("transfer"); // 'transfer' (Section 5) | 'all_commissions'

  // Tab 1: Associate Search & Transfer State (Section 5)
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [associateMatches, setAssociateMatches] = useState([]);
  const [selectedAssociate, setSelectedAssociate] = useState(null);
  const [associateLedger, setAssociateLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Commission Payment Modal State
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    commission: null,
    amount: "",
    payment_method: "NEFT",
    payment_reference: "",
    payment_date: new Date().toISOString().split("T")[0],
    remarks: "",
    submitting: false,
    errorMessage: "",
    successResult: null,
  });

  // Tab 2: All Commissions State
  const [commissions, setCommissions] = useState([]);
  const [loadingCommissions, setLoadingCommissions] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all, direct, upline
  const [selectedCommissionDetail, setSelectedCommissionDetail] =
    useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    item: null,
    newStatus: "",
    reason: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all commissions for Tab 2
  const fetchCommissions = async () => {
    setLoadingCommissions(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/accounts/commissions", { params });
      setCommissions(res.data.data || []);
    } catch (err) {
      console.error("Failed to load commissions:", err);
    } finally {
      setLoadingCommissions(false);
    }
  };

  useEffect(() => {
    if (activeTab === "all_commissions") {
      fetchCommissions();
    }
  }, [activeTab, statusFilter]);

  // Tab 3: Commission Audit & Reconciliation State
  const [auditRows, setAuditRows] = useState([]);
  const [auditSummary, setAuditSummary] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditStatusFilter, setAuditStatusFilter] = useState("");
  const [reprocessingTxnId, setReprocessingTxnId] = useState(null);
  const [auditNotification, setAuditNotification] = useState(null);

  const fetchAuditReport = async () => {
    setLoadingAudit(true);
    try {
      const params = {};
      if (auditStatusFilter) params.status_filter = auditStatusFilter;
      const res = await api.get("/accounts/commissions/audit", { params });
      if (res.data.success) {
        setAuditRows(res.data.data || []);
        setAuditSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load commission audit report:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditReport();
    }
  }, [activeTab, auditStatusFilter]);

  const handleReprocessCommissions = async (txnId) => {
    setReprocessingTxnId(txnId);
    setAuditNotification(null);
    try {
      const res = await api.post(`/accounts/commissions/reprocess/${txnId}`);
      if (res.data.success) {
        setAuditNotification({ type: "success", message: res.data.message });
        await fetchAuditReport();
      }
    } catch (err) {
      setAuditNotification({
        type: "error",
        message: err.response?.data?.message || "Reprocessing failed",
      });
    } finally {
      setReprocessingTxnId(null);
    }
  };

  // Search associates dynamically as user types (Section 5: Step 2)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setAssociateMatches([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/accounts/commissions/search-associates", {
          params: { q: searchQuery.trim() },
        });
        setAssociateMatches(res.data.data || []);
      } catch (err) {
        console.error("Associate search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Load Associate Ledger when selected (Section 5: Step 4)
  const handleSelectAssociate = async (associate) => {
    setSelectedAssociate(associate);
    setAssociateMatches([]);
    setSearchQuery(`${associate.name} (${associate.login_id})`);
    setLoadingLedger(true);
    try {
      const res = await api.get(
        `/accounts/commissions/associate/${associate.id}`,
      );
      setAssociateLedger(res.data.data);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to load associate commission ledger",
      );
    } finally {
      setLoadingLedger(false);
    }
  };

  // Open Payment Modal for a selected commission (Section 5: Step 5 & 6)
  const openPaymentModal = (comm) => {
    const total = parseFloat(comm.amount || 0);
    const paid = parseFloat(comm.paid_amount || 0);
    const remaining = Math.max(0, total - paid);

    setPaymentModal({
      isOpen: true,
      commission: comm,
      amount: remaining.toFixed(2),
      payment_method: "NEFT",
      payment_reference: `UTR-${Date.now().toString().slice(-6)}`,
      payment_date: new Date().toISOString().split("T")[0],
      remarks: `Commission disbursement for Plot #${comm.transaction?.plot?.plot_number || comm.transaction?.plot_id}`,
      submitting: false,
      errorMessage: "",
      successResult: null,
    });
  };

  // Submit Commission Payment (Section 5: Step 8 & Section 7, 8 controls)
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentModal.commission) return;

    const remaining = Math.max(
      0,
      parseFloat(paymentModal.commission.amount || 0) -
        parseFloat(paymentModal.commission.paid_amount || 0),
    );
    const payAmt = parseFloat(paymentModal.amount || 0);

    // Frontend validation
    if (payAmt <= 0) {
      setPaymentModal((p) => ({
        ...p,
        errorMessage: "Payment amount must be greater than zero.",
      }));
      return;
    }
    if (payAmt > remaining) {
      setPaymentModal((p) => ({
        ...p,
        errorMessage: `Payment amount ${INR(payAmt)} exceeds remaining payable balance of ${INR(remaining)}. Overpayment is strictly rejected.`,
      }));
      return;
    }

    setPaymentModal((p) => ({ ...p, submitting: true, errorMessage: "" }));
    try {
      const res = await api.post("/accounts/commissions/pay", {
        commission_id: paymentModal.commission.id,
        amount: payAmt,
        payment_method: paymentModal.payment_method,
        payment_reference: paymentModal.payment_reference,
        payment_date: paymentModal.payment_date,
        remarks: paymentModal.remarks,
      });

      if (res.data.success) {
        setPaymentModal((p) => ({
          ...p,
          submitting: false,
          successResult: res.data.data,
        }));
        // BUG FIX: main commission table bhi refresh karo (Paid / Remaining / Status)
        fetchCommissions();
        // Refresh Associate Ledger immediately
        if (selectedAssociate) {
          const updatedLedger = await api.get(
            `/accounts/commissions/associate/${selectedAssociate.id}`,
          );
          setAssociateLedger(updatedLedger.data.data);
        }
      }
    } catch (err) {
      setPaymentModal((p) => ({
        ...p,
        submitting: false,
        errorMessage:
          err.response?.data?.message ||
          "Failed to process commission payment.",
      }));
    }
  };

  // Status Action (Approve, Reject, Reverse)
  const handleUpdateStatus = async () => {
    if (!actionModal.item || !actionModal.newStatus) return;
    setActionLoading(true);
    try {
      await api.put(`/accounts/commissions/${actionModal.item.id}/status`, {
        status: actionModal.newStatus,
        reason: actionModal.reason,
      });
      setActionModal({ isOpen: false, item: null, newStatus: "", reason: "" });
      fetchCommissions();
      if (selectedAssociate) {
        const updated = await api.get(
          `/accounts/commissions/associate/${selectedAssociate.id}`,
        );
        setAssociateLedger(updated.data.data);
      }
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to update commission status",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCommissions = commissions.filter((c) => {
    if (typeFilter === "direct") return c.level === 0;
    if (typeFilter === "upline") return c.level > 0;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy/10 text-navy uppercase tracking-wider">
              Accounts & Finance Panel
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              0.01% Precision Guaranteed
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Commission Management & Transfers
          </h1>
          <p className="text-sm text-gray-500">
            Authoritative associate commission verification, differential
            calculation, and ledger transfers.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("transfer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "transfer"
                ? "bg-white shadow text-navy"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Associate Commission Transfer
          </button>
          <button
            onClick={() => setActiveTab("sales_ledger")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "sales_ledger"
                ? "bg-white shadow text-navy"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Sales & Commission Ledger
          </button>
          <button
            onClick={() => setActiveTab("all_commissions")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "all_commissions"
                ? "bg-white shadow text-navy"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            All Commissions & Ledger
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-white shadow text-navy"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Commission Audit & Reconciliation</span>
          </button>
        </div>
      </div>

      {activeTab === "sales_ledger" && (
        <CommissionLedgerTable title="Sales & Commission Ledger" />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ASSOCIATE SEARCH & COMMISSION TRANSFER WORKFLOW (Prompt Section 5) */}
      {/* ========================================================================= */}
      {activeTab === "transfer" && (
        <div className="space-y-6">
          {/* Step 1 & 2: Search Associate Box */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Search size={18} className="text-navy" />
                  Search & Select Associate
                </h2>
                <p className="text-xs text-gray-500">
                  Search by unique Associate Login ID, Name, Phone Number, or
                  Email
                </p>
              </div>
              {selectedAssociate && (
                <button
                  onClick={() => {
                    setSelectedAssociate(null);
                    setAssociateLedger(null);
                    setSearchQuery("");
                  }}
                  className="text-xs text-gray-500 hover:text-red-600 font-bold underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. DEV-0002 or Rahul Sharma or 9876543210..."
                className="input-field pl-10 pr-10 text-sm font-medium"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              {searching && (
                <RefreshCw
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                  size={16}
                />
              )}

              {/* Autocomplete Dropdown */}
              {associateMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 divide-y divide-gray-100 z-50 max-h-60 overflow-y-auto">
                  {associateMatches.map((assoc) => (
                    <div
                      key={assoc.id}
                      onClick={() => handleSelectAssociate(assoc)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">
                          {assoc.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ID:{" "}
                          <b className="text-navy font-mono">
                            {assoc.login_id}
                          </b>{" "}
                          · Ph: {assoc.phone}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800">
                          Rate: {parseFloat(assoc.commission_percent || 0)}%
                        </span>
                        <span className="block text-[11px] text-emerald-600 font-bold mt-0.5">
                          Wallet: {INR(assoc.wallet?.balance || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loadingLedger && (
            <div className="p-12 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-200">
              <RefreshCw className="animate-spin inline-block mr-2" size={20} />
              Loading associate sales and commission ledger...
            </div>
          )}

          {/* Step 4 & 5: Associate Summary & Ledger Details */}
          {selectedAssociate && associateLedger && !loadingLedger && (
            <div className="space-y-6 animate-in fade-in">
              {/* Associate Info & Authoritative Balances */}
              <div className="bg-gradient-to-br from-navy to-slate-900 text-white p-6 rounded-2xl shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-gold text-lg">
                      {associateLedger.associate?.name?.charAt(0) || "A"}
                    </div>
                    <div>
                      <h3 className="text-lg font-black">
                        {associateLedger.associate?.name}
                      </h3>
                      <p className="text-xs text-slate-300">
                        Login ID:{" "}
                        <span className="font-mono font-bold text-gold">
                          {associateLedger.associate?.login_id}
                        </span>{" "}
                        · Phone: {associateLedger.associate?.phone} · Email:{" "}
                        {associateLedger.associate?.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-300 block">
                      Authorized Commission Rate
                    </span>
                    <span className="text-xl font-black text-gold">
                      {parseFloat(
                        associateLedger.associate?.commission_percent || 0,
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                </div>

                {/* 5 Reconciled Balances (Derived from Authoritative Ledger) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 text-center">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 uppercase tracking-wider block">
                      Total Earned
                    </span>
                    <span className="text-base font-extrabold text-white">
                      {INR(associateLedger.summary?.totalEarned)}
                    </span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 uppercase tracking-wider block">
                      Approved Pool
                    </span>
                    <span className="text-base font-extrabold text-blue-300">
                      {INR(associateLedger.summary?.approvedAmount)}
                    </span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 uppercase tracking-wider block">
                      Pending Approval
                    </span>
                    <span className="text-base font-extrabold text-amber-300">
                      {INR(associateLedger.summary?.pendingAmount)}
                    </span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 uppercase tracking-wider block">
                      Total Disbursed
                    </span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {INR(associateLedger.summary?.totalPaid)}
                    </span>
                  </div>
                  <div className="bg-amber-500/20 p-3 rounded-xl border border-amber-400/40">
                    <span className="text-[11px] text-amber-200 uppercase tracking-wider block font-bold">
                      Remaining Payable
                    </span>
                    <span className="text-lg font-black text-amber-400">
                      {INR(associateLedger.summary?.remainingPayable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission Deals & Transactions Table (Section 5: Step 5 & 6) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Approved Sales & Commission Transactions
                    </h3>
                    <p className="text-xs text-gray-400">
                      Select any transaction below to view breakdown or transfer
                      commission
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">
                    {associateLedger.commissions?.length || 0} Transactions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Deal / Plot</th>
                        <th className="py-3 px-4 text-right">Base Price</th>
                        <th className="py-3 px-4 text-right">
                          Actual Sale Price
                        </th>
                        <th className="py-3 px-4 text-right">Eligible Diff</th>
                        <th className="py-3 px-4 text-center">Rate</th>
                        <th className="py-3 px-4 text-right">
                          Calculated Comm
                        </th>
                        <th className="py-3 px-4 text-right">Paid Amount</th>
                        <th className="py-3 px-4 text-right text-amber-600">
                          Remaining Payable
                        </th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {associateLedger.commissions?.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="py-8 text-center text-gray-400 font-medium"
                          >
                            No commission records found for this associate.
                          </td>
                        </tr>
                      ) : (
                        associateLedger.commissions.map((comm) => {
                          const base = parseFloat(
                            comm.base_price ||
                              comm.transaction?.plot?.basic_price ||
                              0,
                          );
                          const sale = parseFloat(
                            comm.sale_price ||
                              comm.transaction?.amount ||
                              comm.base_amount ||
                              0,
                          );
                          const diff = parseFloat(
                            comm.eligible_difference ||
                              (base > 0 && sale >= base ? sale - base : sale),
                          );
                          const total = parseFloat(comm.amount || 0);
                          const paid = parseFloat(comm.paid_amount || 0);
                          const remaining = Math.max(0, total - paid);

                          return (
                            <tr
                              key={comm.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <span className="font-bold text-gray-900 block">
                                  {comm.transaction?.plot?.title ||
                                    `Plot #${comm.transaction?.plot_id}`}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono">
                                  Txn #{comm.transaction_id} · Ref:{" "}
                                  {comm.slip_number ||
                                    comm.transaction?.transaction_ref}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right font-medium text-gray-600">
                                {INR(base)}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-gray-900">
                                {INR(sale)}
                              </td>

                              <td className="py-3 px-4 text-right font-extrabold text-navy">
                                {INR(diff)}
                              </td>

                              <td className="py-3 px-4 text-center font-bold text-gold">
                                {parseFloat(comm.percent || 0)}%
                              </td>

                              <td className="py-3 px-4 text-right font-black text-gray-900">
                                {INR(total)}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-emerald-600">
                                {INR(paid)}
                              </td>

                              <td className="py-3 px-4 text-right font-black text-amber-600">
                                {INR(remaining)}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    comm.status === "paid"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : comm.status === "partial"
                                        ? "bg-blue-100 text-blue-800"
                                        : comm.status === "approved"
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {comm.status}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                {remaining > 0 ? (
                                  <button
                                    onClick={() => openPaymentModal(comm)}
                                    className="px-3 py-1.5 bg-navy hover:bg-navy-light text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-1 mx-auto"
                                  >
                                    <CreditCard size={13} /> Pay
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                                    <CheckCircle size={13} /> Paid
                                  </span>
                                )}
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL COMMISSIONS & APPROVALS (Consolidated Table) */}
      {/* ========================================================================= */}
      {activeTab === "all_commissions" && (
        <div className="space-y-6">
          {/* Status & Type Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "All Statuses", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Partial", value: "partial" },
                { label: "Paid", value: "paid" },
                { label: "Rejected", value: "rejected" },
                { label: "Reversed", value: "reversed" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    statusFilter === tab.value
                      ? "bg-navy text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  typeFilter === "all"
                    ? "bg-white shadow text-navy font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                All Sales
              </button>
              <button
                onClick={() => setTypeFilter("direct")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  typeFilter === "direct"
                    ? "bg-white shadow text-navy font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Direct Sales
              </button>
              <button
                onClick={() => setTypeFilter("upline")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  typeFilter === "upline"
                    ? "bg-white shadow text-navy font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Upline Differentials
              </button>
            </div>
          </div>

          {/* Consolidated Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Deal / Plot</th>
                  <th className="px-4 py-3">Associate</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Eligible Base</th>
                  <th className="px-4 py-3 text-center">Rate</th>
                  <th className="px-4 py-3 text-right">Total Comm</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right text-amber-600">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingCommissions ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400">
                      Loading commissions...
                    </td>
                  </tr>
                ) : filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400">
                      No commission records found.
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((c) => {
                    const total = parseFloat(c.amount || 0);
                    const paid = parseFloat(c.paid_amount || 0);
                    const remaining = Math.max(0, total - paid);

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          <span className="font-bold text-navy block">
                            {c.transaction?.plot?.title ||
                              `Plot #${c.transaction?.plot_id}`}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Deal #{c.transaction_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-800 block">
                            {c.earner?.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {c.earner?.login_id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {c.level === 0 ? "Direct" : `L${c.level} Upline`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {INR(c.eligible_difference || c.base_amount)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gold">
                          {parseFloat(c.percent || 0)}%
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-900">
                          {INR(total)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {INR(paid)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-600">
                          {INR(remaining)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              c.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.status === "partial"
                                  ? "bg-blue-100 text-blue-800"
                                  : c.status === "approved"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {c.status === "pending" && (
                              <button
                                onClick={() =>
                                  setActionModal({
                                    isOpen: true,
                                    item: c,
                                    newStatus: "approved",
                                    reason: "",
                                  })
                                }
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Approve"
                              >
                                <CheckCircle size={15} />
                              </button>
                            )}
                            {remaining > 0 && (
                              <button
                                onClick={() => openPaymentModal(c)}
                                className="px-2 py-0.5 bg-navy text-white rounded text-[11px] font-bold"
                              >
                                Pay
                              </button>
                            )}
                          </div>
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

      {/* ========================================================================= */}
      {/* TAB 3: COMMISSION AUDIT & RECONCILIATION ENGINE (Prompt Section 4)       */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Notification Alert */}
          {auditNotification && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
                auditNotification.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span className="font-semibold">
                  {auditNotification.message}
                </span>
              </div>
              <button
                onClick={() => setAuditNotification(null)}
                className="text-xs font-bold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Audit Summary Metrics */}
          {auditSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Total Audited
                </span>
                <span className="text-xl font-black text-gray-900 mt-1 block">
                  {auditSummary.total_rows || 0}
                </span>
                <span className="text-[10px] text-gray-500">
                  MLM Ledger Records
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Matched
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {auditSummary.matched || 0}
                </span>
                <span className="text-[10px] text-emerald-600">
                  Expected == Posted
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Pending Approval
                </span>
                <span className="text-xl font-black text-blue-700 mt-1 block">
                  {auditSummary.pending_approval || 0}
                </span>
                <span className="text-[10px] text-blue-600">
                  Awaiting Admin Signoff
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                  Pending Payment
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block">
                  {auditSummary.pending_payment || 0}
                </span>
                <span className="text-[10px] text-amber-600">
                  Approved, Unpaid
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-sm">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
                  Underpaid
                </span>
                <span className="text-xl font-black text-red-700 mt-1 block">
                  {auditSummary.underpaid || 0}
                </span>
                <span className="text-[10px] text-red-600">
                  Paid &lt; Expected
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Missing Entries
                </span>
                <span className="text-xl font-black text-purple-700 mt-1 block">
                  {auditSummary.missing || 0}
                </span>
                <span className="text-[10px] text-purple-600">
                  Expected, Not Posted
                </span>
              </div>
            </div>
          )}

          {/* Audit Controls & Status Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700 uppercase">
                Filter by Status:
              </span>
              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                className="input-field text-xs font-bold py-1.5 px-3 max-w-xs"
              >
                <option value="">
                  All Reconciliation Statuses ({auditRows.length})
                </option>
                <option value="Matched">Matched Only</option>
                <option value="Pending Approval">Pending Approval Only</option>
                <option value="Pending Payment">Pending Payment Only</option>
                <option value="Underpaid">Underpaid Only</option>
                <option value="Overpaid">Overpaid Only</option>
                <option value="Missing Ledger Entry">
                  Missing Ledger Entry Only
                </option>
                <option value="Duplicate Entry">Duplicate Entry Only</option>
                <option value="Requires Review">Requires Review Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAuditReport}
                disabled={loadingAudit}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold"
              >
                <RefreshCw
                  size={13}
                  className={loadingAudit ? "animate-spin" : ""}
                />
                <span>Refresh Audit</span>
              </button>
            </div>
          </div>

          {/* Main Reconciliation Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Independent Differential Commission Audit Report
                </h3>
                <p className="text-xs text-gray-500">
                  Live comparison of recalculation from saved hierarchy &amp;
                  rates vs actual posted ledger entries
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-navy/10 text-navy">
                {auditRows.length} Records Analyzed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-600 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3">Sale ID</th>
                    <th className="px-3 py-3">Plot Code</th>
                    <th className="px-3 py-3">Selling Associate</th>
                    <th className="px-3 py-3">Recipient</th>
                    <th className="px-3 py-3 text-right">Eligible Base (₹)</th>
                    <th className="px-3 py-3 text-center">Diff %</th>
                    <th className="px-3 py-3 text-right">Expected (₹)</th>
                    <th className="px-3 py-3 text-right">Posted (₹)</th>
                    <th className="px-3 py-3 text-right">Variance (₹)</th>
                    <th className="px-3 py-3 text-right">Approved (₹)</th>
                    <th className="px-3 py-3 text-right">Paid (₹)</th>
                    <th className="px-3 py-3 text-right">Remaining (₹)</th>
                    <th className="px-3 py-3 text-center">Audit Status</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingAudit ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="py-12 text-center text-gray-400"
                      >
                        <RefreshCw
                          size={24}
                          className="animate-spin mx-auto mb-2 text-navy"
                        />
                        Auditing sales and calculating differential
                        distributions...
                      </td>
                    </tr>
                  ) : auditRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="py-12 text-center text-gray-400"
                      >
                        No transactions found matching the audit filter.
                      </td>
                    </tr>
                  ) : (
                    auditRows.map((row, idx) => {
                      const isMatched = row.status === "Matched";
                      const isUnderpaid = row.status === "Underpaid";
                      const isOverpaid = row.status === "Overpaid";
                      const isMissing = row.status === "Missing Ledger Entry";
                      const isPendingApp = row.status === "Pending Approval";
                      const isPendingPay = row.status === "Pending Payment";
                      const isReview =
                        row.status === "Requires Review" ||
                        row.status === "Duplicate Entry";

                      const statusBadgeClass = isMatched
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : isPendingApp
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : isPendingPay
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : isUnderpaid
                              ? "bg-red-100 text-red-800 border-red-200 font-black"
                              : isOverpaid
                                ? "bg-orange-100 text-orange-800 border-orange-200 font-black"
                                : isMissing
                                  ? "bg-purple-100 text-purple-800 border-purple-200 font-bold"
                                  : "bg-rose-100 text-rose-800 border-rose-200 font-bold";

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-3 py-3 font-mono font-bold text-navy">
                            #{row.sale_id}
                          </td>
                          <td className="px-3 py-3 font-semibold text-gray-800">
                            {row.plot_code || `Plot #${row.plot_id}`}
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-semibold block text-gray-900">
                              {row.selling_associate?.name || "—"}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {row.selling_associate?.login_id}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-bold block text-gray-900">
                              {row.commission_recipient?.name || "—"}
                            </span>
                            <span className="text-[10px] text-navy font-mono">
                              {row.commission_recipient?.login_id}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-medium">
                            {INR(row.eligible_difference)}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-gold">
                            {parseFloat(row.expected_percent || 0)}%
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-gray-900">
                            {INR(row.expected_commission)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-blue-900">
                            {INR(row.posted_commission)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-black ${
                              row.variance === 0
                                ? "text-gray-400"
                                : row.variance > 0
                                  ? "text-orange-600"
                                  : "text-red-600"
                            }`}
                          >
                            {row.variance > 0
                              ? `+${INR(row.variance)}`
                              : INR(row.variance)}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-purple-700">
                            {INR(row.approved_amount)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-emerald-600">
                            {INR(row.paid_amount)}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-amber-600">
                            {INR(row.remaining_payable)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] uppercase border inline-block ${statusBadgeClass}`}
                            >
                              {row.status}
                            </span>
                            {row.flag_reason && (
                              <span
                                className="block text-[9px] text-red-600 mt-0.5"
                                title={row.flag_reason}
                              >
                                ⚠️ {row.flag_reason.slice(0, 20)}...
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isMissing || isUnderpaid ? (
                              <button
                                onClick={() =>
                                  handleReprocessCommissions(row.sale_id)
                                }
                                disabled={reprocessingTxnId === row.sale_id}
                                className="px-2 py-1 bg-navy text-white rounded text-[10px] font-bold hover:bg-navy/80 disabled:opacity-50"
                                title="Reprocess commissions for this sale"
                              >
                                {reprocessingTxnId === row.sale_id
                                  ? "Fixing..."
                                  : "Reprocess"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                ✓ Verified
                              </span>
                            )}
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
      )}

      {/* ========================================================================= */}
      {/* COMMISSION PAYMENT MODAL (Section 5: Step 7, 8, 9 & Section 8 Financial Controls) */}
      {/* ========================================================================= */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-navy text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <CreditCard size={18} className="text-gold" />
                  Commission Transfer & Disbursement
                </h3>
                <p className="text-xs text-slate-300">
                  Process official payment to associate's commission ledger
                </p>
              </div>
              <button
                onClick={() =>
                  setPaymentModal((p) => ({
                    ...p,
                    isOpen: false,
                    successResult: null,
                  }))
                }
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Success View */}
            {paymentModal.successResult ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900">
                    Commission Transfer Successful!
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Payment reference:{" "}
                    <b className="font-mono text-navy">
                      {paymentModal.successResult.payment?.payment_ref}
                    </b>
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Transferred:</span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">
                      {INR(paymentModal.successResult.payment?.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remaining Balance:</span>
                    <span className="font-bold text-amber-600 font-mono">
                      {INR(
                        paymentModal.successResult.commission?.remaining_amount,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-bold uppercase text-navy">
                      {paymentModal.successResult.commission?.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPaymentModal((p) => ({
                      ...p,
                      isOpen: false,
                      successResult: null,
                    }))
                  }
                  className="btn-primary w-full py-2.5 text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Payment Form */
              <form
                onSubmit={handleSubmitPayment}
                className="p-6 space-y-4 text-xs"
              >
                {paymentModal.errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{paymentModal.errorMessage}</span>
                  </div>
                )}

                {/* Calculation Breakdown Banner */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-gray-400 block font-semibold text-[10px] uppercase">
                      Calculated Commission
                    </span>
                    <span className="font-black text-gray-900 text-sm">
                      {INR(paymentModal.commission?.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold text-[10px] uppercase">
                      Remaining Payable
                    </span>
                    <span className="font-black text-amber-600 text-sm">
                      {INR(
                        Math.max(
                          0,
                          parseFloat(paymentModal.commission?.amount || 0) -
                            parseFloat(
                              paymentModal.commission?.paid_amount || 0,
                            ),
                        ),
                      )}
                    </span>
                  </div>
                </div>

                {/* Payment Amount Input */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Payment Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentModal.amount}
                    onChange={(e) =>
                      setPaymentModal((p) => ({ ...p, amount: e.target.value }))
                    }
                    className="input-field text-base font-black text-navy"
                    placeholder="Enter amount..."
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Exact decimal amounts allowed. Cannot exceed remaining
                    payable balance.
                  </span>
                </div>

                {/* Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentModal.payment_method}
                      onChange={(e) =>
                        setPaymentModal((p) => ({
                          ...p,
                          payment_method: e.target.value,
                        }))
                      }
                      className="input-field text-xs font-semibold"
                    >
                      <option value="NEFT">NEFT / Bank Transfer</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash Ledger</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentModal.payment_date}
                      onChange={(e) =>
                        setPaymentModal((p) => ({
                          ...p,
                          payment_date: e.target.value,
                        }))
                      }
                      className="input-field text-xs"
                    />
                  </div>
                </div>

                {/* Reference ID / UTR */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Bank Reference / UTR / Transaction ID{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentModal.payment_reference}
                    onChange={(e) =>
                      setPaymentModal((p) => ({
                        ...p,
                        payment_reference: e.target.value,
                      }))
                    }
                    className="input-field text-xs font-mono"
                    placeholder="e.g. UTR-98217349182"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Remarks & Notes
                  </label>
                  <textarea
                    rows={2}
                    value={paymentModal.remarks}
                    onChange={(e) =>
                      setPaymentModal((p) => ({
                        ...p,
                        remarks: e.target.value,
                      }))
                    }
                    className="input-field text-xs"
                    placeholder="Mandatory notes or memo..."
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentModal((p) => ({ ...p, isOpen: false }))
                    }
                    className="btn-secondary py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentModal.submitting}
                    className="btn-primary py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    {paymentModal.submitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />{" "}
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} /> Authorize & Transfer
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Action Status Modal (Approve / Reject / Dispute) */}
      {actionModal.isOpen && (
        <Modal
          isOpen={actionModal.isOpen}
          onClose={() =>
            setActionModal({
              isOpen: false,
              item: null,
              newStatus: "",
              reason: "",
            })
          }
          title={`Confirm ${actionModal.newStatus.toUpperCase()}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to mark Commission{" "}
              <b>#{actionModal.item?.id}</b> ({INR(actionModal.item?.amount)})
              as <b>{actionModal.newStatus}</b>?
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason / Notes (Optional)
              </label>
              <textarea
                value={actionModal.reason}
                onChange={(e) =>
                  setActionModal((m) => ({ ...m, reason: e.target.value }))
                }
                rows={2}
                className="input-field text-sm"
                placeholder="Enter mandatory reason if rejecting or reversing..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    item: null,
                    newStatus: "",
                    reason: "",
                  })
                }
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleUpdateStatus}
                className="btn-primary text-sm font-bold capitalize"
              >
                {actionLoading
                  ? "Updating..."
                  : `Confirm ${actionModal.newStatus}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CommissionManagement;
