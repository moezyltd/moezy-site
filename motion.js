/* Moezy — motion.js (v2)
   1. Hero film pause/play (original behaviour)
   2. Word-by-word masked reveals on the big headings
   3. Scroll reveals for anything marked data-reveal
   4. Scroll-driven manifesto lines (opacity follows your scroll)
   5. Proof-grid counters
   6. Hero parallax, returning glass nav, magnetic pills
   All of it switches on via .has-motion, so if JS ever fails
   the site stays fully visible. */

(() => {
'use strict';

const root = document.documentElement;
let preference;
let reduced = true;
try {
  preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced = preference.matches;
} catch (error) { /* An unavailable preference API uses the static page. */ }
const cleanups = new Set();
const finalCount = (el) => (el.dataset.prefix || '') + (el.dataset.target || '0') + (el.dataset.suffix || '');
document.querySelectorAll('.count').forEach((el) => { el.textContent = finalCount(el); });

/* Content is visible by default. Only commit .has-motion after setup succeeds.
   Both synchronous setup and later animation callbacks fail open. */
function showStatic() {
  reduced = true;
  root.classList.remove('has-motion', 'om-holding');
  root.classList.add('motion-static', 'om-wm-go');
  cleanups.forEach((stop) => { try { stop(); } catch (error) { /* Best-effort cleanup. */ } });
  cleanups.clear();
  document.querySelectorAll('.om-pre, .om-peek').forEach((el) => el.remove());
  document.querySelectorAll('[data-reveal], .split-words').forEach((el) => el.classList.add('is-in'));
  document.querySelectorAll('.count').forEach((el) => { el.textContent = finalCount(el); });
  document.querySelectorAll('.hero-content, .hero-film, .stagger-lines .line, .pill').forEach((el) => {
    ['opacity', 'transform', 'translate'].forEach((property) => el.style.removeProperty(property));
  });
  document.querySelectorAll('.territory-card').forEach((el) => {
    el.style.removeProperty('--om-tx');
    el.style.removeProperty('--om-ty');
  });
  document.querySelectorAll('.om-system path').forEach((el) => {
    el.style.removeProperty('stroke-dasharray');
    el.style.removeProperty('stroke-dashoffset');
  });
  document.querySelectorAll('.om-system .pulse').forEach((el, i) => {
    el.setAttribute('cx', '200');
    el.setAttribute('cy', String(40 + i * 240));
    el.style.opacity = '.75';
  });
  document.querySelectorAll('.approach li').forEach((el) => el.classList.add('om-past'));
  document.querySelectorAll('.om-signoff-mark').forEach((el) => el.style.setProperty('--om-fill', '100%'));
  document.querySelectorAll('.hero-film video').forEach((el) => { try { el.pause(); } catch (error) { /* Still images remain. */ } });
  document.querySelector('.hero-film')?.classList.remove('has-video');
  const control = document.querySelector('.film-control');
  if (control) control.hidden = true;
}

function failOpen(error) {
  showStatic();
  console.warn('Moezy: animation unavailable; showing the static page.', error);
}
function feature(setup) {
  try { setup(); } catch (error) { failOpen(error); }
}
function guard(callback) {
  return (...args) => {
    if (reduced) return;
    try { callback(...args); } catch (error) { failOpen(error); }
  };
}
function queueFrame(callback) {
  if (reduced) return;
  let stop;
  const id = window.requestAnimationFrame(guard((now) => {
    cleanups.delete(stop);
    callback(now);
  }));
  stop = () => window.cancelAnimationFrame(id);
  cleanups.add(stop);
}
function listen(target, type, callback, options) {
  const handler = guard(callback);
  target.addEventListener(type, handler, options);
  cleanups.add(() => target.removeEventListener(type, handler, options));
}
function observer(callback, options) {
  const io = new window.IntersectionObserver(guard(callback), options);
  cleanups.add(() => io.disconnect());
  return io;
}
function finePointer() {
  try { return window.matchMedia('(pointer:fine)').matches; } catch (error) { return false; }
}


/* ---------- 1. film control ---------- */
const control = document.querySelector('.film-control');
const film = document.querySelector('.hero-film');
const icon = control?.querySelector('.pause-icon, .play-icon');
const label = control?.querySelector('.film-label');
control?.addEventListener('click', () => {
  if (reduced) return;
  const paused = film?.classList.toggle('paused') ?? false;
  icon?.classList.toggle('pause-icon', !paused);
  icon?.classList.toggle('play-icon', paused);
  if (label) label.textContent = paused ? 'Play film' : 'Pause film';
  control.setAttribute('aria-label', paused ? 'Play background film' : 'Pause background film');
});

feature(() => {
if (reduced) return;
/* ---------- 2. split headings into masked words ---------- */
function splitWords(el, counter) {
  [...el.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((piece) => {
        if (!piece) return;
        if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(' ')); return; }
        const wr = document.createElement('span');
        wr.className = 'wr';
        const ww = document.createElement('span');
        ww.className = 'ww';
        ww.style.setProperty('--i', counter.i++);
        ww.textContent = piece;
        wr.appendChild(ww);
        frag.appendChild(wr);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
      splitWords(node, counter);
    }
  });
}
document.querySelectorAll('.split-words, .territory-card h3').forEach((el) => {
  el.setAttribute('aria-label', el.textContent.trim());
  splitWords(el, { i: 0 });
});

});

