import PDFDocument from 'pdfkit';
import { IBooking } from '../models/Booking.model';
import { IAmenityUsage } from '../models/AmenityUsage.model';
import { IHotel } from '../models/Hotel.model';
import { IRoom } from '../models/Room.model';

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_LEFT = PAGE_MARGIN;
const CONTENT_RIGHT = PAGE_WIDTH - PAGE_MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

const ROOM_ACCOMMODATION_SAC = '996311';

const fmt = (n: number): string =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (n: number): string => {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
};

const threeDigitsToWords = (n: number): string => {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${hundred ? `${ONES[hundred]} Hundred${rest ? ' ' : ''}` : ''}${rest ? twoDigitsToWords(rest) : ''}`;
};

// Indian numbering (lakh/crore) — hotel folio amounts are always in Rupees, never fractional words.
const amountInWords = (amount: number): string => {
  const n = Math.round(amount);
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const hundred = n % 1e3;
  const parts = [
    crore ? `${threeDigitsToWords(crore)} Crore` : '',
    lakh ? `${threeDigitsToWords(lakh)} Lakh` : '',
    thousand ? `${threeDigitsToWords(thousand)} Thousand` : '',
    hundred ? threeDigitsToWords(hundred) : '',
  ].filter(Boolean);
  return parts.join(' ');
};

const nightsBetween = (checkIn: Date, checkOut: Date): number =>
  Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

export const generateInvoicePdf = (
  booking: IBooking,
  usage: IAmenityUsage[],
  hotel: IHotel | null,
  room: IRoom | null
): PDFKit.PDFDocument => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  let y = PAGE_MARGIN;

  const text = (str: string, x: number, yy: number, opts: PDFKit.Mixins.TextOptions = {}) => {
    doc.text(str, x, yy, { lineBreak: false, ...opts });
  };

  // ── Money math: derived entirely from stored booking fields, never from the room's
  // current live rates — a room price change after booking must never alter a past invoice.
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const servicesTotal = (booking.extraServices || []).reduce((s, x) => s + x.price, 0);
  const discountAmount = booking.discountAmount || 0;
  const preDiscountTotal = booking.totalPrice + discountAmount;
  const stayTotalInclTax = Math.max(0, preDiscountTotal - servicesTotal);
  const stayTaxableAmount = Math.round(stayTotalInclTax / 1.12);
  const stayTax = stayTotalInclTax - stayTaxableAmount;
  const sgst = Math.round(stayTax / 2);
  const cgst = stayTax - sgst;

  const usageTotal = usage.reduce((s, u) => s + u.amount, 0);
  const totalCharges = stayTaxableAmount + servicesTotal + usageTotal;
  const totalAfterTax = totalCharges + sgst + cgst; // pre-coupon-discount, tax-inclusive
  const totalPayable = Math.max(0, totalAfterTax - discountAmount);
  const totalPayment = booking.paymentStatus === 'paid' ? booking.totalPrice : 0;
  const balance = totalPayable - totalPayment;

  const mealPlanNames = (booking.mealPlans || []).map(p => p.name).join(', ');
  const roomNumber = booking.roomNumber || room?.roomNumber || '';
  const adults = booking.adults || booking.guests || 1;
  const kids = Math.max(0, booking.guests - adults);

  // ── Title ──
  doc.fontSize(16).fillColor('#111827').font('Helvetica-Bold').text('Invoice', CONTENT_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 24;

  // ── Hotel header ──
  doc.fontSize(13).fillColor('#111827').font('Helvetica-Bold').text(booking.hotelName, CONTENT_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 16;
  doc.fontSize(8).fillColor('#6b7280').font('Helvetica').text(`GSTIN No : ${hotel?.gstin || '-'}`, CONTENT_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 12;
  if (hotel?.location) {
    text(hotel.location, CONTENT_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 12;
  }
  const contactLine = [hotel?.contact ? `Phone: ${hotel.contact}` : '', hotel?.email ? `E-mail: ${hotel.email}` : ''].filter(Boolean).join('  ·  ');
  if (contactLine) {
    text(contactLine, CONTENT_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 12;
  }
  y += 6;
  doc.moveTo(CONTENT_LEFT, y).lineTo(CONTENT_RIGHT, y).strokeColor('#d1d5db').stroke();
  y += 14;

  // ── Two-column info grid ──
  const leftX = CONTENT_LEFT;
  const rightX = CONTENT_LEFT + CONTENT_WIDTH / 2 + 10;
  const labelWidth = 110;
  const rowGap = 14;

  const valueWidth = CONTENT_WIDTH / 2 - labelWidth - 10;
  const infoRow = (leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) => {
    doc.fontSize(8).font('Helvetica-Bold');
    // A long value (e.g. several meal-plan names) wraps to multiple lines — size the row
    // to the taller of the two columns so it never overlaps the row below.
    const leftHeight = doc.heightOfString(`: ${leftValue}`, { width: valueWidth });
    const rightHeight = doc.heightOfString(`: ${rightValue}`, { width: valueWidth });
    const h = Math.max(rowGap, leftHeight + 2, rightHeight + 2);

    doc.fillColor('#6b7280').font('Helvetica');
    doc.text(leftLabel, leftX, y, { width: labelWidth });
    doc.text(rightLabel, rightX, y, { width: labelWidth });
    doc.fillColor('#111827').font('Helvetica-Bold');
    doc.text(`: ${leftValue}`, leftX + labelWidth, y, { width: valueWidth });
    doc.text(`: ${rightValue}`, rightX + labelWidth, y, { width: valueWidth });
    y += h;
  };

  infoRow('Folio No. / Res No', booking.bookingRef, 'Invoice No', booking.bookingRef);
  infoRow('Guest Name', booking.userName, 'Date of Invoice', new Date().toLocaleString('en-IN'));
  infoRow('Bill To', booking.userName, 'Room', `${booking.roomType}${roomNumber ? ` / ${roomNumber}` : ''}`);
  infoRow('Bill To GSTIN No', '-', 'No of Person', `${adults} (A) / ${kids} (C)`);
  infoRow('State', hotel?.city || '-', 'Rate Type', mealPlanNames || 'Room Only');
  infoRow('Source', booking.source || 'Website', 'No of Nights', String(nights));
  infoRow('Source Of Supply', hotel?.city || '-', 'Date of Arrival', new Date(booking.checkIn).toLocaleString('en-IN'));
  infoRow('TA Voucher No', '-', 'Date of Departure', new Date(booking.checkOut).toLocaleString('en-IN'));

  y += 6;
  doc.moveTo(CONTENT_LEFT, y).lineTo(CONTENT_RIGHT, y).strokeColor('#d1d5db').stroke();
  y += 10;

  // ── Line items table ──
  const cols = [
    { key: 'sr', label: 'Sr', width: 18, align: 'center' as const },
    { key: 'particular', label: 'Particular', width: 108, align: 'left' as const },
    { key: 'hsn', label: 'HSN/SAC', width: 42, align: 'center' as const },
    { key: 'qty', label: 'Qty', width: 22, align: 'center' as const },
    { key: 'rate', label: 'Rate', width: 42, align: 'right' as const },
    { key: 'total', label: 'Total', width: 46, align: 'right' as const },
    { key: 'discount', label: 'Disc.', width: 30, align: 'right' as const },
    { key: 'taxable', label: 'Taxable', width: 46, align: 'right' as const },
    { key: 'sgst', label: 'SGST', width: 32, align: 'right' as const },
    { key: 'cgst', label: 'CGST', width: 32, align: 'right' as const },
    { key: 'igst', label: 'IGST', width: 30, align: 'right' as const },
    { key: 'cess', label: 'CESS', width: 27, align: 'right' as const },
  ];
  const colX: number[] = [];
  let cx = CONTENT_LEFT;
  cols.forEach(c => { colX.push(cx); cx += c.width; });

  const drawTableRow = (values: string[], opts: { bold?: boolean } = {}) => {
    doc.fontSize(7).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#111827');
    // The "Particular" column is the only one long enough to ever wrap — size the row
    // to fit it so a long meal-plan name never overlaps into the row below.
    const particularHeight = doc.heightOfString(values[1] || '', { width: cols[1].width - 4 });
    const h = Math.max(16, particularHeight + 8);
    cols.forEach((c, i) => {
      doc.text(values[i] ?? '', colX[i] + 2, y + 4, { width: c.width - 4, align: c.align });
    });
    y += h;
  };
  const drawRowBorder = () => {
    doc.moveTo(CONTENT_LEFT, y).lineTo(CONTENT_LEFT + cols.reduce((s, c) => s + c.width, 0), y).strokeColor('#e5e7eb').stroke();
  };

  doc.rect(CONTENT_LEFT, y, cols.reduce((s, c) => s + c.width, 0), 16).fillColor('#f3f4f6').fill();
  doc.fillColor('#111827');
  drawTableRow(cols.map(c => c.label), { bold: true });
  drawRowBorder();

  let sr = 1;
  drawTableRow([
    String(sr++), `Room Charges${mealPlanNames ? ` (${mealPlanNames})` : ''}`, ROOM_ACCOMMODATION_SAC, String(nights),
    fmt(nights ? stayTaxableAmount / nights : stayTaxableAmount), fmt(stayTaxableAmount), fmt(0),
    fmt(stayTaxableAmount), fmt(sgst), fmt(cgst), fmt(0), fmt(0),
  ]);
  drawRowBorder();

  (booking.extraServices || []).forEach(s => {
    drawTableRow([String(sr++), s.name, '-', '1', fmt(s.price), fmt(s.price), fmt(0), fmt(s.price), fmt(0), fmt(0), fmt(0), fmt(0)]);
    drawRowBorder();
  });

  usage.forEach(u => {
    drawTableRow([
      String(sr++), `${u.serviceName}${u.notes ? ` (${u.notes})` : ''}`, '-', String(u.quantity),
      fmt(u.unitPrice), fmt(u.amount), fmt(0), fmt(u.amount), fmt(0), fmt(0), fmt(0), fmt(0),
    ]);
    drawRowBorder();
  });

  doc.fontSize(7).font('Helvetica-Bold').fillColor('#111827');
  drawTableRow(['', '', '', '', 'Total', fmt(totalCharges), fmt(0), fmt(totalCharges), fmt(sgst), fmt(cgst), fmt(0), fmt(0)], { bold: true });
  drawRowBorder();
  y += 10;

  // ── Payment table (left) + Summary box (right) ──
  const sectionTop = y;
  const leftColWidth = CONTENT_WIDTH * 0.52;
  const rightColX = CONTENT_LEFT + leftColWidth + 14;
  const rightColWidth = CONTENT_WIDTH - leftColWidth - 14;

  // Payment table
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827').text('Payment Date', CONTENT_LEFT, sectionTop, { width: 80 });
  text('Description', CONTENT_LEFT + 80, sectionTop, { width: leftColWidth - 80 - 70 });
  text('Amount', CONTENT_LEFT + leftColWidth - 70, sectionTop, { width: 70, align: 'right' });
  let py = sectionTop + 14;
  doc.font('Helvetica').fontSize(8);
  if (booking.paymentStatus === 'paid') {
    const paidVia = booking.razorpayPaymentId ? `Razorpay - ${booking.razorpayPaymentId.slice(-6)}` : 'Payment Received';
    text(new Date(booking.createdAt).toLocaleDateString('en-IN'), CONTENT_LEFT, py, { width: 80 });
    text(paidVia, CONTENT_LEFT + 80, py, { width: leftColWidth - 80 - 70 });
    text(fmt(totalPayment), CONTENT_LEFT + leftColWidth - 70, py, { width: 70, align: 'right' });
    py += 14;
  }
  doc.font('Helvetica-Bold');
  text('Total', CONTENT_LEFT + 80, py, { width: leftColWidth - 80 - 70 });
  text(fmt(totalPayment), CONTENT_LEFT + leftColWidth - 70, py, { width: 70, align: 'right' });
  py += 22;

  doc.font('Helvetica-Bold').fontSize(9).text('Total Payable Amount', CONTENT_LEFT, py, { width: leftColWidth });
  py += 13;
  doc.font('Helvetica').fontSize(8).fillColor('#374151').text(`${amountInWords(totalPayable)} Rupees Only`, CONTENT_LEFT, py, { width: leftColWidth });
  py += 20;

  if (booking.specialRequests) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827').text('Remark', CONTENT_LEFT, py, { width: leftColWidth });
    py += 12;
    doc.font('Helvetica').fontSize(8).fillColor('#374151').text(booking.specialRequests, CONTENT_LEFT, py, { width: leftColWidth });
    py += 20;
  }

  // Tax details table
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827');
  text('Tax Details', CONTENT_LEFT, py, { width: leftColWidth / 3 });
  text('Taxable Amount', CONTENT_LEFT + leftColWidth / 3, py, { width: leftColWidth / 3, align: 'right' });
  text('Tax Amount', CONTENT_LEFT + (leftColWidth / 3) * 2, py, { width: leftColWidth / 3, align: 'right' });
  py += 13;
  doc.font('Helvetica').fontSize(8);
  const taxRatePct = stayTaxableAmount > 0 ? (stayTax / 2 / stayTaxableAmount) * 100 : 0;
  [['SGST', sgst], ['CGST', cgst]].forEach(([label, amt]) => {
    text(`${label} @ ${taxRatePct.toFixed(2)}%`, CONTENT_LEFT, py, { width: leftColWidth / 3 });
    text(fmt(stayTaxableAmount), CONTENT_LEFT + leftColWidth / 3, py, { width: leftColWidth / 3, align: 'right' });
    text(fmt(amt as number), CONTENT_LEFT + (leftColWidth / 3) * 2, py, { width: leftColWidth / 3, align: 'right' });
    py += 12;
  });

  // Summary box (right column)
  let sy = sectionTop;
  const summaryRow = (label: string, value: string, bold = false) => {
    doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#111827');
    text(label, rightColX, sy, { width: rightColWidth - 70 });
    text(value, rightColX + rightColWidth - 70, sy, { width: 70, align: 'right' });
    sy += 13;
  };
  summaryRow('Total Charges (Rs)', fmt(totalCharges));
  summaryRow('Total Discount (Rs)', fmt(0));
  summaryRow('Total SGST (Rs)', fmt(sgst));
  summaryRow('Total CGST (Rs)', fmt(cgst));
  summaryRow('Total IGST (Rs)', fmt(0));
  summaryRow('Total Other Tax (Rs)', fmt(0));
  doc.moveTo(rightColX, sy).lineTo(rightColX + rightColWidth, sy).strokeColor('#d1d5db').stroke();
  sy += 4;
  summaryRow('Total (Rs)', fmt(totalAfterTax), true);
  summaryRow('Flat Discount (Rs)', fmt(discountAmount));
  summaryRow('Adjustment (Rs)', fmt(0));
  doc.moveTo(rightColX, sy).lineTo(rightColX + rightColWidth, sy).strokeColor('#d1d5db').stroke();
  sy += 4;
  summaryRow('Total Payable (Rs)', fmt(totalPayable), true);
  summaryRow('Total Payment (Rs)', fmt(totalPayment));
  doc.fillColor(balance > 0 ? '#b91c1c' : '#111827');
  summaryRow('Balance (Rs)', fmt(balance), true);
  doc.fillColor('#111827');

  y = Math.max(py, sy) + 20;

  // ── Footer ──
  if (y > 740) { doc.addPage(); y = PAGE_MARGIN; }
  doc.moveTo(CONTENT_LEFT, y).lineTo(CONTENT_RIGHT, y).strokeColor('#d1d5db').stroke();
  y += 12;
  doc.fontSize(8).font('Helvetica').fillColor('#374151');
  text(`This Folio is in : Rs`, CONTENT_LEFT, y);
  text(`Reception (C/I) : Front Office`, CONTENT_LEFT + 180, y);
  text(`Cashier (C/O) : Front Office`, CONTENT_LEFT + 360, y);
  y += 14;
  text(`Date : ${new Date().toLocaleString('en-IN')}`, CONTENT_LEFT, y);
  text(`Page : Page 1 of 1`, CONTENT_LEFT + 360, y);
  y += 40;
  doc.moveTo(CONTENT_LEFT + 340, y).lineTo(CONTENT_RIGHT, y).strokeColor('#9ca3af').stroke();
  y += 4;
  text('(Guest Signature)', CONTENT_LEFT + 340, y, { width: CONTENT_WIDTH - 340, align: 'center' });

  doc.end();
  return doc;
};
