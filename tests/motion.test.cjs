const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const postcss = require('postcss');

const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..'));
const origin = 'http://moezy.test';
let browser;
before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
});
after(async () => { await browser?.close(); });

test('JavaScript and CSS parse; no global reduced-motion duration hack', () => {
  new vm.Script(fs.readFileSync(path.join(root, 'motion.js'), 'utf8'));
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  postcss.parse(css);
  assert.doesNotMatch(css, /(?:animation|transition)-duration\s*:\s*\.01ms/);
});

const scenarios = [
  { name: 'desktop normal', animated: true },
  { name: 'desktop returning visitor', fault: 'returning', animated: true },
  { name: 'compact desktop normal', viewport: { width: 1024, height: 768 }, animated: true },
  { name: 'wide desktop reduced motion', viewport: { width: 1920, height: 1080 }, reduced: true },
  { name: 'mobile normal', mobile: true, animated: true },
  { name: 'desktop reduced motion', reduced: true },
  { name: 'mobile reduced motion', mobile: true, reduced: true },
  { name: 'sessionStorage getter denied', fault: 'storage-getter', animated: true },
  { name: 'sessionStorage read denied', fault: 'storage-read', animated: true },
  { name: 'sessionStorage write denied', fault: 'storage-write', animated: true },
  { name: 'IntersectionObserver unavailable', fault: 'observer-missing' },
  { name: 'IntersectionObserver constructor throws', fault: 'observer-constructor' },
  { name: 'IntersectionObserver observe throws', fault: 'observer-observe' },
  { name: 'IntersectionObserver callback cleanup throws', fault: 'observer-unobserve' },
  { name: 'canvas context unavailable', fault: 'canvas-null', animated: true },
  { name: 'canvas context throws', fault: 'canvas-throw' },
  { name: 'canvas export throws asynchronously', fault: 'canvas-export' },
  { name: 'canvas drawing throws asynchronously', fault: 'canvas-draw' },
  { name: 'Path2D constructor throws', fault: 'path2d' },
  { name: 'SVG path measurement throws', fault: 'svg-length' },
  { name: 'SVG pulse callback throws', fault: 'svg-point' },
  { name: 'requestAnimationFrame unavailable', fault: 'raf-missing' },
  { name: 'requestAnimationFrame stalls', fault: 'raf-stalled' },
  { name: 'matchMedia unavailable', fault: 'media-missing' },
  { name: 'media preference listener throws', fault: 'media-listener' },
  { name: 'reduced motion switched on during preloader', toggle: 'early' },
  { name: 'reduced motion switched on after scrolling', toggle: 'late' },
  { name: 'JavaScript disabled', noJS: true },
];

