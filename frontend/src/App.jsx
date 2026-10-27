import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Plots from './pages/Plots';
import Transactions from './pages/Transactions';
import Commissions from './pages/Commissions';
import Wallets from './pages/Wallets';
import Reports from './pages/Reports';
import Banners from './pages/Banners';
import Complaints from './pages/Complaints';
import Enquiries from './pages/Enquiries';
import Settings from './pages/Settings';
import SlabSettings from './pages/SlabSettings';
import MyTeamNetworkAdmin from './pages/MyTeamNetwork';
import PaymentsAndReceipts from './pages/PaymentsAndReceipts';
import AdminBookingForms from './pages/accounts/BookingForms';
import EmiStatements from './pages/EmiStatements';

// Plot Management Submenu Pages
import PlotDashboard from './pages/plots/PlotDashboard';
import ProjectsManagement from './pages/plots/ProjectsManagement';
import PlotPurchasing from './pages/plots/PlotPurchasing';
import PlotPurchasesList from './pages/plots/PlotPurchasesList';
import PlotAllotment from './pages/plots/PlotAllotment';
import PlotTransfer from './pages/plots/PlotTransfer';
import PlotCancellations from './pages/plots/PlotCancellations';
import PlotReports from './pages/plots/PlotReports';
import PlotAuditHistory from './pages/plots/PlotAuditHistory';

// ---------- NEW: Client Panel imports ----------
import ClientLayout from './components/client/ClientLayout';
import ClientDashboard from './pages/client/ClientDashboard';
import MyPlots from './pages/client/MyPlots';
import BrowsePlots from './pages/client/BrowsePlots';
import PlotDetail from './pages/client/PlotDetail';
import MyTransactions from './pages/client/MyTransactions';
import MyPayments from './pages/client/MyPayments';
import Profile from './pages/client/Profile';
import ClientNotifications from './pages/client/ClientNotifications';
import Support from './pages/client/Support';

// ---------- NEW: Associate Panel imports ----------
import AssociateLayout from './components/associate/AssociateLayout';
import AssociateDashboard from './pages/associate/AssociateDashboard';
import MyTeam from './pages/associate/MyTeamNetwork';
import AddAssociate from './pages/associate/AddAssociate';
import MyPlotAssociate from './pages/associate/MyPlot';
import MyRewardAssociate from './pages/associate/MyReward';
import MyCommissions from './pages/associate/MyCommissions';
import MyWallet from './pages/associate/MyWallet';
import AssociateBrowsePlots from './pages/associate/BrowsePlots';
import AssociateProfile from './pages/associate/Profile';
import AssociateNotifications from './pages/associate/AssociateNotifications';
import AssociateSupport from './pages/associate/Support';
import AssociateBookingForms from './pages/associate/BookingForms';
import MyPayoutStatements from './pages/associate/MyPayoutStatements';
import PlotSales from './pages/associate/PlotSales';
import MySales from './pages/associate/MySales';
import DownlineCommissions from './pages/associate/DownlineCommissions';

