// Swarm build: the page is wiped to black and a swarm of coloured cursors builds it back, one layer at a time.
// Every element marked data-b is a layer. A block is dragged out as a frame (corner handles, a size tag, guides and
// a ruler reading) and fills as it grows; a picture's frame fills with a blurred preview and is then scanned in
// sharp, and pictures side by side are shown in turn, linked one to the next; a text box is dragged out, clicked
// into and typed. First the swarm scans the page, circling the avatar in two flocks; then the page is built one
// screen at a time, background first and small print last, and the view moves on only when the screen is full.
// More agents join as the page grows; an agent with nothing to do stops where it is and waits. At the end the
// swarm forms the brand mark and sinks into the mark in the footer. A bar at the bottom shows the agents and the
// layers built, and lets you replay, change speed, or skip to the finished page. Alt+Shift+S rebuilds.
(function () {
  const COLORS = ["#a78bfa", "#60a5fa", "#22d3ee", "#f472b6", "#fbbf24", "#34d399"];
  const N0 = 12, NMAX = 20, JOIN_EVERY = 6;
  const WIPE = 0.55, SCAN = 1.4, DRAW = 0.4, HOLD = 0.14, FADE = 0.22, RELEASE = 0.07, MAX_ACTIVE = 14, IGNITE = 1.5;

  // splits a length into n uneven parts, as fractions that add up to one
  const uneven = (n, spread) => { const p = Array.from({ length: n }, () => 1 + (Math.random() - 0.5) * spread), s = p.reduce((a, b) => a + b); return p.map((v) => v / s); };
  // a background marked "tiles" is cut into uneven pieces, each its own layer, so it is laid back piece by piece:
  // strips of different heights, each cut across into a few pieces of different widths
  document.querySelectorAll('[data-b="tiles"]').forEach((bg) => {
    const X = bg.offsetLeft, Y = bg.offsetTop, W = bg.offsetWidth, H = bg.offsetHeight;
    const look = getComputedStyle(bg).backgroundImage;
    let y = 0;
    for (const fh of uneven(Math.max(3, Math.round(H / 150)), 1.4)) {
      const h = fh * H;
      let x = 0;
      for (const fw of uneven(2 + Math.floor(Math.random() * 4), 1.5)) {
        const w = fw * W, t = document.createElement("div");
        Object.assign(t.style, { position: "absolute", left: X + x + "px", top: Y + y + "px", width: w + 0.5 + "px", height: h + 0.5 + "px",
          backgroundImage: look, backgroundSize: `${W}px ${H}px`, backgroundPosition: `${-x}px ${-y}px` });
        t.dataset.b = "block";
        t.dataset.tile = "1";
        bg.before(t);
        x += w;
      }
      y += h;
    }
    bg.remove();
  });
  const layers = [...document.querySelectorAll("[data-b]")].map((el) => ({ el, kind: el.dataset.b, html: el.innerHTML, state: "" }));
  // each layer's container layer, if any: a layer can't be started before its container has been drawn
  layers.forEach((L) => { const up = L.el.parentElement.closest("[data-b]"); L.parent = up ? layers.find((o) => o.el === up) : null; });
  // pictures side by side in a row (larger ones, in the same section, tops level) make a chain: their frames are
  // laid out together, then one agent shows them in turn, dragging a link from each to the next
  // the pictures in a section marked data-together go as one group instead: all laid out at once, shown at once,
  // and set playing one after another in a quick run
  document.querySelectorAll("[data-together]").forEach((sec) => {
    const at = (L) => L.el.getBoundingClientRect();
    const g = layers.filter((L) => L.kind === "image" && sec.contains(L.el)).sort((a, b) => Math.round(at(a).top / 20) - Math.round(at(b).top / 20) || at(a).left - at(b).left);
    g.together = true; g.tasks = [];
    g.forEach((L) => (L.chain = g));
  });
  const bigPics = layers.filter((L) => L.kind === "image" && L.el.getBoundingClientRect().width > 120);
  bigPics.forEach((L) => {
    if (L.chain) return;
    const r = L.el.getBoundingClientRect(), sec = L.el.closest("section");
    const row = bigPics.filter((o) => !o.chain && o.el.closest("section") === sec && Math.abs(o.el.getBoundingClientRect().top - r.top) < 12);
    if (row.length < 2) return;
    row.sort((a, b) => a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left);
    row.forEach((o) => (o.chain = row));
  });
  // a text laid over a picture (a caption on a film) is only written once the picture is there
  const pics = layers.filter((L) => L.kind === "image");
  layers.forEach((L) => {
    if (L.kind !== "text") return;
    const r = L.el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    L.over = pics.find((P) => { const q = P.el.getBoundingClientRect(); return !P.el.contains(L.el) && cx > q.left && cx < q.right && cy > q.top && cy < q.bottom; }) || null;
  });
  // in a card whose picture is shown in a chain, the card's words wait for its picture, so they are typed by the
  // other agents while the chain goes on, card by card
  layers.forEach((L) => {
    if (L.kind === "image" || L.over) return;
    const card = L.el.closest(".cell");
    const pic = card && layers.find((P) => P.kind === "image" && P.chain && card.contains(P.el));
    if (pic && !L.el.contains(pic.el)) L.after = pic; // never the card itself, which the picture waits for
  });
  // small things (an avatar, a button, a pill) pop into place when their frame is set, rather than being filled
  // in by the drag or scanned
  layers.forEach((L) => {
    const r = L.el.getBoundingClientRect();
    L.small = (L.kind === "image" && r.width < 90) || (L.kind === "block" && !L.el.dataset.tile && r.height <= 70 && r.width <= 480);
  });
  // what a screen is built in: the background first, then the big blocks, then headings and pictures, then the small print
  layers.forEach((L) => {
    const r = L.el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(L.el).fontSize);
    L.tier = L.el.dataset.tile ? 0 : L.kind === "block" && (layers.some((o) => o.parent === L) || r.width * r.height > 30000) ? 1 : L.kind === "image" || (L.kind === "text" && (fs >= 22 || L.el.textContent.length >= 24)) ? 2 : 3;
  });

  // ---- the overlay ----
  const layer = document.createElement("div");
  layer.className = "sw-layer";
  document.body.appendChild(layer);
  const black = document.createElement("div");
  black.className = "sw-black";
  // the opening wipe: a black sheet drawn down the view behind a scan line
  const wipe = document.createElement("div");
  wipe.className = "sw-wipe";
  wipe.innerHTML = "<i></i>";
  const ruler = document.createElement("canvas");
  ruler.className = "sw-ruler";
  const rctx = ruler.getContext("2d");

  // the three cursor shapes: an arrow while flying, a crosshair while dragging out a frame, an I-beam while typing
  const SHAPES = {
    arrow: (c) => `<svg viewBox="0 0 18 22" width="18" height="22" style="margin:-2px 0 0 -2px"><path d="M2 2 L2 18 L6.4 13.8 L9.4 20 L12.2 18.8 L9.3 12.7 L15 12.7 Z" fill="${c}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    cross: (c) => `<svg viewBox="0 0 20 20" width="20" height="20" style="margin:-10px 0 0 -10px"><path d="M10 2 V18 M2 10 H18" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M10 2 V18 M2 10 H18" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    ibeam: (c) => `<svg viewBox="0 0 12 22" width="12" height="22" style="margin:-11px 0 0 -6px"><path d="M2 2 H10 M6 2 V20 M2 20 H10" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M2 2 H10 M6 2 V20 M2 20 H10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  };
  // the arrow's tip points up and a little left; this turns it to point along its flight
  // the typing caret, after a zero-width space so that a line with nothing typed yet keeps the baseline of a typed one
  const CARET = '\u200b<span class="sw-caret"></span>';
  const TIP = (-127 * Math.PI) / 180;

  // ---- the control bar ----
  const bar = document.createElement("div");
  bar.className = "sw-bar";
  bar.innerHTML = `<span class="scan">正在扫描页面…<span class="prog"><s></s></span></span>
    <span class="live"><span class="av">${"FIREW".split("").map((l, i) => `<b style="background:${COLORS[i]}">${l}</b>`).join("")}</span>
    <span><b class="na">${N0}</b> 位智能体</span><span class="sep"></span><span><b class="n">0</b> <span class="muted">/ ${layers.length} 图层</span></span>
    <span class="prog"><s></s></span></span><button class="replay">重播</button><button class="speed">1×</button><button class="skip" title="直接完成">✕</button>`;
  document.body.appendChild(bar);
  const nEl = bar.querySelector(".n"), naEl = bar.querySelector(".na"), progEl = bar.querySelector(".live .prog s"), scanProg = bar.querySelector(".scan .prog s");

  let prismsOn = new Set(), igniter = null, ignited = false, scrollAnim = null, anchor = null, doneAt = 0, lastPlay = -9, finale = null, speed = 1, cursors = [], queue = [], active = [], built = 0, running = false, releaseIn = 0, last = 0, clock = 0, flocks = [], exitT = 0;

  const pageRect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
  // the text of a layer as tokens: each character, and any tag (a line break) as one token
  const tokens = (html) => html.match(/<[^>]+>|&[a-z]+;|[\s\S]/g) || [];
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function addCursor(x, y, vx, vy) {
    const i = cursors.length, el = document.createElement("div");
    el.className = "sw-cursor";
    // a name tag, shown while the agent is at work on a layer
    const tag = document.createElement("span");
    tag.className = "sw-name";
    tag.textContent = "AGENT " + String(i + 1).padStart(2, "0");
    tag.style.background = COLORS[i % COLORS.length];
    layer.append(el, tag);
    const c = { el, tag, i, x, y, vx, vy, task: null, color: COLORS[i % COLORS.length], shape: "", rot: 0, press: 1, down: false, click: 0, lastEl: null, flock: i % 2,
      // each agent has its own temper: how fast it flies, drags and types, and which way its paths bend
      pace: 0.9 + Math.random() * 0.2, typeRate: 50 + Math.random() * 50, bend: Math.random() < 0.5 ? -1 : 1 };
    setShape(c, "arrow");
    cursors.push(c);
    naEl.textContent = cursors.length;
    return c;
  }

  function setShape(c, shape) {
    if (c.shape === shape) return;
    c.shape = shape;
    c.el.innerHTML = SHAPES[shape](c.color);
  }

  function reset() {
    scrollTo(0, 0);
    // the page shows whole until the wipe has passed over it
    layers.forEach((L) => { if (L.kind === "text") L.el.innerHTML = L.html; Object.assign(L.el.style, { opacity: "", transition: "", clipPath: "" }); L.el.classList.remove("sw-hide"); L.state = ""; });
    document.querySelectorAll("video[data-b]").forEach((v) => { v.pause(); v.currentTime = 0; recOn(v, false); });
    layer.innerHTML = "";
    layer.style.opacity = "0";
    black.remove();
    document.body.append(wipe, ruler);
    wipe.style.clipPath = "inset(0 0 100% 0)";
    // the avatar in the hero is not a layer: it stays standing when the page is wiped, the swarm circles it while
    // the page is scanned, and then one agent clicks it and the light flows out of it; the light is off till then
    const face = document.querySelector(".hero .face");
    const ar = face ? pageRect(face) : { x: innerWidth / 2 - 36, y: innerHeight * 0.45 - 36, w: 72, h: 72 };
    anchor = { x: ar.x + ar.w / 2, y: ar.y + ar.h / 2, face };
    igniter = null; ignited = false;
    if (window.Prism) Prism.each((cv) => Prism.set(cv, 0));
    prismsOn = new Set();
    doneAt = 0; lastPlay = -9;
    ruler.style.opacity = "0";
    layer.style.height = document.documentElement.scrollHeight + "px";
    cursors = []; active = [];
    // the swarm comes in as two flocks circling the brand mark while the page is scanned
    const cx = anchor.x, cy = anchor.y;
    flocks = [0, 1].map((k) => ({ a: k * Math.PI, r: 180 + k * 30, x: 0, y: 0, h: 0, trail: [] }));
    for (let i = 0; i < N0; i++) {
      const a = (i % 2) * Math.PI + (Math.random() - 0.5) * 0.8;
      addCursor(cx + Math.cos(a) * 200, cy + Math.sin(a) * 160, 0, 0);
    }
    // built the way a designer would: top to bottom, and at each height the background first, then a container,
    // then what is inside it (document order), so the page grows down the view as one front
    queue = layers.map((L, i) => ({ L, i, y: Math.round(pageRect(L.el).y / 24) })).sort((a, b) => a.y - b.y || a.i - b.i).map((o) => o.L);
    built = 0; clock = 0; exitT = 0; scrollAnim = null; finale = null; stallT = 0;
    releaseIn = WIPE + SCAN;
    bar.classList.add("scanning");
    running = true;
    updateBar();
  }

  function finishAll() {
    layers.forEach((L) => { if (L.kind === "text") L.el.innerHTML = L.html; L.el.classList.remove("sw-hide"); Object.assign(L.el.style, { opacity: "", transition: "", clipPath: "" }); });
    layer.innerHTML = "";
    [black, wipe, ruler].forEach((e) => e.remove());
    if (window.Prism) Prism.each((cv) => Prism.set(cv, 1));
    document.querySelectorAll("video[data-b]").forEach((v) => { v.play().catch(() => {}); recOn(v, true); });
    document.querySelectorAll("canvas[data-gen]").forEach((cv) => (cv.dataset.live = ""));
    layer.style.opacity = "";
    bar.classList.remove("scanning");
    cursors = []; queue = []; active = [];
    built = layers.length;
    running = false;
    updateBar();
  }

  function updateBar() {
    nEl.textContent = built;
    progEl.style.width = (built / layers.length) * 100 + "%";
  }

  // ---- a cursor takes a layer: fly to its top left, drag out a frame, then fill it or type it ----
  function begin(c, L) {
    const r = pageRect(L.el); // hidden layers keep their place in the layout
    // most frames are dragged from the top left, the rest from any other corner
    const corner = L.chain && L.chain.together ? 0 : Math.random() < 0.85 ? 0 : 1 + Math.floor(Math.random() * 3);
    const ax = corner === 1 || corner === 3 ? 1 : 0, ay = corner >= 2 ? 1 : 0;
    c.task = { L, r, ax, ay, sx: r.x + ax * r.w, sy: r.y + ay * r.h, stage: "go", t: 0, aim: 0.08 + Math.random() * 0.06, typed: 0, toks: L.kind === "text" ? tokens(L.html) : null, parts: [], d0: 0 };
    // a big heading is first typed small, from its top left corner, and then dragged up to its full size
    const cs = getComputedStyle(L.el);
    if (L.kind === "text" && !L.el.dataset.count && !L.over && parseFloat(cs.fontSize) >= 30 && cs.transform === "none") {
      const t = c.task, s0 = 0.36;
      t.full = r; t.s0 = s0;
      t.r = { x: r.x, y: r.y, w: r.w * s0, h: r.h * s0 };
      t.ax = 0; t.ay = 0; t.sx = r.x; t.sy = r.y;
    }
    L.state = "busy";
    active.push(c.task);
  }

  function el(cls, style, parent = layer) {
    const e = document.createElement("div");
    e.className = cls;
    Object.assign(e.style, style);
    parent.appendChild(e);
    return e;
  }

  function makeFrame(t) {
    const { r } = t;
    // a picture's frame fills with a dim, blurred preview of it as it is dragged out
    if (t.L.kind === "image" && !t.L.el.dataset.gen && !t.L.small && t.group) {
      const g = t.L.el.cloneNode(), cs = getComputedStyle(t.L.el);
      g.classList.remove("sw-hide");
      g.removeAttribute("data-b");
      if (g.tagName === "VIDEO") { g.muted = true; g.removeAttribute("autoplay"); }
      Object.assign(g.style, { position: "absolute", left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", margin: 0, transform: "none", objectFit: cs.objectFit, borderRadius: cs.borderRadius, filter: "blur(7px) brightness(0.45) saturate(0.6)", clipPath: "inset(0 100% 100% 0)" });
      layer.appendChild(g);
      t.ghost = g;
      t.parts.push(g);
    }
    const f = el("sw-frame " + (t.L.kind === "text" ? "text" : t.L.el.dataset.gen ? "img gen" : t.L.kind === "image" ? (t.group || t.L.small ? "img" : "ph img") : "blk"), { left: t.sx + "px", top: t.sy + "px" });
    // a block fills as it is dragged out: it shows through the frame, clipped to it
    if (t.L.kind === "block" && !t.L.small) { t.L.el.style.clipPath = "inset(0 100% 100% 0)"; t.L.el.classList.remove("sw-hide"); }
    // the frame takes the layer's own corner rounding, so a pill is drawn as a pill
    if (t.L.kind !== "text") f.style.borderRadius = getComputedStyle(t.L.el).borderRadius;
    f.innerHTML = "<i></i><i></i><i></i><i></i>";
    t.tag = el("sw-tag", {}, f);
    // guides: a line along the top edge across the page, dotted lines down the left and right edges
    const H = layer.style.height;
    t.guides = [el("sw-guide h", { left: 0, width: "100%", top: t.sy + "px" }), el("sw-guide v", { top: 0, height: H, left: t.sx + "px" }), el("sw-guide v", { top: 0, height: H, left: t.sx + "px" })];
    t.frame = f;
    t.born = clock;
    t.parts.push(f, ...t.guides);
  }

  // a red measurement from this layer to the nearest built neighbour on its left or above, as a designer checks spacing
  let redUntil = 0;
  function redline(t) {
    const { r } = t;
    // now and then, one at a time, and only between small neighbours
    if (clock < redUntil || Math.random() > 0.4 || r.w > 420 || r.h > 160) return;
    let best = null;
    for (const L of layers) {
      if (L === t.L || L.el.classList.contains("sw-hide") || L.el.dataset.tile || L.el.contains(t.L.el) || t.L.el.contains(L.el)) continue;
      const o = pageRect(L.el);
      const overlapY = Math.min(o.y + o.h, r.y + r.h) - Math.max(o.y, r.y), overlapX = Math.min(o.x + o.w, r.x + r.w) - Math.max(o.x, r.x);
      if (overlapY > 4 && o.x + o.w <= r.x) { const g = r.x - (o.x + o.w); if (g > 2 && g < 90 && overlapY < 120 && (!best || g < best.g)) best = { g, x: o.x + o.w, y: Math.max(o.y, r.y), w: g, h: overlapY }; }
      if (overlapX > 4 && o.y + o.h <= r.y) { const g = r.y - (o.y + o.h); if (g > 2 && g < 90 && overlapX < 420 && (!best || g < best.g)) best = { g, x: Math.max(o.x, r.x), y: o.y + o.h, w: overlapX, h: g }; }
    }
    if (!best) return;
    redUntil = clock + 0.35;
    const m = el("sw-red", { left: best.x + "px", top: best.y + "px", width: best.w + "px", height: best.h + "px" });
    el("sw-redtag", {}, m).textContent = Math.round(best.g);
    setTimeout(() => m.remove(), 520 / speed);
  }

  // the copying of a row: a selection round the first row's frames, and a copy of their outlines to drag down
  function startCopy(t, c) {
    const G = t.group, rs = G.row0.map((o) => pageRect(o.el));
    const x0 = Math.min(...rs.map((q) => q.x)), y0 = Math.min(...rs.map((q) => q.y)), x1 = Math.max(...rs.map((q) => q.x + q.w)), y1 = Math.max(...rs.map((q) => q.y + q.h));
    const ny = Math.min(...G.rest.map((o) => pageRect(o.el).y));
    const sel = el("sw-frame sel", { left: x0 - 4 + "px", top: y0 - 4 + "px", width: x1 - x0 + 8 + "px", height: y1 - y0 + 8 + "px", opacity: "0" });
    sel.innerHTML = "<i></i><i></i><i></i><i></i>";
    const copy = el("sw-copy", { left: 0, top: 0 });
    rs.forEach((q) => el("sw-frame", { left: q.x + "px", top: q.y + "px", width: q.w + "px", height: q.h + "px" }, copy));
    const tag = el("sw-tag", { left: (x0 + x1) / 2 + "px", top: y1 + 10 + "px" }, copy);
    t.cp = { sel, copy, tag, dy: ny - y0, grab: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } };
    t.parts.push(sel, copy);
    t.stage = "copy"; t.t = 0;
  }

  // a text box: the cursor goes into it to where the first letter will stand, clicks, and types
  function startText(t) {
    const e2 = t.L.el;
    // a text holds its final size while it is typed, so whatever it sits in (a centred pill, a row, the next line)
    // doesn't shrink and shift round it
    const cs = getComputedStyle(e2), F = t.full || t.r;
    if (cs.display === "inline" || cs.display === "inline-block") {
      // a line inside a heading or paragraph: a block exactly one line tall, set on the top of its line, so its
      // letters sit where they will sit as plain text again
      const lh = cs.lineHeight === "normal" ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.lineHeight);
      Object.assign(e2.style, { display: "inline-block", verticalAlign: "top", width: F.w + "px", height: lh + "px", textAlign: "left", whiteSpace: "nowrap" });
    } else Object.assign(e2.style, { width: F.w + "px", height: F.h + "px", flexShrink: "0" });
    if (t.full) Object.assign(e2.style, { transformOrigin: "0 0", transform: `scale(${t.s0})` });
    e2.innerHTML = CARET;
    const cr = e2.querySelector(".sw-caret").getBoundingClientRect();
    t.ex = cr.left + scrollX + 3; t.ey = cr.top + scrollY + cr.height / 2;
    t.stage = "enter"; t.t = 0;
  }

  // a picture's scan: a scan line sweeps across from the side the drag began on (or as given), the picture appearing
  // behind it, sharp over its blurred preview; the cursor rides the far end of the line
  function startScan(t, c, dir) {
    const { r } = t;
    c.click = 1;
    setShape(c, "arrow");
    if (t.L.el.dataset.gen) { askPlay(t, "gen"); return; }
    // the grey placeholder is set; the cursor goes to its handle to push it out again, in place. A picture reached
    // by a link needs no second trip: dropping the link on it brings it up where it is
    if (t.chainNext) {
      t.frame.classList.add("fadeph");
      t.rad = getComputedStyle(t.L.el).borderRadius;
      t.L.el.style.clipPath = `inset(0 round ${t.rad})`;
      t.L.el.classList.remove("sw-hide");
      t.stage = "redo"; t.t = 0;
      return;
    }
    t.stage = "redo0"; t.t = 0;
  }

  // a play button in the middle of the frame, for the cursor to click
  function askPlay(t, after) {
    const { r } = t;
    t.btn = el("sw-play", { left: r.x + r.w / 2 + "px", top: r.y + r.h / 2 + "px" });
    t.parts.push(t.btn);
    t.after = after;
    t.stage = "play"; t.t = 0;
  }

  // a study drawn in code: once played, it generates itself inside the frame while a progress bar fills along the
  // bottom edge, the cursor riding the end of the bar
  function startGen(t, c) {
    const { r } = t;
    t.bar = el("sw-genbar", { left: r.x + "px", top: r.y + r.h - 2 + "px" });
    t.lbl = el("sw-genlbl", { left: r.x + 8 + "px", top: r.y + r.h - 22 + "px" });
    t.parts.push(t.bar, t.lbl);
    t.dur = 1.5 / c.pace;
    if (window.Lab) Lab.render(t.L.el, 0);
    t.L.el.classList.remove("sw-hide");
    t.stage = "gen"; t.t = 0;
  }

  // a picture is shown: a film first waits to be played; in a chain, the cursor goes on to link it to the next picture
  function revealed(t, c) {
    const { r } = t;
    if (t.ghost) t.ghost.remove();
    t.frame.classList.remove("img", "gen");
    if (t.L.el.tagName === "VIDEO" && !t.played) { askPlay(t, "video"); return; }
    const ch = t.L.chain, i = ch ? ch.indexOf(t.L) : -1;
    if (ch && !ch.together && i < ch.length - 1) {
      // drag a link from its right edge to the next frame in the row
      t.frame.remove();
      doneLayer(t.L);
      t.next = ch[i + 1];
      t.from = { x: r.x + r.w, y: r.y + r.h / 2 };
      t.stage = "watch"; t.t = 0;
    } else { t.stage = "hold"; t.t = 0; }
  }

  // a film's REC mark shows only while it is playing
  function recOn(v, on) {
    const rec = v.parentElement.querySelector(".rec");
    if (!rec) return;
    rec.style.opacity = on ? "1" : "0";
    if (on) rec.animate([{ opacity: 0, transform: "translateY(-3px)" }, { opacity: 1, transform: "none" }], { duration: 260 / speed, easing: "ease-out" });
  }

  function finishTask(c) {
    const t = c.task;
    if (t.toks) { t.L.el.innerHTML = t.L.html; Object.assign(t.L.el.style, { display: "", verticalAlign: "", width: "", height: "", flexShrink: "", textAlign: "", whiteSpace: "", transform: "", transformOrigin: "" }); }
    else Object.assign(t.L.el.style, { clipPath: "", transition: "", opacity: "" });
    t.parts.forEach((p) => p.remove());
    active.splice(active.indexOf(t), 1);
    c.lastEl = t.L.el;
    c.task = null;
    setShape(c, "arrow");
    doneLayer(t.L);
  }

  function doneLayer(L) {
    L.state = "done";
    built++;
    updateBar();
    // more agents join as the page grows, flying in from the side of the view
    if (built % JOIN_EVERY === 0 && cursors.length < NMAX) {
      const left = Math.random() < 0.5, y = scrollY + innerHeight * (0.2 + Math.random() * 0.6);
      // it flies to a spot inside the view and waits there like the rest
      const nc = addCursor(left ? -30 : innerWidth + 30, y, left ? 420 : -420, 0);
      nc.park = { x: innerWidth * (left ? 0.12 + Math.random() * 0.3 : 0.58 + Math.random() * 0.3), y };
    }
  }

  function step(c, dt) {
    const t = c.task, { r } = t;
    if (t.stage === "go") {
      // the flight bends a little to one side, straightening out as it closes in
      const dx = t.sx - c.x, dy = t.sy - c.y, d = Math.hypot(dx, dy) || 1;
      t.d0 = Math.max(t.d0, d);
      const bend = c.bend * Math.min(28, t.d0 * 0.08) * Math.sin(Math.PI * Math.min(1, d / t.d0)) * Math.min(1, d / 80);
      c.tx = t.sx - (dy / d) * bend; c.ty = t.sy + (dx / d) * bend;
      if (d < 70) setShape(c, "cross"); // the crosshair comes up on the approach
      if (d < 14) {
        if (t.L.over) {
          // a caption on a picture needs no frame: the cursor goes straight to where it starts, clicks, and types
          t.L.state = "drawn";
          startText(t);
        } else { t.stage = "aim"; t.t = 0; }
      }
      return;
    }
    t.t += dt;
    if (t.stage === "aim") {
      // a beat to line up on the corner, then mouse down: start dragging
      c.tx = t.sx; c.ty = t.sy;
      if (t.t >= t.aim) { t.stage = "draw"; t.t = 0; makeFrame(t); c.down = true; }
      return;
    }
    if (t.stage === "draw") {
      const dur = (t.L.el.dataset.tile ? DRAW * 0.8 : DRAW) * (0.75 + Math.min(0.6, Math.sqrt(r.w * r.h) / 600)) / c.pace;
      const k = Math.min(1, t.t / dur), e = 1 - Math.pow(1 - k, 3);
      t.w = Math.max(1, r.w * e); t.h = Math.max(1, r.h * e);
      t.fx = t.ax ? r.x + r.w - t.w : r.x; t.fy = t.ay ? r.y + r.h - t.h : r.y;
      Object.assign(t.frame.style, { left: t.fx + "px", top: t.fy + "px", width: t.w + "px", height: t.h + "px" });
      t.tag.textContent = `${Math.round(t.w)} × ${Math.round(t.h)}`;
      t.guides[2].style.left = (t.ax ? t.fx : t.fx + t.w) + "px";
      c.tx = t.ax ? t.fx : t.fx + t.w; c.ty = t.ay ? t.fy : t.fy + t.h; // the cursor drags the far corner
      const clip = `inset(${t.fy - r.y}px ${r.x + r.w - t.fx - t.w}px ${r.y + r.h - t.fy - t.h}px ${t.fx - r.x}px)`;
      if (t.L.kind === "block" && !t.L.small) t.L.el.style.clipPath = clip;
      if (t.ghost) t.ghost.style.clipPath = clip;
      if (k >= 1) {
        c.down = false; // mouse up: the frame is set
        t.L.state = "drawn";
        t.t = 0;
        const e2 = t.L.el;
        if (t.L.small) {
          // a small thing: a click, and it comes in: a small picture pops into place, a button is swept in
          redline(t);
          setShape(c, "arrow");
          c.click = 1;
          t.frame.classList.remove("img");
          e2.style.clipPath = "";
          e2.classList.remove("sw-hide");
          if (t.L.kind === "image") e2.animate([{ scale: "0.86", opacity: 0, filter: "blur(6px)" }, { scale: "1", opacity: 1, filter: "blur(0px)" }], { duration: 300 / speed, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)" });
          else {
            // a button or a pill: its fill sweeps across along its own rounded shape, from the side the drag began
            const rr = getComputedStyle(e2).borderRadius.split(" ")[0] || "0";
            const from = t.ax ? `inset(0 0 0 100% round ${rr})` : `inset(0 100% 0 0 round ${rr})`;
            e2.animate([{ clipPath: from, opacity: 0.6 }, { clipPath: `inset(0 0 0 0 round ${rr})`, opacity: 1 }], { duration: 380 / speed, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)" });
          }
          t.stage = "fill";
        } else if (t.toks) {
          startText(t);
        } else if (t.frameOnly) {
          // a helper in a chain only lays out the frame; it is left waiting for the lead to show the picture
          c.click = 1;
          t.guides.forEach((g) => g.remove());
          t.L.g = { frame: t.frame, ghost: t.ghost };
          active.splice(active.indexOf(t), 1);
          c.lastEl = t.L.el;
          c.task = null;
          setShape(c, "arrow");
        } else if (t.group) {
          // one of a group: wait until every frame of the group is laid out, then all are shown together
          c.click = 1;
          t.guides.forEach((g) => g.remove());
          t.stage = "wait";
        } else if (t.L.kind === "image") {
          // a picture: a click, then a scan line sweeps across from the side the drag began on, the picture
          // appearing behind it; the cursor rides the far end of the line
          redline(t);
          c.click = 1;
          t.guides.forEach((g) => g.remove());
          startScan(t, c);
        } else {
          // a block: already filled by the drag; a click sets it
          redline(t);
          setShape(c, "arrow");
          c.click = 1;
          e2.style.clipPath = "";
          t.stage = "fill";
        }
      }
      return;
    }
    if (t.stage === "enter") {
      setShape(c, "arrow");
      c.tx = t.ex; c.ty = t.ey;
      // the pointer turns to an I-beam once it is over the text box
      if (c.x > r.x && c.x < r.x + r.w && c.y > r.y - 2 && c.y < r.y + r.h + 2) setShape(c, "ibeam");
      if (Math.hypot(c.x - t.ex, c.y - t.ey) < 5) { setShape(c, "ibeam"); c.click = 1; t.stage = "focus"; t.t = 0; }
      return;
    }
    if (t.stage === "focus") {
      c.tx = t.ex; c.ty = t.ey;
      if (t.t >= 0.09) { t.L.el.classList.remove("sw-hide"); t.stage = "fill"; t.t = 0; }
      return;
    }
    if (t.stage === "redo0") {
      // the grey placeholder is set; the cursor takes its bottom right handle and presses
      c.tx = r.x + r.w; c.ty = r.y + r.h;
      setShape(c, "cross");
      if (Math.hypot(c.x - c.tx, c.y - c.ty) < 5) {
        c.down = true;
        t.frame.classList.add("fadeph");
        t.rad = getComputedStyle(t.L.el).borderRadius;
        t.L.el.style.clipPath = `inset(0 round ${t.rad})`; // keep the blur inside the frame
        t.L.el.classList.remove("sw-hide");
        t.stage = "redo"; t.t = 0;
      }
      return;
    }
    if (t.stage === "redo") {
      // a small push in and back out on the handle, in place: as the frame eases back to its size, the grey melts
      // away and the picture comes up through it, from soft to sharp
      const k = Math.min(1, t.t / ((t.chainNext ? 0.45 : 0.6) / c.pace)), b = t.chainNext ? 0 : Math.sin(Math.PI * Math.min(1, k * 1.25)) * 0.05;
      const w = r.w * (1 - b), h = r.h * (1 - b), e = k * k * (3 - 2 * k);
      Object.assign(t.frame.style, { width: w + "px", height: h + "px" });
      t.tag.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      t.L.el.style.opacity = e;
      t.L.el.style.filter = `blur(${(1 - e) * 8}px)`;
      // the picture stays inside the frame as the handle moves
      t.L.el.style.clipPath = `inset(0 ${r.w - w}px ${r.h - h}px 0 round ${t.rad})`;
      if (!t.chainNext) { c.tx = r.x + w; c.ty = r.y + h; }
      if (k >= 1) { c.down = false; Object.assign(t.L.el.style, { opacity: "", filter: "", clipPath: "" }); setShape(c, "arrow"); revealed(t, c); }
      return;
    }
    if (t.stage === "scan") {
      const k = Math.min(1, t.t / t.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const rev = t.dir === "h" ? t.ax : t.ay, p = (rev ? 1 - e : e) * 100, el2 = t.L.el;
      if (t.dir === "v") {
        el2.style.clipPath = rev ? `inset(${p}% 0 0 0)` : `inset(0 0 ${100 - p}% 0)`;
        const y = r.y + (r.h * p) / 100;
        Object.assign(t.line.style, { left: r.x + "px", top: y + "px", width: r.w + "px" });
        c.tx = r.x + r.w + 8; c.ty = y;
      } else {
        el2.style.clipPath = rev ? `inset(0 0 0 ${p}%)` : `inset(0 ${100 - p}% 0 0)`;
        const x = r.x + (r.w * p) / 100;
        Object.assign(t.line.style, { left: x + "px", top: r.y + "px", height: r.h + "px" });
        c.tx = x; c.ty = r.y + r.h + 8;
      }
      if (k >= 1) { el2.style.clipPath = ""; t.line.remove(); revealed(t, c); }
      return;
    }
    if (t.stage === "wait") {
      const G = t.group;
      if (G.lead === t && G.rest.length && !G.copied && G.row0.every((o) => o.state === "drawn")) { startCopy(t, c); return; }
      if (G.every((o) => o.state === "drawn" || o.state === "done")) {
        // all laid out: each comes into focus where it stands, from its blurred preview to sharp, with no sweep
        const e2 = t.L.el;
        e2.classList.remove("sw-hide");
        e2.animate([{ opacity: 0, filter: "blur(10px) brightness(0.6)" }, { opacity: 1, filter: "blur(0px) brightness(1)" }], { duration: 520 / speed, easing: "cubic-bezier(0.3, 0.6, 0.3, 1)" });
        if (t.ghost) t.ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520 / speed, fill: "forwards" });
        t.stage = "focus2"; t.t = 0;
      }
      return;
    }
    if (t.stage === "copy") {
      // to the middle of the row, press: the row is selected
      c.tx = t.cp.grab.x; c.ty = t.cp.grab.y;
      setShape(c, "arrow");
      if (Math.hypot(c.x - c.tx, c.y - c.ty) < 6) { c.down = true; t.cp.sel.style.opacity = "1"; t.stage = "copydrag"; t.t = 0; }
      return;
    }
    if (t.stage === "copydrag") {
      // a beat, then drag a copy of the row down to where the next one goes, and let go
      const cp = t.cp, k = Math.max(0, Math.min(1, (t.t - 0.15) / (0.55 / c.pace))), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cp.copy.style.transform = `translate(0, ${cp.dy * e}px)`;
      cp.tag.textContent = k > 0 ? `+ ${Math.round(cp.dy * e)}` : "";
      c.tx = cp.grab.x; c.ty = cp.grab.y + cp.dy * e;
      if (k >= 1) {
        c.down = false; c.click = 1;
        [cp.sel, cp.copy].forEach((e2) => e2.remove());
        // the copy lands and takes on the next row's own pictures, still blurred; idle agents take them over
        t.group.copied = true;
        t.group.rest.forEach((o) => {
          const free = cursors.filter((h) => !h.task);
          const or = pageRect(o.el);
          free.sort((a, b) => Math.hypot(a.x - or.x, a.y - or.y) - Math.hypot(b.x - or.x, b.y - or.y));
          const h = free[0] || c;
          if (h === c) return;
          begin(h, o);
          const nt = h.task;
          nt.group = t.group;
          t.group.tasks.push(nt);
          makeFrame(nt);
          Object.assign(nt.frame.style, { left: nt.r.x + "px", top: nt.r.y + "px", width: nt.r.w + "px", height: nt.r.h + "px" });
          if (nt.ghost) nt.ghost.style.clipPath = "";
          nt.guides.forEach((g) => g.remove());
          nt.tag.textContent = `${Math.round(nt.r.w)} × ${Math.round(nt.r.h)}`;
          o.state = "drawn";
          nt.stage = "wait"; nt.t = 0;
          h.tx = h.x; h.ty = h.y;
        });
        t.stage = "wait"; t.t = 0;
      }
      return;
    }
    if (t.stage === "grab") {
      // to the small frame's bottom right handle, and press
      c.tx = r.x + r.w; c.ty = r.y + r.h;
      if (Math.hypot(c.x - c.tx, c.y - c.ty) < 5) { c.down = true; t.stage = "grow"; t.t = 0; }
      return;
    }
    if (t.stage === "grow") {
      // drag it out: the text grows with its frame up to its full size, the size tag counting up
      const F = t.full, k = Math.min(1, t.t / (0.5 / c.pace)), e = 1 - Math.pow(1 - k, 3), sc = t.s0 + (1 - t.s0) * e;
      t.L.el.style.transform = `scale(${sc})`;
      Object.assign(t.frame.style, { width: F.w * sc + "px", height: F.h * sc + "px" });
      t.tag.textContent = `${Math.round(F.w * sc)} × ${Math.round(F.h * sc)}`;
      c.tx = F.x + F.w * sc; c.ty = F.y + F.h * sc;
      if (k >= 1) { c.down = false; t.L.el.style.transform = ""; t.L.el.style.transformOrigin = ""; t.r = F; t.stage = "hold"; t.t = 0; }
      return;
    }
    if (t.stage === "focus2") {
      if (t.t >= 0.52) revealed(t, c);
      return;
    }
    if (t.stage === "play") {
      // to the play button, and click it; in a group, once every cursor is on its button, they click one after
      // another, top left to bottom right
      setShape(c, "arrow");
      c.tx = r.x + r.w / 2 + 2; c.ty = r.y + r.h / 2 + 2;
      const there = Math.hypot(c.x - c.tx, c.y - c.ty) < 5;
      let go = there;
      if (t.group) {
        t.arrived = t.arrived || there;
        const G = t.group;
        if (!G.playAt && G.tasks.every((o) => o.arrived)) G.playAt = clock + 0.25;
        go = !!G.playAt && clock >= G.playAt + G.indexOf(t.L) * 0.15;
      }
      if (go) { c.click = 1; t.btn.classList.add("down"); t.stage = "press"; t.t = 0; }
      return;
    }
    if (t.stage === "press") {
      c.tx = r.x + r.w / 2 + 2; c.ty = r.y + r.h / 2 + 2;
      if (t.t >= 0.1) {
        const b = t.btn;
        b.classList.add("go");
        setTimeout(() => b.remove(), 320 / speed);
        t.parts = t.parts.filter((p) => p !== b);
        t.played = true;
        if (t.after === "video") { t.L.el.play().catch(() => {}); recOn(t.L.el, true); lastPlay = clock; revealed(t, c); } else startGen(t, c);
      }
      return;
    }
    if (t.stage === "gen") {
      const k = Math.min(1, t.t / t.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      if (window.Lab) Lab.render(t.L.el, e);
      t.bar.style.width = r.w * e + "px";
      t.lbl.textContent = `RENDER ${Math.round(e * 100)}%`;
      c.tx = r.x + r.w * e; c.ty = r.y + r.h + 6;
      if (k >= 1) { t.L.el.dataset.live = ""; t.bar.remove(); t.lbl.remove(); revealed(t, c); }
      return;
    }
    if (t.stage === "watch") {
      // a moment to watch it start before moving on
      if (t.t >= 0.2) { t.stage = "link"; t.t = 0; }
      return;
    }
    if (t.stage === "link") {
      // to the edge of the picture just shown, press, and drag a link across to the next frame
      c.tx = t.from.x; c.ty = t.from.y;
      setShape(c, "cross");
      if (Math.hypot(c.x - t.from.x, c.y - t.from.y) < 8) {
        c.down = true;
        t.wire = el("sw-wire", {});
        t.parts.push(t.wire);
        t.stage = "linkdrag"; t.t = 0;
      }
      return;
    }
    if (t.stage === "linkdrag") {
      const nr = pageRect(t.next.el), to = { x: nr.x, y: nr.y + nr.h / 2 };
      const k = Math.min(1, t.t / (0.3 / c.pace)), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const x = t.from.x + (to.x - t.from.x) * e, y = t.from.y + (to.y - t.from.y) * e;
      c.tx = x; c.ty = y;
      const len = Math.hypot(c.x - t.from.x, c.y - t.from.y), ang = Math.atan2(c.y - t.from.y, c.x - t.from.x);
      Object.assign(t.wire.style, { left: t.from.x + "px", top: t.from.y + "px", width: len + "px", transform: `rotate(${ang}rad)` });
      // dropped on the next frame once it is laid out: the next picture is shown the same way
      if (k >= 1 && t.next.g) {
        c.down = false; c.click = 1;
        const w = t.wire;
        w.classList.add("hit");
        setTimeout(() => w.remove(), 260 / speed);
        t.parts = t.parts.filter((p) => p !== w);
        const L = t.next, g = L.g;
        t.L = L; t.r = nr; t.frame = g.frame; t.ghost = g.ghost; t.parts.push(...[g.frame, g.ghost].filter(Boolean));
        t.fx = nr.x; t.w = nr.w; t.ax = 0; t.ay = 0;
        t.played = false;
        t.chainNext = true;
        L.state = "drawn";
        startScan(t, c, "h");
      }
      return;
    }
    if (t.stage === "fill") {
      if (t.toks) {
        // a number counts up from zero instead of being typed
        const cnt = t.L.el.dataset.count;
        if (cnt) {
          const k = Math.min(1, t.t / 0.8), e = 1 - Math.pow(1 - k, 3);
          t.L.el.innerHTML = Math.round(+cnt * e) + (t.L.el.dataset.suffix || "") + CARET;
          const cr = t.L.el.querySelector(".sw-caret").getBoundingClientRect();
          c.tx = cr.left + scrollX + 3; c.ty = cr.top + scrollY + cr.height / 2;
          if (k >= 1) { t.stage = "hold"; t.t = 0; setShape(c, "arrow"); }
          return;
        }
        // one letter at a time, at an uneven pace like real typing, now and then a short pause; short words go
        // slower than long lines, so every word is seen being typed
        if (!t.rate) { t.rate = Math.max(16, Math.min(70, t.toks.length / 0.9)) * (c.typeRate / 75); t.nextAt = 0; }
        let n = t.typed;
        while (n < t.toks.length && t.t >= t.nextAt) { n++; t.nextAt += (1 / t.rate) * (0.5 + Math.random()) * (Math.random() < 0.06 ? 3 : 1); }
        if (n !== t.typed) {
          t.typed = n;
          const last = t.toks[n - 1], fresh = last[0] === "<" || last[0] === "&" ? last : `<span class="sw-new">${last}</span>`;
          t.L.el.innerHTML = t.toks.slice(0, n - 1).join("") + fresh + CARET;
        }
        // the cursor follows the caret
        const caret = t.L.el.querySelector(".sw-caret");
        if (caret) { const cr = caret.getBoundingClientRect(); c.tx = cr.left + scrollX + 3; c.ty = cr.top + scrollY + cr.height / 2; }
        if (n >= t.toks.length) { t.stage = t.full ? "grab" : "hold"; t.t = 0; setShape(c, "arrow"); }
      } else if (t.t >= 0.1) { t.stage = "hold"; t.t = 0; }
      return;
    }
    if (t.stage === "hold" && t.t >= HOLD) finishTask(c);
  }

  // the ruler along the top of the view: px marks, with the spans and edges of the frames being drawn in blue
  function drawRuler() {
    const W = innerWidth, dpr = devicePixelRatio || 1;
    if (ruler.width !== W * dpr) { ruler.width = W * dpr; ruler.height = 18 * dpr; }
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rctx.fillStyle = "#15171c"; rctx.fillRect(0, 0, W, 18);
    const marks = [];
    for (const t of active) if (t.frame && t.w) { const x0 = t.fx - scrollX, x1 = x0 + t.w; rctx.fillStyle = "rgba(47, 120, 255, 0.35)"; rctx.fillRect(x0, 0, x1 - x0, 18); marks.push(x0, x1); }
    rctx.strokeStyle = "rgba(255, 255, 255, 0.22)"; rctx.lineWidth = 1;
    rctx.beginPath();
    for (let x = 0; x < W; x += 10) { const h = x % 100 === 0 ? 18 : x % 50 === 0 ? 7 : 4; rctx.moveTo(x + 0.5, 18 - h); rctx.lineTo(x + 0.5, 18); }
    rctx.stroke();
    rctx.font = "9px ui-monospace, SF Mono, Menlo, monospace"; rctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    for (let x = 100; x < W; x += 100) rctx.fillText(x, x + 3, 9);
    rctx.fillStyle = "#6fa4ff";
    for (const x of marks.slice(0, 6)) rctx.fillText(Math.round(x), x + 2, 15);
  }

  // the loop never stops on an error: it is logged, and the next frame goes on
  function frame(now) {
    try { tick(now); } catch (e) { console.error("swarm:", e); }
    requestAnimationFrame(frame);
  }

  let stallT = 0;
  // a watchdog: if no agent is at work and nothing is moving on, though layers are left, the step that should come
  // next is pushed on, so the build can never hang
  function watchdog(dt) {
    const working = active.some((t) => !["wait", "play"].includes(t.stage));
    // not while the page is being wiped and scanned, and not once every layer is out
    if (working || scrollAnim || !ignited || (!queue.length && !active.length) || active.some((t) => t.stage === "play")) { stallT = 0; return; }
    stallT += dt;
    if (stallT < 2.5) return;
    stallT = 0;
    console.warn("swarm: stalled at layer", built, active.map((t) => t.stage), queue.slice(0, 4).map((L) => L.kind + ":" + L.state));
    const G = active.find((t) => t.group) && active.find((t) => t.group).group;
    if (G) {
      // a group waiting: copy its first row down now, or give any frame never begun to a free agent
      const lead = G.lead && active.includes(G.lead) ? G.lead : G.tasks.find((t) => active.includes(t));
      const c = lead && cursors.find((k) => k.task === lead);
      if (c && G.rest.length && !G.copied && lead.stage === "wait") { G.lead = lead; G.row0.forEach((o) => { if (o.state === "busy") o.state = "drawn"; }); startCopy(lead, c); return; }
      G.forEach((o) => { if (o.state === "") { const h = cursors.find((k) => !k.task); if (h) { begin(h, o); h.task.group = G; G.tasks.push(h.task); queue.splice(queue.indexOf(o), 1); } } });
      return;
    }
    // otherwise move the view on, to wherever the next layer is
    if (!queue.length) return;
    const fy = Math.min(...queue.map((L) => pageRect(L.el).y));
    const to = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, fy - 50));
    if (Math.abs(to - scrollY) > 1) scrollAnim = { from: scrollY, to, t: 0, dur: 1 };
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * speed;
    last = now;
    if (running) {
      watchdog(dt);
      clock += dt;
      const vh = innerHeight, W = innerWidth, top = scrollY;
      if (wipe.isConnected) {
        const k = Math.min(1, clock / WIPE), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        wipe.style.clipPath = `inset(0 0 ${(1 - e) * 100}% 0)`;
        wipe.firstChild.style.top = e * 100 + "%";
        if (k >= 1) {
          // wiped: the page is taken down behind the black, and the swarm comes in
          layers.forEach((L) => L.el.classList.add("sw-hide"));
          document.querySelectorAll("canvas[data-gen]").forEach((cv) => delete cv.dataset.live);
          document.body.appendChild(black);
          wipe.remove();
          layer.style.opacity = "";
        }
      }
      const scanning = clock < WIPE + SCAN;
      if (!scanning && bar.classList.contains("scanning")) { bar.classList.remove("scanning"); ruler.style.opacity = "1"; }
      // the scan done, the agent nearest the avatar goes to it and clicks it: the avatar gives a beat of light and
      // the prism flows out of it to both sides; the page is built once the light is up
      // a page without the avatar simply starts once the scan is done
      if (!scanning && !anchor.face) ignited = true;
      if (!scanning && !igniter && anchor.face) {
        igniter = cursors.slice().sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y))[0];
        igniter.park = { x: anchor.x + 6, y: anchor.y + 6 };
      }
      if (igniter && !ignited && Math.hypot(igniter.x - anchor.x - 6, igniter.y - anchor.y - 6) < 6) {
        ignited = true;
        igniter.click = 1;
        anchor.face.animate([{ filter: "brightness(1)", scale: "1" }, { filter: "brightness(1.6) drop-shadow(0 0 24px #c4b5fd)", scale: "1.06" }, { filter: "brightness(1)", scale: "1" }], { duration: 700, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" });
        if (window.Prism) Prism.reveal(".hero .prism", IGNITE / speed);
        prismsOn.add(document.querySelector(".hero .prism"));
        releaseIn = IGNITE * 0.7;
      }
      if (!ignited) releaseIn = Math.max(releaseIn, 0.05);
      scanProg.style.width = Math.min(1, clock / (WIPE + SCAN)) * 100 + "%";

      // release the next layer to a free cursor at a steady pace, once its place has come into view
      releaseIn -= dt;
      // the order is loose: any of the next few layers in view may go next, the nearer the top the likelier, as
      // long as its container has been drawn; so several parts of the page are worked on at once
      // one screen at a time: only layers that start on the screen in view, and at each moment mostly those of the
      // lowest tier left there (background, then blocks, then headings and pictures, then small print), picked at
      // random among them, as long as their container has been drawn
      // while the view is gliding on to the next screen, work there starts on whatever has already come into sight
      const scrolling = !!scrollAnim, viewTop = scrolling ? scrollAnim.to : top;
      let ready = [];
      for (let k = 0; k < queue.length; k++) {
        const L = queue[k];
        const lr = pageRect(L.el);
        if (lr.y > viewTop + vh - 30) break;
        if (lr.y > top + vh - 10) continue;
        // a tall layer waits until most of it is in view, so it is never built half off screen
        if (lr.y + Math.min(lr.h, vh * 0.7) > viewTop + vh - 20) continue;
        if (L.over && L.over.state !== "done") continue;
        if (L.after && L.after.state !== "done") continue;
        if (!L.parent || L.parent.state === "drawn" || L.parent.state === "done") ready.push(k);
      }
      // a chain goes out only when all its pictures are waiting on this screen with their containers drawn
      // (a group shown together needs only its first row in view: the rows below it are copied down from it)
      const inReady = (o) => ready.some((j) => queue[j] === o);
      ready = ready.filter((k) => {
        const ch = queue[k].chain;
        if (!ch) return true;
        if (!ch.together) return ch.every(inReady);
        const y0 = Math.min(...ch.map((o) => pageRect(o.el).y));
        return ch.filter((o) => Math.abs(pageRect(o.el).y - y0) < 12).every(inReady);
      });
      const low = Math.min(...ready.map((k) => queue[k].tier));
      // in order: the lowest tier first, and within it top to bottom, left to right, with only a little give
      const inTier = ready.filter((k) => queue[k].tier <= low + 1);
      if (inTier.length) ready = inTier;
      const at = (k) => pageRect(queue[k].el);
      ready.sort((a, b) => Math.round(at(a).y / 40) - Math.round(at(b).y / 40) || at(a).x - at(b).x);
      if (releaseIn <= 0 && ready.length && active.length < MAX_ACTIVE) {
        const free = cursors.filter((c) => !c.task && c.x > -10 && c.x < W + 10);
        if (free.length) {
          const k = ready[Math.random() < 0.75 ? 0 : Math.min(ready.length - 1, 1 + Math.floor(Math.random() * 2))], L = queue[k], r = pageRect(L.el);
          // the nearest free cursor, but whoever built the container this layer sits in comes first
          const cost = (c) => Math.hypot(c.x - r.x, c.y - r.y) - (c.lastEl && c.lastEl !== L.el && c.lastEl.contains(L.el) ? 2000 : 0);
          free.sort((a, b) => cost(a) - cost(b));
          if (L.chain && L.chain.together && free.length >= L.chain.length) {
            // one agent to each picture of the first row, nearest first; the rows below are not drawn by hand but
            // copied from it: the first row is selected and dragged down, and the copy becomes the next row
            const G = L.chain, top0 = Math.round(pageRect(G[0].el).y);
            L.chain.forEach((o) => queue.splice(queue.indexOf(o), 1));
            // a fresh start for this run (a replay finds the marks of the last one)
            G.tasks = []; G.playAt = 0; G.copied = false; G.lead = null;
            G.row0 = G.filter((o) => Math.abs(pageRect(o.el).y - top0) < 12);
            G.rest = G.filter((o) => !G.row0.includes(o));
            G.row0.forEach((o) => {
              const orr = pageRect(o.el);
              free.sort((a, b) => Math.hypot(a.x - orr.x, a.y - orr.y) - Math.hypot(b.x - orr.x, b.y - orr.y));
              const h = free.shift();
              begin(h, o);
              h.task.group = G;
              G.tasks.push(h.task);
            });
            G.lead = G.tasks[0];
          } else if (L.chain && !L.chain.together && free.length >= L.chain.length) {
            // the lead takes the first picture; others, nearest first, lay out the frames of the rest
            const [first, ...rest] = L.chain, fr = pageRect(first.el);
            free.sort((a, b) => Math.hypot(a.x - fr.x, a.y - fr.y) - Math.hypot(b.x - fr.x, b.y - fr.y));
            L.chain.forEach((o) => queue.splice(queue.indexOf(o), 1));
            begin(free[0], first);
            rest.forEach((o, j) => { const h = free[j + 1]; begin(h, o); h.task.frameOnly = true; });
          } else if (!L.chain) {
            queue.splice(k, 1);
            begin(free[0], L);
          }
          // an uneven beat: now a pause, now a burst of several at once
          releaseIn = RELEASE * (0.85 + Math.random() * 0.3);
        }
      }

      // when everything on this screen is built, the view moves on down to the next unbuilt part, never back up
      // it lingers first, so the finished screen can be seen, and longer if a film has just been set playing
      if (queue.length && !active.length && !scrolling && !ready.length && clock > WIPE + SCAN) {
        if (!doneAt) {
          doneAt = clock;
          // the waiting cursors drift down toward the bottom of the view, where the next part will come in
          cursors.forEach((c) => { if (!c.task) c.park = { x: c.x, y: top + vh * (0.6 + Math.random() * 0.25) }; });
        }
        if (clock >= Math.max(doneAt + 0.15, lastPlay + 0.6)) {
          const fy = Math.min(...queue.map((L) => pageRect(L.el).y));
          let to = Math.max(top, Math.min(document.documentElement.scrollHeight - vh, fy - 50));
          // nothing can be started where the view is: move on half a screen rather than wait forever
          if (to <= top + 1) to = Math.min(document.documentElement.scrollHeight - vh, top + vh * 0.5);
          if (to > top + 1) scrollAnim = { from: top, to, t: 0, dur: Math.min(1.5, 0.9 + (to - top) / 1500) }; // a slower glide is the pause
          doneAt = 0;
        }
      }
      if (scrollAnim) {
        // a smooth glide, slow out, slow in
        const sa = scrollAnim;
        sa.t += dt;
        const k = Math.min(1, sa.t / sa.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        scrollTo(0, sa.from + (sa.to - sa.from) * e);
        // the idle cursors hover over the view, not the page: the page scrolls on beneath them
        const moved = scrollY - top;
        cursors.forEach((c) => { if (!c.task) { c.y += moved; if (c.park) c.park.y += moved; } });
        if (k >= 1) scrollAnim = null;
      }

      // the light in a section further down flows in as that section comes into view
      if (ignited && window.Prism) Prism.each((cv) => {
        if (prismsOn.has(cv) || cv.dataset.when === "end") return;
        const cr = cv.getBoundingClientRect();
        if (cr.top < innerHeight * 0.7) { prismsOn.add(cv); Prism.reveal(cv, 1.8 / speed); }
      });

      // the scan: two flock leaders circle the brand mark, on opposite sides
      const mx = anchor.x, my = anchor.y;
      flocks.forEach((f, k) => {
        f.a += dt * (2.1 + k * 0.25);
        f.x = mx + Math.cos(f.a) * f.r * 1.15; f.y = my + Math.sin(f.a) * f.r * 0.7;
        f.h = f.a + Math.PI / 2;
        f.trail.unshift({ x: f.x, y: f.y, h: f.h, t: clock });
        while (f.trail.length > 2 && clock - f.trail[f.trail.length - 1].t > 0.8) f.trail.pop();
      });
      const past = (f, lag) => f.trail.find((p) => clock - p.t >= lag) || f.trail[f.trail.length - 1];
      const done = built === layers.length && !queue.length;
      // the finale: the work done, the agents fly home one after another, nearest first, each on a gentle arc into
      // the brand mark in the footer, which gives a small beat as each one lands; when the last is in, the mark
      // lights up and a ring of light spreads from it
      if (done && !finale) {
        const mark = document.querySelector("footer .fb img"), mr = mark ? pageRect(mark) : { x: W / 2, y: top + vh / 2, w: 0, h: 0 };
        const M = { x: mr.x + mr.w / 2, y: mr.y + mr.h / 2 };
        cursors.slice().sort((a, b) => Math.hypot(a.x - M.x, a.y - M.y) - Math.hypot(b.x - M.x, b.y - M.y)).forEach((c, k) => { c.leave = 0.15 + k * 0.08; c.el.style.opacity = "1"; });
        finale = { M, mark, home: 0 };
      }

      // to keep the screen readable, only the newest few frames show their size tags and guides, and only the agent
      // that began dragging last shows its name
      const drawing = active.filter((t) => t.frame && t.frame.isConnected).sort((a, b) => b.born - a.born);
      drawing.forEach((t, i) => {
        t.tag.style.visibility = i < 3 ? "" : "hidden";
        if (t.guides) t.guides.forEach((g) => (g.style.visibility = i < 2 ? "" : "hidden"));
      });
      const named = drawing.find((t) => t.stage === "draw" || t.stage === "linkdrag");

      cursors.forEach((c) => {
        let ax, ay, max;
        if (c.task) {
          if (c.idleT) { c.idleT = 0; c.el.style.opacity = "1"; }
          step(c, dt);
          // a worker wants a velocity toward its target, full speed far off, braking as it closes in
          max = 820 * c.pace;
          const gx = c.tx - c.x, gy = c.ty - c.y, gd = Math.hypot(gx, gy) || 1, want = Math.min(max, gd * 7);
          ax = ((gx / gd) * want - c.vx) * 16; ay = ((gy / gd) * want - c.vy) * 16;
        } else if (scanning) {
          // in a flock behind its leader, strung back along the leader's path, a little to either side
          max = 900;
          const f = flocks[c.flock], rank = Math.floor(c.i / 2), side = rank % 2 ? 1 : -1, row = Math.ceil(rank / 2);
          const p = past(f, 0.02 + row * 0.045), spread = 8 + row * 6;
          const tx = p.x - Math.sin(p.h) * side * spread, ty = p.y + Math.cos(p.h) * side * spread;
          const gx = tx - c.x, gy = ty - c.y, gd = Math.hypot(gx, gy) || 1, want = Math.min(max, gd * 8);
          ax = ((gx / gd) * want - c.vx) * 10; ay = ((gy / gd) * want - c.vy) * 10;
        } else if (done) {
          const { M } = finale;
          max = 950; ax = -c.vx * 6; ay = -c.vy * 6;
          if (!c.home && exitT >= c.leave) {
            const dx = M.x - c.x, dy = M.y - c.y, gd = Math.hypot(dx, dy) || 1;
            // aim a little to one side while far off, so the path bends, straightening as it closes in
            const off = c.bend * Math.min(140, gd * 0.35);
            const tx = M.x - (dy / gd) * off, ty = M.y + (dx / gd) * off;
            const gx = tx - c.x, gy = ty - c.y, g = Math.hypot(gx, gy) || 1, want = Math.min(max, 260 + gd * 3);
            ax = ((gx / g) * want - c.vx) * 7; ay = ((gy / g) * want - c.vy) * 7;
            // close in, or out of time (a slow frame rate can leave it circling), it is drawn straight in
            if (gd < 60 || exitT > c.leave + 1.4) { c.x += (M.x - c.x) * Math.min(1, dt * 10); c.y += (M.y - c.y) * Math.min(1, dt * 10); c.vx *= 0.5; c.vy *= 0.5; }
            if (gd < 12) {
              // home: it slips into the mark, which gives a small beat
              c.home = true;
              finale.home++;
              c.el.animate([{ opacity: 1, scale: "1" }, { opacity: 0, scale: "0.2" }], { duration: 180, fill: "forwards" });
              if (finale.mark) finale.mark.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.8) drop-shadow(0 0 6px #c4b5fd)" }, { filter: "brightness(1)" }], { duration: 260 });
            }
          }
          if (c.home) { c.x = M.x; c.y = M.y; c.vx = 0; c.vy = 0; ax = 0; ay = 0; }
        } else {
          // idle: it stops where its last job left it and waits there, pointer upright, until it is given the next;
          // after a moment of waiting it dims, so the ones at work stand out
          max = 600;
          c.idleT = (c.idleT || 0) + dt;
          c.el.style.opacity = c.idleT > 0.6 && !scanning ? "0.35" : "1";
          if (c.park) {
            const gx = c.park.x - c.x, gy = c.park.y - c.y, gd = Math.hypot(gx, gy) || 1, want = Math.min(max, gd * 5);
            ax = ((gx / gd) * want - c.vx) * 9; ay = ((gy / gd) * want - c.vy) * 9;
            if (gd < 4) c.park = null;
          } else { ax = -c.vx * 9; ay = -c.vy * 9; }
        }
        // keep clear of the others, except when at work on a layer
        if (!done && (!c.task || c.task.stage === "go")) for (const o of cursors) {
          if (o === c) continue;
          const dx = c.x - o.x, dy = c.y - o.y, d2 = dx * dx + dy * dy, R = c.task ? 24 : 16;
          if (d2 < R * R && d2 > 0.01) { const d = Math.sqrt(d2), f = ((R - d) / R) * (c.task ? Math.min(1, Math.max(0, (Math.hypot(c.tx - c.x, c.ty - c.y) - 40) / 120)) : 1) * (c.task ? 2200 : 600); ax += (dx / d) * f; ay += (dy / d) * f; }
        }
        c.vx += ax * dt; c.vy += ay * dt;
        const sp = Math.hypot(c.vx, c.vy);
        if (sp > max) { c.vx *= max / sp; c.vy *= max / sp; }
        c.x += c.vx * dt; c.y += c.vy * dt;
        // in flight the arrow turns to point where it is going; slowing down, it settles upright like a pointer
        const want = c.shape === "arrow" && sp > 60 ? wrap(Math.atan2(c.vy, c.vx) - TIP) * Math.min(1, (sp - 60) / 220) : 0;
        c.rot += wrap(want - c.rot) * Math.min(1, dt * 14);
        // held down while dragging, a quick dip for a click
        c.click = Math.max(0, c.click - dt * 7);
        c.press += ((c.down ? 0.86 : 1) - c.press) * Math.min(1, dt * 30);
        const sc = c.press * (1 - 0.16 * Math.sin(Math.PI * c.click));
        c.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) rotate(${((c.rot * 180) / Math.PI).toFixed(1)}deg) scale(${sc.toFixed(3)})`;
        c.tag.style.transform = `translate(${(c.x + 14).toFixed(1)}px, ${(c.y + 16).toFixed(1)}px)`;
        c.tag.classList.toggle("on", !!c.task && c.task === named);
      });

      if (!scanning) drawRuler();
      if (done) {
        if (exitT === 0) { black.remove(); ruler.style.opacity = "0"; }
        exitT += dt;
        if (finale.home === cursors.length && !finale.lit) {
          // all home: the mark lights up and a ring of light spreads out from it
          finale.lit = exitT;
          if (finale.mark) finale.mark.animate([{ scale: "1", filter: "brightness(1)" }, { scale: "1.35", filter: "brightness(2) drop-shadow(0 0 14px #c4b5fd)" }, { scale: "1", filter: "brightness(1)" }], { duration: 900, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" });
          const ring = el("sw-ring", { left: finale.M.x + "px", top: finale.M.y + "px" });
          // and the light flows out of it, as it flowed out of the avatar at the start
          if (window.Prism) Prism.each((cv) => { if (cv.dataset.when === "end") Prism.reveal(cv, 1.6 / speed); });
          ring.animate([{ width: "24px", height: "24px", opacity: 1, borderWidth: "3px" }, { width: "760px", height: "760px", opacity: 0, borderWidth: "1px" }], { duration: 1500, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" });
          finale.ring = ring;
        }
        if (finale.lit && exitT > finale.lit + 1.8) {
          cursors.forEach((c) => { c.el.remove(); c.tag.remove(); });
          [finale.ring, ruler].forEach((e) => e && e.remove());
          running = false;
        }
      }
    }
  }

  bar.querySelector(".replay").onclick = reset;
  bar.querySelector(".skip").onclick = finishAll;
  bar.querySelector(".speed").onclick = (e) => { speed = speed === 3 ? 1 : speed + 1; e.target.textContent = speed + "×"; };
  addEventListener("keydown", (e) => { if (e.altKey && e.shiftKey && e.code === "KeyS") { e.preventDefault(); reset(); } });

  // the finished page shows for a moment, then is wiped and rebuilt
  addEventListener("load", () => setTimeout(() => { reset(); window.swarmReady = true; }, 900));
  requestAnimationFrame(frame);
})();