feature(() => {
if (reduced) return;
/* ---------- 3. scroll reveals ---------- */
const revealIO = observer((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revealIO.unobserve(e.target);
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal], .split-words').forEach((el) => revealIO.observe(el));

});

/* ---------- 4. manifesto lines follow the scroll ---------- */
const mlines = [...document.querySelectorAll('.stagger-lines .line')];
function paintLines() {
  mlines.forEach((l) => {
    const r = l.getBoundingClientRect();
    const p = Math.min(Math.max((innerHeight * 0.82 - r.top) / (innerHeight * 0.3), 0), 1);
    l.style.opacity = (0.08 + 0.92 * p).toFixed(3);
    l.style.translate = `0 ${((1 - p) * 24).toFixed(1)}px`;
  });
}

feature(() => {
if (reduced) return;
/* ---------- 5. counters ---------- */
const countIO = observer((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target;
    const target = Number(el.dataset.target) || 0;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    if (reduced) { el.textContent = prefix + target + suffix; return; }
    const dur = 1500, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) queueFrame(tick);
    };
    queueFrame(tick);
  });
}, { threshold: 0.7 });
document.querySelectorAll('.about .count').forEach((el) => countIO.observe(el));

});

feature(() => {
/* ---------- 6. scroll-linked effects: parallax + nav ---------- */
const heroContent = document.querySelector('.hero-content');
const hero = document.querySelector('.hero');
const header = document.querySelector('.site-header');
let ticking = false;

function onScroll() {
  const y = scrollY;
  /* hero drifts up and fades as you leave it */
  if (hero && heroContent && y < hero.offsetHeight) {
    heroContent.style.transform = `translateY(${(y * 0.18).toFixed(1)}px)`;
    heroContent.style.opacity = Math.max(1 - y / (hero.offsetHeight * 0.85), 0).toFixed(3);
    if (film) film.style.transform = `translateY(${(y * 0.08).toFixed(1)}px)`;
  }
  /* glass nav returns once the hero is gone */
  if (header && hero) header.classList.toggle('scrolled', y > hero.offsetHeight - 80);
  paintLines();
  ticking = false;
}
function requestScroll() {
  if (!ticking) { ticking = true; queueFrame(onScroll); }
}
if (!reduced) {
  listen(window, 'scroll', requestScroll, { passive: true });
  listen(window, 'resize', requestScroll, { passive: true });
  onScroll();
} else {
  mlines.forEach((l) => { l.style.opacity = 1; l.style.translate = '0 0'; });
}

});

