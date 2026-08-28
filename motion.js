/* Moezy — motion.js (v2)
   1. Hero film pause/play (original behaviour)
   2. Word-by-word masked reveals on the big headings
   3. Scroll reveals for anything marked data-reveal
   4. Scroll-driven manifesto lines (opacity follows your scroll)
   5. Proof-grid counters
   6. Hero parallax, returning glass nav, magnetic pills
   All of it switches on via .has-motion, so if JS ever fails
   the site stays fully visible. */

document.documentElement.classList.add('has-motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. film control ---------- */
const control = document.querySelector('.film-control');
const film = document.querySelector('.hero-film');
const icon = control?.querySelector('.pause-icon, .play-icon');
const label = control?.querySelector('.film-label');
control?.addEventListener('click', () => {
  const paused = film?.classList.toggle('paused') ?? false;
  icon?.classList.toggle('pause-icon', !paused);
  icon?.classList.toggle('play-icon', paused);
  if (label) label.textContent = paused ? 'Play film' : 'Pause film';
  control.setAttribute('aria-label', paused ? 'Play background film' : 'Pause background film');
});

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

/* ---------- 3. scroll reveals ---------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revealIO.unobserve(e.target);
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal], .split-words').forEach((el) => revealIO.observe(el));

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

/* ---------- 5. counters ---------- */
const countIO = new IntersectionObserver((entries) => {
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
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.7 });
document.querySelectorAll('.count').forEach((el) => countIO.observe(el));

/* ---------- 6. scroll-linked effects: parallax + nav ---------- */
const heroContent = document.querySelector('.hero-content');
const hero = document.querySelector('.hero');
const header = document.querySelector('.site-header');
let ticking = false;

function onScroll() {
  const y = scrollY;
  /* hero drifts up and fades as you leave it */
  if (hero && y < hero.offsetHeight) {
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
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}
if (!reduced) {
  addEventListener('scroll', requestScroll, { passive: true });
  addEventListener('resize', requestScroll, { passive: true });
  onScroll();
} else {
  mlines.forEach((l) => { l.style.opacity = 1; l.style.translate = '0 0'; });
}

/* ---------- 7. magnetic pills ---------- */
if (!reduced && matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.pill').forEach((b) => {
    b.addEventListener('mousemove', (e) => {
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 7).toFixed(1)}px`;
    });
    b.addEventListener('mouseleave', () => { b.style.translate = ''; });
  });
}


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
   styles.css. No index.html changes required.
   ============================================================ */
(() => {
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;

  /* ---------- 9. preloader ---------- */
  const wmGo = () => root.classList.add('om-wm-go');
  if (still || location.hash || sessionStorage.getItem('om-pre')) {
    requestAnimationFrame(() => requestAnimationFrame(wmGo));
  } else {
    try { sessionStorage.setItem('om-pre', '1'); } catch (e) { /* private mode */ }
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
    curtain.addEventListener('click', lift);
    addEventListener('keydown', lift, { once: true });
    const t0 = performance.now(), dur = 1100;
    const tick = (now) => {
      if (done) return;
      const p = Math.min((now - t0) / dur, 1);
      count.textContent = String(Math.round(p * 100)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(tick); else lift();
    };
    requestAnimationFrame(tick);
  }

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

  /* ---------- 11. selected-work hover previews ---------- */
  const cases = [...document.querySelectorAll('.work-list article')];
  if (cases.length && finePointer && !still) {
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
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    cases.forEach((art, n) => {
      const src = art.dataset.preview || stills[n % stills.length];
      art.addEventListener('mouseenter', () => {
        img.src = src;
        if (!showing) { gx = mx; gy = my; }
        showing = true;
        peek.classList.add('on');
      });
      art.addEventListener('mouseleave', () => { showing = false; peek.classList.remove('on'); });
    });
    const glide = () => {
      gx += (mx - gx) * 0.11;
      gy += (my - gy) * 0.11;
      if (showing || peek.classList.contains('on')) {
        const tilt = Math.max(-8, Math.min(8, (mx - gx) * 0.035));
        peek.style.transform = `translate(${(gx + 26).toFixed(1)}px, ${(gy - 86).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
      }
      requestAnimationFrame(glide);
    };
    glide();
  }

  /* ---------- 12. favicon draws itself in ---------- */
  const icon = document.querySelector('link[rel="icon"]');
  const safari = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|android/i.test(navigator.userAgent);
  if (icon && !still && !safari && typeof Path2D === 'function') {
    const tile = document.createElement('canvas');
    tile.width = 64;
    tile.height = 64;
    const ctx = tile.getContext('2d');
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
      const timer = setInterval(() => {
        f += 1;
        frame(f / steps);
        if (f >= steps) clearInterval(timer);
      }, 70);
    }
  }
})();

