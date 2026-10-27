import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Award, BarChart2, Layers, Star, Target, User } from "lucide-react";

const INR = (v) =>
  "\u20b9" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status) => {
  const map = {
    paid: "bg-emerald-100 text-emerald-800",
    partial: "bg-blue-100 text-blue-800",
    approved: "bg-purple-100 text-purple-800",
    credited: "bg-indigo-100 text-indigo-800",
    pending: "bg-amber-100 text-amber-800",
    reversed: "bg-red-100 text-red-800",
    rejected: "bg-gray-100 text-gray-500",
  };
  return map[status] || "bg-gray-100 text-gray-500";
};

const SummaryCard = ({ label, value, sub, gradient, border, textColor = "text-white", labelColor }) => (
  <div className={"rounded-2xl p-5 " + (gradient || "") + " " + (border || "")}>
    <p className={"text-[11px] uppercase tracking-widest font-bold " + (labelColor || "text-white/70")}>{label}</p>
    <p className={"text-2xl font-black mt-1.5 " + textColor}>{value}</p>
    {sub && <p className={"text-[11px] mt-1 " + (labelColor ? "text-gray-500" : "text-white/60")}>{sub}</p>}
  </div>
);

const SlabProgressBar = ({ progress, selfSalesTotal, targetAmount }) => {
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{INR(selfSalesTotal)}</span>
        <span className="font-bold text-gray-700">{pct}%</span>
        <span>{INR(targetAmount)}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: pct + "%", background: "linear-gradient(90deg,#f59e0b,#f59e0bcc)" }}
        />
      </div>
    </div>
  );
};

