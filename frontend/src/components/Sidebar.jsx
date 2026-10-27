import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Home, Receipt, Percent, Wallet,
  BarChart3, Image, Headphones, Settings, LogOut, ChevronDown,
  Network, MessageSquare, ChevronRight, Bell, FileText, UserCog
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const Sidebar = ({ collapsed }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const { logout, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  // Compare both pathname and query params precisely
  const isSubActive = (subPath) => {
    const [subPathname, subSearch] = subPath.split('?');
    if (location.pathname !== subPathname) return false;
    if (!subSearch) {
      // exact pathname match with NO query params
      return !location.search;
    }
    // compare each query param
    const subParams = new URLSearchParams(subSearch);
    const locParams = new URLSearchParams(location.search);
    for (const [key, val] of subParams.entries()) {
      if (locParams.get(key) !== val) return false;
    }
    // make sure location doesn't have extra params that would match another tab
    // (count exact param pairs)
    let locParamCount = 0;
    for (const _ of locParams.entries()) locParamCount++;
    let subParamCount = 0;
    for (const _ of subParams.entries()) subParamCount++;
    return locParamCount === subParamCount;
  };

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get("/users", { params: { status: "pending_approval" } });
        setPendingCount(res.data.count || 0);
      } catch (_) {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    {
      title: "User Management", icon: Users, path: "/users",
      badge: pendingCount > 0 ? pendingCount : null,
      sub: [
        { title: "All Users", path: "/users" },
        { title: "All Associates", path: "/users?role=associate" },
        { title: "All Clients", path: "/users?role=client" },
        { title: "Accounts Users", path: "/users?role=accounts" },
        { title: "Pending Approval", path: "/users?role=associate&status=pending_approval", badge: pendingCount > 0 ? pendingCount : null },
        { title: "Pending KYC", path: "/users?kyc_status=pending" },
      ]
    },
    { title: "Add Accounts", icon: UserCog, path: "/add-accounts-user" },
    { title: "Team Network", icon: Network, path: "/network" },
    {
      title: "Plot Management", icon: Home, path: "/plots",
      sub: [
        { title: "Plot Dashboard", path: "/plots/dashboard" },
        { title: "Plot Inventory", path: "/plots" },
        { title: "Add New Plot", path: "/plots/add" },
        { title: "Plot Purchasing / Booking", path: "/plots/purchasing" },
        { title: "All Plot Purchases", path: "/plots/purchases" },
        { title: "Booking Applications", path: "/booking-forms" },
        { title: "Client Details", path: "/users?role=client" },
        { title: "Payment Plans & Installments", path: "/emi-statements" },
        { title: "Payment Collection", path: "/payments" },
        { title: "Receipts & Booking Documents", path: "/payments" },
        { title: "Plot Transfer", path: "/plots/transfer" },
        { title: "Cancellation and Refunds", path: "/plots/cancellations" },
        { title: "Plot Purchase Audit History", path: "/plots/audit-history" }
      ]
    },
    { title: "Transactions", icon: Receipt, path: "/transactions" },
    {
      title: "Accounts & Finance", icon: Receipt, path: "/accounts",
      sub: [
        { title: "Accounts Dashboard", path: "/accounts" },
        { title: "Commission Management & Audit", path: "/accounts/commissions" },
        { title: "Associate Accounts Ledger", path: "/accounts/associates" },
        { title: "Daily Records", path: "/daily-records" },
        { title: "Payments & Receipts", path: "/payments" },
        { title: "EMI Statements", path: "/emi-statements" }
      ]
    },
    { title: "Booking Forms", icon: FileText, path: "/booking-forms" },
    {
      title: "Commission / Payroll", icon: Percent, path: "/commissions",
      sub: [
        { title: "Commission Rates & Hierarchy", path: "/commissions" },
        { title: "Commission Tracking & Payouts", path: "/accounts/commissions" },
        { title: "Commission Slips", path: "/accounts/commission-slips" },
        { title: "Slab Settings", path: "/slabs" }
      ]
    },
    { title: "Wallet Management", icon: Wallet, path: "/wallets" },
    { title: "Reports & Analytics", icon: BarChart3, path: "/reports" },
    { title: "Content / Banners", icon: Image, path: "/banners" },
    { title: "Support / Complaints", icon: Headphones, path: "/complaints" },
    { title: "Website Enquiries", icon: MessageSquare, path: "/enquiries" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside
      style={{
        position: "fixed", top: 0, left: 0, height: "100vh",
        width: collapsed ? "72px" : "280px",
        display: "flex", flexDirection: "column", zIndex: 40,
        transition: "width 0.3s ease",
        background: "linear-gradient(180deg, #0b1437 0%, #0d1b4b 40%, #091230 100%)",
        borderRight: "1px solid rgba(212,175,55,0.18)"
      }}
    >
      {/* Top gold accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, transparent, #D4AF37, #FFD700, #D4AF37, transparent)" }} />

      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: collapsed ? "16px 12px" : "16px 20px",
        justifyContent: "center",
        borderBottom: "1px solid rgba(212,175,55,0.2)",
        flexShrink: 0
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="Devojas"
            style={{ position: "relative", width: "120px", height: "auto", maxHeight: "68px", objectFit: "contain" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      </div>

      {/* User chip */}
      {!collapsed && user && (
        <div style={{
          margin: "12px", padding: "12px 14px", borderRadius: "12px",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.15)",
          display: "flex", alignItems: "center", gap: "12px", flexShrink: 0
        }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #1e3a8a, #D4AF37)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "14px", fontWeight: 900
          }}>
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", fontSize: "13px", fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
            <p style={{ color: "#D4AF37", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{user.role} · {user.login_id || "DEV-0001"}</p>
          </div>
          {pendingCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(239,68,68,0.2)", color: "#f87171", padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>
              <Bell size={10} />
              {pendingCount}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px", scrollbarWidth: "none" }}>
        {menuItems.map((item) => (
          <div key={item.title} style={{ marginBottom: "2px" }}>
            {item.sub ? (
              <>
                <button
                  onClick={() => setOpenMenu(openMenu === item.title ? null : item.title)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: "10px", border: "none", cursor: "pointer",
                    color: openMenu === item.title ? "#D4AF37" : "rgba(148,163,184,0.9)",
                    background: openMenu === item.title ? "rgba(212,175,55,0.1)" : "transparent",
                    transition: "all 0.2s"
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <item.icon size={17} style={{ color: openMenu === item.title ? "#D4AF37" : "rgba(148,163,184,0.65)" }} />
                    {!collapsed && <span style={{ fontSize: "13px", fontWeight: 600 }}>{item.title}</span>}
                  </span>
                  {!collapsed && (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {item.badge && (
                        <span style={{ background: "#ef4444", color: "white", fontSize: "9px", fontWeight: 900, padding: "2px 6px", borderRadius: "20px" }}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown size={13} style={{ transform: openMenu === item.title ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "#64748b" }} />
                    </span>
                  )}
                </button>

                {openMenu === item.title && !collapsed && (
                  <div style={{ marginLeft: "16px", paddingLeft: "12px", borderLeft: "2px solid rgba(212,175,55,0.25)", marginTop: "2px", marginBottom: "4px" }}>
                    {item.sub.map((s) => {
                      const active = isSubActive(s.path);
                      return (
                        <NavLink
                          key={s.title}
                          to={s.path}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 10px", borderRadius: "8px",
                            color: active ? "#D4AF37" : "rgba(148,163,184,0.8)",
                            background: active ? "rgba(212,175,55,0.1)" : "transparent",
                            fontWeight: active ? 700 : 500, fontSize: "12px",
                            textDecoration: "none", marginBottom: "1px", transition: "all 0.15s"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ChevronRight size={10} style={{ opacity: 0.6 }} />
                            {s.title}
                          </span>
                          {s.badge && (
                            <span style={{ background: "#ef4444", color: "white", fontSize: "9px", fontWeight: 900, padding: "2px 6px", borderRadius: "20px" }}>
                              {s.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                end={item.path === "/"}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 12px", borderRadius: "10px",
                  color: isActive ? "#D4AF37" : "rgba(148,163,184,0.9)",
                  background: isActive ? "rgba(212,175,55,0.12)" : "transparent",
                  borderLeft: isActive ? "3px solid #D4AF37" : "3px solid transparent",
                  fontSize: "13px", fontWeight: 600, textDecoration: "none", transition: "all 0.2s"
                })}
              >
                <item.icon size={17} />
                {!collapsed && item.title}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: "1px", margin: "0 12px", background: "rgba(212,175,55,0.15)" }} />

      {/* Logout */}
      <div style={{ padding: "12px" }}>
        <button
          onClick={logout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
            color: "rgba(148,163,184,0.8)", background: "transparent", fontSize: "13px", fontWeight: 600,
            transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.8)"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={16} />
          {!collapsed && "Logout"}
        </button>
      </div>

      {/* Bottom gold bar */}
      <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }} />
    </aside>
  );
};

export default Sidebar;
