import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceExportRecord {
  studentName: string;
  admissionNumber: string;
  className: string;
  date: string;
  status: string;
  session?: string;
  reason?: string;
}

export function downloadAttendanceCSV(
  records: AttendanceExportRecord[],
  filename: string = 'attendance-report'
) {
  if (records.length === 0) return false;

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(filename.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 25);

  autoTable(doc, {
    startY: 30,
    head: [['Student Name', 'Adm No', 'Class', 'Date', 'Status', 'Session', 'Reason']],
    body: records.map(r => [
      r.studentName,
      r.admissionNumber,
      r.className,
      r.date,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.session || 'Full Day',
      r.reason || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  return true;
}

export function downloadAttendancePDF(
  records: AttendanceExportRecord[],
  title: string,
  dateRange: string
) {
  if (records.length === 0) return false;

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };
  const percentage = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(`Date Range: ${dateRange}`, 14, 26);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 32);

  // Summary box
  doc.setFontSize(9);
  doc.setDrawColor(200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, 36, 180, 18, 2, 2, 'FD');
  doc.text(`Total: ${stats.total}   |   Present: ${stats.present}   |   Absent: ${stats.absent}   |   Late: ${stats.late}   |   Attendance: ${percentage}%`, 20, 47);

  // Table
  autoTable(doc, {
    startY: 60,
    head: [['Student Name', 'Adm No', 'Class', 'Date', 'Status', 'Session', 'Reason']],
    body: records.map(r => [
      r.studentName,
      r.admissionNumber,
      r.className,
      r.date,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.session || 'Full Day',
      r.reason || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${title.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  return true;
}
