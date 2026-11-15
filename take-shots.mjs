// Take the three entry screenshots from the built dashboard (tooling, not entry code).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = '/workspace/radar-entry/out';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  let p = join(ROOT, req.url === '/' ? 'dashboard/index.html' : req.url.split('?')[0]);
  if (!existsSync(p) || !statSync(p).isFile()) p = join(ROOT, 'dashboard', 'index.html');
  res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8899, r));

const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8899/dashboard/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const targets = [
  ['screenshots/1-board.jpg', null],
  ['screenshots/2-detail.jpg', async () => {
    const row = await page.$('#boardTable tbody tr');
    await row.click();
    await page.waitForTimeout(800);
  }],
  ['screenshots/3-filtered.jpg', async () => {
    // back to board, then apply watchlist filter
    const back = await page.$('button.back, .btn-back, [data-action="back"], button:has-text("Back")');
    if (back) { await back.click(); await page.waitForTimeout(500); }
    const toggle = await page.$('#watchlistOnly, #watchlistFilter, input[type="checkbox"]');
    if (toggle) { await toggle.check(); await page.waitForTimeout(600); }
    else { await page.select('#categoryFilter', 'Liquid Staking'); await page.waitForTimeout(600); }
  }],
];
for (const [name, action] of targets) {
  await action?.();
  await page.screenshot({ path: '/workspace/radar-entry/' + name, type: 'jpeg', quality: 88, fullPage: false });
  console.log('shot', name);
}
await browser.close();
server.close();
