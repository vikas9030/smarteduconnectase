import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReceiptTemplate } from './ReceiptTemplateSettings';

interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  admissionNumber?: string;
  className?: string;
  feeType: string;
  amount: number;
  discount?: number;
  paidAmount: number;
  paidAt: string;
  template?: ReceiptTemplate;
}

export async function generateFeeReceipt(data: ReceiptData) {
  const t = data.template;
  const doc = new jsPDF();
  let y = 15;

  // Logo
  if (t?.showLogo && t.logoUrl) {
    try {
      const img = await loadImage(t.logoUrl);
      doc.addImage(img, 'PNG', 14, y, 16, 16);
    } catch {}
  }

  // School header
  if (t?.schoolName) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(t.schoolName, 105, y + 4, { align: 'center' });
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (t.schoolAddress) { doc.text(t.schoolAddress, 105, y + 4, { align: 'center' }); y += 5; }
    if (t.schoolPhone) { doc.text(`Ph: ${t.schoolPhone}`, 105, y + 4, { align: 'center' }); y += 5; }
    y += 4;
  }

  // Header title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t?.headerTitle || 'Payment Receipt', 105, y + 4, { align: 'center' });
  y += 12;

  // Line
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 6;

  // Receipt meta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${data.receiptNumber}`, 14, y);
  doc.text(`Date: ${new Date(data.paidAt).toLocaleDateString()}`, 150, y);
  y += 8;

  // Student info
  doc.setFontSize(11);
  doc.text(`Student: ${data.studentName}`, 14, y);
  y += 7;
  const showAdm = t ? t.showAdmissionNumber : true;
  const showClass = t ? t.showClass : true;
  if (showAdm && data.admissionNumber) { doc.text(`Admission No: ${data.admissionNumber}`, 14, y); y += 7; }
  if (showClass && data.className) { doc.text(`Class: ${data.className}`, 14, y); y += 7; }
  y += 2;

  // Table
  const discount = data.discount || 0;
  const netAmount = data.amount - discount;
  const showDiscount = t ? t.showDiscount : true;

  const head = showDiscount
    ? [['Fee Type', 'Amount (₹)', 'Discount (₹)', 'Net (₹)', 'Paid (₹)']]
    : [['Fee Type', 'Amount (₹)', 'Net (₹)', 'Paid (₹)']];

  const body = showDiscount
    ? [[data.feeType, data.amount.toLocaleString(), discount.toLocaleString(), netAmount.toLocaleString(), data.paidAmount.toLocaleString()]]
    : [[data.feeType, data.amount.toLocaleString(), netAmount.toLocaleString(), data.paidAmount.toLocaleString()]];

  autoTable(doc, { startY: y, head, body, theme: 'grid' });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(t?.footerText || 'This is a computer-generated receipt.', 105, finalY, { align: 'center' });

  doc.save(`Receipt_${data.receiptNumber}.pdf`);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
