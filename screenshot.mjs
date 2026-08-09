import puppeteer from '../topofthesouthcardiology/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

const screenshotsDir = join(__dirname, 'temporary screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const existing = readdirSync(screenshotsDir).filter(f => f.startsWith('screenshot-'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(Boolean);
const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
const outPath = join(screenshotsDir, `screenshot-${nextNum}${label}.png`);

const scrollY = parseInt(process.argv[4] || '0');
// arg 5: viewport preset — desktop (default) | mobile | tablet
const PRESETS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const viewport = PRESETS[process.argv[5] || 'desktop'] || PRESETS.desktop;
const fullPage = process.argv[6] === 'full';

const chromePath = '/Users/tomlekkerkerker/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  // --disable-gpu makes Page.captureScreenshot hang on pages using backdrop-filter
  args: ['--no-sandbox'],
  protocolTimeout: 60000,
});

const page = await browser.newPage();
await page.setViewport(viewport);
// networkidle0 never settles on pages with a live Google Maps embed
try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
} catch {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
}

// Let entry animations settle before capturing
await new Promise(r => setTimeout(r, 1400));

if (scrollY > 0) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await new Promise(r => setTimeout(r, 600));
}

await page.screenshot({ path: outPath, fullPage });
await browser.close();
console.log(`Saved: ${outPath}`);
