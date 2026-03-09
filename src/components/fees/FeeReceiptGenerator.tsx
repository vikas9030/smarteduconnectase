import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
}

export function generateFeeReceipt(data: ReceiptData) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Payment Receipt', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Receipt No: ${data.receiptNumber}`, 14, 35);
  doc.text(`Date: ${new Date(data.paidAt).toLocaleDateString()}`, 150, 35);

  doc.setFontSize(12);
  doc.text(`Student: ${data.studentName}`, 14, 50);
  if (data.admissionNumber) doc.text(`Admission No: ${data.admissionNumber}`, 14, 58);
  if (data.className) doc.text(`Class: ${data.className}`, 14, 66);

  const discount = data.discount || 0;
  const netAmount = data.amount - discount;

  autoTable(doc, {
    startY: 75,
    head: [['Fee Type', 'Amount (₹)', 'Discount (₹)', 'Net (₹)', 'Paid (₹)']],
    body: [[data.feeType, data.amount.toLocaleString(), discount.toLocaleString(), netAmount.toLocaleString(), data.paidAmount.toLocaleString()]],
    theme: 'grid',
  });

  doc.setFontSize(10);
  doc.text('This is a computer-generated receipt.', 105, (doc as any).lastAutoTable.finalY + 20, { align: 'center' });

  doc.save(`Receipt_${data.receiptNumber}.pdf`);
}
