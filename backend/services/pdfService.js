const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

const ROYAL_BLUE = '#1E3A8A';
const SKY_BLUE = '#0284C7';
const BORDER_BLUE = '#1E40AF';
const GRAY = '#4B5563';
const DARK = '#111827';

const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Generates the "Plot Price Details" booking PDF for a transaction
 * (mirrors the exact structure of the uploaded form with Royal Blue branding)
 */
const generateBookingPdf = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { transaction, plot, buyer, companySettings, emiPlan, bookingForm } = data;
      const fileName = `booking-txn-${transaction.id}.pdf`;
      const filePath = path.join(receiptsDir, fileName);

      const doc = new PDFDocument({ size: 'A4', margin: 25 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);

      // Outer Royal Blue Border (as seen on the uploaded form)
      doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2))
        .lineWidth(4)
        .strokeColor(BORDER_BLUE)
        .stroke();

      let y = margin + 8;

      // ---------- HEADER: Company Branding ----------
      doc.rect(margin + 4, y, contentWidth - 8, 38).fill(ROYAL_BLUE);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16)
        .text(companySettings?.company_name || 'DEVOJAS REALTORS', margin + 12, y + 8);
      doc.font('Helvetica').fontSize(8.5).fillColor('#E0E7FF')
        .text(companySettings?.tagline || 'Your Trusted Real Estate Partner', margin + 12, y + 24);
      doc.fillColor(DARK);

      y += 46;

      // Helper function for section banner
      const drawSectionBanner = (title, curY) => {
        doc.rect(margin + 4, curY, contentWidth - 8, 22).fill(ROYAL_BLUE);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
          .text(title, margin + 12, curY + 6);
        doc.fillColor(DARK);
        return curY + 28;
      };

      // ---------- 1. PLOT PRICE DETAILS ----------
      y = drawSectionBanner('PLOT PRICE DETAILS', y);

      const sizeSqft = parseFloat(plot?.size_sqft || bookingForm?.plot_size || 0);
      const ratePerSqft = parseFloat(plot?.rate_per_sqft || bookingForm?.rate_per_sqft || 0) ||
        (sizeSqft > 0 && plot?.price ? Math.round(parseFloat(plot.price) / sizeSqft) : 0);

      const basePlotPrice = (sizeSqft > 0 && ratePerSqft > 0)
        ? (sizeSqft * ratePerSqft)
        : parseFloat(transaction?.amount || plot?.price || 0);

      const isCorner = Boolean(plot?.is_corner || bookingForm?.is_corner);
      const cornerPercent = isCorner ? parseFloat(bookingForm?.corner_percent || 10) : 0;
      const cornerCharge = (isCorner && cornerPercent > 0)
        ? (basePlotPrice * (cornerPercent / 100))
        : 0;

      const isParkFacing = Boolean(plot?.is_park_facing || plot?.facing === 'park' || bookingForm?.is_park_facing);
      const parkFacingPercent = isParkFacing ? parseFloat(bookingForm?.park_facing_percent || 10) : 0;
      const parkFacingCharge = (isParkFacing && parkFacingPercent > 0)
        ? (basePlotPrice * (parkFacingPercent / 100))
        : 0;

      // Final plot price: Size × Rate + applicable charges (authoritative)
      const finalPlotPrice = parseFloat(transaction?.amount) || (basePlotPrice + cornerCharge + parkFacingCharge);

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK);
      doc.text('Project Name: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(plot?.title || plot?.project?.name || 'Residential Township');
      y += 18;

      doc.font('Helvetica-Bold').text('Plot Size: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(`${sizeSqft || '---'} Sq.ft.         Sector No.: ${plot?.sector_number || plot?.block || plot?.sector || '---'}         Plot No.: ${plot?.plot_number || plot?.plot_code || plot?.id || '---'}`);
      y += 18;

      doc.font('Helvetica-Bold').text('Rate: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(`Rs. ${Number(ratePerSqft).toLocaleString('en-IN')} Per Sq.ft.`);
      y += 18;

      doc.font('Helvetica-Bold').text('Corner: ', margin + 12, y, { continued: true });
      const cornerStr = cornerPercent > 0 ? `${cornerPercent} % (+ ${formatMoney(cornerCharge)})` : '0 %';
      const parkStr = parkFacingPercent > 0 ? `${parkFacingPercent} % (+ ${formatMoney(parkFacingCharge)})` : '0 %';
      doc.font('Helvetica').text(`${cornerStr}         Park Facing: ${parkStr}`);
      y += 18;

      doc.font('Helvetica-Bold').text('Final Plot Price: ', margin + 12, y, { continued: true });
      doc.font('Helvetica-Bold').fillColor(ROYAL_BLUE).text(formatMoney(finalPlotPrice));
      doc.fillColor(DARK);
      y += 24;

      // ---------- 2. PAYMENT PLAN OPTION ----------
      y = drawSectionBanner('PAYMENT PLAN OPTION', y);

      const totalPlotPrice = finalPlotPrice;
      const paidAmt = parseFloat(transaction?.paid_amount || 0);
      const pendingAmt = Math.max(0, totalPlotPrice - paidAmt);

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK);
      doc.text('A. 100% Plot Amount (Full Plot Amount)', margin + 12, y);
      doc.text(`Total Plot Price: ${formatMoney(totalPlotPrice)}`, margin + 300, y);
      y += 18;

      doc.font('Helvetica-Bold').text('B. Payment Mode: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(emiPlan ? 'Down Payment + Monthly EMI' : (transaction?.payment_mode || 'Direct / Bank Transfer'));
      y += 18;

      doc.font('Helvetica-Bold').text('C. Down Payment Plan (EMI)', margin + 12, y);
      y += 16;

      if (emiPlan) {
        doc.font('Helvetica').text(`    EMI Duration: ${emiPlan.num_months} Months        Down Payment Amt. Rs.: ${formatMoney(emiPlan.down_payment)}`, margin + 12, y);
        y += 16;
        doc.text(`    Monthly EMI Amount: ${formatMoney(emiPlan.monthly_amount)} / month        Start Date: ${emiPlan.start_date || 'Booking Date'}`, margin + 12, y);
      } else {
        doc.font('Helvetica').text(`    Amount Paid: ${formatMoney(paidAmt)}        Balance Pending: ${formatMoney(pendingAmt)}`, margin + 12, y);
      }
      y += 24;

      // ---------- 3. NOTE / TERMS & CONDITIONS ----------
      y = drawSectionBanner('NOTE / TERMS & CONDITIONS', y);

      const notes = [
        'Date of Booking refers to when application for booking is submitted to the developer.',
        'Service Tax / GST as applicable shall be paid extra in accordance with law.',
        'Other charges (if any) shall be payable by customer as per terms and conditions of booking.',
        'Booking amt. 25%-50% but adjustable when plot purchase at any location once. Valid for One Plot.',
        'Preferential Location Charges applied as per company norms.',
        'If down payment plan opted and EMI is not paid timely, then an additional charges will be applied or plot may be cancelled if certain no. of EMI is pending continuously.',
        'For more information & latest terms & conditions for the same, please always contact or visit to our Head Office.'
      ];

      doc.font('Helvetica').fontSize(8).fillColor(GRAY);
      notes.forEach((note) => {
        doc.text(`• ${note}`, margin + 12, y, { width: contentWidth - 24 });
        y += doc.heightOfString(`• ${note}`, { width: contentWidth - 24 }) + 3;
      });
      y += 12;

      // ---------- 4. APPLICANT DETAILS ----------
      doc.rect(margin + 4, y, contentWidth - 8, 1).strokeColor('#E2E8F0').stroke();
      y += 10;

      const applicantDisplayName = (buyer && buyer.name && buyer.name !== 'Super Admin')
        ? buyer.name
        : (bookingForm?.applicant_name || buyer?.name || '---');

      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK);
      doc.text('Name of Applicant: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(applicantDisplayName);
      y += 16;

      doc.font('Helvetica-Bold').text('Date: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(new Date(transaction?.deal_date || transaction?.createdAt || Date.now()).toLocaleDateString('en-IN'));
      y += 16;

      doc.font('Helvetica-Bold').text('Place: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(companySettings?.company_address ? companySettings.company_address.split(',')[0] : 'Head Office');

      doc.text('_____________________________', margin + 350, y - 10);
      doc.font('Helvetica-Bold').fontSize(8.5).text('Signature of the Applicant', margin + 360, y + 6);
      y += 26;

      // ---------- 5. FOR OFFICE USE ONLY ----------
      y = drawSectionBanner('FOR OFFICE USE ONLY', y);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK);
      doc.text('Name of Applicant: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(applicantDisplayName);
      y += 16;

      doc.font('Helvetica-Bold').text('Date: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text(new Date(transaction?.deal_date || transaction?.createdAt || Date.now()).toLocaleDateString('en-IN'));
      y += 16;

      doc.font('Helvetica-Bold').text('Place: ', margin + 12, y, { continued: true });
      doc.font('Helvetica').text('Devojas Head Office');

      doc.text('_____________________________', margin + 350, y - 10);
      doc.font('Helvetica-Bold').fontSize(8.5).text('Authorised Signature', margin + 375, y + 6);

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generates an official PAYMENT RECEIPT PDF for a verified payment
 */
const generatePaymentReceiptPdf = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { payment, transaction, plot, buyer, sellerAssociate, companySettings, totalPaidSoFar, pendingBalance } = data;
      const fileName = `receipt-${payment.receipt_no || payment.id}.pdf`;
      const filePath = path.join(receiptsDir, fileName);

      const doc = new PDFDocument({ size: 'A4', margin: 25 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);

      // Outer border
      doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2))
        .lineWidth(2.5)
        .strokeColor(BORDER_BLUE)
        .stroke();

      let y = margin + 10;

      // Header Banner
      doc.rect(margin + 4, y, contentWidth - 8, 44).fill(ROYAL_BLUE);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16)
        .text(companySettings?.company_name || 'DEVOJAS REALTORS PVT. LTD.', margin + 14, y + 8);
      doc.font('Helvetica').fontSize(8.5).fillColor('#E0E7FF')
        .text(`${companySettings?.company_address || 'Corporate Office: Commercial Hub, Lucknow'} | Phone: ${companySettings?.company_phone || '+91 98765 43210'}`, margin + 14, y + 26);

      y += 54;

      // Document Type Ribbon
      doc.rect(margin + 4, y, contentWidth - 8, 24).fill('#0F172A');
      doc.fillColor('#D4AF37').font('Helvetica-Bold').fontSize(12)
        .text('OFFICIAL PAYMENT RECEIPT', margin + 14, y + 6);
      doc.fillColor('#FFFFFF').font('Helvetica').fontSize(9)
        .text(`ORIGINAL COPY - PAYMENT VERIFIED`, margin + contentWidth - 220, y + 7);

      y += 32;

      // Grid Row: Receipt Meta & Client Info
      const colWidth = (contentWidth - 16) / 2;

      // Box 1: Receipt Information
      doc.rect(margin + 4, y, colWidth, 90).lineWidth(1).strokeColor('#CBD5E1').stroke();
      doc.rect(margin + 4, y, colWidth, 18).fill('#F1F5F9');
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text('RECEIPT DETAILS', margin + 10, y + 5);

      let box1Y = y + 24;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY).text('Receipt No: ', margin + 10, box1Y, { continued: true });
      doc.fillColor(DARK).font('Helvetica-Bold').text(payment.receipt_no || `REC-${payment.id}`);
      box1Y += 14;

      doc.fillColor(GRAY).font('Helvetica').text('Receipt Date: ', margin + 10, box1Y, { continued: true });
      doc.fillColor(DARK).text(new Date(payment.paid_on || Date.now()).toLocaleDateString('en-IN'));
      box1Y += 14;

      doc.fillColor(GRAY).font('Helvetica').text('Booking Ref: ', margin + 10, box1Y, { continued: true });
      doc.fillColor(DARK).text(transaction?.transaction_ref ? `BK-${transaction.transaction_ref}` : `BK-${transaction?.id || '—'}`);
      box1Y += 14;

      doc.fillColor(GRAY).font('Helvetica').text('Transaction Ref: ', margin + 10, box1Y, { continued: true });
      doc.fillColor(DARK).text(transaction?.transaction_ref || `TX-${transaction?.id || '—'}`);

      // Box 2: Client Information
      doc.rect(margin + 12 + colWidth, y, colWidth, 90).lineWidth(1).strokeColor('#CBD5E1').stroke();
      doc.rect(margin + 12 + colWidth, y, colWidth, 18).fill('#F1F5F9');
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text('CUSTOMER DETAILS', margin + 18 + colWidth, y + 5);

      let box2Y = y + 24;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY).text('Client Name: ', margin + 18 + colWidth, box2Y, { continued: true });
      doc.fillColor(DARK).font('Helvetica-Bold').text(buyer?.name || 'Customer');
      box2Y += 14;

      doc.fillColor(GRAY).font('Helvetica').text('Client ID: ', margin + 18 + colWidth, box2Y, { continued: true });
      doc.fillColor(DARK).text(buyer?.login_id || `CLI-${buyer?.id || '—'}`);
      box2Y += 14;

      doc.fillColor(GRAY).font('Helvetica').text('Phone: ', margin + 18 + colWidth, box2Y, { continued: true });
      doc.fillColor(DARK).text(buyer?.phone || '—');
      box2Y += 14;

      doc.fillColor(GRAY).font('Helvetica').text('Address: ', margin + 18 + colWidth, box2Y, { continued: true });
      doc.fillColor(DARK).text(buyer?.address ? buyer.address.substring(0, 30) : 'Registered Address');

      y += 100;

      // Property Details Banner
      doc.rect(margin + 4, y, contentWidth - 8, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5)
        .text('PROPERTY / PLOT SPECIFICATIONS', margin + 12, y + 5);
      y += 24;

      doc.rect(margin + 4, y, contentWidth - 8, 64).lineWidth(1).strokeColor('#CBD5E1').stroke();
      let propY = y + 8;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY).text('Project Name: ', margin + 12, propY, { continued: true });
      doc.fillColor(DARK).text(plot?.title || 'Residential Township');
      doc.fillColor(GRAY).text('Plot ID / Code: ', margin + 280, propY, { continued: true });
      doc.fillColor(DARK).text(plot?.plot_code || `PLOT-${plot?.id || '—'}`);
      propY += 16;

      doc.fillColor(GRAY).text('Sector Number: ', margin + 12, propY, { continued: true });
      doc.fillColor(DARK).text(plot?.sector_number || plot?.block || 'Sector 02');
      doc.fillColor(GRAY).text('Plot Number: ', margin + 280, propY, { continued: true });
      doc.fillColor(DARK).text(plot?.plot_number || String(plot?.id || '—'));
      propY += 16;

      doc.fillColor(GRAY).text('Plot Dimensions & Size: ', margin + 12, propY, { continued: true });
      doc.fillColor(DARK).text(`${plot?.size_sqft || '—'} Sq.ft. (${plot?.dimensions || 'Standard'})`);
      doc.fillColor(GRAY).text('Total Plot Price: ', margin + 280, propY, { continued: true });
      doc.fillColor(ROYAL_BLUE).font('Helvetica-Bold').text(formatMoney(transaction?.amount || plot?.price));

      y += 76;

      // Payment Breakdown Section
      doc.rect(margin + 4, y, contentWidth - 8, 20).fill(ROYAL_BLUE);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5)
        .text('PAYMENT RECEIPT BREAKDOWN', margin + 12, y + 5);
      y += 24;

      const pmtAmt = parseFloat(payment.amount || 0);
      const totalPlotPrice = parseFloat(transaction?.amount || plot?.price || 0);
      const finalPaid = totalPaidSoFar !== undefined ? parseFloat(totalPaidSoFar) : parseFloat(transaction?.paid_amount || pmtAmt);
      const prevPaid = Math.max(0, finalPaid - pmtAmt);
      const balanceOutstanding = pendingBalance !== undefined ? parseFloat(pendingBalance) : Math.max(0, totalPlotPrice - finalPaid);

      doc.rect(margin + 4, y, contentWidth - 8, 140).lineWidth(1).strokeColor('#CBD5E1').stroke();
      let tableY = y + 10;

      const drawRow = (label, val, isHighlight = false, isBold = false) => {
        if (isHighlight) {
          doc.rect(margin + 6, tableY - 2, contentWidth - 12, 18).fill('rgba(30, 58, 138, 0.08)');
        }
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(isHighlight ? ROYAL_BLUE : DARK);
        doc.text(label, margin + 14, tableY);
        doc.text(val, margin + contentWidth - 180, tableY);
        tableY += 18;
      };

      drawRow('Current Payment Amount Received (In Figures):', formatMoney(pmtAmt), true, true);
      drawRow('Payment Mode:', `${payment.payment_mode || 'Cash'} (Ref: ${payment.reference_no || 'Direct Verification'})`);
      drawRow('Previously Received Amount:', formatMoney(prevPaid));
      drawRow('Total Amount Received to Date:', formatMoney(finalPaid), false, true);
      drawRow('Remaining Outstanding Balance:', formatMoney(balanceOutstanding), true, true);
      drawRow('Payment Verification Status:', payment.status?.toUpperCase() || 'VERIFIED');

      y += 152;

      // Selling Associate & Reference
      if (sellerAssociate || transaction?.sellerAssociate) {
        const assoc = sellerAssociate || transaction.sellerAssociate;
        doc.rect(margin + 4, y, contentWidth - 8, 28).fill('#F8FAFC');
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(`Assisted by Selling Associate: ${assoc.name} (Associate ID / Referral ID: ${assoc.login_id || assoc.id})`, margin + 12, y + 9);
        y += 36;
      }

      // Legal declaration
      doc.rect(margin + 4, y, contentWidth - 8, 1).strokeColor('#E2E8F0').stroke();
      y += 8;
      doc.font('Helvetica').fontSize(7.5).fillColor(GRAY);
      doc.text('Important Notice: This receipt is an official acknowledgment of the specific amount received above. It does not confer final freehold ownership or legal conveyance until full payment of the plot value and execution of the registered sale deed.', margin + 8, y, { width: contentWidth - 16 });
      y += 24;

      // Signature blocks
      let sigY = pageHeight - margin - 50;
      doc.rect(margin + 4, sigY, contentWidth - 8, 40).fill('#F1F5F9');
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text('System Verified & Authorized', margin + 14, sigY + 8);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
        .text('Devojas Accounts Department', margin + 14, sigY + 22);

      doc.text('____________________________________', margin + contentWidth - 220, sigY + 10);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
        .text('Authorised Officer / Cashier Signature', margin + contentWidth - 200, sigY + 24);

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBookingPdf, generatePaymentReceiptPdf, receiptsDir };

