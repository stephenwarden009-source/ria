// Regression check for the two shell-poisoning paths, run against the patched
// tree. Both must end with the real app being served offline.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TYPES = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
const REAL_TITLE = 'RIA — Relapse Interception App';
const PORTAL = '<!DOCTYPE html><html><head><title>Airport WiFi — Sign In</title></head><body>Accept terms</body></html>';

let portalMode = false;

function makeServer(port){
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    if (portalMode && (clean === '/' || clean === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(PORTAL);           // 200, text/html, same origin, not redirected
      return;
    }
    const p = path.join(ROOT, clean === '/' ? 'index.html' : clean);
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404, {'Content-Type':'text/html'}); res.end('<!DOCTYPE html><title>404</title>gone'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return server;
}

async function scenario(name, port, mid){
  portalMode = false;
  const server = makeServer(port);
  await new Promise(r => server.listen(port, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await page.waitForTimeout(500);

  await mid(page, port);

  server.closeAllConnections();
  await new Promise(r => server.close(r));
  await ctx.setOffline(true);
  await page.goto(`http://localhost:${port}/index.html`).catch(() => {});
  const served = await page.title();
  await browser.close();

  const pass = served === REAL_TITLE;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      offline shell serves: "${served}"`);
  return pass;
}

(async () => {
  const results = [];

  // 1. A stray in-scope page is visited. It must not become the shell.
  results.push(await scenario('stray in-scope page does not become the shell', 8131, async (page, port) => {
    fs.writeFileSync(path.join(ROOT, 'decoy.html'),
      '<!DOCTYPE html><html><head><title>RIA — Dead Test Build</title></head><body>decoy</body></html>');
    await page.goto(`http://localhost:${port}/decoy.html`);
    await page.waitForTimeout(1200);
    fs.unlinkSync(path.join(ROOT, 'decoy.html'));
  }));

  // 2. A captive portal answers the entry URL itself with a 200. Same origin,
  //    text/html, no redirect — everything the old check looked at.
  results.push(await scenario('captive portal 200 at the entry URL is not cached', 8132, async (page, port) => {
    portalMode = true;
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForTimeout(1200);
    portalMode = false;
  }));

  console.log(results.every(Boolean) ? '\nALL PASS' : '\nFAILURES PRESENT');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
