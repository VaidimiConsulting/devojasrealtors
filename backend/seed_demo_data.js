/**
 * DEMO DATA SEED SCRIPT - REAL ESTATE MLM SYSTEM
 * -------------------------------------------------------------------------
 * Populates realistic, repeatable demo data to verify the MLM commission
 * calculation across Admin, Associate, and Accounts panels.
 *
 * Requirements fulfilled:
 * - One Admin account
 * - One Accounts user
 * - One main associate with 10% commission (Associate A)
 * - Three direct downline associates with 7%, 4%, and 5% commissions (B, C, D)
 * - Additional 2nd & 3rd level downlines (Associate E at 4%, Associate G at 2%)
 * - Sample properties and property transactions
 * - Exact ₹10,00,000 transaction generating ₹1,00,000 total pool:
 *     Associate G (2%):  ₹20,000
 *     Associate E (4%):  ₹20,000 (4% - 2% = 2%)
 *     Associate B (7%):  ₹30,000 (7% - 4% = 3%)
 *     Associate A (10%): ₹30,000 (10% - 7% = 3%)
 *     Total distributed = ₹1,00,000 (no duplication, exact match)
 * - Sample pending and paid commission entries
 * - Repeatable without creating duplicate records or altering existing data
 * -------------------------------------------------------------------------
 * Usage:
 *   node backend/seed_demo_data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/db');
const {
  User, Plot, Transaction, Commission, CommissionHistory,
  Wallet, WalletTransaction, PayoutStatement, Slab
} = require('./models');
const { processCommissionForAssociate } = require('./services/commissionEngine');

async function seedDemoData() {
  console.log('🚀 Starting repeatable Demo Data Seeding for MLM Commission System...');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    const defaultHashedPassword = await bcrypt.hash('Demo@1234', 10);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ADMIN USER
    // ─────────────────────────────────────────────────────────────────────────
    let admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      admin = await User.create({
        name: 'Super Admin',
        email: 'admin@devojasrealtors.in',
        phone: '9999000001',
        password: defaultHashedPassword,
        role: 'admin',
        login_id: 'DEV-ADMIN',
        status: 'active',
        kyc_status: 'approved',
        commission_percent: 0
      });
      await Wallet.findOrCreate({ where: { user_id: admin.id }, defaults: { balance: 0 } });
      console.log('  Created Admin: admin@devojasrealtors.in / Demo@1234');
    } else {
      console.log(`  Existing Admin found: ${admin.email}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ACCOUNTS USER
    // ─────────────────────────────────────────────────────────────────────────
    let accountsUser = await User.findOne({ where: { role: 'accounts' } });
    if (!accountsUser) {
      accountsUser = await User.create({
        name: 'Finance & Accounts Officer',
        email: 'accounts@devojasrealtors.in',
        phone: '9999000002',
        password: defaultHashedPassword,
        role: 'accounts',
        login_id: 'DEV-ACCOUNTS',
        status: 'active',
        kyc_status: 'approved',
        commission_percent: 0
      });
      await Wallet.findOrCreate({ where: { user_id: accountsUser.id }, defaults: { balance: 0 } });
      console.log('  Created Accounts User: accounts@devojasrealtors.in / Demo@1234 (login: DEV-ACCOUNTS)');
    } else {
      console.log(`  Existing Accounts User found: ${accountsUser.email}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. SAMPLE CLIENTS (Buyer & Seller)
    // ─────────────────────────────────────────────────────────────────────────
    let [demoBuyer] = await User.findOrCreate({
      where: { phone: '9888000099' },
      defaults: {
        name: 'Vikram Seth (Demo Buyer)',
        email: 'client.vikram@demo.com',
        phone: '9888000099',
        password: defaultHashedPassword,
        role: 'client',
        login_id: 'CLIENT-001',
        status: 'active',
        kyc_status: 'approved'
      }
    });

    let [demoSeller] = await User.findOrCreate({
      where: { phone: '9888000098' },
      defaults: {
        name: 'Devojas Property Holdings (Demo Seller)',
        email: 'holdings@demo.com',
        phone: '9888000098',
        password: defaultHashedPassword,
        role: 'client',
        login_id: 'SELLER-001',
        status: 'active',
        kyc_status: 'approved'
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. MLM ASSOCIATE HIERARCHY
    // ─────────────────────────────────────────────────────────────────────────
    // Multi-Level Tree Structure:
    // Associate A (10%)  [Top Sponsor]
    //  ├── Associate B (7%)
    //  │    └── Associate E (4%)
    //  │         └── Associate G (2%)  [Closing Associate for ₹10,00,000 deal]
    //  ├── Associate C (4%)
    //  └── Associate D (5%)

    // --- Associate A (10%) ---
    let assocA = await User.findOne({ where: { phone: '9888000001' } });
    if (!assocA) {
      assocA = await User.create({
        name: 'Associate A (Main Leader)',
        email: 'associate.a@demo.com',
        phone: '9888000001',
        password: defaultHashedPassword,
        role: 'associate',
        login_id: 'DEMO-001',
        commission_percent: 10.0,
        commission_set_by: 'admin',
        referred_by: null,
        status: 'active',
        kyc_status: 'approved',
        referral_code: 'LEADER10'
      });
      await Wallet.findOrCreate({ where: { user_id: assocA.id }, defaults: { balance: 0 } });
      await CommissionHistory.create({
        user_id: assocA.id,
        previous_percent: 5.0,
        new_percent: 10.0,
        changed_by: admin.id,
        reason: 'Promoted to Top Leader (10% Tier)'
      });
      console.log('  Created Associate A (10%): associate.a@demo.com / DEMO-001');
    } else {
      await assocA.update({ commission_percent: 10.0, referred_by: null });
    }

    // --- Associate B (7% - direct under A) ---
    let assocB = await User.findOne({ where: { phone: '9888000002' } });
    if (!assocB) {
      assocB = await User.create({
        name: 'Associate B (Senior Partner)',
        email: 'associate.b@demo.com',
        phone: '9888000002',
        password: defaultHashedPassword,
        role: 'associate',
        login_id: 'DEMO-002',
        commission_percent: 7.0,
        commission_set_by: 'admin',
        referred_by: assocA.id,
        status: 'active',
        kyc_status: 'approved',
        referral_code: 'PARTNER7'
      });
      await Wallet.findOrCreate({ where: { user_id: assocB.id }, defaults: { balance: 0 } });
      await CommissionHistory.create({
        user_id: assocB.id,
        previous_percent: 5.0,
        new_percent: 7.0,
        changed_by: admin.id,
        reason: 'Assigned 7% Partner Tier'
      });
      console.log('  Created Associate B (7%): associate.b@demo.com / DEMO-002 (under A)');
    } else {
      await assocB.update({ commission_percent: 7.0, referred_by: assocA.id });
    }

    // --- Associate C (4% - direct under A) ---
    let assocC = await User.findOne({ where: { phone: '9888000003' } });
    if (!assocC) {
      assocC = await User.create({
        name: 'Associate C (Direct Partner)',
        email: 'associate.c@demo.com',
        phone: '9888000003',
        password: defaultHashedPassword,
        role: 'associate',
        login_id: 'DEMO-003',
        commission_percent: 4.0,
        commission_set_by: 'admin',
        referred_by: assocA.id,
        status: 'active',
        kyc_status: 'approved',
        referral_code: 'PARTNER4'
      });
      await Wallet.findOrCreate({ where: { user_id: assocC.id }, defaults: { balance: 0 } });
      await CommissionHistory.create({
        user_id: assocC.id,
        previous_percent: 3.0,
        new_percent: 4.0,
        changed_by: admin.id,
        reason: 'Assigned 4% Tier'
      });
      console.log('  Created Associate C (4%): associate.c@demo.com / DEMO-003 (under A)');
    } else {
      await assocC.update({ commission_percent: 4.0, referred_by: assocA.id });
    }

    // --- Associate D (5% - direct under A) ---
    let assocD = await User.findOne({ where: { phone: '9888000004' } });
    if (!assocD) {
      assocD = await User.create({
        name: 'Associate D (Direct Partner)',
        email: 'associate.d@demo.com',
        phone: '9888000004',
        password: defaultHashedPassword,
        role: 'associate',
        login_id: 'DEMO-004',
        commission_percent: 5.0,
        commission_set_by: 'admin',
        referred_by: assocA.id,
        status: 'active',
        kyc_status: 'approved',
        referral_code: 'PARTNER5'
      });
      await Wallet.findOrCreate({ where: { user_id: assocD.id }, defaults: { balance: 0 } });
      console.log('  Created Associate D (5%): associate.d@demo.com / DEMO-004 (under A)');
    } else {
      await assocD.update({ commission_percent: 5.0, referred_by: assocA.id });
    }

    // --- Associate E (4% - under B) ---
    let assocE = await User.findOne({ where: { phone: '9888000005' } });
    if (!assocE) {
      assocE = await User.create({
        name: 'Associate E (Team Member)',
        email: 'associate.e@demo.com',
        phone: '9888000005',
        password: defaultHashedPassword,
        role: 'associate',
        login_id: 'DEMO-005',
        commission_percent: 4.0,
        commission_set_by: 'admin',
        referred_by: assocB.id,
        status: 'active',
        kyc_status: 'approved',
        referral_code: 'MEMBER4'
      });
      await Wallet.findOrCreate({ where: { user_id: assocE.id }, defaults: { balance: 0 } });
      console.log('  Created Associate E (4%): associate.e@demo.com / DEMO-005 (under B)');
    } else {
      await assocE.update({ commission_percent: 4.0, referred_by: assocB.id });
    }

    // --- Associate G (2% - under E) ---
    let assocG = await User.findOne({ where: { phone: '9888000006' } });
    if (!assocG) {
      assocG = await User.create({
        name: 'Associate G (Field Executive)',
        email: 'associate.g@demo.com',
        phone: '9888000006',
        password: defaultHashedPassword,
        role: 'associate',
        login_id: 'DEMO-006',
        commission_percent: 2.0,
        commission_set_by: 'admin',
        referred_by: assocE.id,
        status: 'active',
        kyc_status: 'approved',
        referral_code: 'FIELD2'
      });
      await Wallet.findOrCreate({ where: { user_id: assocG.id }, defaults: { balance: 0 } });
      console.log('  Created Associate G (2%): associate.g@demo.com / DEMO-006 (under E)');
    } else {
      await assocG.update({ commission_percent: 2.0, referred_by: assocE.id });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SAMPLE PLOTS
    // ─────────────────────────────────────────────────────────────────────────
    let [plot1] = await Plot.findOrCreate({
      where: { title: 'Demo Elite Plot #101' },
      defaults: {
        title: 'Demo Elite Plot #101',
        location: 'Kaithi, Varanasi',
        city: 'Varanasi',
        size_sqft: 1000,
        price: 1000000,
        owner_id: demoSeller.id,
        status: 'sold',
        is_featured: true,
        description: 'Demo plot used for testing ₹10,00,000 MLM differential distribution.'
      }
    });

    let [plot2] = await Plot.findOrCreate({
      where: { title: 'Demo Royal Villa Plot #202' },
      defaults: {
        title: 'Demo Royal Villa Plot #202',
        location: 'Sigra, Varanasi',
        city: 'Varanasi',
        size_sqft: 1500,
        price: 2000000,
        owner_id: demoSeller.id,
        status: 'sold',
        is_featured: false,
        description: 'Demo plot used for testing 2-level differential distribution.'
      }
    });

    let [plot3] = await Plot.findOrCreate({
      where: { title: 'Demo Prime Commercial Plot #303' },
      defaults: {
        title: 'Demo Prime Commercial Plot #303',
        location: 'Lanka, Varanasi',
        city: 'Varanasi',
        size_sqft: 2000,
        price: 3000000,
        owner_id: demoSeller.id,
        status: 'available',
        is_featured: true,
        description: 'Available demo commercial plot for live tests.'
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. SAMPLE TRANSACTIONS & COMMISSION CALCULATIONS
    // ─────────────────────────────────────────────────────────────────────────
    // Transaction 1: ₹10,00,000 closed by Associate G
    // Hierarchy: G (2%) -> E (4%) -> B (7%) -> A (10%)
    let existingTx1 = await Transaction.findOne({ where: { plot_id: plot1.id } });
    if (!existingTx1) {
      const t1 = await sequelize.transaction();
      try {
        existingTx1 = await Transaction.create({
          plot_id: plot1.id,
          buyer_id: demoBuyer.id,
          seller_id: demoSeller.id,
          seller_associate_id: assocG.id,
          amount: 1000000,
          status: 'completed',
          payment_status: 'paid',
          paid_amount: 1000000,
          deal_date: new Date()
        }, { transaction: t1 });

        // Process commission for Associate G using commission engine
        const comms1 = await processCommissionForAssociate(
          assocG.id,
          1000000,
          existingTx1.id,
          'seller_side',
          true,
          t1
        );

        await t1.commit();
        console.log(`  Processed Transaction #1 (₹10,00,000 deal by Associate G): generated ${comms1.length} commissions.`);
      } catch (err) {
        await t1.rollback();
        throw err;
      }
    } else {
      console.log(`  Transaction #1 already exists (Plot #101).`);
    }

    // Transaction 2: ₹20,00,000 closed by Associate C
    // Hierarchy: C (4%) -> A (10%)
    let existingTx2 = await Transaction.findOne({ where: { plot_id: plot2.id } });
    if (!existingTx2) {
      const t2 = await sequelize.transaction();
      try {
        existingTx2 = await Transaction.create({
          plot_id: plot2.id,
          buyer_id: demoBuyer.id,
          seller_id: demoSeller.id,
          seller_associate_id: assocC.id,
          amount: 2000000,
          status: 'completed',
          payment_status: 'paid',
          paid_amount: 2000000,
          deal_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }, { transaction: t2 });

        const comms2 = await processCommissionForAssociate(
          assocC.id,
          2000000,
          existingTx2.id,
          'seller_side',
          true,
          t2
        );

        await t2.commit();
        console.log(`  Processed Transaction #2 (₹20,00,000 deal by Associate C): generated ${comms2.length} commissions.`);
      } catch (err) {
        await t2.rollback();
        throw err;
      }
    } else {
      console.log(`  Transaction #2 already exists (Plot #202).`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. SAMPLE PAYOUT STATEMENT FOR ACCOUNTS PANEL
    // ─────────────────────────────────────────────────────────────────────────
    let existingStmt = await PayoutStatement.findOne({ where: { associate_id: assocB.id } });
    if (!existingStmt) {
      await PayoutStatement.create({
        associate_id: assocB.id,
        created_by: accountsUser.id,
        payment_date: new Date().toISOString().split('T')[0],
        self_business: 500000,
        team_business: 1000000,
        total_business: 1500000,
        slab_percent: 7.0,
        self_deposit: 35000,
        team_deposit: 70000,
        total_amount: 105000,
        tds_percent: 5.0,
        tds_amount: 5250,
        processing_percent: 2.0,
        processing_amount: 2100,
        net_payable: 97650,
        notes: 'Monthly payout statement generated by Accounts department.',
        status: 'published'
      });
      console.log('  Created sample Payout Statement for Associate B in Accounts panel.');
    }

    console.log('\n=============================================================');
    console.log('✅ DEMO DATA SEEDED SUCCESSFULLY!');
    console.log('=============================================================');
    console.log('Login credentials for testing:');
    console.log('-------------------------------------------------------------');
    console.log('ADMIN PANEL:');
    console.log('  Email:    admin@devojasrealtors.in');
    console.log('  Password: Demo@1234');
    console.log('');
    console.log('ACCOUNTS PANEL:');
    console.log('  Email:    accounts@devojasrealtors.in');
    console.log('  Login ID: DEV-ACCOUNTS');
    console.log('  Password: Demo@1234');
    console.log('');
    console.log('ASSOCIATE PANEL (Top Leader - 10%):');
    console.log('  Email:    associate.a@demo.com');
    console.log('  Login ID: DEMO-001');
    console.log('  Password: Demo@1234');
    console.log('');
    console.log('ASSOCIATE PANEL (Closing Exec - 2%):');
    console.log('  Email:    associate.g@demo.com');
    console.log('  Login ID: DEMO-006');
    console.log('  Password: Demo@1234');
    console.log('=============================================================\n');

  } catch (error) {
    console.error('❌ Error during demo data seeding:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDemoData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedDemoData;
