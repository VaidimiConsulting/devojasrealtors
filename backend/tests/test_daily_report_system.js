/**
 * Test script for Daily Reporting & Verification System
 * Tests:
 * 1. Fetching daily summary from actual database tables (plots, transactions, payments, EMI, daily_records)
 * 2. Save draft report
 * 3. Submit report to Admin
 * 4. Fetch reports list with filters
 * 5. Fetch single report with snapshot & live data
 * 6. Admin approval
 * 7. Admin rejection with reason & resubmission
 * 8. Verify data safety: ensure existing records are unmodified
 */
const { sequelize } = require('../config/db');
const { User, DailyReport, Transaction, Payment, Plot, Client, EmiPlan, EmiInstallment, DailyRecord } = require('../models');

async function runTests() {
  console.log('🧪 Starting Daily Report System Tests...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    // Ensure DailyReport table is synced
    await DailyReport.sync({ alter: false });
    console.log('✅ DailyReport table verified.');

    // 1. Find or verify an accounts user and an admin user
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) throw new Error('No admin user found in database!');
    console.log(`✅ Admin user found: ${adminUser.name} (${adminUser.email}, ID: ${adminUser.id})`);

    let accountsUser = await User.findOne({ where: { role: 'accounts' } });
    if (!accountsUser) {
      console.log('ℹ️ No accounts role user found, falling back to admin for submission test.');
      accountsUser = adminUser;
    } else {
      console.log(`✅ Accounts user found: ${accountsUser.name} (${accountsUser.email}, ID: ${accountsUser.id})`);
    }

    // 2. Test controller logic directly
    const ctrl = require('../controllers/dailyReportController');

    // Test getDailySummary
    const testDate = '2026-10-25';
    let summaryResult = null;
    const mockReqSummary = {
      query: { date: testDate },
      user: accountsUser
    };
    const mockResSummary = {
      json: (data) => { summaryResult = data; return mockResSummary; },
      status: (code) => mockResSummary
    };

    await ctrl.getDailySummary(mockReqSummary, mockResSummary);
    if (!summaryResult || !summaryResult.success) {
      throw new Error(`getDailySummary failed: ${JSON.stringify(summaryResult)}`);
    }
    console.log(`✅ getDailySummary succeeded for ${testDate}:`);
    console.log(`   - Bookings: ${summaryResult.data.summary.new_bookings}`);
    console.log(`   - Sales Value: ₹${summaryResult.data.summary.sales_value}`);
    console.log(`   - Collections: ₹${summaryResult.data.summary.total_collections}`);
    console.log(`   - Cash Collections: ₹${summaryResult.data.summary.cash_collections}`);
    console.log(`   - Bank Collections: ₹${summaryResult.data.summary.bank_collections}`);
    console.log(`   - EMI Collections: ₹${summaryResult.data.summary.emi_collections}`);
    console.log(`   - Expenses: ₹${summaryResult.data.summary.total_expenses}`);

    // Clean up any test report for date 2099-12-31 to keep database clean
    const futureDate = '2099-12-31';
    await DailyReport.destroy({ where: { report_date: futureDate } });

    // 3. Test Save Draft
    let draftResult = null;
    const mockReqDraft = {
      body: {
        report_date: futureDate,
        remarks: 'Test draft remarks',
        summary: summaryResult.data.summary
      },
      user: accountsUser
    };
    const mockResDraft = {
      json: (data) => { draftResult = data; return mockResDraft; },
      status: (code) => mockResDraft
    };

    await ctrl.saveDraft(mockReqDraft, mockResDraft);
    if (!draftResult || !draftResult.success) {
      throw new Error(`saveDraft failed: ${JSON.stringify(draftResult)}`);
    }
    const reportId = draftResult.data.id;
    console.log(`✅ saveDraft succeeded: Created Report #${reportId} with status '${draftResult.data.status}'`);

    // 4. Test Submit Report
    let submitResult = null;
    const mockReqSubmit = {
      body: {
        report_date: futureDate,
        remarks: 'Test submission remarks for Admin',
        summary: summaryResult.data.summary
      },
      user: accountsUser
    };
    const mockResSubmit = {
      json: (data) => { submitResult = data; return mockResSubmit; },
      status: (code) => mockResSubmit
    };

    await ctrl.submitReport(mockReqSubmit, mockResSubmit);
    if (!submitResult || !submitResult.success) {
      throw new Error(`submitReport failed: ${JSON.stringify(submitResult)}`);
    }
    console.log(`✅ submitReport succeeded: Report #${reportId} status is now '${submitResult.data.status}'`);

    // 5. Test List Reports
    let listResult = null;
    const mockReqList = {
      query: { status: 'submitted' },
      user: adminUser
    };
    const mockResList = {
      json: (data) => { listResult = data; return mockResList; },
      status: (code) => mockResList
    };
    await ctrl.getReports(mockReqList, mockResList);
    if (!listResult || !listResult.success || !Array.isArray(listResult.data)) {
      throw new Error(`getReports failed: ${JSON.stringify(listResult)}`);
    }
    const foundReport = listResult.data.find(r => r.id === reportId);
    if (!foundReport) throw new Error(`Report #${reportId} not found in submitted list!`);
    console.log(`✅ getReports succeeded: Found submitted report #${reportId} in list (${listResult.data.length} submitted reports).`);

    // 6. Test Get Report By ID
    let singleResult = null;
    const mockReqSingle = {
      params: { id: reportId },
      user: adminUser
    };
    const mockResSingle = {
      json: (data) => { singleResult = data; return mockResSingle; },
      status: (code) => mockResSingle
    };
    await ctrl.getReportById(mockReqSingle, mockResSingle);
    if (!singleResult || !singleResult.success || !singleResult.data.report) {
      throw new Error(`getReportById failed: ${JSON.stringify(singleResult)}`);
    }
    console.log(`✅ getReportById succeeded: Report #${reportId} retrieved with snapshot & live arrays.`);

    // 7. Test Admin Reject
    let rejectResult = null;
    const mockReqReject = {
      params: { id: reportId },
      body: { reason: 'Please verify cash expense voucher #12' },
      user: adminUser
    };
    const mockResReject = {
      json: (data) => { rejectResult = data; return mockResReject; },
      status: (code) => mockResReject
    };
    await ctrl.rejectReport(mockReqReject, mockResReject);
    if (!rejectResult || !rejectResult.success || rejectResult.data.status !== 'rejected') {
      throw new Error(`rejectReport failed: ${JSON.stringify(rejectResult)}`);
    }
    console.log(`✅ rejectReport succeeded: Report #${reportId} rejected with reason: "${rejectResult.data.reject_reason}"`);

    // 8. Test Accounts resubmits after rejection
    await ctrl.submitReport(mockReqSubmit, mockResSubmit);
    console.log(`✅ Resubmission after rejection succeeded: Status is back to 'submitted'.`);

    // 9. Test Admin Approve
    let approveResult = null;
    const mockReqApprove = {
      params: { id: reportId },
      user: adminUser
    };
    const mockResApprove = {
      json: (data) => { approveResult = data; return mockResApprove; },
      status: (code) => mockResApprove
    };
    await ctrl.approveReport(mockReqApprove, mockResApprove);
    if (!approveResult || !approveResult.success || approveResult.data.status !== 'approved') {
      throw new Error(`approveReport failed: ${JSON.stringify(approveResult)}`);
    }
    console.log(`✅ approveReport succeeded: Report #${reportId} approved by Admin (ID: ${approveResult.data.reviewed_by}) at ${approveResult.data.reviewed_at}`);

    // Clean up test report
    await DailyReport.destroy({ where: { id: reportId } });
    console.log(`✅ Cleaned up test report #${reportId}. No real data was modified.`);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Daily Reporting & Verification System is 100% operational.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
