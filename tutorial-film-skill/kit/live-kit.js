// Live-demonstration kit: the motion helpers of a "live demo" tutorial film.
// Every state is a pure function of film time T (seconds), so any frame can be sought and replayed.
// A film writes one render(T) that calls these helpers, then LiveKit.mount(render, duration).
// Usage and examples: ../SKILL.md and ../README.md
(function () {
  const F = 1 / 30;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const Eout = (p) => 1 - Math.pow(1 - clamp(p), 3); // fast in, soft landing: objects moving into place
  const Eio = (p) => (1 - Math.cos(Math.PI * clamp(p))) / 2; // ease in-out: cursor travel, prop keyframes
  const P = (T, a, b) => clamp((T - a) / (b - a)); // progress of T through [a, b]
  // piecewise keyframes [[t, value], ...]
  const kf = (T, keys, ease = Eio) => {
    if (T <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (T < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease((T - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    return keys[keys.length - 1][1];
  };
  // cubic Bézier point at p
  const bez = (p, P0, P1, P2, P3) => {
    const q = 1 - p;
    return [0, 1].map((k) => q * q * q * P0[k] + 3 * q * q * p * P1[k] + 3 * q * p * p * P2[k] + p * p * p * P3[k]);
  };
  // a path over time: [[t, x, y], ...] eased between points; a point may be ["bez", t0, t1, P0, P1, P2, P3]
  const route = (T, points, ease = Eio) => {
    let last = null;
    for (const pt of points) {
      if (pt[0] === "bez") {
        const [, t0, t1, P0, P1, P2, P3] = pt;
        if (T < t0) return last ? lerp2(last.xy, P0, ease(P(T, last.t, t0))) : P0;
        if (T < t1) return bez(ease(P(T, t0, t1)), P0, P1, P2, P3);
        last = { t: t1, xy: P3 };
      } else {
        const [t, x, y] = pt;
        if (T < t) return last ? lerp2(last.xy, [x, y], ease(P(T, last.t, t))) : [x, y];
        last = { t, xy: [x, y] };
      }
    }
    return last.xy;
  };
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  // ---- element helpers ------------------------------------------------------------------------------------------
  const box = (el, x, y, w, h) => {
    if (x != null) el.style.left = x + "px";
    if (y != null) el.style.top = y + "px";
    if (w != null) { el.style.width = w + "px"; el.style.height = h + "px"; }
  };
  const place = (el, x, y, w, h, r = 0, s = 1) => { box(el, x, y, w, h); el.style.transform = `rotate(${r}deg) scale(${s})`; };
  const show = (el, a) => { el.style.opacity = a; el.style.visibility = a > 0.001 ? "visible" : "hidden"; };
  // the dot-shadow image of an object, stretched to the object (shadows are drawn 40 px larger than their object)
  const fitShadow = (img, w, h) => { img.style.width = w + 40 + "px"; img.style.height = h + 40 + "px"; };

  // "land": an object set down in 8 frames — scale .82 → 1.04 → 1, y +34 → -4 → 0
  const land = (T, t0) => ({
    a: clamp((T - t0) / (3 * F)),
    s: kf(T, [[t0, 0.82], [t0 + 5 * F, 1.04], [t0 + 8 * F, 1]]),
    y: kf(T, [[t0, 34], [t0 + 5 * F, -4], [t0 + 8 * F, 0]]),
  });
  // a stamp word: 6 frames, scale 1.15 → .98 → 1, rotation -5 → -3; leaves at tOut (6 frames, up 12 px). size scales the 128 px face.
  const stamp = (el, T, t0, tOut = 1e9, size = 1) => {
    const s = kf(T, [[t0, 1.15], [t0 + 4 * F, 0.98], [t0 + 6 * F, 1]]), r = kf(T, [[t0, -5], [t0 + 6 * F, -3]]);
    const out = P(T, tOut, tOut + 6 * F);
    show(el, T < t0 ? 0 : clamp((T - t0) / (3 * F)) * (1 - out));
    el.style.transform = `translateY(${-12 * Eout(out)}px) rotate(${r}deg) scale(${s * 0.76 * size}, ${s * 0.94 * size})`;
  };
  // an object leaving: 6 frames, up 12 px and out
  const leave = (T, t0) => ({ a: 1 - P(T, t0, t0 + 6 * F), y: -12 * Eout(P(T, t0, t0 + 6 * F)) });

  // ---- subtitle: one line of words appearing on their alignment times; pages = [[pageId, [t per word], endTime], ...]
  const subtitles = (T, pages) => {
    for (const [id, times, end] of pages) {
      const pg = document.getElementById(id), out = P(T, end - 3 * F, end);
      pg.style.opacity = 1 - out; pg.style.transform = `translateY(${-6 * Eout(out)}px)`;
      [...pg.querySelectorAll(".w")].forEach((w, i) => {
        const u = times[i] == null ? 0 : Eout(P(T, times[i], times[i] + 4 * F));
        w.style.opacity = u; w.style.transform = `translateY(${8 * (1 - u)}px)`;
      });
    }
  };

  // ---- step badge: one element, the number of each step pops big then shrinks to the corner;
  // starts = [t of step 1, t of step 2, ...]; the badge slides right and fades before the next step and at end
  const stepBadge = (el, T, starts, end, big = [610, 350], corner = [918, 210], shrinkAfter = 0.4) => {
    const block = el.querySelector(".block"), shadow = el.querySelector(".shadow");
    const n = starts.filter((b) => T >= b).length;
    if (n === 0) { el.style.opacity = 0; return; }
    const t0 = starts[n - 1], next = n < starts.length ? starts[n] : end;
    block.textContent = n;
    const s = kf(T, [[t0, 0.64], [t0 + 8 * F, 1.07], [t0 + 12 * F, 1]]);
    const y = kf(T, [[t0, 18], [t0 + 8 * F, -4], [t0 + 12 * F, 0]]);
    const st = t0 + shrinkAfter, u = Eout(P(T, st, st + 11 * F));
    const r = T < st ? kf(T, [[t0, -8], [t0 + 8 * F, -3], [t0 + 12 * F, -4]]) : lerp(-4, -3, u);
    const w = lerp(172, 76, u), h = lerp(180, 80, u), gone = Eio(P(T, next - 0.3, next));
    box(el, lerp(big[0], corner[0], u) + 90 * gone, lerp(big[1], corner[1], u), w, h);
    block.style.fontSize = lerp(145, 62, u) + "px"; block.style.lineHeight = h + "px"; block.style.borderRadius = lerp(20, 12, u) + "px";
    block.style.boxShadow = `${lerp(6, 3, u)}px ${lerp(8, 4, u)}px 0 #4a414d, ${lerp(6, 3, u)}px ${lerp(9, 5, u)}px 0 1px #19151d`;
    block.style.letterSpacing = lerp(-8, -3, u) + "px";
    if (shadow) fitShadow(shadow, w, h);
    el.style.opacity = clamp((T - t0) / (3 * F)) * (1 - gone);
    el.style.transform = `translateY(${T < st ? y : 0}px) rotate(${r}deg) scale(${T < st ? s : 1})`;
  };

  // ---- cursor: draws the arrow at path(T); clicks press it and leave a ring; while held (dragging) it stays pressed
  // opts: { clicks: [t...], held: [[t0, t1]...], from: t it appears, until: t it fades }
  const cursor = (curEl, ringEl, T, path, opts = {}) => {
    const { clicks = [], held = [], from = 0, until = 1e9 } = opts;
    const [x, y] = path(T);
    let s = 1;
    for (const c of clicks) {
      if (T >= c && T < c + 2 * F) s = lerp(1, 0.82, (T - c) / (2 * F));
      else if (T >= c + 2 * F && T < c + 6 * F) s = lerp(0.82, 1, (T - c - 2 * F) / (4 * F));
    }
    for (const [a, b] of held) if (T >= a + 2 * F && T < b) s = 0.88;
    curEl.style.opacity = T < from ? 0 : clamp((T - from) / (4 * F)) * (1 - P(T, until, until + 0.48));
    curEl.style.left = x - 3 + "px"; curEl.style.top = y - 2 + "px"; curEl.style.transform = `scale(${s})`;
    let rr = 0, ra = 0, rx = x, ry = y;
    for (const c of clicks.concat(held.map((h) => h[1]))) if (T >= c && T < c + 8 * F) { const u = (T - c) / (8 * F); rr = lerp(12, 24, Eout(u)); ra = lerp(0.8, 0, u); [rx, ry] = path(c); }
    if (ringEl) { ringEl.style.opacity = ra; ringEl.style.width = ringEl.style.height = rr * 2 + "px"; ringEl.style.left = rx - rr + "px"; ringEl.style.top = ry - rr + "px"; }
  };

  // ---- typing: segs = [[t0, t1, text, clearAt?], ...] → the text typed so far (each seg cleared at clearAt)
  const typed = (T, segs) => {
    let s = "";
    for (const [a, b, text, clearAt] of segs) if (T >= a && (clearAt == null || T < clearAt)) s += text.slice(0, Math.round(text.length * P(T, a, b)));
    return s;
  };
  // a stroke drawn along an SVG path (strike-through, circle, tick)
  const drawStroke = (pathEl, T, t0, t1) => { const L = pathEl.getTotalLength(); pathEl.style.strokeDasharray = L; pathEl.style.strokeDashoffset = L * (1 - P(T, t0, t1)); };

  // ---- a file dropped into a folder: flies to just above the folder mouth (clear of the front), goes behind the front
  // there, then drops in. Returns { x, y, u (flight progress), inside } — put the file between .fold-back and .fold-front.
  const intoFolder = (T, t0, t1, t2, from, apex, to) => {
    const u = Eio(P(T, t0, t1)), d = P(T, t1, t2);
    const p = T < t1 ? bez(u, from, [from[0] + 60, from[1] - 160], [apex[0] - 40, apex[1] - 60], apex) : [apex[0], lerp(apex[1], to[1], d * d)];
    return { x: p[0], y: p[1], u, inside: T >= t1 };
  };

  // ---- end signature: the scene fades (t0 → t0 + .6), your mark and name fade in together (t0 + .7, .8 s) and hold
  const signature = (T, t0, sceneEls = ["#scene", "#host"]) => {
    const end = P(T, t0, t0 + 0.6);
    for (const s of sceneEls) { const el = $(s); if (el) el.style.opacity = end > 0 ? 1 - end : ""; }
    const sig = $("#sig"); if (!sig) return;
    sig.style.opacity = T >= t0 ? 1 : 0;
    $("#sigMark").style.opacity = $("#sigName").style.opacity = P(T, t0 + 0.7, t0 + 1.5);
  };

  // ---- mount: one paused timeline whose clock drives render(T) on every seek
  const mount = (render, duration, id = "main") => {
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true }), clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: duration, duration, ease: "none", immediateRender: false, onUpdate: () => render(clock.t) }, 0);
    render(0);
    window.__timelines[id] = tl;
    return tl;
  };

  window.LiveKit = { F, $, $$, clamp, lerp, lerp2, Eout, Eio, P, kf, bez, route, box, place, show, fitShadow, land, stamp, leave, subtitles, stepBadge, cursor, typed, drawStroke, intoFolder, signature, mount };
})();