async function openPage(scenario) {
  const context = await browser.newContext({
    viewport: scenario.viewport || (scenario.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }),
    isMobile: !!scenario.mobile,
    hasTouch: !!scenario.mobile,
    reducedMotion: scenario.reduced ? 'reduce' : 'no-preference',
    javaScriptEnabled: !scenario.noJS,
  });
  await context.route(`${origin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename)) return route.fulfill({ status: 404, body: '' });
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
    await route.fulfill({ body: fs.readFileSync(filename), contentType: types[path.extname(filename)] });
  });
  if (scenario.fault) await context.addInitScript((fault) => {
    const denied = () => { throw new Error('Injected failure: ' + fault); };
    switch (fault) {
      case 'returning': sessionStorage.setItem('om-pre', '1'); break;
      case 'storage-getter': Object.defineProperty(window, 'sessionStorage', { get: denied }); break;
      case 'storage-read': Storage.prototype.getItem = denied; break;
      case 'storage-write': Storage.prototype.setItem = denied; break;
      case 'observer-missing': window.IntersectionObserver = undefined; break;
      case 'observer-constructor': window.IntersectionObserver = class { constructor() { denied(); } }; break;
      case 'observer-observe': IntersectionObserver.prototype.observe = denied; break;
      case 'observer-unobserve': IntersectionObserver.prototype.unobserve = denied; break;
      case 'canvas-null': HTMLCanvasElement.prototype.getContext = () => null; break;
      case 'canvas-throw': HTMLCanvasElement.prototype.getContext = denied; break;
      case 'canvas-export': HTMLCanvasElement.prototype.toDataURL = denied; break;
      case 'canvas-draw': {
        const stroke = CanvasRenderingContext2D.prototype.stroke;
        let frames = 0;
        CanvasRenderingContext2D.prototype.stroke = function (...args) {
          if (++frames > 26) denied();
          return stroke.apply(this, args);
        };
        break;
      }
      case 'path2d': window.Path2D = class { constructor() { denied(); } }; break;
      case 'svg-length': SVGGeometryElement.prototype.getTotalLength = denied; break;
      case 'svg-point': SVGGeometryElement.prototype.getPointAtLength = denied; break;
      case 'raf-missing': window.requestAnimationFrame = undefined; break;
      case 'raf-stalled': window.requestAnimationFrame = () => 1; break;
      case 'media-missing': window.matchMedia = undefined; break;
      case 'media-listener': MediaQueryList.prototype.addEventListener = denied; break;
    }
  }, scenario.fault);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(origin, { waitUntil: 'load' });
  return { context, page, errors };
}

async function visibleContent(page) {
  return page.evaluate(() => {
    const selectors = '.hero-kicker, .hero h1, .hero h1 .w, .hero-detail, [data-reveal], .ww, .wordmark .wm-l, .stagger-lines .line, .count, .territory-card img, .om-system, .om-signoff-mark';
    return [...document.querySelectorAll(selectors)].filter((el) => {
      const s = getComputedStyle(el);
      return Number(s.opacity) < .99 || s.display === 'none' || s.visibility === 'hidden' || !el.getBoundingClientRect().width || (s.translate !== 'none' && s.translate.split(' ').some((value) => parseFloat(value) !== 0));
    }).map((el) => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 35), opacity: getComputedStyle(el).opacity, translate: getComputedStyle(el).translate }));
  });
}

describe('visibility and failure fallbacks', { concurrency: 3 }, () => {
for (const scenario of scenarios) {
  test(scenario.name, { timeout: 40000 }, async () => {
    const { context, page, errors } = await openPage(scenario);
    try {
      if (scenario.toggle === 'early') await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(3100);
      const hero = await page.evaluate(() => ({
        opacity: getComputedStyle(document.querySelector('.hero-content')).opacity,
        image: [...document.querySelectorAll('.hero-frame')].some((el) => el.complete && el.naturalWidth > 0 && Number(getComputedStyle(el).opacity) > .1 && getComputedStyle(el).display !== 'none'),
        curtain: !!document.querySelector('.om-pre'),
        holding: document.documentElement.classList.contains('om-holding'),
      }));
      assert.equal(hero.opacity, '1');
      assert.equal(hero.image, true, 'A hero image must be painted');
      assert.equal(hero.curtain, false);
      assert.equal(hero.holding, false);
      if (process.env.SCREENSHOT_DIR && ['desktop normal', 'desktop reduced motion', 'mobile reduced motion'].includes(scenario.name)) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, scenario.name.replaceAll(' ', '-') + '-hero.png') });
      }
      // Traverse the actual viewport so the normal observers and scroll effects run.
      const dimensions = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, step: innerHeight * .7 }));
      for (let y = 0; y < dimensions.height; y += dimensions.step) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
        await page.waitForTimeout(scenario.noJS ? 25 : 120);
      }
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      if (scenario.toggle === 'late') await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(2200);
      const isAnimated = await page.evaluate(() => document.documentElement.classList.contains('has-motion'));
      assert.equal(isAnimated, !!scenario.animated);
      assert.deepEqual(await visibleContent(page), [], 'All content must finish revealing');
      const final = await page.evaluate(() => ({
        counters: [...document.querySelectorAll('.count')].map((el) => {
          const expected = (el.dataset.prefix || '') + el.dataset.target + (el.dataset.suffix || '');
          if (!el.querySelector('.om-od-reel')) return { expected, actual: el.textContent };
          const digits = [...el.querySelectorAll('.om-od-reel')].map((reel) => {
            const y = parseFloat(getComputedStyle(reel).translate.split(' ')[1]) || 0;
            const height = reel.firstElementChild.getBoundingClientRect().height;
            return Math.round(-y / height);
          }).join('');
          return { expected, actual: (el.dataset.prefix || '') + digits + (el.dataset.suffix || '') };
        }),
        paths: [...document.querySelectorAll('.om-system path')].map((el) => getComputedStyle(el).strokeDashoffset),
        system: !!document.querySelector('.om-system svg'),
        signoff: !!document.querySelector('.om-signoff-mark'),
        fill: getComputedStyle(document.querySelector('.om-signoff-mark')).getPropertyValue('--om-fill').trim() || '100%',
        overflow: document.documentElement.scrollWidth > innerWidth,
        moving: document.getAnimations().filter((a) => a.playState === 'running').length,
        brokenImages: [...document.images].filter((el) => !el.closest('.om-peek') && (!el.complete || !el.naturalWidth)).map((el) => el.src),
      }));
      final.counters.forEach(({ actual, expected }) => assert.equal(actual, expected));
      final.paths.forEach((offset) => assert.equal(parseFloat(offset), 0));
      assert.equal(final.system, true);
      assert.equal(final.signoff, true);
      assert.equal(parseFloat(final.fill), 100);
      assert.equal(final.overflow, false);
      assert.deepEqual(final.brokenImages, [], 'All image assets must load');
      if (!scenario.animated) assert.equal(final.moving, 0, 'Static fallback must stop animations');
      else assert.ok(final.moving > 0, 'Normal motion must be preserved');
      if (!scenario.noJS) {
        await page.locator('.qa-q').first().click();
        assert.equal(await page.locator('.qa-q').first().getAttribute('aria-expanded'), 'true');
      }
      assert.deepEqual(errors, [], 'No uncaught browser/runtime errors');
      if (process.env.SCREENSHOT_DIR && ['desktop reduced motion', 'mobile reduced motion'].includes(scenario.name)) {
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, scenario.name.replaceAll(' ', '-') + '-full.png'), fullPage: true });
        if (!scenario.mobile) {
          await page.locator('.model').screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'growth-system.png') });
          await page.locator('.om-signoff').screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'signoff.png') });
        }
      }
    } finally { await context.close(); }
  });
}
});

test('normal film pause and resume still work', async () => {
  const { context, page, errors } = await openPage({ fault: 'returning' });
  try {
    await page.waitForTimeout(100);
    await page.locator('.film-control').click();
    assert.equal(await page.locator('.hero-frame-one').evaluate((el) => getComputedStyle(el).animationPlayState), 'paused');
    await page.locator('.film-control').click();
    assert.equal(await page.locator('.hero-frame-one').evaluate((el) => getComputedStyle(el).animationPlayState), 'running');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
