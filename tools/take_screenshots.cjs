const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// CLI Arguments parsing
const args = process.argv.slice(2);
let baseUrl = 'http://localhost:5173';
let outDir = path.resolve(__dirname, '../screenshots/v2');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    baseUrl = args[i + 1];
    i++;
  } else if (args[i] === '--out-dir' && args[i + 1]) {
    outDir = path.resolve(args[i + 1]);
    i++;
  } else if (!args[i].startsWith('--')) {
    if (!baseUrl || baseUrl === 'http://localhost:5173') {
      baseUrl = args[i];
    } else {
      outDir = path.resolve(args[i]);
    }
  }
}

// Ensure base URL has no trailing slash
baseUrl = baseUrl.replace(/\/+$/, '');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Target Base URL: ${baseUrl}`);
console.log(`Screenshots Output Directory: ${outDir}`);

const ROUTES = [
  { name: 'home', path: '#/' },
  { name: 'workbench', path: '#/workbench' },
  { name: 'predict', path: '#/predict' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, label: '1440px' },
  { width: 390, height: 844, label: '390px' },
];

const THEMES = ['light', 'dark'];

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    channel: 'msedge',
  }).catch(() => chromium.launch());

  const allConsoleErrors = [];
  const overflowIssues = [];
  const verifiedMetrics = new Set();

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`\nTesting Viewport: ${vp.label}, Theme: ${theme}`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          allConsoleErrors.push(`[${vp.label} ${theme}] console.error: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => {
        allConsoleErrors.push(`[${vp.label} ${theme}] pageerror: ${err.message}`);
      });

      // Set localStorage theme before navigation
      await page.addInitScript((t) => {
        localStorage.setItem('theme', t);
      }, theme);

      for (const route of ROUTES) {
        const url = `${baseUrl}/${route.path}`;
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);

        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.waitForTimeout(300);

        if (route.name === 'predict') {
          // Run prediction if live API is online so probability strip + ghost shift are visible
          try {
            const btn = page.locator('button:has-text("Calculate Risk & Consensus")');
            if (await btn.isEnabled({ timeout: 2000 }).catch(() => false)) {
              await btn.click();
              await page.waitForTimeout(900);
              await page.evaluate(() => window.scrollTo(0, 0));
              await page.waitForTimeout(200);
            }
          } catch (e) {}
        }

        // Verify horizontal overflow & non-blank visible render on <main>
        const checks = await page.evaluate(() => {
          const main = document.getElementById('main-content');
          const style = main?.firstElementChild ? getComputedStyle(main.firstElementChild) : null;
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            mainHeight: main ? main.getBoundingClientRect().height : 0,
            childOpacity: style ? style.opacity : '1',
          };
        });
        if (checks.scrollWidth > checks.clientWidth + 1) {
          overflowIssues.push(`${route.name} (${vp.label}, ${theme}): scrollWidth=${checks.scrollWidth} > clientWidth=${checks.clientWidth}`);
        }
        if (checks.mainHeight < 100 || Number(checks.childOpacity) < 0.9) {
          allConsoleErrors.push(`[${vp.label} ${theme}] ${route.name} rendered blank/invisible (height=${checks.mainHeight}, opacity=${checks.childOpacity})`);
        }

        // Capture above-the-fold route screenshot
        const filename = `${route.name}_${vp.label}_${theme}.png`;
        await page.screenshot({ path: path.join(outDir, filename), fullPage: false });
        console.log(`Saved screenshot: ${filename}`);

        if (route.name === 'home') {
          // Gently scroll through all chapters so IntersectionObserver/whileInView settle at final values
          const chapters = ['ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'];
          for (const chId of chapters) {
            await page.evaluate((id) => {
              document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
            }, chId);
            await page.waitForTimeout(350);
          }
          await page.waitForTimeout(700);

          // Check key empirical values on Home after numerals settle
          const bodyText = await page.evaluate(() => document.body.innerText);
          for (const token of ['87.2%', '0.931', '172', '88.37%']) {
            if (bodyText.includes(token)) verifiedMetrics.add(`home:${token}`);
          }

          // Capture Chapter 4 (Results + Strip Plot) & Chapter 5 (Dumbbell) at 1440px and 390px light
          if (theme === 'light' || vp.label === '1440px') {
            await page.evaluate(() => {
              document.getElementById('ch4')?.scrollIntoView({ behavior: 'instant' });
            });
            await page.waitForTimeout(300);
            const ch4File = `home_ch4_${vp.label}_${theme}.png`;
            await page.screenshot({ path: path.join(outDir, ch4File), fullPage: false });
            console.log(`Saved screenshot: ${ch4File}`);

            await page.evaluate(() => {
              document.getElementById('ch5')?.scrollIntoView({ behavior: 'instant' });
            });
            await page.waitForTimeout(300);
            const ch5File = `home_ch5_${vp.label}_${theme}.png`;
            await page.screenshot({ path: path.join(outDir, ch5File), fullPage: false });
            console.log(`Saved screenshot: ${ch5File}`);
          }

          // Capture full-page notebook scroll
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(250);
          const fullFilename = `home_full_${vp.label}_${theme}.png`;
          await page.screenshot({ path: path.join(outDir, fullFilename), fullPage: true });
          console.log(`Saved screenshot: ${fullFilename}`);
        } else if (route.name === 'workbench') {
          const bodyText = await page.evaluate(() => document.body.innerText);
          for (const token of ['87.17%', '0.931']) {
            if (bodyText.includes(token)) verifiedMetrics.add(`workbench:${token}`);
          }
          const fullFilename = `workbench_full_${vp.label}_${theme}.png`;
          await page.screenshot({ path: path.join(outDir, fullFilename), fullPage: true });
          console.log(`Saved screenshot: ${fullFilename}`);
        } else if (route.name === 'predict') {
          const fullFilename = `predict_full_${vp.label}_${theme}.png`;
          await page.screenshot({ path: path.join(outDir, fullFilename), fullPage: true });
          console.log(`Saved screenshot: ${fullFilename}`);
        }
      }

      await context.close();
    }
  }

  // Interactive & Accessibility Verification Pass
  console.log('\nRunning interactive keyboard, mobile drawer & ARIA audit...');
  const qaCtxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const qaPage = await qaCtxDesktop.newPage();
  await qaPage.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
  await qaPage.waitForTimeout(400);

  // Check landmarks, heading hierarchy, and skip link on Home
  const homeAudit = await qaPage.evaluate(() => ({
    h1Count: document.querySelectorAll('h1').length,
    hasMain: Boolean(document.querySelector('main#main-content')),
    hasSkip: Boolean(document.querySelector('a[href="#main-content"]')),
    unlabeledImgs: [...document.querySelectorAll('svg[role="img"]')].filter(s => !s.getAttribute('aria-label')).length,
  }));

  // SegmentedControl ArrowRight test (Chapter IV Strip Plot metric switcher)
  const metricRadio = qaPage.locator('[aria-label="Strip plot metric"] [role="radio"]').first();
  await metricRadio.focus();
  await qaPage.keyboard.press('ArrowRight');
  const secondChecked = await qaPage.locator('[aria-label="Strip plot metric"] [role="radio"]').nth(1).getAttribute('aria-checked');
  if (secondChecked !== 'true') {
    allConsoleErrors.push('SegmentedControl ArrowRight keyboard navigation failed');
  }

  // DataTable sort test on Workbench
  await qaPage.goto(`${baseUrl}/#/workbench`, { waitUntil: 'networkidle' });
  await qaPage.waitForTimeout(400);
  const sortHeader = qaPage.locator('th[aria-sort] button').first();
  const initialSort = await qaPage.locator('th[aria-sort]').first().getAttribute('aria-sort');
  await sortHeader.click();
  const afterSort = await qaPage.locator('th[aria-sort]').first().getAttribute('aria-sort');
  if (initialSort === afterSort) {
    allConsoleErrors.push('DataTable sort click did not change aria-sort');
  }
  await qaCtxDesktop.close();

  // Mobile sheet test at 390px
  const qaCtxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await qaCtxMobile.newPage();
  await mPage.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(300);
  await mPage.click('button[aria-label="Open navigation menu"]');
  await mPage.waitForTimeout(250);
  const drawerVisible = await mPage.locator('[role="dialog"][aria-label="Navigation menu"]').isVisible();
  const workbenchLinkVisible = await mPage.locator('[role="dialog"] a:has-text("/workbench")').isVisible();
  const predictLinkVisible = await mPage.locator('[role="dialog"] a:has-text("/predict")').isVisible();
  if (!drawerVisible || !workbenchLinkVisible || !predictLinkVisible) {
    allConsoleErrors.push('Mobile navigation sheet missing routes');
  }
  await mPage.click('button[aria-label="Close navigation menu"]');
  await qaCtxMobile.close();

  await browser.close();

  console.log('\n─── Browser QA Summary ───');
  console.log('ARIA Home Audit:', JSON.stringify(homeAudit));
  console.log('Keyboard SegmentedControl ArrowRight:', secondChecked === 'true' ? 'PASS' : 'FAIL');
  console.log('Workbench DataTable Sort:', initialSort !== afterSort ? 'PASS' : 'FAIL');
  console.log('Mobile 390px Navigation Sheet (all routes):', (drawerVisible && workbenchLinkVisible && predictLinkVisible) ? 'PASS' : 'FAIL');
  console.log('Verified metrics rendered:', [...verifiedMetrics].sort().join(', '));
  console.log('Console/Page errors:', allConsoleErrors.length);
  if (allConsoleErrors.length > 0) {
    for (const err of allConsoleErrors) console.error('  ERROR:', err);
  }
  console.log('Horizontal overflow issues:', overflowIssues.length);
  if (overflowIssues.length > 0) {
    for (const issue of overflowIssues) console.error('  OVERFLOW:', issue);
  }
  console.log('All screenshots captured successfully in:', outDir);

  if (allConsoleErrors.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
