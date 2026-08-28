# Desktop motion audit

Source: `moezyltd/moezy-site`, commit `f905113`.

## Root cause

The page enabled `.has-motion` before setting up its observers and other animation features. That class hides reveal content and masked words. An exception could stop execution without removing the class or completing the content. The preloader read `sessionStorage` outside a try/catch; SVG geometry and canvas operations were also unguarded. Later graphics depended on those earlier features finishing successfully.

The stylesheet accumulated several reduced-motion blocks, including a universal `.01ms` duration override and rules that removed artwork. Those rules did not comprehensively reset inline scroll state when the preference changed. The final territory tilt rule also replaced its opacity/translate reveal transition.

In Chrome, reduced motion alone did **not** reproduce a blank hero: the original first-image opacity fallback worked. However, removing IntersectionObserver or throwing during canvas setup reproduced an uncaught error, hidden masked content, and missing growth/sign-off graphics. Denied storage also stopped creation of the later graphics. The fix addresses these confirmed failures as well as the incomplete reduced-motion handling.

## Changes

- `styles.css`: removed the universal duration override and consolidated reduced motion into explicit static states. Hero imagery/text, masked words, territory cards, stat hairlines, odometers, the growth system and sign-off remain visible. Grain and available canvas artwork remain still instead of being removed. Restored the territory reveal transition alongside tilt.
- `motion.js`: isolated feature setup and asynchronous callbacks; tracked and cancelled animation work on failure; safely read/write session storage; enabled `.has-motion` only after setup. Failure or reduced motion resolves counters, inline styles and graphics to their final state. Added preloader/frame watchdogs, guarded canvas/SVG operations and preference changes, and preserved normal animation and film controls. The sign-off now completes at the bottom of the page.
- `index.html`: moved the existing growth diagram and sign-off markup into HTML and supplied the existing final counter values. They no longer depend on JavaScript to exist. The growth diagram is no longer suppressed on small screens.
- Added development-only tests and a lockfile; no production libraries, build step, replacement artwork or copy changes.

If reduced motion is enabled during a visit, the page stays static for the rest of that visit. Reloading with reduced motion disabled restores normal animation.

## Verification

**Final clean-install run: 30 tests passed, 0 failed; no uncaught browser/runtime errors.** JavaScript syntax, CSS parsing and `git diff --check` also passed.

The regression suite checks JavaScript/CSS parsing and real-browser visibility, final counters, SVG paths, sign-off fill, image loading, horizontal overflow, ongoing normal animation, static fallbacks, accordion interaction and film pause/resume.

Coverage includes desktop at 1024, 1440 and 1920 pixels; mobile at 390 pixels; initial and mid-session reduced motion; returning visitors; denied storage; missing/throwing observers; null/throwing canvas contexts; asynchronous drawing/export errors; Path2D and SVG geometry failures; missing/stalled animation frames; failed preference APIs; and disabled JavaScript.

Browser verification uses headless Chrome 143.0.7499.42 with Playwright 1.62.1 and Node 24.19.0. Desktop/mobile screenshots and the growth/sign-off sections were visually inspected. This is local repository verification, not a production deployment or a Safari/Firefox check. The live URL could not be retrieved from this environment.

### Run the tests

Use Node 20 or newer:

```sh
npm ci
npx playwright install chromium
npm test
```

Alternatively, set `CHROME_PATH` to an installed Chrome executable. Set `SCREENSHOT_DIR` to save verification screenshots.

## Deployment

Deploy `index.html`, `styles.css` and `motion.js` together with the unchanged `assets/` directory. The HTML and JavaScript changes depend on each other. A GitHub push does not by itself confirm a successful Cloudflare deployment; production deployment was not verified as part of this audit.
