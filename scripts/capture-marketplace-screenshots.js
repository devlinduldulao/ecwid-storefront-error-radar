const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.MARKETPLACE_SCREENSHOT_URL || 'http://127.0.0.1:4174/public?storeId=1003';
const outputDir = path.join(__dirname, '..', 'assets', 'marketplace', 'exported');

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function waitForApp(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#settings-form').waitFor();
  await page.locator('#fake-preview-toggle').waitFor();
}

async function enableDemoPreview(page) {
  const toggle = page.locator('#fake-preview-toggle');

  if ((await toggle.textContent()).includes('Use Demo Preview')) {
    await toggle.click();
  }

  await page.locator('text=Demo preview with fake merchant data').waitFor();
}

async function capture() {
  ensureOutputDir();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await waitForApp(page);
    await enableDemoPreview(page);

    await page.evaluate(function () {
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(outputDir, 'screenshot-1-dashboard-1600x1000.png'),
      type: 'png',
    });

    await page.evaluate(function () {
      const previewSection = document.querySelector('#preview-shell');
      if (previewSection) {
        previewSection.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outputDir, 'screenshot-2-demo-preview-1600x1000.png'),
      type: 'png',
    });

    await page.locator('#max-events').fill('120');
    await page.locator('#slow-request-ms').fill('900');
    await page.locator('#settings-form button[type="submit"]').click();
    await page.locator('text=Owner diagnostics settings updated for this browser.').waitFor();
    await page.evaluate(function () {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outputDir, 'screenshot-3-settings-1600x1000.png'),
      type: 'png',
    });
  } finally {
    await browser.close();
  }
}

capture().catch(function (error) {
  console.error(error);
  process.exit(1);
});