// One-off dev tool: rasterizes build/icon.svg to a 1024x1024 PNG using
// Electron's own offscreen BrowserWindow (no extra deps needed since
// Electron is already a project dependency). Run with the real Electron
// binary, not `node`: `electron scripts/generate-icon.js`.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const SIZE = 1024;
const svgPath = path.join(__dirname, '../build/icon.svg');
const outPath = path.join(__dirname, '../build/icon.png');

app.whenReady().then(async () => {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent;}
    svg{display:block;}
  </style></head><body>${svg}</body></html>`;

  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    webPreferences: { offscreen: true },
  });

  await win.loadURL('data:text/html,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 200));
  const image = await win.webContents.capturePage();
  fs.writeFileSync(outPath, image.toPNG());
  console.log('Wrote', outPath, image.getSize());
  app.quit();
});