feature(() => {
/* ---------- 7. magnetic pills ---------- */
if (!reduced && finePointer()) {
  document.querySelectorAll('.pill').forEach((b) => {
    listen(b, 'mousemove', (e) => {
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 7).toFixed(1)}px`;
    });
    listen(b, 'mouseleave', () => { b.style.translate = ''; });
  });
}


});

/* ---------- 8. straight answers accordion ---------- */
document.querySelectorAll('.qa').forEach((qa) => {
  const btn = qa.querySelector('.qa-q');
  btn?.addEventListener('click', () => {
    const open = qa.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
});

/* ============================================================
   MOTION KIT v3 additions — paste at the END of motion.js
   9.  Preloader — ≈1.2s, once per session, click or any key
       skips it. It holds the hero intro (film keeps playing)
       and, with the v4 CSS, holds any reveal that intersects
       behind the curtain so everything plays on lift.
   10. Wordmark reveal — preloader handoff into the header,
       plus on-load fallback when the curtain is session-skipped
   11. Selected-work hover previews — abstract monochrome
       placeholders; swap in real case stills any time with
       data-preview="path.webp" on the <article>
   12. Favicon draws itself in at load (Safari and reduced
       motion keep the static SVG)
   Companion CSS: the "MOTION KIT v4" block at the end of
   styles.css. Static content remains available without this script.
   ============================================================ */
feature(() => {
  const still = reduced;

  /* ---------- 9. preloader ---------- */
  const wmGo = () => root.classList.add('om-wm-go');
  let seen = false;
  try { seen = window.sessionStorage.getItem('om-pre') === '1'; } catch (error) { seen = true; }
  if (still || location.hash || seen) {
    if (still) wmGo(); else queueFrame(() => queueFrame(wmGo));
  } else {
    try { window.sessionStorage.setItem('om-pre', '1'); } catch (e) { /* private mode */ }
    root.classList.add('om-holding');
    const curtain = document.createElement('div');
    curtain.className = 'om-pre';
    curtain.setAttribute('role', 'presentation');
    curtain.innerHTML =
      '<div class="om-pre-mark" aria-hidden="true">' +
      [...'MOEZY.'].map((ch, i) => `<span class="om-pre-l" style="--i:${i}">${ch}</span>`).join('') +
      '</div><div class="om-pre-line" aria-hidden="true"></div><div class="om-pre-count" aria-hidden="true">00</div>';
    document.body.appendChild(curtain);
    const count = curtain.querySelector('.om-pre-count');
    let done = false;
    const lift = () => {
      if (done) return;
      done = true;
      count.textContent = '100';
      curtain.classList.add('out');
      root.classList.remove('om-holding');
      wmGo();
      setTimeout(() => curtain.remove(), 750);
    };
    listen(curtain, 'click', lift);
    listen(window, 'keydown', lift, { once: true });
    // A stalled animation frame must never leave the curtain over the page.
    const deadline = setTimeout(guard(lift), 1800);
    cleanups.add(() => clearTimeout(deadline));
    const t0 = performance.now(), dur = 1100;
    const tick = (now) => {
      if (done) return;
      const p = Math.min((now - t0) / dur, 1);
      count.textContent = String(Math.round(p * 100)).padStart(2, '0');
      if (p < 1) queueFrame(tick); else lift();
    };
    queueFrame(tick);
  }

});

feature(() => {
  /* ---------- 10. wordmark letters ---------- */
  document.querySelectorAll('.wordmark').forEach((wm) => {
    if (wm.querySelector('.wm-l')) return;
    if (!wm.getAttribute('aria-label')) wm.setAttribute('aria-label', wm.textContent.trim());
    const frag = document.createDocumentFragment();
    let i = 0;
    [...wm.childNodes].forEach((node) => {
      const isDot = node.nodeType === Node.ELEMENT_NODE;
      [...node.textContent].forEach((ch) => {
        if (!ch.trim()) return;
        const s = document.createElement('span');
        s.className = isDot ? 'wm-l wm-dot' : 'wm-l';
        s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--i', i++);
        s.textContent = ch;
        frag.appendChild(s);
      });
    });
    wm.replaceChildren(frag);
  });

});

feature(() => {
  const still = reduced;
  /* ---------- 11. selected-work hover previews ---------- */
  const cases = [...document.querySelectorAll('.work-list article')];
  if (cases.length && finePointer() && !still) {
    /* striped monochrome placeholders — replaced by any
       data-preview="..." you add to a case <article> */
    const placeholder = (n) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
      '<defs><pattern id="s" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="14" height="14" fill="#1d1d1c"/><rect width="7" height="14" fill="#222221"/></pattern></defs>' +
      '<rect width="800" height="600" fill="url(#s)"/>' +
      `<text x="760" y="96" text-anchor="end" font-family="monospace" font-size="56" fill="#3a3a38">${n}</text>` +
      `<text x="36" y="556" font-family="monospace" font-size="21" fill="#8a8a86">case still ${n} — drop real image</text>` +
      '</svg>');
    const stills = [placeholder('01'), placeholder('02'), placeholder('03')];
    const peek = document.createElement('div');
    peek.className = 'om-peek';
    peek.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.alt = '';
    peek.appendChild(img);
    document.body.appendChild(peek);
    let mx = 0, my = 0, gx = 0, gy = 0, showing = false;
    listen(window, 'mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    cases.forEach((art, n) => {
      const src = art.dataset.preview || stills[n % stills.length];
      listen(art, 'mouseenter', () => {
        img.src = src;
        if (!showing) { gx = mx; gy = my; }
        showing = true;
        peek.classList.add('on');
      });
      listen(art, 'mouseleave', () => { showing = false; peek.classList.remove('on'); });
    });
    const glide = () => {
      gx += (mx - gx) * 0.11;
      gy += (my - gy) * 0.11;
      if (showing || peek.classList.contains('on')) {
        const tilt = Math.max(-8, Math.min(8, (mx - gx) * 0.035));
        peek.style.transform = `translate(${(gx + 26).toFixed(1)}px, ${(gy - 86).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
      }
      queueFrame(glide);
    };
    glide();
  }

});

feature(() => {
  const still = reduced;
  /* ---------- 12. favicon draws itself in ---------- */
  const icon = document.querySelector('link[rel="icon"]');
  const safari = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|android/i.test(navigator.userAgent);
  if (icon && !still && !safari && typeof Path2D === 'function') {
    const tile = document.createElement('canvas');
    tile.width = 64;
    tile.height = 64;
    const ctx = tile.getContext('2d');
    const originalHref = icon.getAttribute('href');
    const originalType = icon.type;
    cleanups.add(() => { icon.setAttribute('href', originalHref); icon.type = originalType; });
    if (ctx && ctx.roundRect) {
      /* the M from assets/favicon.svg */
      const m = new Path2D('M8 23V9H11.2L16 17.1L20.8 9H24V23H20.9V14.4L17.1 20.8H14.9L11.1 14.4V23H8Z');
      const frame = (p) => {
        const e = 1 - Math.pow(1 - p, 3);
        ctx.clearRect(0, 0, 64, 64);
        ctx.save();
        ctx.scale(2, 2);
        ctx.beginPath();
        ctx.roundRect(0, 0, 32, 32, 8);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.clip();
        ctx.translate(0, (1 - e) * 15);
        ctx.globalAlpha = Math.min(1, p * 1.7);
        ctx.fillStyle = '#F5F5F0';
        ctx.fill(m);
        ctx.restore();
        icon.type = 'image/png';
        icon.href = tile.toDataURL('image/png');
      };
      let f = 0;
      const steps = 14;
      const timer = setInterval(guard(() => {
        f += 1;
        frame(f / steps);
        if (f >= steps) clearInterval(timer);
      }), 70);
      cleanups.add(() => clearInterval(timer));
    }
  }
});

/* ============================================================
   MOTION KIT v5 additions — animated in-page assets
   13. Growth-system diagram: rendered after the model copy;
       hairlines draw with your scroll, pulses travel the
       system once it is fully drawn
   14. Approach tracker: movement numbers light as you pass
   Companion CSS: the "MOTION KIT v5" block in styles.css.
   Static content remains available without this script.
   ============================================================ */
feature(() => {
  const still = reduced;
  /* ---------- 13. growth-system diagram ---------- */
  // The full diagram lives in HTML; only its animation needs SVG geometry APIs.
  const board = document.querySelector('.om-system');
  const paths = board ? [...board.querySelectorAll('path')] : [];
  const pulses = board ? [...board.querySelectorAll('.pulse')].map((el, i) => ({
    el, path: paths[i * 3], t: i * 0.5,
  })) : [];
  let drawn = 0;
  if (!still) paths.forEach((p) => {
    const len = p.getTotalLength();
    p.dataset.len = len;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });

  /* ---------- 14. approach tracker ---------- */
  const moves = [...document.querySelectorAll('.approach ol li')];

  const paint = () => {
    const vh = innerHeight;
    if (board) {
      const r = board.getBoundingClientRect();
      drawn = Math.min(Math.max((vh * 0.9 - r.top) / (r.height + vh * 0.35), 0), 1);
      paths.forEach((el, n) => {
        const len = parseFloat(el.dataset.len) || 0;
        const isOut = n === paths.length - 1;
        const a = isOut ? 0.55 : n * 0.09;
        const b = isOut ? 1 : 0.62 + n * 0.09;
        const q = Math.min(Math.max((drawn - a) / (b - a), 0), 1);
        el.style.strokeDashoffset = String(len * (1 - q));
      });
    }
    moves.forEach((li) => {
      li.classList.toggle('om-past', li.getBoundingClientRect().top < vh * 0.62);
    });
  };

  if (!still && (board || moves.length)) {
    let waiting = false;
    const run = () => { waiting = false; paint(); };
    const ask = () => { if (!waiting) { waiting = true; queueFrame(run); } };
    listen(window, 'scroll', ask, { passive: true });
    listen(window, 'resize', ask, { passive: true });
    paint();
  } else if (still) {
    moves.forEach((li) => li.classList.add('om-past'));
  }

  /* pulses travel the system once it is drawn */
  if (!still && pulses.length) {
    let last = performance.now();
    const loop = (now) => {
      const dt = now - last;
      last = now;
      if (drawn > 0.97) {
        pulses.forEach((pu) => {
          pu.t += dt / 2600;
          if (pu.t >= 1) {
            pu.t = 0;
            pu.path = paths[Math.floor(Math.random() * (paths.length - 1))];
          }
          const len = parseFloat(pu.path.dataset.len) || 0;
          if (len > 0) {
            const e = pu.t < 0.5 ? 2 * pu.t * pu.t : 1 - Math.pow(-2 * pu.t + 2, 2) / 2;
            const pt = pu.path.getPointAtLength(len * e);
            pu.el.setAttribute('cx', pt.x);
            pu.el.setAttribute('cy', pt.y);
            pu.el.style.opacity = String(Math.sin(pu.t * Math.PI));
          }
        });
      } else {
        pulses.forEach((pu) => { pu.el.style.opacity = '0'; });
      }
      queueFrame(loop);
    };
    queueFrame(loop);
  }
});

/* ============================================================
   MOTION KIT v6 additions — paste stays at the END of motion.js
   15. Territory cards tilt subtly toward the cursor
   16. Why-now stats roll like odometers (About keeps count-up)
   17. Sign-off band above the footer; the outline
       MOEZY. fills with your scroll
   18. Living hero: a generative light-streak layer animates
       over the graded stills. It honours the Pause film
       control, sleeps offscreen and in hidden tabs. When real
       footage exists, add data-hero-video="assets/hero.webm"
       to .hero-film — it swaps in with the same grade and the
       stills stay as the fallback.
   Companion CSS: the "MOTION KIT v6" block in styles.css.
   ============================================================ */
feature(() => {
  const still = reduced;

  /* ---------- 15. territory tilt ---------- */
  if (finePointer() && !still) {
    document.querySelectorAll('.territory-card').forEach((card) => {
      listen(card, 'mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const tx = ((e.clientX - r.left) / r.width - 0.5) * 6.5;
        const ty = (0.5 - (e.clientY - r.top) / r.height) * 4.5;
        card.style.setProperty('--om-tx', tx.toFixed(2) + 'deg');
        card.style.setProperty('--om-ty', ty.toFixed(2) + 'deg');
      });
      listen(card, 'mouseleave', () => {
        card.style.setProperty('--om-tx', '0deg');
        card.style.setProperty('--om-ty', '0deg');
      });
    });
  }

});

feature(() => {
  const still = reduced;
  /* ---------- 16. odometer stats (why-now only) ---------- */
  if (!still) {
    document.querySelectorAll('.whynow .count').forEach((el) => {
      const target = String(el.dataset.target || '0');
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      el.setAttribute('aria-label', prefix + target + suffix);
      const wrap = document.createElement('span');
      wrap.className = 'om-odwrap';
      wrap.setAttribute('aria-hidden', 'true');
      if (prefix) wrap.append(prefix);
      [...target].forEach((ch, i) => {
        if (!/[0-9]/.test(ch)) { wrap.append(ch); return; }
        const od = document.createElement('span');
        od.className = 'om-od';
        const reel = document.createElement('span');
        reel.className = 'om-od-reel';
        reel.style.setProperty('--n', ch);
        reel.style.setProperty('--d', i);
        for (let d = 0; d <= 9; d += 1) {
          const s = document.createElement('span');
          s.textContent = String(d);
          reel.appendChild(s);
        }
        od.appendChild(reel);
        wrap.appendChild(od);
      });
      if (suffix) wrap.append(suffix);
      el.textContent = '';
      el.appendChild(wrap);
    });
  }

});

feature(() => {
  const still = reduced;
  /* ---------- 17. sign-off band ---------- */
  const band = document.querySelector('.om-signoff');
  const mark = band?.querySelector('.om-signoff-mark');
  if (band && mark && !still) {
    let waiting = false;
    const fill = () => {
      waiting = false;
      const r = band.getBoundingClientRect();
      // The last graphic must finish even when there is little page left to scroll.
      const start = scrollY + r.top - innerHeight * 0.92;
      const end = Math.min(start + r.height + innerHeight * 0.3, document.documentElement.scrollHeight - innerHeight);
      const p = Math.min(Math.max((scrollY - start) / Math.max(end - start, 1), 0), 1);
      mark.style.setProperty('--om-fill', (p * 100).toFixed(1) + '%');
    };
    const ask = () => { if (!waiting) { waiting = true; queueFrame(fill); } };
    listen(window, 'scroll', ask, { passive: true });
    listen(window, 'resize', ask, { passive: true });
    fill();
  }

});

feature(() => {
  const still = reduced;
  /* ---------- 18. living hero ---------- */
  const filmEl = document.querySelector('.hero-film');
  if (filmEl) {
    const cv = document.createElement('canvas');
    cv.className = 'om-herofx';
    cv.setAttribute('aria-hidden', 'true');
    filmEl.appendChild(cv);
    const cx = cv.getContext('2d');
    if (!cx) { cv.remove(); return; }
    let W = 0, H = 0;
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = filmEl.clientWidth; H = filmEl.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, W, H);
    };
    fit();
    listen(window, 'resize', fit, { passive: true });
    const streaks = [];
    for (let i = 0; i < 26; i += 1) {
      streaks.push({
        x: Math.random() * 1.2 - 0.1,
        y: Math.random(),
        v: (Math.random() * 0.6 + 0.2) * 0.0011,
        l: Math.random() * 0.13 + 0.03,
        a: Math.random() * 0.1 + 0.03,
        w: Math.random() < 0.2 ? 1.5 : 1,
      });
    }
    let vis = true;
    if (!still) observer((en) => { vis = en[0].isIntersecting; }).observe(filmEl);
    const step = () => {
      queueFrame(step);
      if (!vis || document.hidden || filmEl.classList.contains('paused')) return;
      cx.fillStyle = 'rgba(0,0,0,.13)';
      cx.fillRect(0, 0, W, H);
      cx.strokeStyle = '#f5f5f0';
      streaks.forEach((s) => {
        s.x += s.v;
        if (s.x - s.l > 1.1) { s.x = -0.12; s.y = Math.random(); }
        cx.globalAlpha = s.a;
        cx.lineWidth = s.w;
        const y = s.y * H;
        cx.beginPath();
        cx.moveTo(s.x * W, y);
        cx.lineTo((s.x - s.l) * W, y);
        cx.stroke();
      });
      cx.globalAlpha = 1;
    };
    step();
  }
});

