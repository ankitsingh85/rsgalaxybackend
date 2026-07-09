import PDFDocument from 'pdfkit';
import { IBooking } from '../models/Booking.model';
import { IAmenityUsage } from '../models/AmenityUsage.model';
import { StayPrice } from './pricing';

export const generateInvoicePdf = (booking: IBooking, usage: IAmenityUsage[], stay: StayPrice | null): PDFKit.PDFDocument => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.fontSize(20).fillColor('#b45309').text('RS GALAXY HOTEL', { align: 'left' });
  doc.fontSize(10).fillColor('#6b7280').text('Premium 5-Star Luxury · Goa & Rishikesh');
  doc.moveDown(1.5);

  doc.fontSize(16).fillColor('#111827').text('Invoice', { align: 'right' });
  doc.fontSize(10).fillColor('#6b7280').text(`Booking Ref: ${booking.bookingRef}`, { align: 'right' });
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, { align: 'right' });
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor('#111827').text(`Guest: ${booking.userName}`);
  doc.fontSize(10).fillColor('#6b7280').text(booking.userEmail);
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#111827').text(`${booking.hotelName} — Room ${booking.roomNumber} (${booking.roomType})`);
  doc.fontSize(10).fillColor('#6b7280').text(
    `${new Date(booking.checkIn).toLocaleDateString()} → ${new Date(booking.checkOut).toLocaleDateString()}${stay ? ` · ${stay.nights} night(s)` : ''}`
  );
  doc.moveDown(1.5);

  const col = { desc: 50, qty: 330, amount: 420 };
  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#374151');
  doc.text('Description', col.desc, tableTop);
  doc.text('Qty', col.qty, tableTop);
  doc.text('Amount', col.amount, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#e5e7eb').stroke();

  let y = tableTop + 25;
  const row = (desc: string, qty: string, amount: number) => {
    doc.fontSize(10).fillColor('#111827');
    doc.text(desc, col.desc, y, { width: 260 });
    doc.text(qty, col.qty, y);
    doc.text(`Rs. ${amount.toLocaleString()}`, col.amount, y);
    y += 20;
  };

  if (stay) {
    row(`Room charge (${stay.nights} night(s))`, '1', stay.subtotal);
    row('Tax (12%)', '-', stay.tax);
  } else {
    row('Room charge', '1', booking.totalPrice);
  }

  (booking.extraServices || []).forEach(s => row(s.name, '1', s.price));
  usage.forEach(u => row(`${u.serviceName}${u.notes ? ` (${u.notes})` : ''}`, String(u.quantity), u.amount));

  doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor('#e5e7eb').stroke();
  y += 20;

  const usageTotal = usage.reduce((s, u) => s + u.amount, 0);
  const grandTotal = booking.totalPrice + usageTotal;

  doc.fontSize(12).fillColor('#111827').text('Grand Total', col.qty, y, { continued: false });
  doc.fontSize(12).fillColor('#b45309').text(`Rs. ${grandTotal.toLocaleString()}`, col.amount, y);

  doc.moveDown(3);
  doc.fontSize(9).fillColor('#9ca3af').text('Thank you for staying with RS Galaxy Hotel.', 50, doc.y, { align: 'center', width: 495 });

  doc.end();
  return doc;
};