// ---------- NEW: Accounts Panel imports ----------
import AccountsLayout from './components/accounts/AccountsLayout';
import AccountsDashboard from './pages/accounts/AccountsDashboard';
import AssociateAccounts from './pages/accounts/AssociateAccounts';
import CommissionManagement from './pages/accounts/CommissionManagement';
import CommissionSlips from './pages/accounts/CommissionSlips';
import SalesAndBookings from './pages/accounts/SalesAndBookings';
import CustomerPayments from './pages/accounts/CustomerPayments';
import TransactionsLedger from './pages/accounts/TransactionsLedger';
import IncomeExpenses from './pages/accounts/IncomeExpenses';
import FinancialReports from './pages/accounts/FinancialReports';
import AuditLogs from './pages/accounts/AuditLogs';
import AccountsSettings from './pages/accounts/AccountsSettings';
import PaymentVerification from './pages/accounts/PaymentVerification';
import PayoutManagement from './pages/accounts/PayoutManagement';
import Invoices from './pages/accounts/Invoices';
import AllWallets from './pages/accounts/AllWallets';
import ExportData from './pages/accounts/ExportData';
import AccountsSupport from './pages/accounts/Support';
import AccountsBookingForms from './pages/accounts/BookingForms';
import DailyRecords from './pages/accounts/DailyRecords';
import AdminDailyReports from './pages/AdminDailyReports';
import AddAccountsUser from './pages/AddAccountsUser';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* ---------- ADMIN PANEL (unchanged — same as before) ---------- */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/plots" element={<Plots />} />
            <Route path="/plots/add" element={<Plots />} />
            <Route path="/plots/dashboard" element={<PlotDashboard />} />
            <Route path="/plots/projects" element={<ProjectsManagement />} />
            <Route path="/plots/purchasing" element={<PlotPurchasing />} />
            <Route path="/plots/purchases" element={<PlotPurchasesList />} />
            <Route path="/plots/allotment" element={<PlotAllotment />} />
            <Route path="/plots/transfer" element={<PlotTransfer />} />
            <Route path="/plots/cancellations" element={<PlotCancellations />} />
            <Route path="/plots/sales-reports" element={<PlotReports />} />
            <Route path="/plots/audit-history" element={<PlotAuditHistory />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/commissions" element={<Commissions />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/banners" element={<Banners />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/enquiries" element={<Enquiries />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/slabs" element={<SlabSettings />} />
            <Route path="/network" element={<MyTeamNetworkAdmin />} />
            <Route path="/payments" element={<PaymentsAndReceipts />} />
            <Route path="/booking-forms" element={<AdminBookingForms />} />
            <Route path="/daily-records" element={<DailyRecords />} />
            <Route path="/daily-reports" element={<AdminDailyReports />} />
            <Route path="/admin/daily-reports" element={<AdminDailyReports />} />
            <Route path="/emi-statements" element={<EmiStatements />} />
            <Route path="/add-accounts-user" element={<AddAccountsUser />} />
          </Route>

          {/* ---------- CLIENT PANEL (new) ---------- */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="/client/my-plots" element={<MyPlots />} />
            <Route path="/client/my-plots/add" element={<MyPlots />} />
            <Route path="/client/browse" element={<BrowsePlots />} />
            <Route path="/client/plots/:id" element={<PlotDetail />} />
            <Route path="/client/transactions" element={<MyTransactions />} />
            <Route path="/client/payments" element={<MyPayments />} />
            <Route path="/client/profile" element={<Profile />} />
            <Route path="/client/notifications" element={<ClientNotifications />} />
            <Route path="/client/support" element={<Support />} />
          </Route>

          {/* ---------- ASSOCIATE PANEL (new) ---------- */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['associate']}>
                <AssociateLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/associate" element={<AssociateDashboard />} />
            <Route path="/associate/plot-sales" element={<PlotSales />} />
            <Route path="/associate/sales" element={<MySales />} />
            <Route path="/associate/team" element={<MyTeam />} />
            <Route path="/associate/add-associate" element={<AddAssociate />} />
            <Route path="/associate/my-plot" element={<MyPlotAssociate />} />
            <Route path="/associate/my-reward" element={<MyRewardAssociate />} />
            <Route path="/associate/commissions" element={<MyCommissions />} />
            <Route path="/associate/downline-commissions" element={<DownlineCommissions />} />
            <Route path="/associate/plot-purchasing" element={<PlotPurchasing mode="associate" />} />
            <Route path="/associate/plot-purchases" element={<PlotPurchasing mode="associate" initialTab="list" />} />
            <Route path="/associate/wallet" element={<MyWallet />} />
            <Route path="/associate/plots" element={<AssociateBrowsePlots />} />
            <Route path="/associate/profile" element={<AssociateProfile />} />
            <Route path="/associate/notifications" element={<AssociateNotifications />} />
            <Route path="/associate/support" element={<AssociateSupport />} />
            <Route path="/associate/booking-forms" element={<AssociateBookingForms />} />
            <Route path="/associate/payout-statements" element={<MyPayoutStatements />} />
            <Route path="/associate/network" element={<MyTeam />} />
            <Route path="/associate/referrals" element={<MyTeam />} />
            <Route path="/associate/customers" element={<MySales />} />
            <Route path="/associate/reports" element={<MySales />} />
            <Route path="/associate/kyc" element={<AssociateProfile />} />
            <Route path="/associate/change-password" element={<AssociateProfile />} />
          </Route>

          {/* ---------- ACCOUNTS PANEL (Complete Modules) ---------- */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['accounts', 'admin']}>
                <AccountsLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/accounts" element={<AccountsDashboard />} />
            <Route path="/accounts/associates" element={<AssociateAccounts />} />
            <Route path="/accounts/commissions" element={<CommissionManagement />} />
            <Route path="/accounts/commission-slips" element={<CommissionSlips />} />
            <Route path="/accounts/sales" element={<SalesAndBookings />} />
            <Route path="/accounts/payments" element={<CustomerPayments />} />
            <Route path="/accounts/transactions-ledger" element={<TransactionsLedger />} />
            <Route path="/accounts/income-expenses" element={<IncomeExpenses />} />
            <Route path="/accounts/reports" element={<FinancialReports />} />
            <Route path="/accounts/audit-logs" element={<AuditLogs />} />
            <Route path="/accounts/settings" element={<AccountsSettings />} />
            <Route path="/accounts/payouts" element={<PayoutManagement />} />
            <Route path="/accounts/invoices" element={<Invoices />} />
            <Route path="/accounts/wallets" element={<AllWallets />} />
            <Route path="/accounts/export" element={<ExportData />} />
            <Route path="/accounts/support" element={<AccountsSupport />} />
            <Route path="/accounts/booking-forms" element={<AccountsBookingForms />} />
            <Route path="/accounts/daily-records" element={<DailyRecords />} />
            <Route path="/accounts/emi-statements" element={<EmiStatements />} />
          </Route>
          <Route path="/plot-purchases" element={<PlotPurchasing mode="associate" initialTab="list" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
