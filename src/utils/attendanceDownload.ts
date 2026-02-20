import { format } from 'date-fns';

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

  // CSV headers
  const headers = ['Student Name', 'Admission No', 'Class', 'Date', 'Status', 'Session', 'Reason'];
  
  // Convert records to CSV rows
  const csvRows = [
    headers.join(','),
    ...records.map(record => [
      `"${record.studentName}"`,
      `"${record.admissionNumber}"`,
      `"${record.className}"`,
      `"${record.date}"`,
      `"${record.status}"`,
      `"${record.session || 'Full Day'}"`,
      `"${record.reason || '-'}"`
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  // Create and download blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
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

  // Create printable HTML
  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };

  const percentage = stats.total > 0 
    ? Math.round(((stats.present + stats.late) / stats.total) * 100) 
    : 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
        .stats { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; }
        .stat { text-align: center; padding: 10px 20px; border-radius: 8px; }
        .stat.total { background: #f3f4f6; }
        .stat.present { background: #dcfce7; color: #166534; }
        .stat.absent { background: #fee2e2; color: #dc2626; }
        .stat.late { background: #fef9c3; color: #ca8a04; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }
        tr:nth-child(even) { background: #f9fafb; }
        .status-present { color: #166534; }
        .status-absent { color: #dc2626; }
        .status-late { color: #ca8a04; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="subtitle">${dateRange}</p>
      <div class="stats">
        <div class="stat total">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Records</div>
        </div>
        <div class="stat present">
          <div class="stat-value">${stats.present}</div>
          <div class="stat-label">Present</div>
        </div>
        <div class="stat absent">
          <div class="stat-value">${stats.absent}</div>
          <div class="stat-label">Absent</div>
        </div>
        <div class="stat late">
          <div class="stat-value">${stats.late}</div>
          <div class="stat-label">Late</div>
        </div>
      </div>
      <p style="text-align: center; color: #666;">Attendance Rate: <strong>${percentage}%</strong></p>
      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Admission No</th>
            <th>Class</th>
            <th>Date</th>
            <th>Status</th>
            <th>Session</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td>${r.studentName}</td>
              <td>${r.admissionNumber}</td>
              <td>${r.className}</td>
              <td>${r.date}</td>
              <td class="status-${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</td>
              <td>${r.session || 'Full Day'}</td>
              <td>${r.reason || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>Generated on ${format(new Date(), 'PPP')} | SmartEduConnect</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return true;
}
