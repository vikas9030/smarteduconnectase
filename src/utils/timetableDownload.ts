export interface TimetableEntry {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subjects?: { name: string } | null;
  teacherName?: string;
  className?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function downloadTimetableAsCSV(
  entries: TimetableEntry[],
  title: string,
  includeTeacher: boolean = false,
  includeClass: boolean = false
) {
  // Group by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = entries
      .filter(t => t.day_of_week === day)
      .sort((a, b) => a.period_number - b.period_number);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  // Build CSV content
  let headers = ['Day', 'Period', 'Subject', 'Start Time', 'End Time'];
  if (includeTeacher) headers.push('Teacher');
  if (includeClass) headers.push('Class');

  let csvContent = headers.join(',') + '\n';

  DAYS.forEach(day => {
    const dayEntries = groupedByDay[day];
    if (dayEntries.length === 0) {
      csvContent += `${day},No classes,,,\n`;
    } else {
      dayEntries.forEach(entry => {
        const row = [
          day,
          entry.period_number.toString(),
          `"${entry.subjects?.name || 'Free Period'}"`,
          entry.start_time?.slice(0, 5) || '',
          entry.end_time?.slice(0, 5) || '',
        ];
        if (includeTeacher) row.push(`"${entry.teacherName || ''}"`);
        if (includeClass) row.push(`"${entry.className || ''}"`);
        csvContent += row.join(',') + '\n';
      });
    }
  });

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/\s+/g, '_')}_Timetable.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadTimetableAsPDF(
  entries: TimetableEntry[],
  title: string,
  includeTeacher: boolean = false,
  includeClass: boolean = false
) {
  // Group by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = entries
      .filter(t => t.day_of_week === day)
      .sort((a, b) => a.period_number - b.period_number);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  // Create printable HTML
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Timetable</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4f46e5; color: white; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .day-header { background-color: #e5e7eb; font-weight: bold; }
        .no-class { color: #9ca3af; font-style: italic; }
        .period-num { 
          width: 30px; 
          height: 30px; 
          border-radius: 50%; 
          background-color: #eef2ff; 
          color: #4f46e5; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          font-weight: bold;
        }
        @media print {
          body { padding: 0; }
          h1 { font-size: 18px; }
        }
      </style>
    </head>
    <body>
      <h1>${title} - Weekly Timetable</h1>
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Subject</th>
            <th>Time</th>
            ${includeTeacher ? '<th>Teacher</th>' : ''}
            ${includeClass ? '<th>Class</th>' : ''}
          </tr>
        </thead>
        <tbody>
  `;

  DAYS.forEach(day => {
    const dayEntries = groupedByDay[day];
    html += `<tr class="day-header"><td colspan="${3 + (includeTeacher ? 1 : 0) + (includeClass ? 1 : 0)}">${day}</td></tr>`;
    
    if (dayEntries.length === 0) {
      html += `<tr><td colspan="${3 + (includeTeacher ? 1 : 0) + (includeClass ? 1 : 0)}" class="no-class">No classes scheduled</td></tr>`;
    } else {
      dayEntries.forEach(entry => {
        html += `
          <tr>
            <td><span class="period-num">${entry.period_number}</span></td>
            <td>${entry.subjects?.name || 'Free Period'}</td>
            <td>${entry.start_time?.slice(0, 5) || ''} - ${entry.end_time?.slice(0, 5) || ''}</td>
            ${includeTeacher ? `<td>${entry.teacherName || '-'}</td>` : ''}
            ${includeClass ? `<td>${entry.className || '-'}</td>` : ''}
          </tr>
        `;
      });
    }
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/\s+/g, '_')}_Timetable.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
