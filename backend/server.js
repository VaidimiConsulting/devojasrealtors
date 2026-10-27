const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { sequelize, connectDB } = require('./config/db');
require('./models'); // load all models + associations
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const plotRoutes = require('./routes/plotRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const walletRoutes = require('./routes/walletRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const clientRoutes = require('./routes/clientRoutes'); // NEW: Client Panel routes
const associateRoutes = require('./routes/associateRoutes'); // NEW: Associate Panel routes
const accountsRoutes = require('./routes/accountsRoutes'); // NEW: Accounts Panel routes
const slabRoutes = require('./routes/slabRoutes'); // NEW: Slab settings (admin)
const networkRoutes = require('./routes/networkRoutes'); // NEW: Network tree (admin)
const publicRoutes = require('./routes/publicRoutes'); // NEW: Public plot API (no auth)
const emiRoutes = require('./routes/emiRoutes'); // NEW: EMI plan & installments
const settingsRoutes = require('./routes/settingsRoutes'); // NEW: Company settings (logo/name)
const enquiryRoutes = require('./routes/enquiryRoutes'); // NEW: Website enquiries (admin view)
const bookingFormRoutes = require('./routes/bookingFormRoutes');
const payoutStatementRoutes = require('./routes/payoutStatementRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); // NEW: Generic file upload (e.g. company logo)
const dailyRecordRoutes = require('./routes/dailyRecordRoutes');
const projectRoutes = require('./routes/projectRoutes'); // NEW: Project management

const app = express();

// Middleware
// Allow both the Admin Panel (5173) and Public Website (5174) to talk to
// this backend — plus whatever is set in FRONTEND_URL (for production).
// This fixes the common local-dev issue where a port gets taken by one
// project and the other bumps to a different port, breaking CORS.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // permissive fallback for local dev — tighten in production if needed
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date() });
});

// TEMPORARY ROUTE TO FIX PRODUCTION DATABASE
// Visit this URL once to update the tables (adds missing is_fixed_associate column)
app.get('/api/sync-database-now', async (req, res) => {
  try {
    const { sequelize } = require('./config/db');
    await sequelize.sync({ alter: true });
    res.json({ success: true, message: 'Database synced successfully! Column added.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// TEMPORARY ROUTE TO GENERATE 6 FIXED ASSOCIATES (devojas-0001 to 0006) WITH COMMISSIONS 30% to 25%
app.get('/api/seed-fixed-associates', async (req, res) => {
  try {
    const { User, Wallet } = require('./models');
    const bcrypt = require('bcryptjs');
    
    const fixedCommissions = [30, 29, 28, 27, 26, 25]; // 0001 to 0006
    const results = [];
    
    for (let i = 1; i <= 6; i++) {
      const login_id = `devojas-000${i}`;
      const commissionPercent = fixedCommissions[i - 1];
      const pw = await bcrypt.hash('password', 10);
      
      let existing = await User.findOne({ where: { login_id, is_fixed_associate: true } });
      
      if (!existing) {
        const refCode = `FIXED${i}${Math.floor(100 + Math.random() * 900)}`;
        const phone = `999900100${i}`; 
        const email = `associate${i}@devojas.com`;
        
        const user = await User.create({
          name: `Fixed Associate ${i}`,
          email,
          phone,
          password: pw,
          plain_password: 'password',
          role: 'associate',
          status: 'active',
          kyc_status: 'approved',
          referral_code: refCode,
          is_fixed_associate: true,
          referral_commission_percent: commissionPercent,
          commission_percent: commissionPercent
        });
        
        await user.update({ login_id });
        await Wallet.create({ user_id: user.id, balance: 0 });
        results.push(`Created ${login_id} with ${commissionPercent}%`);
      } else {
        await existing.update({
          referral_commission_percent: commissionPercent,
          commission_percent: commissionPercent,
          plain_password: 'password',
          password: pw
        });
        results.push(`Updated ${login_id} to ${commissionPercent}%`);
      }
    }
    res.json({ success: true, message: 'Fixed associates processed.', details: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes
app.use('/api', emiRoutes); // NEW: EMI plan & installments — MUST be mounted before transactionRoutes to avoid its admin-only middleware intercepting /transactions/:id/emi
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/commission-ledger', require('./routes/commissionLedgerRoutes'));
app.use('/api/wallets', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/client', clientRoutes); // NEW: Client Panel API
app.use('/api/associate', associateRoutes); // NEW: Associate Panel API
app.use('/api/accounts', accountsRoutes); // NEW: Accounts Panel API
app.use('/api/slabs', slabRoutes); // NEW: Slab settings API
app.use('/api/network', networkRoutes); // NEW: Network tree API
app.use('/api/public', publicRoutes); // NEW: Public plot API (no auth needed)
app.use('/api/settings', settingsRoutes); // NEW: Company settings (logo/name)
app.use('/api/enquiries', enquiryRoutes); // NEW: Website enquiries (admin view)
app.use('/api/booking-forms', bookingFormRoutes);
app.use('/api/payout-statements', payoutStatementRoutes);
app.use('/api/upload', uploadRoutes); // NEW: Generic file upload (company logo, etc.)
app.use('/api/daily-records', dailyRecordRoutes); // NEW: Accounts Daily Records (manual entry)
app.use('/api/daily-reports', require('./routes/dailyReportRoutes')); // NEW: Daily Report submission & approval
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads'))); // NEW: serve uploaded logo/PDF files

// ---------- PRODUCTION: Serve frontend build (if present) ----------
// Ye sirf tab kaam karta hai jab frontend/dist folder maujood ho (build kiya hua).
// Local development me is folder ke na hone se kuch farq nahi padta —
// dev me frontend alag se "npm run dev" (Vite) se hi chalta hai jaisa pehle chalta tha.
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next(); // API routes ko yaha se skip karo
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 handler (API routes ke liye — sirf tab lagega jab upar wala static handler na mila ho)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  // Sync all models to DB (creates tables automatically if not exist)
  await sequelize.sync({ alter: false }); // alter:false — tables already exist; avoids MySQL "too many keys" crash on every restart
  console.log('✅ All models synced with database');

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