/* ============================================================
   MOTION KIT v5 additions — animated in-page assets
   13. Growth-system diagram: injected after the model copy;
       hairlines draw with your scroll, pulses travel the
       system once it is fully drawn
   14. Approach tracker: movement numbers light as you pass
   Companion CSS: the "MOTION KIT v5" block in styles.css.
   No index.html changes required.
   ============================================================ */
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };

  /* ---------- 13. growth-system diagram ---------- */
  const home = document.querySelector('.model .model-copy');
  const paths = [];
  const pulses = [];
  let board = null;
  let drawn = 0;
  if (home && !document.querySelector('.om-system')) {
    const wrap = document.createElement('div');
    wrap.className = 'om-system';
    wrap.setAttribute('aria-hidden', 'true');
    const svg = mk('svg', { viewBox: '0 0 1200 400', preserveAspectRatio: 'xMidYMid meet' });
    ['Strategy', 'Partnerships', 'Talent', 'Creative', 'Market entry'].forEach((name, n) => {
      const y = 40 + n * 80;
      const p = mk('path', { d: 'M200 ' + y + ' C 400 ' + y + ', 440 200, 636 200' });
      svg.appendChild(p);
      paths.push(p);
      svg.appendChild(mk('circle', { class: 'node', cx: 200, cy: y, r: 3 }));
      const t = mk('text', { x: 186, y: y + 4, 'text-anchor': 'end' });
      t.textContent = name.toUpperCase();
      svg.appendChild(t);
    });
    const out = mk('path', { d: 'M664 200 H 1030' });
    svg.appendChild(out);
    paths.push(out);
    svg.appendChild(mk('circle', { class: 'node', cx: 650, cy: 200, r: 5 }));
    const hub = mk('text', { x: 650, y: 236, 'text-anchor': 'middle', class: 'om-sys-hub' });
    hub.textContent = 'MOEZY.';
    svg.appendChild(hub);
    svg.appendChild(mk('circle', { class: 'node', cx: 1030, cy: 200, r: 3 }));
    const g = mk('text', { x: 1046, y: 204, class: 'om-sys-out' });
    g.textContent = 'GROWTH';
    svg.appendChild(g);
    for (let i = 0; i < 2; i += 1) {
      const c = mk('circle', { class: 'pulse', r: 2.6, cx: -10, cy: -10 });
      svg.appendChild(c);
      pulses.push({ el: c, path: paths[i * 3], t: i * 0.5 });
    }
    wrap.appendChild(svg);
    home.after(wrap);
    board = wrap;
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.dataset.len = len;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = still ? 0 : len;
    });
  }

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
    const ask = () => { if (!waiting) { waiting = true; requestAnimationFrame(run); } };
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask, { passive: true });
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
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();

/* ============================================================
   MOTION KIT v6 additions — paste stays at the END of motion.js
   15. Territory cards tilt subtly toward the cursor
   16. Why-now stats roll like odometers (About keeps count-up)
   17. Sign-off band injected above the footer; the outline
       MOEZY. fills with your scroll
   18. Living hero: a generative light-streak layer animates
       over the graded stills. It honours the Pause film
       control, sleeps offscreen and in hidden tabs. When real
       footage exists, add data-hero-video="assets/hero.webm"
       to .hero-film — it swaps in with the same grade and the
       stills stay as the fallback.
   Companion CSS: the "MOTION KIT v6" block in styles.css.
   ============================================================ */
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;

  /* ---------- 15. territory tilt ---------- */
  if (finePointer && !still) {
    document.querySelectorAll('.territory-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const tx = ((e.clientX - r.left) / r.width - 0.5) * 6.5;
        const ty = (0.5 - (e.clientY - r.top) / r.height) * 4.5;
        card.style.setProperty('--om-tx', tx.toFixed(2) + 'deg');
        card.style.setProperty('--om-ty', ty.toFixed(2) + 'deg');
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--om-tx', '0deg');
        card.style.setProperty('--om-ty', '0deg');
      });
    });
  }

  /* ---------- 16. odometer stats (why-now only) ---------- */
  if (!still) {
    document.querySelectorAll('.whynow .count').forEach((el) => {
      try { countIO.unobserve(el); } catch (e) { /* counter renamed upstream */ }
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

  /* ---------- 17. sign-off band ---------- */
  const foot = document.querySelector('footer');
  let mark = null;
  let band = null;
  if (foot && !document.querySelector('.om-signoff')) {
    band = document.createElement('div');
    band.className = 'om-signoff';
    band.setAttribute('aria-hidden', 'true');
    mark = document.createElement('span');
    mark.className = 'om-signoff-mark';
    mark.textContent = 'MOEZY.';
    band.appendChild(mark);
    foot.before(band);
  }
  if (band && !still) {
    let waiting = false;
    const fill = () => {
      waiting = false;
      const r = band.getBoundingClientRect();
      const p = Math.min(Math.max((innerHeight * 0.92 - r.top) / (r.height + innerHeight * 0.3), 0), 1);
      mark.style.setProperty('--om-fill', (p * 100).toFixed(1) + '%');
    };
    const ask = () => { if (!waiting) { waiting = true; requestAnimationFrame(fill); } };
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask, { passive: true });
    fill();
  }

  /* ---------- 18. living hero ---------- */
  const filmEl = document.querySelector('.hero-film');
  if (filmEl && !still) {
    const cv = document.createElement('canvas');
    cv.className = 'om-herofx';
    cv.setAttribute('aria-hidden', 'true');
    filmEl.appendChild(cv);
    const cx = cv.getContext('2d');
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
    addEventListener('resize', fit, { passive: true });
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
    new IntersectionObserver((en) => { vis = en[0].isIntersecting; }).observe(filmEl);
    const step = () => {
      requestAnimationFrame(step);
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
  /* optional real footage: data-hero-video="assets/hero.webm" */
  const src = filmEl && filmEl.dataset.heroVideo;
  if (filmEl && src) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('aria-hidden', 'true');
    v.src = src;
    v.addEventListener('canplay', () => {
      filmEl.classList.add('has-video');
      v.play().catch(() => {});
    }, { once: true });
    v.addEventListener('error', () => v.remove(), { once: true });
    filmEl.appendChild(v);
    const ctl = document.querySelector('.film-control');
    if (ctl) ctl.addEventListener('click', () => {
      if (filmEl.classList.contains('paused')) v.pause(); else v.play().catch(() => {});
    });
  }
})();