feature(() => {
  const filmEl = document.querySelector('.hero-film');
  /* optional real footage: data-hero-video="assets/hero.webm" */
  const src = filmEl && filmEl.dataset.heroVideo;
  if (filmEl && src && !reduced) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('aria-hidden', 'true');
    v.src = src;
    listen(v, 'canplay', () => {
      if (reduced || filmEl.classList.contains('paused')) return;
      v.play().then(() => {
        if (!reduced) filmEl.classList.add('has-video'); else v.pause();
      }).catch(() => { filmEl.classList.remove('has-video'); });
    }, { once: true });
    v.addEventListener('error', () => { filmEl.classList.remove('has-video'); v.remove(); }, { once: true });
    filmEl.appendChild(v);
    const ctl = document.querySelector('.film-control');
    if (ctl) listen(ctl, 'click', () => {
      if (filmEl.classList.contains('paused')) v.pause();
      else v.play().then(() => {
        if (!reduced) filmEl.classList.add('has-video'); else v.pause();
      }).catch(() => { filmEl.classList.remove('has-video'); });
    });
  }
});

// An available but stalled frame API is also a failure, not a reason to hide content.
feature(() => {
  if (reduced) return;
  let ready = false;
  queueFrame(() => { ready = true; });
  const deadline = setTimeout(() => {
    if (!ready) failOpen(new Error('Animation frames did not start'));
  }, 2000);
  cleanups.add(() => clearTimeout(deadline));
});

// Commit the enhancement only after every synchronous feature has had a chance
// to initialize. Reduced motion and failed features share the same final state.
if (reduced) showStatic();
else root.classList.add('has-motion');

// Honour an OS preference change during an animation, not only at page load.
if (preference) {
  const change = (event) => { if (event.matches) showStatic(); };
  try {
    if (preference.addEventListener) preference.addEventListener('change', change);
    else if (preference.addListener) preference.addListener(change);
  } catch (error) { failOpen(error); }
}
})();