const MyCommissions = () => {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("differential");

  useEffect(() => {
    api.get("/associate/commissions")
      .then((res) => {
        const d = res.data;
        if (Array.isArray(d.data)) {
          setData({ commissions: d.data, personalSales: [], rewardLogs: [], slabProgress: null });
        } else {
          setData(d.data || {});
        }
        setSummary(d.summary || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const commissions = data?.commissions || [];
  const personalSales = data?.personalSales || [];
  const rewardLogs = data?.rewardLogs || [];
  const slabProgress = data?.slabProgress || null;

  const totalDiff = summary?.totalDifferentialCommission ?? commissions.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const totalRewards = summary?.totalSlabRewards ?? rewardLogs.reduce((s, r) => s + parseFloat(r.reward_amount || 0), 0);
  const totalEarnings = summary?.totalEarnings ?? (totalDiff + totalRewards);
  const totalPaid = summary?.totalPaid ?? 0;
  const remaining = summary?.remainingPayable ?? Math.max(0, totalEarnings - totalPaid);

  const tabOptions = [
    { key: "differential", label: "Downline Differential", count: commissions.length },
    { key: "rewards", label: "Slab Rewards", count: rewardLogs.length },
    { key: "personal", label: "Personal Sales", count: personalSales.length },
  ];

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-14">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">My Commission & Payout History</h1>
        <p className="text-gray-500 text-sm mt-1">
          Downline differential commissions (Rule B) · Self-sale slab rewards (Rule A) · Authoritative reconciled balances
        </p>
      </div>

      {/* 5-Card Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <SummaryCard label="Differential Commission" value={INR(totalDiff)}
          sub={commissions.length + " transaction" + (commissions.length !== 1 ? "s" : "")}
          gradient="bg-gradient-to-br from-slate-800 to-slate-700" />
        <SummaryCard label="Slab Rewards" value={INR(totalRewards)}
          sub={slabProgress?.earnedSlab ? "Slab " + slabProgress.earnedSlab.slab_number + " achieved" : "No slab yet"}
          gradient="bg-gradient-to-br from-amber-500 to-yellow-500" />
        <SummaryCard label="Total Earnings" value={INR(totalEarnings)}
          sub="Commission + Rewards"
          gradient="bg-gradient-to-br from-blue-700 to-blue-600" />
        <SummaryCard label="Total Paid" value={INR(totalPaid)}
          sub="Disbursed to date"
          gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" />
        <SummaryCard label="Remaining Payable" value={INR(remaining)}
          sub="Pending disbursement"
          gradient="" border="border-2 border-amber-300 bg-amber-50"
          textColor="text-amber-900" labelColor="text-amber-700" />
      </div>

      {/* Slab Progress Section */}
      {slabProgress && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Personal Sales & Slab Target Progress</h3>
              <p className="text-xs text-gray-400">Only your own personal sales (as seller) count toward the self-sales target</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">My Personal Sales</span>
                <span className="text-sm font-black text-gray-900">{INR(slabProgress.selfSalesTotal)}</span>
              </div>
              {slabProgress.earnedSlab && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Achieved Slab</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {"Slab " + slabProgress.earnedSlab.slab_number + " \u2713"}
                  </span>
                </div>
              )}
              {slabProgress.earnedSlab && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Slab Reward Earned</span>
                  <span className="text-sm font-black text-amber-600">{INR(slabProgress.earnedSlab.reward_amount)}</span>
                </div>
              )}
              {slabProgress.nextTargetSlab && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Next Slab Target</span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {"Slab " + slabProgress.nextTargetSlab.slab_number}
                  </span>
                </div>
              )}
              {slabProgress.nextTargetSlab && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Amount Needed</span>
                  <span className="text-sm font-bold text-blue-600">{INR(slabProgress.remainingToNextSlab)}</span>
                </div>
              )}
              {slabProgress.nextTargetSlab && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Next Reward</span>
                  <span className="text-sm font-bold text-purple-600">{INR(slabProgress.nextTargetSlab.reward_amount)}</span>
                </div>
              )}
            </div>
            <div className="sm:col-span-2 flex flex-col justify-center gap-4">
              {slabProgress.nextTargetSlab ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span>{"Progress toward Slab " + slabProgress.nextTargetSlab.slab_number}</span>
                    {slabProgress.earnedSlab && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                        {"Slab " + slabProgress.earnedSlab.slab_number + " achieved \u2713"}
                      </span>
                    )}
                  </div>
                  <SlabProgressBar
                    progress={slabProgress.progressPercent}
                    selfSalesTotal={slabProgress.selfSalesTotal}
                    targetAmount={slabProgress.nextTargetSlab.self_target_amount}
                  />
                  <p className="text-xs text-gray-500">
                    {"Sell " + INR(slabProgress.remainingToNextSlab) + " more to unlock Slab " + slabProgress.nextTargetSlab.slab_number + " reward of "}
                    <span className="font-bold text-purple-700">{INR(slabProgress.nextTargetSlab.reward_amount)}</span>
                  </p>
                </>
              ) : slabProgress.earnedSlab ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Star className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="font-bold text-amber-800 text-sm">Highest Slab Achieved! \ud83c\udfc6</p>
                    <p className="text-xs text-amber-600">
                      {"Slab " + slabProgress.earnedSlab.slab_number + " \u2014 Reward " + INR(slabProgress.earnedSlab.reward_amount) + " earned"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">Make personal sales to start earning slab rewards</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Business Rule Explainer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-2 items-start">
          <Layers className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-800">Rule B — Downline Differential Commission</p>
            <p className="text-xs text-blue-600 mt-1">
              You earn the rate difference when your downline associate sells a plot.
              Formula: <span className="font-mono font-bold">(Your % - Downline %) x Sale Value</span>.
              Accrues from all downline levels where your rate exceeds theirs.
            </p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2 items-start">
          <Award className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">Rule A — Self-Sale Slab Reward</p>
            <p className="text-xs text-amber-600 mt-1">
              When your own personal sales reach the slab Self Target, you earn a one-time milestone reward.
              Only the <span className="font-bold">highest qualifying slab</span> reward is awarded (not cumulative).
              Team sales do NOT count toward your self-target.{" "}
              <span className="font-bold text-amber-700">No direct commission on personal sales.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tab Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-2">
          {tabOptions.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " +
                (tab === t.key ? "bg-slate-900 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
            >
              {t.label}
              <span className={"ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold " +
                (tab === t.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Differential Tab */}
        {tab === "differential" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-gray-600 uppercase tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Deal / Plot</th>
                  <th className="px-4 py-3">Selling Associate</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Sale Value</th>
                  <th className="px-4 py-3 text-center">My % / Downline % / Diff %</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right text-amber-600">Remaining</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12">
                      <BarChart2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-xs">No downline differential commissions yet</p>
                      <p className="text-gray-300 text-[11px]">You earn this when your downline makes a sale at a lower rate than yours</p>
                    </td>
                  </tr>
                ) : commissions.map((c) => {
                  const total = parseFloat(c.amount || 0);
                  const paid = parseFloat(c.paid_amount || 0);
                  const rem = Math.max(0, total - paid);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">
                          {c.transaction?.plot?.title || c.transaction?.plot?.plot_code || ("Plot #" + (c.transaction?.plot_id || "-"))}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {"Deal #" + c.transaction_id + " \u00b7 " + c.slip_number}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {c.transaction?.sellerAssociate?.name || c.downlineAssociate?.name || "-"}
                        <div className="text-[10px] text-gray-400 font-mono">
                          {c.transaction?.sellerAssociate?.login_id || c.downlineAssociate?.login_id}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700">
                          Upline Differential
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">{"L" + c.level + " upline"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-600">
                        {INR(c.eligible_difference || c.base_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700 font-mono">
                        {parseFloat(c.upline_percent || 0) + "% / " + parseFloat(c.downline_percent || 0) + "% / " + parseFloat(c.differential_percent ?? c.percent ?? 0) + "%"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-gray-900">{INR(total)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{INR(paid)}</td>
                      <td className="px-4 py-3.5 text-right font-black text-amber-600">{INR(rem)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={"px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase " + statusBadge(c.status)}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rewards Tab */}
        {tab === "rewards" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-amber-50 text-amber-800 uppercase tracking-wider border-b border-amber-100">
                <tr>
                  <th className="px-4 py-3">Earning Type</th>
                  <th className="px-4 py-3">Slab</th>
                  <th className="px-4 py-3 text-right">Self Target</th>
                  <th className="px-4 py-3 text-right">Reward Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right text-amber-600">Remaining</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Awarded On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : rewardLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12">
                      <Award className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-xs">No slab rewards earned yet</p>
                      <p className="text-gray-300 text-[11px]">Make personal sales to reach a slab self-target and earn a milestone reward</p>
                    </td>
                  </tr>
                ) : rewardLogs.map((rl) => (
                  <tr key={rl.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                        Self-Sale Slab Reward
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      {"Slab " + (rl.slab?.slab_number ?? rl.slab_id)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-600">
                      {INR(rl.slab?.self_target_amount ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-amber-700">{INR(rl.reward_amount)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{INR(rl.paid_amount || 0)}</td>
                    <td className="px-4 py-3.5 text-right font-black text-amber-600">{INR(rl.remaining_amount)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={"px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase " + statusBadge(rl.status)}>
                        {rl.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-500 font-mono">
                      {rl.createdAt ? new Date(rl.createdAt).toLocaleDateString("en-IN") : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Personal Sales Tab */}
        {tab === "personal" && (
          <div className="overflow-x-auto">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
              <span className="font-bold">Note:</span> Personal sales do <span className="font-bold">not</span> generate a direct commission.
              They count toward your Self-Sales Target for slab milestone rewards.
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-blue-50/60 text-blue-800 uppercase tracking-wider border-b border-blue-100">
                <tr>
                  <th className="px-4 py-3">Plot</th>
                  <th className="px-4 py-3">Customer / Buyer</th>
                  <th className="px-4 py-3 text-right">Sale Value</th>
                  <th className="px-4 py-3 text-center">Direct Commission</th>
                  <th className="px-4 py-3 text-center">Slab Reward</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : personalSales.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <User className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-xs">No personal sales on record</p>
                    </td>
                  </tr>
                ) : personalSales.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">
                        {t.plot?.title || t.plot?.plot_code || ("Plot #" + t.id)}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">{"Txn #" + t.transaction_id}</div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">
                      {t.buyer?.name || "\u2014"}
                      <div className="text-[10px] text-gray-400">{t.buyer?.phone || ""}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-gray-900">{INR(t.amount)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">
                        {"\u20b90 (Not Awarded)"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold">
                        Counts toward self-target
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={"px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase " + statusBadge(t.status)}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-500 font-mono">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {personalSales.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Personal Sales Volume</span>
                <span className="text-sm font-black text-gray-900">
                  {INR(personalSales.reduce((s, t) => s + parseFloat(t.amount || 0), 0))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCommissions;
