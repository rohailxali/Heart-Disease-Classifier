const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// CLI Arguments parsing
const args = process.argv.slice(2);
let baseUrl = 'http://localhost:5173';
let outDir = path.resolve(__dirname, '../screenshots');

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
  { name: 'overview', path: '#/' },
  { name: 'dataset', path: '#/dataset' },
  { name: 'pipeline', path: '#/pipeline' },
  { name: 'results', path: '#/results' },
  { name: 'comparison', path: '#/comparison' },
  { name: 'predict', path: '#/predict' },
  { name: 'findings', path: '#/findings' },
  { name: 'experiments', path: '#/experiments' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, label: '1440px' },
  { width: 390, height: 844, label: '390px' },
];

const THEMES = ['dark', 'light'];

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    channel: 'msedge', // use system Edge if available
  }).catch(() => chromium.launch()); // fallback to bundled chromium if installed

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`\nTesting Viewport: ${vp.label}, Theme: ${theme}`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      // Set localStorage theme before navigation
      await page.addInitScript((t) => {
        localStorage.setItem('theme', t);
      }, theme);

      for (const route of ROUTES) {
        const url = `${baseUrl}/${route.path}`;
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600); // allow animations & transitions

        // Ensure theme attribute on html
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.waitForTimeout(300);

        if (route.name === 'predict') {
          // Trigger a prediction or sample test patient so the risk gauge and results are visible
          try {
            await page.click('button:has-text("Calculate Risk & Consensus")', { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(600);
          } catch (e) {}
        }

        const filename = `${route.name}_${vp.label}_${theme}.png`;
        const filepath = path.join(outDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`Saved screenshot: ${filename}`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('\nAll screenshots captured successfully in:', outDir);
}

run().catch((err) => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
