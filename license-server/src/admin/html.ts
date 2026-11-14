export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const fmtDate = (iso: string | null | undefined) => (iso ? esc(iso.slice(0, 16).replace('T', ' ')) + ' UTC' : '—');

export function layout(title: string, body: string, opts: { csrf?: string; nav?: boolean; flash?: string } = {}): string {
  const nav = opts.nav
    ? `<nav><strong>Fazal Licensing</strong>
        <a href="/admin">Licences</a><a href="/admin/devices">Devices</a><a href="/admin/audit">Audit log</a>
        <form method="post" action="/admin/logout" class="inline"><input type="hidden" name="_csrf" value="${esc(opts.csrf)}"><button class="link">Sign out</button></form></nav>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)} · Fazal Licensing</title>
<link rel="stylesheet" href="/admin/static/style.css"></head><body>${nav}<main>${opts.flash ? `<div class="flash">${esc(opts.flash)}</div>` : ''}${body}</main></body></html>`;
}

export const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#1c2430;--muted:#667085;--line:#e3e7ee;--accent:#1d5fd1;--danger:#c0362c;--ok:#1a7f4b;--warn:#b26a00}
@media (prefers-color-scheme:dark){:root{--bg:#10151c;--card:#171e28;--ink:#e8edf4;--muted:#9aa6b8;--line:#263142;--accent:#6ea2ff;--danger:#ff8a80;--ok:#5fd699;--warn:#f0b35a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,Segoe UI,sans-serif}
nav{display:flex;gap:18px;align-items:center;padding:12px 24px;background:var(--card);border-bottom:1px solid var(--line)}
nav a{color:var(--ink);text-decoration:none}nav a:hover{color:var(--accent)}nav form{margin-left:auto}
main{max-width:1100px;margin:24px auto;padding:0 20px}h1{font-size:20px;margin:0 0 16px}h2{font-size:15px;margin:24px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px;margin-bottom:16px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
label{display:block;font-weight:600;margin:10px 0 4px}input,select,textarea{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
button,.btn{display:inline-block;padding:8px 14px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer;font:inherit;text-decoration:none}
button.primary,.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}button.danger{color:var(--danger);border-color:var(--danger)}
button.link{border:0;background:none;color:var(--accent);padding:0}form.inline{display:inline}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.badge{padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;border:1px solid currentColor}.active{color:var(--ok)}.suspended{color:var(--warn)}.revoked,.expired{color:var(--danger)}
.flash{background:var(--card);border:1px solid var(--accent);border-radius:6px;padding:10px 14px;margin-bottom:16px}
.key{font:600 20px ui-monospace,Consolas,monospace;letter-spacing:.05em;padding:12px;background:var(--bg);border:1px dashed var(--accent);border-radius:6px;user-select:all}
.muted{color:var(--muted)}.error{color:var(--danger)}.login{max-width:380px;margin:80px auto}
`;
