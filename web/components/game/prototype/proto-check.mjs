import { chromium } from '@playwright/test';

const OUT = '/tmp/claude-1000/-home-justin-Projects/9ecafeae-f854-4ed2-9a11-50bc12e6832c/scratchpad';
const VARIANTS = process.argv[2]?.split(',') ?? ['A', 'B', 'C', 'D', 'E'];

// WebGL in headless needs a software rasteriser.
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const v of VARIANTS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

  await page.goto(`http://localhost:3000/play/game?difficulty=easy&variant=${v}`, { waitUntil: 'networkidle' });

  const skip = page.getByRole('button', { name: /skip intro/i });
  if (await skip.count()) await skip.first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForSelector('[data-testid="human-hand-tile"]', { state: 'attached', timeout: 60000 });

  // Variant E hides the DOM hand; un-hide it only to drive the game, then
  // restore before measuring or screenshotting.
  const driver = await page.addStyleTag({
    content: '.game-hand-row{display:flex !important;visibility:visible !important}',
  });

  // Play a handful of turns so the discard sea actually has tiles in it.
  for (let turn = 0; turn < 6; turn++) {
    const tiles = page.locator('[data-testid="human-hand-tile"] button');
    if (await tiles.count()) await tiles.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
    const discardBtn = page.getByRole('button', { name: /^discard/i }).first();
    if (await discardBtn.count()) await discardBtn.click().catch(() => {});
    await page.waitForTimeout(2600);
  }
  await driver.evaluate(el => el.remove());
  await page.waitForTimeout(1200);

  const stats = await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const start = performance.now();
    const tick = () => { frames++; if (performance.now() - start < 3000) requestAnimationFrame(tick); else finish(); };
    const finish = () => resolve({
      fps: Math.round((frames / (performance.now() - start)) * 1000),
      domNodes: document.getElementsByTagName('*').length,
      tileButtons: document.querySelectorAll('[data-testid="human-hand-tile"] button').length,
      canvases: document.querySelectorAll('.proto-three-mount canvas').length,
      // Everything a screen reader can name in the discard sea.
      seaAccessible: document.querySelectorAll('[data-proto-discard-sea] [aria-label]').length,
    });
    requestAnimationFrame(tick);
  }));

  console.log(
    `variant ${v}: fps=${stats.fps} domNodes=${stats.domNodes} handButtons=${stats.tileButtons} ` +
    `canvases=${stats.canvases} seaAriaLabels=${stats.seaAccessible} errors=${errors.length}`,
  );
  if (errors.length) console.log(`   ! ${errors.slice(0, 3).join(' | ')}`);

  await page.screenshot({ path: `${OUT}/variant-${v}.png` });
  await page.locator('[data-proto-discard-sea]').screenshot({ path: `${OUT}/pool-${v}.png` }).catch(() => {});
  await page.close();
}
await browser.close();
