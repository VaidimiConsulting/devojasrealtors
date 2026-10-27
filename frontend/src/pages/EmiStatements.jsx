import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { useReactToPrint } from "react-to-print";
import {
  Printer, X, FileText, Search, CheckCircle2, Clock,
  Plus, ChevronDown, ChevronUp, IndianRupee,
  CreditCard, RefreshCw, AlertTriangle, Building2, User, Phone, MapPin, Hash
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inr = (val) =>
  "₹" + parseFloat(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_STYLE = {
  paid:    { bg: "#dcfce7", text: "#15803d", border: "#22c55e" },
  overdue: { bg: "#fee2e2", text: "#b91c1c", border: "#ef4444" },
  pending: { bg: "#fef9c3", text: "#92400e", border: "#f59e0b" },
};

const getLiveStatus = (inst) => {
  if (inst.status === "paid") return "paid";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(inst.due_date); due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  return "pending";
};

// ─── PRINT STATEMENT (white paper) ───────────────────────────────────────────
const PrintStatement = React.forwardRef(({ plan }, ref) => {
  const installments = (plan.installments || []).sort((a, b) => a.month_number - b.month_number);
  const paidAmt = installments.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
  const pendingAmt = installments.filter(i => i.status !== "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
  const associate = plan.transaction?.sellerAssociate || {};
  const buyer = plan.transaction?.buyer || {};
  const plot = plan.transaction?.plot || {};

  return (
    <div ref={ref} style={{ fontFamily: "'Segoe UI',Arial,sans-serif", padding: "40px", maxWidth: "900px", margin: "0 auto", color: "#1a1a2e", background: "#fff" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "4px solid #D4AF37", paddingBottom: "20px", marginBottom: "28px" }}>
        <div>
          <img src="/logo.png" alt="Devojas Realtors" style={{ height: "60px", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
          <h2 style={{ margin: "8px 0 2px", fontSize: "20px", fontWeight: 700, color: "#0b1437" }}>Devojas Realtors Pvt. Ltd.</h2>
          <p style={{ margin: 0, color: "#666", fontSize: "12px" }}>Real Estate Management | India</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "#0b1437", color: "#D4AF37", padding: "8px 18px", borderRadius: "8px", fontWeight: 800, fontSize: "20px", letterSpacing: "2px", marginBottom: "8px" }}>EMI STATEMENT</div>
          <p style={{ margin: "3px 0", fontSize: "13px", fontWeight: 600 }}>Statement ID: <span style={{ color: "#D4AF37" }}>#EMI-{plan.id}</span></p>
          <p style={{ margin: "3px 0", fontSize: "13px" }}>Date: {fmt(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "24px" }}>
        {/* Associate */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
          <div style={{ background: "#0b1437", color: "#D4AF37", padding: "5px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "12px", marginBottom: "10px", textTransform: "uppercase" }}>Associate Details</div>
          <PRow label="Name" value={associate.name || "N/A"} />
          <PRow label="Associate ID" value={associate.login_id || "N/A"} />
          <PRow label="Phone" value={associate.phone || "N/A"} />
          <PRow label="Email" value={associate.email || "N/A"} />
        </div>
        {/* Client & Plot */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
          <div style={{ background: "#0b1437", color: "#D4AF37", padding: "5px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "12px", marginBottom: "10px", textTransform: "uppercase" }}>Client & Plot Details</div>
          <PRow label="Client Name" value={buyer.name || "N/A"} />
          <PRow label="Client Phone" value={buyer.phone || "N/A"} />
          <PRow label="Plot No." value={plot.plot_number || "N/A"} />
          <PRow label="Total Price" value={inr(plan.total_amount)} />
          <PRow label="Down Payment" value={inr(plan.down_payment)} />
          <PRow label="Monthly EMI" value={inr(plan.monthly_amount)} />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
        {[
          { l: "Total EMI Amount", v: inr(parseFloat(plan.total_amount) - parseFloat(plan.down_payment || 0)), c: "#0b1437" },
          { l: "Amount Collected", v: inr(paidAmt), c: "#15803d" },
          { l: "Balance Remaining", v: inr(pendingAmt), c: "#b91c1c" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ border: `2px solid ${c}`, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>{l}</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: c }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <h3 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 700, color: "#0b1437", borderBottom: "2px solid #D4AF37", paddingBottom: "5px" }}>EMI Schedule — Month-wise Breakup</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "24px" }}>
        <thead>
          <tr style={{ background: "#0b1437", color: "#D4AF37" }}>
            {["#", "Due Date", "EMI Amount", "Paid", "Balance", "Status", "Paid On"].map(h => (
              <th key={h} style={{ padding: "9px 10px", textAlign: h === "#" ? "center" : "left", border: "1px solid #1e3a8a" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {installments.map((inst, idx) => {
            const ls = getLiveStatus(inst);
            const sc = STATUS_STYLE[ls];
            const paid2 = parseFloat(inst.paid_amount || (inst.status === "paid" ? inst.amount : 0));
            const bal = parseFloat(inst.amount) - paid2;
            return (
              <tr key={inst.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #e2e8f0", fontWeight: 700 }}>{inst.month_number}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #e2e8f0" }}>{fmt(inst.due_date)}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #e2e8f0", fontWeight: 600 }}>{inr(inst.amount)}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #e2e8f0", color: "#15803d" }}>{paid2 > 0 ? inr(paid2) : "—"}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #e2e8f0", color: "#b91c1c" }}>{bal > 0 ? inr(bal) : "—"}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ background: sc.bg, color: sc.text, padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{ls}</span>
                </td>
                <td style={{ padding: "8px 10px", border: "1px solid #e2e8f0", color: "#64748b" }}>{inst.paid_on ? fmt(inst.paid_on) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan="2" style={{ padding: "9px 10px", border: "1px solid #e2e8f0", textAlign: "right" }}>TOTAL</td>
            <td style={{ padding: "9px 10px", border: "1px solid #e2e8f0" }}>{inr(installments.reduce((s, i) => s + parseFloat(i.amount), 0))}</td>
            <td style={{ padding: "9px 10px", border: "1px solid #e2e8f0", color: "#15803d" }}>{inr(paidAmt)}</td>
            <td style={{ padding: "9px 10px", border: "1px solid #e2e8f0", color: "#b91c1c" }}>{inr(pendingAmt)}</td>
            <td colSpan="2" style={{ border: "1px solid #e2e8f0" }}></td>
          </tr>
        </tfoot>
      </table>

      <div style={{ borderTop: "2px solid #D4AF37", paddingTop: "14px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
        <p style={{ margin: "0 0 3px" }}>This is a computer-generated statement and does not require a physical signature.</p>
        <p style={{ margin: 0 }}>For discrepancies, contact accounts@devojas.com | Devojas Realtors Pvt. Ltd.</p>
      </div>
    </div>
  );
});

const PRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
    <span style={{ color: "#64748b" }}>{label}</span>
    <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{value}</span>
  </div>
);

// ─── Shared styles for light-mode UI ─────────────────────────────────────────
const C = {
  // Card
  card: { background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  // Table header
  th: { padding: "11px 14px", textAlign: "left", color: "#475569", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0", background: "#f8fafc", whiteSpace: "nowrap" },
  // Table cell
  td: { padding: "11px 14px", color: "#1e293b", fontSize: "13px", borderBottom: "1px solid #f1f5f9" },
  // Label
  label: { display: "block", color: "#64748b", fontSize: "11px", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" },
  // Input inside dark modal
  inp: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "white", boxSizing: "border-box", fontSize: "14px", outline: "none" },
};

// ─── Stat Card (light mode) ───────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div style={{ ...C.card, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{value}</p>
      <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{label}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: "11px", color, fontWeight: 600 }}>{sub}</p>}
    </div>
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const sc = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{status}</span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const EmiStatements = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Create Modal ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [eligibleTxns, setEligibleTxns] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [addForm, setAddForm] = useState({ down_payment: "", num_months: "12", start_date: new Date().toISOString().split("T")[0] });
  const [adding, setAdding] = useState(false);

  // ── Pay Modal ──
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount_paid: "", paid_on: new Date().toISOString().split("T")[0] });
  const [paying, setPaying] = useState(false);

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedPlan ? `EMI_Statement_${selectedPlan.id}` : "EMI_Statement",
  });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/emi-plans");
      if (res.data.success) setPlans(res.data.data);
    } catch (err) {
      setError("Failed to load EMI plans. " + (err.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  const fetchEligibleTxns = async () => {
    try {
      setLoadingTxns(true); setTxnError("");
      const res = await api.get("/emi-eligible-transactions");
      if (res.data.success) setEligibleTxns(res.data.data);
    } catch (err) {
      setTxnError("Could not load transactions: " + (err.response?.data?.message || err.message));
    } finally { setLoadingTxns(false); }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setSelectedTxn(null);
    setAddForm({ down_payment: "", num_months: "12", start_date: new Date().toISOString().split("T")[0] });
    fetchEligibleTxns();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTxn) { alert("Please select a transaction first"); return; }
    setAdding(true);
    try {
      await api.post(`/transactions/${selectedTxn.id}/emi`, {
        down_payment: parseFloat(addForm.down_payment) || 0,
        num_months: parseInt(addForm.num_months),
        start_date: addForm.start_date,
      });
      setShowAddModal(false);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating EMI plan");
    } finally { setAdding(false); }
  };

  const openPayModal = (inst) => {
    const remaining = parseFloat(inst.amount) - parseFloat(inst.paid_amount || 0);
    setPayModal(inst);
    setPayForm({ amount_paid: remaining.toFixed(2), paid_on: new Date().toISOString().split("T")[0] });
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payModal) return;
    setPaying(true);
    try {
      await api.put(`/emi/installments/${payModal.id}/pay`, {
        amount_paid: parseFloat(payForm.amount_paid),
        paid_on: payForm.paid_on,
      });
      setPayModal(null);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || "Error recording payment");
    } finally { setPaying(false); }
  };

  // Live EMI preview
  const txnTotal = selectedTxn ? parseFloat(selectedTxn.amount) : 0;
  const txnPaid = selectedTxn ? parseFloat(selectedTxn.paid_amount || 0) : 0;
  const downPay = parseFloat(addForm.down_payment) || 0;
  const emiBalance = txnTotal - txnPaid - downPay;
  const monthlyEmi = addForm.num_months > 0 && emiBalance > 0 ? Math.round((emiBalance / parseInt(addForm.num_months)) * 100) / 100 : 0;

  // Stats
  const totalInstallments = plans.reduce((s, p) => s + (p.installments?.length || 0), 0);
  const paidInstallments = plans.reduce((s, p) => s + (p.installments?.filter(i => i.status === "paid").length || 0), 0);
  const overdueCount = plans.reduce((s, p) => s + (p.installments?.filter(i => getLiveStatus(i) === "overdue").length || 0), 0);
  const totalEmiValue = plans.reduce((s, p) => s + (parseFloat(p.total_amount) - parseFloat(p.down_payment || 0)), 0);

  // Filter
  const filtered = plans.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      p.transaction?.sellerAssociate?.name?.toLowerCase().includes(q) ||
      p.transaction?.buyer?.name?.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      p.transaction?.plot?.plot_number?.toLowerCase().includes(q) ||
      p.transaction?.buyer?.phone?.includes(q);
    if (!matchQ) return false;
    if (filterStatus === "completed") return p.installments?.every(i => i.status === "paid");
    if (filterStatus === "active") return p.installments?.some(i => i.status !== "paid");
    if (filterStatus === "overdue") return p.installments?.some(i => getLiveStatus(i) === "overdue");
    return true;
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>EMI Statements</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
            View, manage and print complete EMI schedules — record monthly installment payments
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Search size={15} color="#94a3b8" />
            <input placeholder="Search name, plot, phone…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#1e293b", fontSize: "13px", width: "200px" }} />
          </div>
          {/* Filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "9px 12px", color: "#374151", fontSize: "13px", cursor: "pointer", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <option value="all">All Plans</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
          {/* Refresh */}
          <button onClick={fetchPlans} title="Refresh"
            style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "9px 12px", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <RefreshCw size={15} />
          </button>
          {/* Create */}
          <button onClick={openAddModal}
            style={{ background: "linear-gradient(135deg, #D4AF37, #c9a227)", color: "#0b1437", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(212,175,55,0.3)" }}>
            <Plus size={16} /> Create EMI Plan
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", color: "#b91c1c", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard label="Total EMI Plans" value={plans.length} icon={FileText} color="#3b82f6" />
        <StatCard label="Total EMI Value" value={inr(totalEmiValue)} icon={IndianRupee} color="#D4AF37" />
        <StatCard label="Installments Paid" value={`${paidInstallments} / ${totalInstallments}`} icon={CheckCircle2} color="#22c55e"
          sub={totalInstallments > 0 ? `${Math.round((paidInstallments / totalInstallments) * 100)}% complete` : "No installments yet"} />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} color="#ef4444"
          sub={overdueCount > 0 ? "Require immediate attention" : "✓ All on time"} />
      </div>

      {/* ── Plans Table ── */}
      <div style={{ ...C.card, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={17} color="#D4AF37" />
          <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "15px" }}>EMI Plans ({filtered.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <Clock size={36} style={{ opacity: 0.4, marginBottom: "12px" }} />
            <p style={{ margin: 0 }}>Loading EMI plans…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No EMI plans found.</p>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>Click "Create EMI Plan" to get started.</p>
          </div>
        ) : (
          <div>
            {filtered.map((p) => {
              const installments = (p.installments || []).sort((a, b) => a.month_number - b.month_number);
              const paidCount = installments.filter(i => i.status === "paid").length;
              const overdueInst = installments.filter(i => getLiveStatus(i) === "overdue").length;
              const total = installments.length;
              const progress = total > 0 ? Math.round((paidCount / total) * 100) : 0;
              const isExpanded = expandedPlanId === p.id;
              const assoc = p.transaction?.sellerAssociate || {};
              const buyer = p.transaction?.buyer || {};
              const plot = p.transaction?.plot || {};
              const paidValue = installments.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
              const balanceValue = parseFloat(p.total_amount) - parseFloat(p.down_payment || 0) - paidValue;

              return (
                <div key={p.id}>
                  {/* ── Plan Row ── */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px", cursor: "pointer", borderBottom: isExpanded ? "none" : "1px solid #f1f5f9", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={() => setExpandedPlanId(isExpanded ? null : p.id)}
                  >
                    {/* Expand icon */}
                    <div style={{ color: "#94a3b8", flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>

                    {/* ID */}
                    <div style={{ minWidth: "56px" }}>
                      <span style={{ color: "#D4AF37", fontWeight: 800, fontSize: "14px" }}>#{p.id}</span>
                    </div>

                    {/* Associate */}
                    <div style={{ flex: 1, minWidth: "130px" }}>
                      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: "13px" }}>{assoc.name || "N/A"}</div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>{assoc.login_id || ""}</div>
                    </div>

                    {/* Client */}
                    <div style={{ flex: 1, minWidth: "130px" }}>
                      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: "13px" }}>{buyer.name || "N/A"}</div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>{plot.plot_number ? `Plot: ${plot.plot_number}` : buyer.phone || ""}</div>
                    </div>

                    {/* Monthly EMI */}
                    <div style={{ minWidth: "110px" }}>
                      <div style={{ color: "#D4AF37", fontWeight: 700, fontSize: "13px" }}>{inr(p.monthly_amount)}<span style={{ color: "#94a3b8", fontWeight: 400 }}>/mo</span></div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>{p.num_months} months</div>
                    </div>

                    {/* Balance */}
                    <div style={{ minWidth: "120px" }}>
                      <div style={{ color: balanceValue > 0 ? "#ef4444" : "#22c55e", fontWeight: 700, fontSize: "13px" }}>{inr(balanceValue)}</div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>remaining</div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "#22c55e" : overdueInst > 0 ? "#ef4444" : "#D4AF37", borderRadius: "3px", transition: "width 0.4s" }} />
                        </div>
                        <span style={{ color: "#64748b", fontSize: "11px", whiteSpace: "nowrap" }}>{paidCount}/{total}</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: 600 }}>{paidCount} paid</span>
                        {overdueInst > 0 && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>{overdueInst} overdue</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedPlan(p)}
                        style={{ background: "#fff", color: "#0b1437", border: "1px solid #D4AF37", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600, fontSize: "12px" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#fef9c3"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                        <Printer size={13} /> Print
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Installments ── */}
                  {isExpanded && (
                    <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                      {/* Mini summary */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
                        {[
                          { l: "Total EMI Value", v: inr(parseFloat(p.total_amount) - parseFloat(p.down_payment || 0)), c: "#3b82f6" },
                          { l: "Collected", v: inr(paidValue), c: "#22c55e" },
                          { l: "Outstanding", v: inr(balanceValue), c: "#ef4444" },
                          { l: "Down Payment", v: inr(p.down_payment), c: "#D4AF37" },
                        ].map(({ l, v, c }) => (
                          <div key={l} style={{ background: "#fff", border: `1px solid ${c}33`, borderRadius: "10px", padding: "10px 14px" }}>
                            <p style={{ margin: "0 0 3px", fontSize: "11px", color: "#64748b" }}>{l}</p>
                            <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: c }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Installment table */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr>
                              {["#", "Due Date", "EMI Amount", "Paid", "Balance", "Status", "Paid On", "Action"].map(h => (
                                <th key={h} style={{ ...C.th, textAlign: h === "#" ? "center" : "left" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {installments.map((inst) => {
                              const ls = getLiveStatus(inst);
                              const paid2 = parseFloat(inst.paid_amount || (inst.status === "paid" ? inst.amount : 0));
                              const bal = parseFloat(inst.amount) - paid2;
                              const canPay = inst.status !== "paid";

                              return (
                                <tr key={inst.id}
                                  style={{ background: "#fff", borderBottom: "1px solid #f1f5f9" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                  <td style={{ ...C.td, textAlign: "center", color: "#64748b", fontWeight: 700 }}>{inst.month_number}</td>
                                  <td style={C.td}>{fmt(inst.due_date)}</td>
                                  <td style={{ ...C.td, fontWeight: 600 }}>{inr(inst.amount)}</td>
                                  <td style={{ ...C.td, color: paid2 > 0 ? "#15803d" : "#94a3b8", fontWeight: 600 }}>{paid2 > 0 ? inr(paid2) : "—"}</td>
                                  <td style={{ ...C.td, color: bal > 0 ? "#ef4444" : "#94a3b8", fontWeight: 600 }}>{bal > 0 ? inr(bal) : "—"}</td>
                                  <td style={C.td}><Badge status={ls} /></td>
                                  <td style={{ ...C.td, color: "#64748b" }}>{inst.paid_on ? fmt(inst.paid_on) : "—"}</td>
                                  <td style={C.td}>
                                    {canPay ? (
                                      <button onClick={() => openPayModal(inst)}
                                        style={{ background: ls === "overdue" ? "#fee2e2" : "#dcfce7", color: ls === "overdue" ? "#b91c1c" : "#15803d", border: `1px solid ${ls === "overdue" ? "#fca5a5" : "#86efac"}`, padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontWeight: 600, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                                        <CreditCard size={12} /> Record Payment
                                      </button>
                                    ) : (
                                      <span style={{ color: "#15803d", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                                        <CheckCircle2 size={13} /> Paid
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PRINT MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      {selectedPlan && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "960px", height: "90vh", borderRadius: "16px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", background: "#0b1437", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={18} color="#D4AF37" />
                <span style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>EMI Statement — #{selectedPlan.id}</span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handlePrint}
                  style={{ background: "#D4AF37", color: "#0b1437", border: "none", padding: "8px 18px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px" }}>
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button onClick={() => setSelectedPlan(null)}
                  style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <X size={15} /> Close
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
              <PrintStatement ref={printRef} plan={selectedPlan} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE EMI PLAN MODAL  (DARK)
      ══════════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={() => setShowAddModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} />
          <div style={{
            position: "relative", background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: "20px", border: "1px solid rgba(212,175,55,0.25)",
            width: "100%", maxWidth: "620px", padding: "28px", zIndex: 110,
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)", maxHeight: "92vh", overflowY: "auto"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px" }}>
              <div>
                <h3 style={{ margin: 0, color: "white", fontSize: "20px", fontWeight: 800 }}>Create New EMI Plan</h3>
                <p style={{ margin: "5px 0 0", color: "rgba(148,163,184,0.7)", fontSize: "13px" }}>Select a booking transaction and set the installment schedule</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* ── Transaction Dropdown ── */}
              <div>
                <label style={{ ...C.label, color: "#94a3b8" }}>Select Booking / Transaction *</label>
                {loadingTxns ? (
                  <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", color: "#94a3b8", fontSize: "13px" }}>
                    Loading eligible transactions…
                  </div>
                ) : txnError ? (
                  <div style={{ padding: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px" }}>
                    ⚠️ {txnError}
                  </div>
                ) : eligibleTxns.length === 0 ? (
                  <div style={{ padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>
                    No eligible transactions found. All bookings may already have EMI plans or are fully paid.
                  </div>
                ) : (
                  <select
                    value={selectedTxn?.id || ""}
                    onChange={e => {
                      const txn = eligibleTxns.find(t => String(t.id) === e.target.value);
                      setSelectedTxn(txn || null);
                      setAddForm(prev => ({ ...prev, down_payment: "" }));
                    }}
                    style={{ ...C.inp }}
                  >
                    <option value="">— Select a transaction —</option>
                    {eligibleTxns.map(t => (
                      <option key={t.id} value={t.id}>
                        #{t.id} | {t.buyer?.name || "Client?"} | Plot: {t.plot?.plot_number || "N/A"} | {inr(t.amount)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* ── Selected Transaction Full Details ── */}
              {selectedTxn && (
                <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "14px", padding: "18px" }}>
                  <p style={{ margin: "0 0 14px", color: "#D4AF37", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    📋 Booking / Transaction Details
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                    {/* Client Section */}
                    <div style={{ paddingRight: "16px", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                      <p style={{ margin: "0 0 8px", color: "rgba(148,163,184,0.5)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                        <User size={10} style={{ display: "inline", marginRight: "4px" }} />Client Details
                      </p>
                      {[
                        ["Name", selectedTxn.buyer?.name || "N/A"],
                        ["Client ID", selectedTxn.buyer?.login_id || "N/A"],
                        ["Phone", selectedTxn.buyer?.phone || "N/A"],
                        ["Email", selectedTxn.buyer?.email || "N/A"],
                        ["Address", selectedTxn.buyer?.address || "N/A"],
                      ].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
                          <span style={{ color: "rgba(148,163,184,0.6)" }}>{l}</span>
                          <span style={{ color: "white", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {/* Plot + Financial Section */}
                    <div style={{ paddingLeft: "16px" }}>
                      <p style={{ margin: "0 0 8px", color: "rgba(148,163,184,0.5)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                        <Building2 size={10} style={{ display: "inline", marginRight: "4px" }} />Plot & Financials
                      </p>
                      {[
                        ["Plot No.", selectedTxn.plot?.plot_number || "N/A"],
                        ["Size", selectedTxn.plot?.size_sqft ? `${selectedTxn.plot.size_sqft} sq.ft` : "N/A"],
                        ["Block", selectedTxn.plot?.block || "N/A"],
                        ["Dimensions", selectedTxn.plot?.dimensions || "N/A"],
                        ["Facing", selectedTxn.plot?.facing || "N/A"],
                        ["Transaction #", `#${selectedTxn.id}`],
                        ["Total Amount", inr(selectedTxn.amount)],
                        ["Already Paid", inr(selectedTxn.paid_amount)],
                        ["Pending Balance", inr(parseFloat(selectedTxn.amount) - parseFloat(selectedTxn.paid_amount || 0))],
                        ["Assoc. Name", selectedTxn.sellerAssociate?.name || "N/A"],
                      ].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
                          <span style={{ color: "rgba(148,163,184,0.6)" }}>{l}</span>
                          <span style={{ color: "white", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── EMI Config ── */}
              <div>
                <label style={{ ...C.label, color: "#94a3b8" }}>Down Payment (₹) <span style={{ color: "rgba(148,163,184,0.5)", fontSize: "10px", textTransform: "none" }}>— collected today, outside EMI</span></label>
                <input type="number" min="0" step="1"
                  max={selectedTxn ? parseFloat(selectedTxn.amount) - parseFloat(selectedTxn.paid_amount || 0) : undefined}
                  value={addForm.down_payment}
                  onChange={e => setAddForm({ ...addForm, down_payment: e.target.value })}
                  placeholder="0"
                  style={{ ...C.inp }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ ...C.label, color: "#94a3b8" }}>No. of EMI Months *</label>
                  <input type="number" required min="1" max="360"
                    value={addForm.num_months}
                    onChange={e => setAddForm({ ...addForm, num_months: e.target.value })}
                    style={{ ...C.inp }} />
                </div>
                <div>
                  <label style={{ ...C.label, color: "#94a3b8" }}>First EMI Due Date *</label>
                  <input type="date" required
                    value={addForm.start_date}
                    onChange={e => setAddForm({ ...addForm, start_date: e.target.value })}
                    style={{ ...C.inp }} />
                </div>
              </div>

              {/* ── Live Preview ── */}
              {selectedTxn && emiBalance > 0 && (
                <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "12px", padding: "16px" }}>
                  <p style={{ margin: "0 0 12px", color: "#60a5fa", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 EMI Schedule Preview</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {[
                      { l: "EMI Balance", v: inr(emiBalance), c: "#f87171" },
                      { l: "Monthly EMI", v: inr(monthlyEmi), c: "#D4AF37" },
                      { l: "Duration", v: `${addForm.num_months || "—"} months`, c: "#60a5fa" },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ textAlign: "center", background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "10px" }}>
                        <p style={{ margin: "0 0 4px", color: "rgba(148,163,184,0.6)", fontSize: "11px" }}>{l}</p>
                        <p style={{ margin: 0, color: c, fontWeight: 800, fontSize: "16px" }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTxn && emiBalance <= 0 && downPay > 0 && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", padding: "12px", color: "#f87171", fontSize: "13px" }}>
                  ⚠️ Down payment exceeds the pending balance. Please reduce the down payment.
                </div>
              )}

              <button
                disabled={adding || !selectedTxn || emiBalance <= 0}
                type="submit"
                style={{
                  width: "100%", padding: "14px", borderRadius: "10px",
                  background: (adding || !selectedTxn || emiBalance <= 0) ? "rgba(212,175,55,0.3)" : "linear-gradient(135deg, #D4AF37, #c9a227)",
                  color: (adding || !selectedTxn || emiBalance <= 0) ? "rgba(255,255,255,0.4)" : "#0b1437",
                  fontWeight: 800, fontSize: "15px", border: "none",
                  cursor: (adding || !selectedTxn || emiBalance <= 0) ? "not-allowed" : "pointer",
                  marginTop: "4px"
                }}>
                {adding ? "Generating Schedule…" : "✓ Generate EMI Schedule"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          RECORD PAYMENT MODAL (DARK)
      ══════════════════════════════════════════════════════════════════════════ */}
      {payModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={() => setPayModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }} />
          <div style={{
            position: "relative", background: "linear-gradient(145deg, #1e293b, #0f172a)",
            borderRadius: "20px", border: "1px solid rgba(34,197,94,0.25)",
            width: "100%", maxWidth: "440px", padding: "28px", zIndex: 210,
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, color: "white", fontSize: "18px", fontWeight: 800 }}>Record EMI Payment</h3>
                <p style={{ margin: "5px 0 0", color: "rgba(148,163,184,0.6)", fontSize: "13px" }}>
                  Installment #{payModal.month_number} &nbsp;•&nbsp; Due: {fmt(payModal.due_date)}
                </p>
              </div>
              <button onClick={() => setPayModal(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={20} /></button>
            </div>

            {/* Installment Info */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
              {[
                ["Total EMI Amount", inr(payModal.amount)],
                ["Already Paid", inr(payModal.paid_amount || 0)],
                ["Balance Due", inr(parseFloat(payModal.amount) - parseFloat(payModal.paid_amount || 0))],
                ["Current Status", getLiveStatus(payModal).toUpperCase()],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
                  <span style={{ color: "rgba(148,163,184,0.7)" }}>{l}</span>
                  <span style={{ color: "white", fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handlePaySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ ...C.label, color: "#94a3b8" }}>Amount to Collect (₹) *</label>
                <input type="number" required min="1" step="0.01"
                  max={parseFloat(payModal.amount) - parseFloat(payModal.paid_amount || 0)}
                  value={payForm.amount_paid}
                  onChange={e => setPayForm({ ...payForm, amount_paid: e.target.value })}
                  style={{ ...C.inp }} />
                <p style={{ margin: "5px 0 0", color: "rgba(148,163,184,0.4)", fontSize: "11px" }}>
                  Max payable: {inr(parseFloat(payModal.amount) - parseFloat(payModal.paid_amount || 0))} — partial payments supported
                </p>
              </div>
              <div>
                <label style={{ ...C.label, color: "#94a3b8" }}>Payment Date *</label>
                <input type="date" required value={payForm.paid_on}
                  onChange={e => setPayForm({ ...payForm, paid_on: e.target.value })}
                  style={{ ...C.inp }} />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={() => setPayModal(null)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>
                  Cancel
                </button>
                <button type="submit" disabled={paying}
                  style={{ flex: 2, padding: "12px", borderRadius: "10px", background: paying ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22c55e, #16a34a)", color: "white", fontWeight: 800, fontSize: "14px", border: "none", cursor: paying ? "not-allowed" : "pointer" }}>
                  {paying ? "Recording…" : "✓ Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmiStatements;
