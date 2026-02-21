import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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
  if (records.length === 0) {
    return false;
  }

  const sheetData = records.map(record => ({
    'Student Name': record.studentName,
    'Admission No': record.admissionNumber,
    'Class': record.className,
    'Date': record.date,
    'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
    'Session': record.session || 'Full Day',
    'Reason': record.reason || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

  return true;
}

export function downloadAttendancePDF(
  records: AttendanceExportRecord[],
  title: string,
  dateRange: string
) {
  if (records.length === 0) {
    return false;
  }

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };

  const percentage = stats.total > 0 
    ? Math.round(((stats.present + stats.late) / stats.total) * 100) 
    : 0;

  // Summary row + data
  const sheetData = records.map(r => ({
    'Student Name': r.studentName,
    'Admission No': r.admissionNumber,
    'Class': r.className,
    'Date': r.date,
    'Status': r.status.charAt(0).toUpperCase() + r.status.slice(1),
    'Session': r.session || 'Full Day',
    'Reason': r.reason || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  // Add a summary sheet
  const summaryData = [
    { 'Metric': 'Report', 'Value': title },
    { 'Metric': 'Date Range', 'Value': dateRange },
    { 'Metric': 'Total Records', 'Value': stats.total },
    { 'Metric': 'Present', 'Value': stats.present },
    { 'Metric': 'Absent', 'Value': stats.absent },
    { 'Metric': 'Late', 'Value': stats.late },
    { 'Metric': 'Attendance Rate', 'Value': `${percentage}%` },
    { 'Metric': 'Generated On', 'Value': format(new Date(), 'PPP') },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

  return true;
}
