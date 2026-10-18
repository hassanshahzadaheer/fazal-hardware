// §17.3: CSV export (Blob + anchor download) and Print/PDF export (HTML window
// + window.print()) shared across all 5 report tabs.

export function downloadCSV(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printTable(title: string, headers: string[], rows: (string | number | null)[][]) {
  const win = window.open('', '_blank');
  if (!win) return;
  const headHtml = headers.map((h) => `<th>${h}</th>`).join('');
  const rowsHtml = rows.map((r) => `<tr>${r.map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('');
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
          th { background: #F7F8FA; }
          .btn { margin-top: 24px; padding: 10px 16px; background: #1F6B3B; color: white; border: none; border-radius: 8px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div style="color:#6B7280; font-size:12px;">Generated ${new Date().toLocaleString()}</div>
        <table><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
        <button class="btn" onclick="window.print()">Print / Save PDF</button>
      </body>
    </html>
  `);
  win.document.close();
}
