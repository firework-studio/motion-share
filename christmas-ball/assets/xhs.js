// Xiaohongshu version: a red dumpling with white eyes painted on the sphere, red drops that build the app icon.
// Motion comes from the measured reference (assets/data.js); every state is a pure function of film time T.
(function () {
  const D = window.REPLICA_DATA;
  const FPS = 60;
  const W = 1920, H = 1080;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const P = (f, a, b) => clamp((f - a) / (b - a));
  const Eout = (p) => 1 - Math.pow(1 - clamp(p), 3);
  const Eio = (p) => (1 - Math.cos(Math.PI * clamp(p))) / 2;
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const at = (arr, f) => {
    const i = clamp(f, 0, arr.length - 1), i0 = Math.floor(i), i1 = Math.min(i0 + 1, arr.length - 1), u = i - i0;
    return arr[i0].map((v, k) => lerp(v, arr[i1][k], u));
  };

  // review mode: which skins (rows of SKINS) play and whether halos show; null skins = all (the full film)
  const REVIEW = { skins: null, halo: false };

  const RED = "#FF2442", RED_DARK = "#C91B3C", BG = "#11131A", PUPIL = "#302129";

  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };

  // ---- sphere projection ---------------------------------------------------------------------------------------
  const mm = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mul = (M, v) => [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]);
  const rot = (yaw, pitch, roll) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    return mm(mm([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], [[1, 0, 0], [0, cp, -sp], [0, sp, cp]]), [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]]);
  };
  // an ellipse drawn on the unit sphere around the face point (lon, lat), offset (ou, ov) in its tangent plane
  const sphereEllipse = (R, box, lon, lat, ou, ov, rx, ry, n = 48) => {
    const [cx, cy, , , Rof] = box;
    const c = [Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)];
    const up = [-Math.sin(lon) * Math.sin(lat), Math.cos(lat), -Math.cos(lon) * Math.sin(lat)];
    const rt = [up[1] * c[2] - up[2] * c[1], up[2] * c[0] - up[0] * c[2], up[0] * c[1] - up[1] * c[0]];
    const pts = [];
    for (let k = 0; k < n; k++) {
      const t = (2 * Math.PI * k) / n, u = ou + rx * Math.cos(t), v = ov + ry * Math.sin(t);
      let p = [0, 1, 2].map((i) => c[i] + u * rt[i] + v * up[i]);
      const l = Math.hypot(...p); p = mul(R, p.map((q) => q / l));
      let x = p[0], y = p[1];
      if (p[2] < 0) { const m = Math.hypot(x, y) || 1; x /= m; y /= m; }
      const kr = Rof(Math.atan2(y, x));
      pts.push([cx + kr * x, cy - kr * y]);
    }
    return pts;
  };
  const poly = (c2, pts) => { c2.beginPath(); pts.forEach(([x, y], i) => (i ? c2.lineTo(x, y) : c2.moveTo(x, y))); c2.closePath(); };

  // ---- timeline -----------------------------------------------------------------------------------------------------
  // 17.5 s at 60 fps. The skin run (F210-F466) is designed: the star goes in, then nine
  // skins, each change a hit the body answers, gaps shrinking from 48 to 16 frames. Elsewhere the film borrows the
  // reference's measured motion: ref(f) maps a film frame to a reference frame.
  const WARP = [[0, 0], [216, 216], [456, 423], [558, 545], [1050, 1037]];
  const ref = (f) => {
    if (f <= 0) return f;
    for (let i = 1; i < WARP.length; i++) if (f <= WARP[i][0]) return lerp(WARP[i - 1][1], WARP[i][1], (f - WARP[i - 1][0]) / (WARP[i][0] - WARP[i - 1][0]));
    return f - 13;
  };
  // T0: the frame the star's leading point crosses the body's surface; ENTRY: where, counter-clockwise from screen right
  const T0 = 216, ENTRY = (25 * Math.PI) / 180;
  // [first frame, material (body-gl.js), wipe frames, entry side (deg, screen space), aura colour]
  // Christmas ornaments, one feature each, gaps 48 -> 16 frames, ordered light / dark so every change shows.
  // Entry sides after the first are the reference's own for the change whose body reaction is replayed (REACT).
  const SKINS = [
    [216, 50, 12, -25, "#F7EDD8"],  // frosted snow white, growing from where the star went in
    [264, 51, 12, 315, "#E8A0A6"],  // candy-cane stripes
    [304, 52, 11, 90, "#5C8C74"],   // pine-green chunky knit
    [338, 60, 10, 225, "#CFEAF4"],  // ice
    [368, 53, 10, 45, "#B85A5E"],   // red and green gift plaid
    [394, 61, 9, 225, "#6E9C7E"],   // holly on cream
    [416, 58, 8, 90, "#9C2238"],    // burgundy velvet
    [434, 59, 8, 315, "#E6E4E8"],   // moonlight silver, so the return to red still reads
    [450, 0, 6, 270, RED],          // back to the dumpling's red
  ];
  const HIT = [1, 0.85, 0.8, 0.72, 0.66, 0.6, 0.55, 0.5, 0.45];   // how hard each change lands
  const RUN = [210, 466];                                               // body and face are designed in here
  const inRun = (f) => f >= RUN[0] && f < RUN[1];
  const measured = (table, f) => {
    if (!inRun(f)) return at(table, ref(f));
    if (table === D.FACE) { const v = at(table, ref(f)); v[3] = 1; v[4] = D.G[2]; return v; } // head turn only
    // the body: a calm round shape gliding between the measured ends of the run; the hits deform it
    const A = at(table, ref(RUN[0])), B = at(table, ref(RUN[1])), u = Eio(P(f, RUN[0], RUN[1]));
    const v = A.map((x, i) => lerp(x, B[i], u)), edge = Math.min(P(f, RUN[0], RUN[0] + 4), 1 - P(f, RUN[1] - 4, RUN[1]));
    return v.map((x, i) => (i >= 3 ? x * (1 - edge) : x));
  };
  // damped spring: the settle after a push
  const spring = (x, period, decay) => (x < 0 ? 0 : Math.exp(-x / decay) * Math.cos((2 * Math.PI * x) / period));
  // After the star, each change replays one whole reference skin change at its own speed: the side its skin came in
  // from (SKINS) and the body's reaction to it, so the push, the shape and the drift all come from one event.
  // [reference start (2 frames before that change), end, mirror, strength]
  // strength follows the material: candy 0.9, knit 1, ice 0.7, plaid 0.9, holly 1, velvet 1, silver 0.75
  const REACT = [[338, 362, 0, 0.9], [323, 347, 0, 1], [287, 311, 0, 0.7], [307, 331, 0, 0.9], [379, 403, 0, 1], [409, 433, 0, 1], [365, 389, 0, 0.75]];
  // the deviation of the reference outline from its own drift across the window, eased in and out
  function reaction(i, tau) {
    const w = REACT[i - 1];
    if (!w || tau < 0 || tau > w[1] - w[0]) return null;
    const A = D.OUTLINE[w[0]], B = D.OUTLINE[w[1]], u = tau / (w[1] - w[0]), O = at(D.OUTLINE, w[0] + tau);
    const env = Eio(P(tau, 0, 3)) * (1 - Eio(P(tau, w[1] - w[0] - 6, w[1] - w[0])));
    const dev = O.map((v, j) => (v - lerp(A[j], B[j], u)) * env * w[3]);
    if (w[2]) { // mirrored left to right: t -> pi - t
      dev[0] = -dev[0];
      for (let k = 1; k <= 6; k++) { const sg = k % 2 ? -1 : 1; dev[3 + 2 * (k - 1)] *= sg; dev[4 + 2 * (k - 1)] *= -sg; }
    }
    return dev;
  }
  // each change: [index, frames since it started scaled to the first change's tempo, entry angle, strength]
  function changes(f) {
    const out = [];
    SKINS.forEach(([s0, , , deg], i) => {
      const next = i + 1 < SKINS.length ? SKINS[i + 1][0] : s0 + 48, sc = clamp((next - s0) / 48, 0.5, 1);
      const tau = (f - s0) / sc;
      if (tau >= -2 && tau < 30) out.push({ i, tau, sc, th: (-deg * Math.PI) / 180, k: HIT[i] });
    });
    return out;
  }

  // what happens to the body: r0 scale, Fourier a2/b2 (squash axis), centre shift, a squeeze band
  // [height on the body -1..1 (screen up), strength], and the hit [entry angle, dent, far-side swell]
  function sceneBody(f) {
    const out = { r0: 1, a2: 0, b2: 0, dx: 0, dy: 0, band: [0, 0], impact: [0, 0, 0], dk: new Array(12).fill(0) };
    const gEx = ref(f);
    if (gEx >= 930 && gEx < 962) {
      out.dy -= tugUp(gEx);
      out.a2 += -0.05 * Eio(P(gEx, 938, LET_GO)) * (1 - P(gEx, LET_GO, 949))      // stretched by the pull
              + 0.14 * Math.sin(Math.PI * P(gEx, 950, 954)) + 0.05 * spring(gEx - 954, 8, 4);   // lands, squashes
    }
    // leaning toward the icon while the star is on its way
    out.dx += 6 * Eio(P(f, 182, 200)) * (1 - Eio(P(f, T0, T0 + 8)));
    // the star lands with a designed hit: a dent at the entry, the far side swells, the body squashes along the
    // push and gives way, springs back past round once and settles. Later changes use the reference's reactions.
    for (const c of changes(f)) {
      const t = c.tau;
      if (t < 0) continue;
      if (c.i > 0) {          // the reference's own reaction, unscaled in time
        const dev = reaction(c.i, f - SKINS[c.i][0] + 2);
        if (dev) { out.dx += dev[0]; out.dy += dev[1]; out.r0 += dev[2] / 153; for (let j = 0; j < 12; j++) out.dk[j] += dev[3 + j]; }
        continue;
      }
      const A = c.k * kf(t, [[0, 0], [2, -0.035], [5, -0.085], [7, -0.06], [11, 0.04], [16, -0.015], [22, 0.005], [28, 0]]);
      out.a2 += A * Math.cos(2 * c.th); out.b2 += A * Math.sin(2 * c.th);
      const dent = c.k * 0.055 * Eout(P(t, 0, 3)) * (1 - Eio(P(t, 3, 9))), swell = c.k * 0.025 * Math.sin(Math.PI * P(t, 1, 10));
      if (dent + swell > out.impact[1] + out.impact[2]) out.impact = [c.th, dent, swell];
      const give = c.k * 306 * kf(t, [[0, 0], [5, 0.025], [11, -0.008], [18, 0]]);
      out.dx += -Math.cos(c.th) * give; out.dy += Math.sin(c.th) * give;
      // what the material does to the body, folded into the same hit
      if (c.i === 1 && t < 14) out.band = [-1.15 + 2.35 * Eio(t / 14), 0.12 * Math.sin((Math.PI * t) / 14)];   // knit: the hem runs up
    }
    return out;
  }
  // what happens to the face: eye opening (one control in the run), pupil size, extra look
  function sceneFace(f) {
    const out = { open: 1, pup: 1, lu: 0, lv: 0, only: inRun(f) };
    // the star pops: pupils widen and follow it, then the entry, then the colour across
    out.pup += 0.2 * Math.sin(Math.PI * P(f, 194, T0 + 4));
    if (f >= 196 && f < T0 + 16) {
      const tau = f - T0, b = ballRest(), sp = starAt(Math.min(f, T0));
      let dx = sp[0] - b.cx, dy = -(sp[1] - b.cy); const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const along = Eio(P(tau, 6, 11)) * (1 - Eio(P(tau, 11, 16)));
      const w = 0.075 * (1 - P(tau, 11, 16)) * Eout(P(f, 196, 202));
      out.lu += w * lerp(dx, -dx * 0.5, along) - 0.03 * Eout(P(f, 196, 202)) * (1 - P(tau, 11, 16));
      out.lv += w * lerp(dy, -dy * 0.5, along) + 0.024 * Eout(P(f, 196, 202)) * (1 - P(tau, 11, 16));
    }
    // the face says less in the run: one squint as the star is taken in, then eyes open, relaxing at the end
    let open = 1;
    for (const c of changes(f)) if (c.i === 0) open = Math.min(open, kf(c.tau, [[-6, 1], [0, 1], [1, 0.82], [3, 0.6], [6, 0.74], [11, 1]]));
    out.pup += 0.1 * Math.sin(Math.PI * P(f, 446, 470));
    if (inRun(f)) out.open = open;
    // ending: settled in the word, a happy squint (reference F866-F892)
    const g = ref(f);
    if (g >= 862 && g < 896) { out.open = 1 - Eio(P(g, 862, 868)) * (1 - Eio(P(g, 889, 895))); out.happy = true; }
    if (g >= 930 && g < 952) out.lv += 0.06 * Eio(P(g, 930, 940)) * (1 - Eio(P(g, 946, 952)));
    if (g >= 954 && g < 978) { out.open = 1 - Eio(P(g, 954, 958)) * (1 - Eio(P(g, 972, 977))); out.happy = true; }
    return out;
  }

  // ---- the dumpling -----------------------------------------------------------------------------------------------
  // face geometry from the design sheet (body r 172 in a 400 box): white 54x70, pupil 24x34
  // drawn 1.3x the sheet size so the face still reads on a phone
  const EYE_LON = Math.asin(52 / 172), EYE_LAT = Math.asin(52 / 172), EK = 1.3;
  const WHITE = [(27 * EK) / 172, (35 * EK) / 172], PUP = [(12 * EK) / 172, (17 * EK) / 172], GLINT = [(3 * EK) / 172, (4 * EK) / 172];
  // the body outline, measured per frame: centroid, mean radius r0 and Fourier terms k (angle t counter-clockwise
  // from screen right); box = [cx, cy, w, h, R] where R(t) is the radius toward t
  const ballBox = (f) => {
    const o = measured(D.OUTLINE, f), sb = sceneBody(f);
    let [cx, cy, r0] = [o[0] + sb.dx, o[1] + sb.dy, o[2] * sb.r0];
    const k = o.slice(3);
    const g = ref(f);
    if (g >= 600) { // the ending's track is over the reference's "Grok"; move it onto our "o", scaled to fit it
      const L = wordLayout(), e = Eio(P(g, 956, 1000));
      cx = lerp(L.oX + (cx - 1468) * L.kb, cx, e); cy = lerp(L.oY + (cy - 556) * L.kb, cy, e); r0 *= lerp(L.kb, 1, e);
    }
    k[2] += sb.a2; k[3] += sb.b2;
    for (let j = 0; j < 12; j++) k[j] += sb.dk[j];
    const sk = { ...skinState(f), band: sb.band, impact: sb.impact };
    const R = (t) => { let s = 1; for (let j = 0; j < 6; j++) s += k[2 * j] * Math.cos((j + 1) * t) + k[2 * j + 1] * Math.sin((j + 1) * t); return r0 * s * surf(sk, t); };
    return [cx, cy, 2 * R(0), 2 * R(Math.PI / 2), R, r0, k, sk];
  };
  const outlinePath = (box) => {
    const [cx, cy, , , R] = box;
    ctx.beginPath();
    for (let i = 0; i < 180; i++) { const t = (2 * Math.PI * i) / 180, r = R(t); i ? ctx.lineTo(cx + Math.cos(t) * r, cy - Math.sin(t) * r) : ctx.moveTo(cx + Math.cos(t) * r, cy - Math.sin(t) * r); }
    ctx.closePath();
  };
  // pupils move inside the whites before the head turns: they find the drops 3 frames early
  const look = (f) => {
    const toIcon = Eout(P(f, 93, 101)) * (1 - Eio(P(f, 226, 244))), right = Eout(P(f, 500, 506)) * (1 - Eio(P(f, 534, 546)));
    return [0.03 + 0.065 * toIcon + 0.055 * right, -0.03 + 0.015 * toIcon];
  };

  function drawBall(f) {
    const box = ballBox(f), [cx, cy, w, h, , r0, k, sk] = box;
    if (r0 < 0.5) return;
    const [yaw, pitch, roll] = measured(D.FACE, f), R = rot(yaw, pitch, roll);
    const body = BodyGL.render({ r0, k, R, a: sk.a, b: sk.b, wipe: sk.wipe, wipeAngle: sk.angle, wipeZ: sk.wz, viewA: sk.viewA, viewB: sk.viewB, seed: sk.seed, time: f / FPS, wob: sk.wob, bulge: sk.bulge, band: sk.band, impact: sk.impact });
    ctx.drawImage(body, cx - BodyGL.S / 2, cy - BodyGL.S / 2);
    ctx.save();
    outlinePath(box); ctx.clip();
    // soft rim light on the upper left, scaled with the body
    ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.39, h * 0.39, 0, Math.PI * 1.08, Math.PI * 1.42);
    ctx.strokeStyle = "rgba(255,255,255,0.24)"; ctx.lineWidth = Math.max(1, w * 0.012); ctx.lineCap = "round"; ctx.stroke();
    if (f >= 5) drawEyes(f, box);
    ctx.restore();
    drawCap(f, box);
  }

  // ---- the ornament cap: grows out of the top as the star is taken in, then stays. It is rigid metal: it follows
  // the body's top point and tilt but never squashes with it. Sizes from the design: cap .17D x .055D, ring .055D x .075D
  const SHOW_CAP = false; // the ornament cap is off: the ribbon ties straight to the top of the ball
  let capTop = null, capDia = 0; // the top of the cap's ring (or of the ball) in screen space, and the ball's size, this frame
  // where the cap sits: the body's up axis on screen, mostly pulled to straight up (an ornament hangs from its top)
  function capPlace(f, box) {
    const [yaw, pitch, roll] = measured(D.FACE, f), R3 = rot(yaw, pitch, roll), r0 = box[5];
    const grow = SHOW_CAP ? Eout(P(f, T0 + 6, T0 + 12)) : 0, ring = SHOW_CAP ? Eout(P(f, T0 + 12, T0 + 18)) : 0;
    const [cx, cy, , , Rt] = box, up = [0.3 * R3[0][1], 0.3 * R3[1][1] + 0.7];
    const l = Math.hypot(up[0], up[1]) || 1, ux = up[0] / l, uy = up[1] / l, t = Math.atan2(uy, ux);
    const dia = 2 * r0, top = [cx + ux * Rt(t), cy - uy * Rt(t)], tilt = Math.atan2(ux, uy);
    const w = 0.17 * dia * lerp(0.35, 1, grow), h = 0.055 * dia * grow, ry = -h - 0.032 * dia * ring - 0.0375 * dia * ring;
    return { grow, ring, D: dia, top, tilt, w, h, ringTop: [top[0] - ry * Math.sin(tilt), top[1] + ry * Math.cos(tilt)] };
  }
  function drawCap(f, box) {
    const { grow, ring, D, top, tilt, w, h } = capPlace(f, box);
    if (grow <= 0) return;
    ctx.save(); ctx.translate(top[0], top[1]); ctx.rotate(tilt);
    if (ring > 0) {
      ctx.globalAlpha = ring; ctx.lineWidth = Math.max(1.5, 0.012 * D); ctx.strokeStyle = "#C9A256";
      ctx.beginPath(); ctx.ellipse(0, -h - 0.032 * D * ring, 0.0275 * D, 0.0375 * D * ring, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, "#8F6A2A"); g.addColorStop(0.35, "#E9CD86"); g.addColorStop(0.6, "#C99B4A"); g.addColorStop(1, "#7A5822");
    ctx.fillStyle = g;
    const y0 = -h + 0.012 * D, r = Math.min(h, w) * 0.25;
    ctx.beginPath(); ctx.roundRect(-w / 2, y0, w, h + 0.01 * D, r); ctx.fill();
    ctx.strokeStyle = "rgba(90,62,20,0.55)"; ctx.lineWidth = Math.max(1, 0.004 * D);         // pressed ribs
    for (let i = 1; i < 6; i++) { const x = -w / 2 + (w * i) / 6; ctx.beginPath(); ctx.moveTo(x, y0 + h * 0.15); ctx.lineTo(x, y0 + h + 0.006 * D); ctx.stroke(); }
    ctx.restore();
  }

  function drawEyes(f, box) {
    const [yaw, pitch, roll, blink0, hh] = measured(D.FACE, f), R = rot(yaw, pitch, roll), sf = sceneFace(f);
    const blink = sf.only ? sf.open : blink0 * sf.open;
    // hh: the reference eye's half-height. Tall = normal, about its width = round "curious" eye, tiny = shut
    const [, , EL, EW] = D.G, tall = clamp((hh - EW) / (EL - EW));
    const open = sf.only ? blink : blink * clamp((hh - 0.045) / (EW - 0.045)), [lu0, lv0] = look(ref(f)), lu = lu0 + sf.lu, lv = lv0 + sf.lv;
    const roundY = lerp(WHITE[0] / WHITE[1], 1, tall), pupK = (1 + 0.18 * (1 - tall)) * sf.pup;
    const s = box[2] / 308; // line widths follow the body size
    for (const side of [-1, 1]) {
      const lon = side * EYE_LON, ry = WHITE[1] * roundY;
      // the upper lid comes down: the white keeps its lower edge and loses height from the top
      const lid = ry * (1 - open);
      if (open > 0.06) {
        const white = sphereEllipse(R, box, lon, EYE_LAT, 0, -lid, WHITE[0], ry * open);
        poly(ctx, white); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.lineWidth = 2.4 * s; ctx.strokeStyle = "rgba(55,35,40,0.34)"; ctx.stroke();
        ctx.save(); poly(ctx, white); ctx.clip();
        poly(ctx, sphereEllipse(R, box, lon, EYE_LAT, lu, lv, PUP[0] * pupK, PUP[1] * pupK)); ctx.fillStyle = PUPIL; ctx.fill();
        poly(ctx, sphereEllipse(R, box, lon, EYE_LAT, lu - 0.024, lv + 0.045, GLINT[0], GLINT[1], 20)); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.restore();
        // the lid's edge while it sweeps down
        if (open < 0.9) { ctx.lineWidth = 3.5 * s; ctx.strokeStyle = PUPIL; ctx.lineCap = "round"; ctx.globalAlpha = clamp((0.9 - open) / 0.3); lidLine(R, box, lon, ry - 2 * lid, 0); ctx.globalAlpha = 1; }
      }
      if (open < 0.3) { // shut: a soft downward curve where the eye was, or a happy arch
        ctx.globalAlpha = clamp((0.3 - open) / 0.24);
        ctx.lineWidth = 5.5 * s; ctx.strokeStyle = PUPIL; ctx.lineCap = "round";
        if (sf.happy) lidLine(R, box, lon, ry * 0.05, -ry * 0.45); else lidLine(R, box, lon, -ry * 0.55, ry * 0.32);
        ctx.globalAlpha = 1;
      }
    }
  }
  // a line across the eye at height v (tangent-plane units), sagging by `sag` in the middle, projected on the sphere
  function lidLine(R, box, lon, v, sag) {
    const rx = WHITE[0] * 1.02;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const u = -rx + (2 * rx * i) / 16, vv = v - sag * (1 - (u / rx) ** 2);
      const [[x, y]] = sphereEllipse(R, box, lon, EYE_LAT, u, vv, 0, 0, 1);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  // ---- skins --------------------------------------------------------------------------------------------------------
  const playing = (k) => !REVIEW.skins || REVIEW.skins.includes(k);
  const skinIndex = (f) => { let i = -1; SKINS.forEach((sk, k) => { if (f >= sk[0] && playing(k)) i = k; }); return i; };
  const prevIndex = (i) => { for (let k = i - 1; k >= 0; k--) if (playing(k)) return k; return -1; };
  // a skin's picture faces the camera as it was when that skin arrived: the view's right, up and front in body space
  const viewFrame = (f) => { const [yaw, pitch, roll] = measured(D.FACE, f), R = rot(yaw, pitch, roll); return [...R[0], ...R[1], ...R[2]]; };
  const CHARGE = [51, 52, 60, 53, 61, 58, 59, 0];   // the colourful ones; snow white would read as a blank
  function skinState(f) {
    const g = ref(f);
    if (g >= 545 && g < 572) { // every skin flashes across the body as it charges up and bursts
      const n = Math.floor((g - 545) / 2), id = CHARGE[(n * 3) % CHARGE.length], prev = CHARGE[((n + CHARGE.length - 1) * 3) % CHARGE.length];
      return { a: n ? prev : 0, b: id, wipe: 0.9 + 0.5 * Math.sin(g * 1.3), angle: (n * 137) % 360, seed: n * 1.3, wob: 0.035, bulge: [0, 0, 0], viewA: null, viewB: viewFrame(f) };
    }
    const i = skinIndex(f);
    if (i < 0) return { a: 0, b: 0, wipe: 0, angle: 0, seed: 0, wob: 0, bulge: [0, 0, 0] };
    const [start, id, len, angle] = SKINS[i], u = P(f, start, start + len);
    const pk = prevIndex(i), prev = pk >= 0 ? SKINS[pk][1] : 0;
    const viewB = viewFrame(start + 2), viewA = pk >= 0 ? viewFrame(SKINS[pk][0] + 2) : null;
    if (u >= 1) return { a: id, b: id, wipe: 0, angle, seed: i * 1.7, wob: 0, bulge: [0, 0, 0], viewA: viewB, viewB };
    // already a visible patch on its first frame, fast through the middle, settling at the end
    const bulge = i === 0 ? [0, 0, 0] : [(-angle * Math.PI) / 180, Eio(u), 0.035 * HIT[i] * Math.sin(Math.PI * u)];
    return { a: prev, b: id, wipe: 0.3 + 2.6 * Eio(u), angle, seed: i * 1.7, wob: 0, bulge, wz: 0.42, viewA, viewB };
  }
  // the same outline deformation the shader applies (assets/body-gl.js), so eyes and clipping follow the surface
  const wrapA = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  const surf = (sk, t) => {
    const [ta, u, amp] = sk.bulge, g = (x) => Math.exp(-(wrapA(x) ** 2) / (2 * 0.45 * 0.45));
    const [bh, bs] = sk.band || [0, 0], band = bs * Math.exp(-((Math.sin(t) - bh) ** 2) / (2 * 0.2 * 0.2));
    const [ia, dent, swell] = sk.impact || [0, 0, 0];
    const hit = 1 - dent * Math.exp(-(wrapA(t - ia) ** 2) / (2 * 0.38 * 0.38)) + swell * Math.exp(-(wrapA(t - ia - Math.PI) ** 2) / (2 * 0.6 * 0.6));
    return (1 + sk.wob * (0.6 * Math.sin(5 * t + sk.seed * 3) + 0.4 * Math.sin(8 * t - sk.seed * 5)) + amp * (g(t - ta - Math.PI * u) + g(t - ta + Math.PI * u))) * (1 - band) * hit;
  };

  // ---- auras ---------------------------------------------------------------------------------------------------------
  const wobbly = (cx, cy, r, seed, f, amp = 1) => {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const t = (2 * Math.PI * i) / 96;
      const k = 1 + amp * (0.045 * Math.sin(9 * t + seed + 0.05 * f) + 0.03 * Math.sin(13 * t + 2.1 * seed - 0.04 * f) + 0.02 * Math.sin(5 * t - seed));
      i ? ctx.lineTo(cx + Math.cos(t) * r * k, cy + Math.sin(t) * r * k * 0.97) : ctx.moveTo(cx + Math.cos(t) * r * k, cy + Math.sin(t) * r * k * 0.97);
    }
    ctx.closePath();
  };
  const kf = (f, keys) => {
    if (f <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (f < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (f - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    return keys[keys.length - 1][1];
  };
  // the shock ring as the icon is swallowed: a wavy band that thins to a glowing line as it races off screen
  function drawShock(f, box) {
    if (f < T0 || f > T0 + 44) return;
    f += 222 - T0;
    const [cx, cy] = box;
    const ro = kf(f, [[222, 170], [224, 210], [228, 310], [234, 449], [240, 557], [248, 654], [266, 900]]);
    const band = kf(f, [[222, 46], [230, 34], [240, 14], [256, 8]]);
    const a = 1 - P(f, 240, 264), col = f < 236 ? RED : "#FF6F91";
    ctx.save();
    ctx.strokeStyle = col;
    ctx.filter = "blur(16px)"; ctx.globalAlpha = 0.35 * a; ctx.lineWidth = band * 2.2; wobbly(cx, cy, ro - band / 2, 1.3, f, 0.8); ctx.stroke();
    ctx.filter = "blur(3px)"; ctx.globalAlpha = 0.55 * a; ctx.lineWidth = band; wobbly(cx, cy, ro - band / 2, 1.3, f, 0.8); ctx.stroke();
    ctx.filter = "blur(1px)"; ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = "#FFC2D1"; ctx.lineWidth = 2; wobbly(cx, cy, ro, 1.3, f, 0.8); ctx.stroke();
    ctx.restore();
  }
  // per-skin aura: three soft wavy rings and a centre glow in the skin's colour; a new skin pushes them out 45 px
  function ringSet(cx, cy, col, scale, push, alpha, seed, f) {
    const R0 = [190, 235, 295], A = [0.16, 0.08, 0.035], B = [10, 24, 42];
    ctx.save();
    ctx.fillStyle = col; ctx.strokeStyle = col;
    for (let k = 2; k >= 0; k--) {
      const r = R0[k] * scale + push;
      ctx.filter = `blur(${B[k]}px)`; ctx.globalAlpha = A[k] * alpha; wobbly(cx, cy, r, seed + k, f); ctx.fill();
      ctx.filter = "blur(2px)"; ctx.globalAlpha = 0.16 * alpha * (k === 2 ? 0.7 : 1); ctx.lineWidth = 3; wobbly(cx, cy, r + 8, seed + k + 0.5, f); ctx.stroke();
    }
    ctx.restore();
  }
  function drawAura(f, box) {
    const i = skinIndex(f);
    if (i < 0 || f > 560) return;
    const [cx, cy] = box, scale = 1 + 0.5 * Eio(P(f, 253, 510));
    const fadeOut = 1 - P(f, 521, 555);
    for (let k = Math.max(0, i - 1); k <= i; k++) {
      const [start, , , , col] = SKINS[k], u = Eout(P(f, SKINS[i][0] + 3, SKINS[i][0] + 11));
      const born = Eout(P(f, start, start + 14)) * (k === 0 ? P(f, 236, 252) : 1);
      const alpha = (k === i ? u : 1 - u) * born * fadeOut;
      if (alpha <= 0.01) continue;
      const push = k === i ? 45 * (u - 1) : 45 * u;
      ringSet(cx, cy, col, scale, push, alpha, k * 2.3, f);
    }
  }

  // ---- drops and the app icon -----------------------------------------------------------------------------------
  // icon in frame-204 coordinates; it then drifts and is pulled into the dumpling along the measured logo track
  const ICON_C = [1372, 462], ICON_S = 146;
  const LOGO = D.LOGO;
  const logoXform = (f) => {
    if (f <= LOGO[0][0]) return LOGO[0].slice(1);
    for (let i = 1; i < LOGO.length; i++) if (f < LOGO[i][0]) {
      const u = (f - LOGO[i - 1][0]) / (LOGO[i][0] - LOGO[i - 1][0]);
      return [1, 2, 3].map((k) => lerp(LOGO[i - 1][k], LOGO[i][k], u));
    }
    return LOGO[LOGO.length - 1].slice(1);
  };
  const iconAt = (f) => {
    const [ox, oy, s0] = logoXform(Math.min(Math.max(f, 168), 204));
    const s = s0 * (1 - Eio(P(f, 203, 216)));
    const pop = 1 + 0.05 * Math.sin(Math.PI * P(f, 167, 177)) * (1 - P(f, 172, 180)) // the snap: a small overshoot
      + 0.08 * Math.sin(Math.PI * P(f, 193, 201)); // and puffs as it lets the star go
    return { x: ICON_C[0] + ox, y: ICON_C[1] + oy, s: s * pop };
  };
  // the drops become the app tile: the tile is split into four corner regions, one per drop (tile half 84, corner 40)
  const ORDER = ["C", "A", "D", "B"];
  const QUAD = { C: [-1, -1], B: [1, -1], A: [-1, 1], D: [1, 1] };
  const TILE_HALF = 84, TILE_R = 40;
  const regionAt = (k, f) => {
    const ic = iconAt(f), h = TILE_HALF * ic.s, [sx, sy] = QUAD[k], ov = 16;   // regions overlap 16 px past the centre
    const hw = h / 2 + ov / 2, x = ic.x + sx * (h / 2) - sx * (ov / 2), y = ic.y + sy * (h / 2) - sy * (ov / 2);
    const soft = 20 * ic.s, R = TILE_R * ic.s;
    const radii = [sx < 0 && sy < 0 ? R : soft, sx > 0 && sy < 0 ? R : soft, sx > 0 && sy > 0 ? R : soft, sx < 0 && sy > 0 ? R : soft];
    return { x, y, hw, hh: hw, radii };
  };
  const aimAt = (k, f) => { const g = regionAt(k, f); return [g.x, g.y]; };
  const N = 72;

  const track = {};
  for (const k of ORDER) {
    const rows = D.DROPS[k], firstR = rows.find((r) => r[3] > 0)[3];
    track[k] = rows.map(([F, x, y, r]) => [F, x, y, r > 0 ? r : firstR]);
  }
  const trackAt = (k, f) => {
    const rows = track[k];
    if (f <= rows[0][0]) {
      const [F0, x0, y0, r0] = rows[0], [F1, x1, y1] = rows[3];
      const vx = (x1 - x0) / (F1 - F0), vy = (y1 - y0) / (F1 - F0);
      return [x0 + vx * (f - F0), y0 + vy * (f - F0), r0];
    }
    for (let i = 1; i < rows.length; i++) if (f < rows[i][0]) {
      const u = (f - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]);
      return [1, 2, 3].map((j) => lerp(rows[i - 1][j], rows[i][j], u));
    }
    return rows[rows.length - 1].slice(1);
  };
  const DROP_GROW = 1.3; // the icon needs more volume than the reference logo
  const ENTER = { A: 76, B: 86, C: 94, D: 94 };
  const TRACK_END = { A: 146, C: 146, B: 128, D: 128 };
  // each drop turns into its region on its own clock: the first pair earlier, the late drops later
  const MORPH = { B: [134, 160], D: [136, 162], A: [146, 168], C: [150, 170] };
  const WOB = {};
  ORDER.forEach((k, i) => { const r = rng(11 + i); WOB[k] = [2, 3, 4, 5].map((m) => [m, (0.07 / m) * 2.2 * (0.6 + 0.8 * r()), r() * 6.28, (r() - 0.5) * 0.25]); });
  const blobR = (k, t, f) => 1 + WOB[k].reduce((s, [m, a, ph, w]) => s + a * Math.sin(m * t + ph + w * f), 0);

  function dropState(k, f) {
    const m = Eio(P(f, ...MORPH[k])), aim = aimAt(k, Math.max(f, 168));
    if (f <= TRACK_END[k]) { const [x, y, r] = trackAt(k, f); return { x, y, r: r * DROP_GROW, m }; }
    const [x0, y0, r0] = trackAt(k, TRACK_END[k]);
    // B and D meet first, right of centre, touching with a thin neck, then part for their places in the word
    const WAY = { B: [[128, x0, y0], [140, 1352, 450], [150, 1336, 440]], D: [[128, x0, y0], [140, 1418, 510], [150, 1384, 504]] };
    const shrink = 1 - 0.3 * Eio(P(f, 140, 166));
    if (WAY[k]) {
      const pts = [...WAY[k], [162, aim[0], aim[1]]];
      let [x, y] = aim;
      for (let i = 1; i < pts.length; i++) if (f < pts[i][0]) {
        const u = Eio(P(f, pts[i - 1][0], pts[i][0]));
        x = lerp(pts[i - 1][1], pts[i][1], u); y = lerp(pts[i - 1][2], pts[i][2], u); break;
      }
      return { x, y, r: r0 * DROP_GROW * shrink, m };
    }
    const u = Eout(P(f, TRACK_END[k], 162));
    return { x: lerp(x0, aim[0], u), y: lerp(y0, aim[1], u), r: r0 * DROP_GROW * shrink, m };
  }
  // the Xiaohongshu wordmark (Simple Icons, CC0), its box is x 0-24, y 7.81-16.38
  const WORDMARK = new Path2D(document.getElementById("wordmark-path").getAttribute("d"));
  // the join: a thin neck at first contact that thickens as the drops pool, then the exact tile takes over
  const joinK = (f) => kf(f, [[0, 5], [124, 5], [140, 24], [166, 24], [176, 10]]);
  const ICON_TEST = false; // review: the drops alone, white on black
  function drawIcon(f) {
    if (f < 76 || f >= 216) return;
    const ic = iconAt(f), S2 = IconGL.S / 2, ox = ic.x - S2, oy = ic.y - S2;
    const drops = ORDER.map((k, i) => {
      const st = dropState(k, f);
      const a = trackAt(k, Math.min(f, TRACK_END[k])), b = trackAt(k, Math.min(f, TRACK_END[k]) - 1);
      const sp = Math.hypot(a[0] - b[0], a[1] - b[1]);
      return { x: st.x - ox, y: st.y - oy, r: st.r, stretch: 1 + clamp(sp / 140, 0, 0.35) * (1 - st.m), angle: Math.atan2(a[1] - b[1], a[0] - b[0]),
               phase: i * 1.9 + f * 0.04, morph: st.m, on: f >= ENTER[k] };
    });
    const regions = ORDER.map((k) => { const g = regionAt(k, f); return { ...g, x: g.x - ox, y: g.y - oy }; });
    const tile = { x: S2, y: S2, half: TILE_HALF * ic.s, r: TILE_R * ic.s };
    const color = ICON_TEST ? [1, 1, 1] : [1, 36 / 255, 66 / 255];
    const body = IconGL.render({ drops, regions, tile, k: joinK(f), tileW: Eio(P(f, 162, 176)), color });
    if (!ICON_TEST) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.filter = "blur(18px)"; ctx.globalAlpha = 0.25; ctx.drawImage(body, ox, oy);
      ctx.restore();
    }
    ctx.drawImage(body, ox, oy);
    // once the tile stands, the white wordmark appears whole and crisp, with a small settle
    const rev = P(f, 176, 184);
    if (rev > 0 && !ICON_TEST) {
      const side = 2 * TILE_HALF * ic.s, mw = side * 0.74, sc = (mw / 24) * kf(f, [[176, 0.86], [181, 1.04], [184, 1]]), mh = 8.57 * sc;
      ctx.save(); ctx.globalAlpha = Eout(rev);
      ctx.translate(ic.x - (24 * sc) / 2, ic.y - mh / 2); ctx.scale(sc, sc); ctx.translate(0, -7.81);
      ctx.fillStyle = "#fff"; ctx.fill(WORDMARK);
      ctx.restore();
    }
  }

  // ---- the save star: the icon lets one go, it arcs over and goes into the dumpling ------------------------------
  const STAR_R = 26, STAR_V = 17; // radius, speed through the surface (px per frame)
  // the body at T0 without the hit: where the star aims
  const ballRest = () => { const o = measured(D.OUTLINE, T0); return { cx: o[0] + 6 * Eio(1), cy: o[1], r: o[2] }; };
  function starAt(f) {
    const b = ballRest(), din = [-Math.cos(ENTRY), Math.sin(ENTRY)];
    const E = [b.cx + Math.cos(ENTRY) * b.r, b.cy - Math.sin(ENTRY) * b.r];
    const at0 = [E[0] - din[0] * STAR_R, E[1] - din[1] * STAR_R];       // leading point just on the surface
    if (f >= T0 - 6) { const d = (f - T0) * STAR_V; return [at0[0] + din[0] * d, at0[1] + din[1] * d]; }
    // the arc from the icon, arriving along the entry direction at T0 - 6
    const ic = iconAt(198), side = ICON_S * ic.s;
    const p0 = [ic.x - side * 0.25, ic.y - side * 0.45], p2 = [at0[0] - din[0] * 6 * STAR_V, at0[1] - din[1] * 6 * STAR_V];
    const p1 = [p2[0] - din[0] * 170, p2[1] - din[1] * 170];
    const u = Math.pow(P(f, 198, T0 - 6), 1.25), q = 1 - u;
    return [q * q * p0[0] + 2 * q * u * p1[0] + u * u * p2[0], q * q * p0[1] + 2 * q * u * p1[1] + u * u * p2[1]];
  }
  function starPath(c2, x, y, r, rot) {
    c2.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.5 : r;
      i ? c2.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c2.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c2.closePath();
  }
  function drawStar(f) {
    if (f < 196 || f > T0 + 7) return;
    const [x, y] = starAt(Math.max(f, 198)), born = Eout(P(f, 196, 200)) * 1.15 - 0.15 * P(f, 199, 202);
    const r = STAR_R * born, rot = -0.08 * (f - 196);
    ctx.save();
    // hide the part already inside the body
    const box = ballBox(f), [cx, cy, , , R] = box;
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    for (let i = 0; i <= 180; i++) { const t = -(2 * Math.PI * i) / 180, rr = R(t); i ? ctx.lineTo(cx + Math.cos(t) * rr, cy - Math.sin(t) * rr) : ctx.moveTo(cx + Math.cos(t) * rr, cy - Math.sin(t) * rr); }
    ctx.closePath(); ctx.clip("evenodd");
    ctx.translate(x, y);
    ctx.shadowColor = "rgba(255,201,74,0.7)"; ctx.shadowBlur = 16;
    starPath(ctx, 0, 0, r, rot); ctx.fillStyle = "#FFC94A"; ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = 2.5; ctx.strokeStyle = "#F2A11F"; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.3, r * 0.14, r * 0.09, -0.6, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill();
    ctx.restore();
  }

  // ---- ending: the burst, the wordmark, the landing ---------------------------------------------------------------
  // All times here are reference frames g = ref(f) (the film runs 90 frames behind the reference by now).
  const CREAM = "#F7EEDF", INK = "#35262B";
  const WORD = "REDnote", FONT = '700 216px "Inter Film"', TRACK = -7;
  let layout = null;
  // letter positions and the o's centre; the ball is scaled so it just covers the o
  function wordLayout() {
    if (layout && layout.ready) return layout;
    ctx.save(); ctx.font = FONT;
    const ws = [...WORD].map((ch) => ctx.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + TRACK * (WORD.length - 1);
    const om = ctx.measureText("o"), oH = om.actualBoundingBoxAscent + om.actualBoundingBoxDescent;
    ctx.restore();
    const oY = 556, base = oY + (om.actualBoundingBoxAscent - om.actualBoundingBoxDescent) / 2;
    let x = 960 - total / 2;
    const xs = ws.map((w) => { const x0 = x; x += w + TRACK; return x0; });
    const oi = WORD.indexOf("o");
    layout = { xs, ws, base, oX: xs[oi] + ws[oi] / 2, oY, oH, kb: (oH * 1.08) / 92, ready: document.fonts.check(FONT) };
    return layout;
  }
  const ORDER_IN = [3, 1, 5, 0, 6, 2, 4]; // letters sharpen out of the blur in this order
  const ORDER_OUT = [0, 1, 2, 3, 4, 5, 6]; // and soften away left to right
  function drawWord(g, box) {
    if (g < 588 || g > 1000) return;
    const L = wordLayout();
    ctx.save(); ctx.font = FONT; ctx.fillStyle = INK; ctx.textBaseline = "alphabetic";
    [...WORD].forEach((ch, i) => {
      const off = ORDER_IN[i] * 2.5, u = Eout(P(g, 588 + off, 588 + off + 36));
      const out = Eio(P(g, 942 + ORDER_OUT[i] * 3, 978 + ORDER_OUT[i] * 3));
      const blur = 26 * (1 - u) + 20 * out, alpha = (0.03 + 0.97 * u) * (1 - out);
      if (alpha <= 0.004) return;
      ctx.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "none";
      ctx.globalAlpha = alpha;
      if (ch === "o") {
        // the o is a trampoline: the falling ball presses it flat; once the ball takes its place it is gone
        const [, , , , R] = box, bottom = box[1] + R(-Math.PI / 2), top = L.oY - L.oH / 2;
        const press = g >= 643 && g < 760 ? clamp((bottom - top) / L.oH, 0, 0.6) : 0;
        const sy = 1 - press, sx = 1 + 0.4 * press, gone = P(g, 748, 754);
        if (gone >= 1) return;
        ctx.globalAlpha = alpha * (1 - gone);
        const bx = L.xs[i] + L.ws[i] / 2, by = L.oY + L.oH / 2;
        ctx.translate(bx, by); ctx.scale(sx, sy); ctx.fillText(ch, -L.ws[i] / 2, L.base - by);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else ctx.fillText(ch, L.xs[i], L.base);
    });
    ctx.restore();
  }
  function drawSubline(g) {
    const a = Eout(P(g, 790, 812)) * (1 - Eio(P(g, 940, 966)));
    if (a <= 0) return;
    ctx.save();
    ctx.font = '32px "Noto Sans SC"'; ctx.letterSpacing = "6px"; ctx.textAlign = "center"; ctx.fillStyle = "#9B7968";
    ctx.globalAlpha = a; ctx.filter = `blur(${(6 * (1 - Eout(P(g, 790, 806)))).toFixed(1)}px)`;
    ctx.fillText("把喜欢，挂上圣诞树。", 960 + 3, 778);
    ctx.restore();
  }
  // a soft contact shadow once the ball sits in the word
  function drawShadow(g, box) {
    if (g < 643 || g > 990) return;
    const L = wordLayout(), [cx, cy, , , R] = box, bottom = cy + R(-Math.PI / 2), floor = L.oY + L.oH / 2;
    const fade = 1 - P(g, 950, 975);
    // on the wall behind: offset away from the light (upper left), softer and fainter the higher the ball is
    const lift = clamp((floor - bottom) / 300), r = R(0);
    ctx.save(); ctx.globalCompositeOperation = "multiply";
    ctx.filter = `blur(${(8 + 14 * lift).toFixed(1)}px)`; ctx.globalAlpha = (0.32 - 0.2 * lift) * fade; ctx.fillStyle = "#8C6A62";
    ctx.beginPath(); ctx.ellipse(cx + 12 + 18 * lift, cy + 16 + 22 * lift, r * 0.95, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    // contact shadow where it sits in the word
    const near = clamp(1 - Math.abs(floor - bottom) / 120) * fade;
    if (near > 0) { ctx.filter = "blur(6px)"; ctx.globalAlpha = 0.3 * near; ctx.beginPath(); ctx.ellipse(cx + 4, floor + 6, r * 0.8, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }



  // ---- the hang: the ball comes down on a red ribbon tied to its top, from a pine twig peeking in at the top edge.
  // The ribbon explains the fall and the bounces (an ornament on a springy ribbon); it is slack while the ball is
  // high, taut once it hangs in the o. The twig arrives with the ball, so nothing appears without a reason.
  const twigY = (x, oX) => 34 + 7 * Math.sin((x - oX) / 160);
  const twigIn = (g) => Eout(P(g, 628, 648));
  // the exit: the twig lifts (slowly, then away), the taut cord tugs the ball up until the bow comes undone
  const LET_GO = 946;
  const twigLift = (g) => (g < LET_GO ? 40 * Eio(P(g, 930, LET_GO)) : 40 + 1100 * Math.pow(P(g, LET_GO, 1010), 1.7));   // carries the whole cord out of frame
  const tugUp = (g) => (g < LET_GO ? twigLift(g) : kf(g, [[LET_GO, 40], [951, 0], [954, 9], [957, 0]]));
  function drawTwig(g) {
    const a = twigIn(g);
    if (a <= 0) return;
    const { oX } = wordLayout(), x0 = oX - 260, x1 = oX + 300, r = rng(31), dy = -40 * (1 - a) - twigLift(g);
    ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.4); ctx.lineCap = "round"; ctx.translate(0, dy);
    ctx.strokeStyle = "#4A3A2C"; ctx.lineWidth = 8;
    ctx.beginPath(); for (let x = x0; x <= x1; x += 8) (x === x0 ? ctx.moveTo(x, twigY(x, oX)) : ctx.lineTo(x, twigY(x, oX))); ctx.stroke();
    // short needles in tufts, pointing forward along the twig, two greens
    for (let x = x0 + 4; x < x1 - 6; x += 5) {
      const y = twigY(x, oX), taper = Math.min(1, (x1 - x) / 110, (x - x0) / 70 + 0.45);
      for (const side of [-1, 1, -1, 1]) {
        const ang = side * (0.7 + 0.55 * r()) - 0.45, len = (34 + 22 * r()) * taper;
        ctx.strokeStyle = r() < 0.5 ? "#234D42" : "#3E7A62"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // the cord is simulated (Verlet, fixed steps, from the moment the ball comes in), so it hangs with weight, swings
  // with the bounces and pulls straight once the ball hangs. At F940 (reference) the bow lets go and the cord is drawn
  // up with the twig. Positions are cached per reference frame; seeking replays from the start of the cache.
  const ROPE = { g0: 643, gEnd: 1030, n: 24, frames: [] };
  const ropeAnchor = (g) => { const { oX } = wordLayout(); return [oX + 4, twigY(oX + 4, oX) + 2 - 40 * (1 - twigIn(g)) - twigLift(g)]; };
  const ballTopAt = (g) => capPlace(g + 13, ballBox(g + 13)).ringTop;
  function ropeAt(g) {
    const gi = Math.max(ROPE.g0, Math.min(ROPE.gEnd, Math.floor(g)));
    if (!wordLayout().ready) ROPE.frames = []; // positions depend on the wordmark's metrics: only cache once the font is in
    if (!ROPE.frames.length) {
      const { oY, oH } = wordLayout(), A = ropeAnchor(ROPE.g0), E = ballTopAt(ROPE.g0);
      ROPE.rest = oY - oH * 0.54 - A[1] + 4;
      ROPE.seg = ROPE.rest / (ROPE.n - 1);
      // start as a loop hanging between the anchor and the ball up above, then let it settle
      let pts = Array.from({ length: ROPE.n }, (_, k) => { const u = k / (ROPE.n - 1); return [lerp(A[0], E[0], u) + 30 * Math.sin(Math.PI * u), lerp(A[1], E[1], u) + 160 * Math.sin(Math.PI * u)]; });
      ROPE.cur = pts; ROPE.prev = pts.map((p) => p.slice());
      for (let w = 0; w < 120; w++) ropeStep(A, E, true);
      ROPE.frames.push(ROPE.cur.map((p) => p.slice()));
    }
    while (ROPE.g0 + ROPE.frames.length - 1 < gi) {
      const gN = ROPE.g0 + ROPE.frames.length, A = ropeAnchor(gN), E = gN < LET_GO ? ballTopAt(gN) : null;
      for (let sub = 0; sub < 4; sub++) ropeStep(A, E, false);
      ROPE.frames.push(ROPE.cur.map((p) => p.slice()));
    }
    return ROPE.frames[gi - ROPE.g0];
  }
  function ropeStep(A, E, settle) {
    const { cur, prev, n, seg } = ROPE, grav = 0.55;
    for (let k = 1; k < n; k++) {
      const p = cur[k], q = prev[k], vx = (p[0] - q[0]) * 0.975, vy = (p[1] - q[1]) * 0.975;
      q[0] = p[0]; q[1] = p[1];
      p[0] += settle ? 0 : vx; p[1] += (settle ? 0 : vy) + grav;
    }
    for (let it = 0; it < 24; it++) {
      cur[0][0] = A[0]; cur[0][1] = A[1];
      if (E) { cur[n - 1][0] = E[0]; cur[n - 1][1] = E[1]; }
      for (let k = 0; k < n - 1; k++) {
        const a = cur[k], b = cur[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, e = (d - seg) / d;
        if (d <= seg) continue;                                        // a cord only resists stretching
        const wa = k === 0 ? 0 : 0.5, wb = k + 1 === n - 1 && E ? 0 : 0.5, sum = wa + wb || 1;
        a[0] += dx * e * (wa / sum); a[1] += dy * e * (wa / sum);
        b[0] -= dx * e * (wb / sum); b[1] -= dy * e * (wb / sum);
      }
    }
    if (settle) for (let k = 0; k < n; k++) { prev[k][0] = cur[k][0]; prev[k][1] = cur[k][1]; }
  }
  // red cord with a gold strand twisted round it
  function cordPath(pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length - 1; k++) { const m = [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2]; ctx.quadraticCurveTo(pts[k][0], pts[k][1], m[0], m[1]); }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }
  function drawRibbon(g, front = false) {
    if (g < 643 || g > 1030) return;
    const a = 1;
    if (a <= 0) return;
    const pts = ropeAt(g);
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (!front) {
      ctx.strokeStyle = "#7E1E2A"; ctx.lineWidth = 8; cordPath(pts); ctx.stroke();
      ctx.strokeStyle = "#C8323F"; ctx.lineWidth = 6; cordPath(pts); ctx.stroke();
      // the gold twist: short slanted ticks walked along the cord
      ctx.strokeStyle = "#E7B653"; ctx.lineWidth = 2.4;
      let carry = 0;
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1e-6, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
        for (let t = carry; t < L; t += 7) {
          const x = x0 + ux * t, y = y0 + uy * t, c = Math.cos(0.9), sn = Math.sin(0.9);
          const dx = (ux * c - uy * sn) * 3.4, dy = (ux * sn + uy * c) * 3.4;
          ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
          carry = t + 7 - L;
        }
      }
      ctx.restore(); return;
    }
    // the bow on top of the ball, gone when it lets go
    if (g < LET_GO && capTop) {
      const tight = Eio(P(g, 936, LET_GO)), E = capTop, sz = 0.06 * capDia;
      ctx.strokeStyle = "#C8323F"; ctx.lineWidth = Math.max(2, sz * 0.32);
      // pulled tight, the loops shrink and stand up along the cord before the knot slips
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(E[0] + sd * sz * 0.7 * (1 - 0.7 * tight), E[1] - sz * (0.15 + 0.5 * tight), sz * 0.7 * (1 - 0.6 * tight), sz * 0.42 * (1 - 0.3 * tight), sd * (0.35 + 0.9 * tight), 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#E7B653"; ctx.beginPath(); ctx.arc(E[0], E[1], sz * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // three big, faint snowflakes on the warm background
  const FLAKES = [[282, 270, 124, 0.09], [1642, 348, 104, 0.075], [1604, 858, 146, 0.1]];
  function drawFlakes(g) {
    const a = Eout(P(g, 600, 640)) * (1 - Eio(P(g, 944, 960)));
    if (a <= 0) return;
    ctx.save(); ctx.strokeStyle = "#8C7A68"; ctx.lineCap = "round";
    FLAKES.forEach(([x, y, d, al], i) => {
      ctx.globalAlpha = al * a; ctx.lineWidth = 3.5;
      const cx = x + 6 * Math.sin(g * 0.012 + i), cy = y + (g - 600) * 0.06, rot = g * 0.003 * (i % 2 ? -1 : 1), R = d / 2;
      for (let k = 0; k < 6; k++) {
        const t = rot + (k * Math.PI) / 3, dx = Math.cos(t), dy = Math.sin(t);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * R, cy + dy * R); ctx.stroke();
        for (const sd of [-1, 1]) {
          const bx = cx + dx * R * 0.55, by = cy + dy * R * 0.55, t2 = t + sd * 0.7;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(t2) * R * 0.28, by + Math.sin(t2) * R * 0.28); ctx.stroke();
        }
      }
    });
    ctx.restore();
  }

  // the burst: 28 rays in Christmas red, pine, gold and cream, then discs red, green, gold, cream push out
  // the reference's beams: 28 straight, saturated bars, in Christmas red, pine, gold and cream
  const RAY_COL = ["#E8283F", "#2F9B6A", "#F2C24E", "#FFF6E6", "#FF4A5E", "#3FB27F", "#FFD873"];
  const RAYS = (() => { const r = rng(23); return Array.from({ length: 28 }, (_, i) => ({ a: (2 * Math.PI * i) / 28 + (r() - 0.5) * 0.12, len: 0.8 + 0.35 * r(), col: RAY_COL[i % RAY_COL.length], w: 0.75 + 0.45 * r(), reach: 0.8 + 0.35 * r() })); })();
  const DISCS = [[566, "#D62A40"], [569, "#2F7A5E"], [572, "#EBC867"], [575, CREAM]];
  function heart(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.35, y - s * 0.85, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.35, y - s * 0.85, x + s * 0.9, y - s * 0.25, x, y + s * 0.35); ctx.fill();
  }
  function bubble(x, y, s) {
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.08, s * 0.55, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.25, y + s * 0.22); ctx.lineTo(x - s * 0.38, y + s * 0.5); ctx.lineTo(x - s * 0.02, y + s * 0.3); ctx.fill();
  }
  function drawBurst(g, box) {
    if (g < 540 || g > 600) return;
    const [cx, cy, , , , r0] = box;
    ctx.save();
    // the charge: a glow swelling round the ball, pulsing with the flashes
    if (g < 566) {
      const k = Eio(P(g, 540, 557)) * (1 - P(g, 562, 566)), pulse = 0.75 + 0.25 * Math.sin(g * 1.6);
      const gr = ctx.createRadialGradient(cx, cy, r0 * 0.9, cx, cy, r0 * (1.9 + 0.5 * k));
      gr.addColorStop(0, `rgba(255,214,150,${0.5 * k * pulse})`); gr.addColorStop(0.5, `rgba(205,43,58,${0.22 * k})`); gr.addColorStop(1, "rgba(205,43,58,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r0 * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (g >= 558) {
      // rays: thin, bright, straight out of the ball's edge, racing to the frame
      const outer = kf(g, [[558, r0 * 1.25], [560, 360], [563, 600], [566, 780], [572, 1300]]);
      const len = kf(g, [[558, r0 * 0.35], [561, 300], [564, 560], [567, 620]]);
      // wedges like the reference: thin at the inner end, wide at the outer, each its own length and width
      for (const pass of [0, 1]) {
        ctx.filter = pass ? "none" : "blur(8px)"; ctx.globalAlpha = pass ? 1 : 0.35;
        for (const ry of RAYS) {
          const o = outer * ry.reach, i0 = Math.max(r0 * 1.02, o - len * ry.len);
          const wo = ry.w * (pass ? 1 : 1.5) * (22 + 30 * Math.min(1, o / 800)), wi = wo * 0.35;
          const dx = Math.cos(ry.a), dy = Math.sin(ry.a), nx = -dy, ny = dx;
          ctx.fillStyle = ry.col; ctx.beginPath();
          ctx.moveTo(cx + dx * i0 + nx * wi / 2, cy + dy * i0 + ny * wi / 2); ctx.lineTo(cx + dx * o + nx * wo / 2, cy + dy * o + ny * wo / 2);
          ctx.lineTo(cx + dx * o - nx * wo / 2, cy + dy * o - ny * wo / 2); ctx.lineTo(cx + dx * i0 - nx * wi / 2, cy + dy * i0 - ny * wi / 2);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // the discs push out fast and fill the frame; a white flash, then the cream ground
      for (const [s0, col] of DISCS) {
        const u = P(g, s0, s0 + 11);
        if (u <= 0) continue;
        ctx.filter = "blur(12px)"; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.8 + 1600 * Math.pow(u, 1.15), 0, Math.PI * 2); ctx.fill();
      }
      const flash = P(g, 578, 584) * (1 - Eio(P(g, 586, 598)));
      if (flash > 0) {
        ctx.filter = "blur(30px)"; ctx.globalAlpha = flash; ctx.fillStyle = "#FFFDF7";
        ctx.beginPath(); ctx.arc(cx, cy, 200 + 1500 * Eout(P(g, 578, 586)), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }


  // ---- sparkles ----------------------------------------------------------------------------------------------------
  const SPARK = (() => {
    const r = rng(7), out = [];
    for (let i = 0; i < 130; i++) {
      out.push({ birth: 100 + r() * 118, life: 14 + r() * 22, ang: r() * Math.PI * 2, rad: 40 + Math.pow(r(), 1.3) * 200, size: 3 + Math.pow(r(), 1.6) * 12, drift: 4 + r() * 14, tint: r() < 0.35 });
    }
    return out;
  })();
  function star(x, y, s, a) {
    const k = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + k, y - k, x + s, y); ctx.quadraticCurveTo(x + k, y + k, x, y + s);
    ctx.quadraticCurveTo(x - k, y + k, x - s, y); ctx.quadraticCurveTo(x - k, y - k, x, y - s);
    ctx.globalAlpha = a; ctx.fill();
  }
  function drawSparkles(f) {
    if (f < 96 || f > 240) return;
    const ic = iconAt(f);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const sp of SPARK) {
      const u = (f - sp.birth) / sp.life;
      if (u < 0 || u > 1) continue;
      const rad = sp.rad + sp.drift * u;
      ctx.fillStyle = sp.tint ? "#ffb3c0" : "#f3eef0";
      star(ic.x + Math.cos(sp.ang) * rad, ic.y + Math.sin(sp.ang) * rad * 0.9, sp.size * (0.6 + 0.4 * Math.sin(Math.PI * u)), 0.8 * Math.sin(Math.PI * u));
    }
    ctx.restore();
  }

  // the corner note stays readable on the night background and on cream
  const note = document.getElementById("unofficial");
  const noteColor = (g, night) => { note.style.color = g >= 585 && night < 0.5 ? "#7A6C72" : "#A8A0AA"; };

  // ---- behind the scenes: "trace" draws motion paths and data over the dimmed film, "timeline" an editor track view
  const MODE = window.FILM_MODE || "film";
  const MONO = '600 20px "SF Mono", Menlo, monospace', MONO_S = '500 16px "SF Mono", Menlo, monospace';
  const TMONO = '700 40px "SF Mono", Menlo, monospace', TMONO_S = '600 28px "SF Mono", Menlo, monospace';  // trace: shown at half size
  const CY = "#5CE1E6", MG = "#FF5FA2", YL = "#FFD45C", GR = "#7CF29A", WH = "rgba(255,255,255,0.85)";
  // what is happening at film frame f, for the label and the timeline (film frames; the ending runs 13 frames behind the reference)
  const EVENTS = [
    [0, 76, "出场 · 实测形变"], [76, 172, "液滴聚拢 · 距离场融合"], [172, 196, "图标成形"], [196, T0, "收藏星飞入"],
    [T0, 264, "入体 · 同帧变色凹陷"], [264, 456, "换皮 · 原片受力事件"], [456, 545, "张望 · 实测转头"],
    [545, 571, "蓄力"], [571, 598, "爆开 · 光束与色盘"], [598, 656, "字标逐字清晰"], [656, 779, "绳挂下落 · 两次弹跳"],
    [779, 943, "挂稳 · 笑眼"], [943, 1000, "松枝上抬 · 结被扯开"], [1000, 1050, "缩回红点"],
  ];
  const eventAt = (f) => (EVENTS.find(([a, b]) => f >= a && f < b) || EVENTS[EVENTS.length - 1])[2];
  const SKIN_NAMES = ["雪白", "拐杖糖", "松绿针织", "冰块", "红绿格", "冬青", "酒红丝绒", "月光银", "回红"];
  function polyline(pts, dash) { ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.setLineDash([]); }
  function tag(x, y, text, col) {
    ctx.font = TMONO_S; const w = ctx.measureText(text).width + 20;
    ctx.fillStyle = "rgba(10,12,18,0.8)"; ctx.fillRect(x, y - 26, w, 38); ctx.fillStyle = col; ctx.fillText(text, x + 10, y + 3);
  }
  // a smooth curve through points (Catmull-Rom as cubic Béziers), with a fading width and alpha toward the tail
  function smoothTrail(pts, col, width, head = true) {
    if (pts.length < 3) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const glow of [true, false]) for (let k = 1; k < pts.length - 2; k++) {
      const p0 = pts[k - 1], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2], u = k / (pts.length - 2);
      ctx.filter = glow ? "blur(8px)" : "none";
      ctx.strokeStyle = col; ctx.globalAlpha = (glow ? 0.45 : 1) * (0.25 + 0.75 * u); ctx.lineWidth = (glow ? 2.6 : 1) * width * (0.4 + 0.6 * u);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]);
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      ctx.stroke();
    }
    ctx.filter = "none"; ctx.globalAlpha = 1;
    if (!head) return;
    const h = pts[pts.length - 1];                                  // the head: a bright dot with a white core
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(h[0], h[1], width * 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(h[0], h[1], width * 0.7, 0, 7); ctx.fill();
  }
  const avg = (pts, n) => pts.map((_, i) => { let x = 0, y = 0, c = 0; for (let k = Math.max(0, i - n); k <= Math.min(pts.length - 1, i + n); k++) { x += pts[k][0]; y += pts[k][1]; c++; } return [x / c, y / c]; });
  function drawTrace(f) {
    const g = ref(f), light = g >= 585 && g < 990;
    const col = light ? "#E0475C" : "#7FE7F0";
    ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
    // the ball: where its centre has travelled over the last second and a half
    if ((g < 570 || g >= 643) && f > 4) {
      const pts = [];
      for (let k = Math.max(0, f - 150); k <= f; k++) { const gk = ref(k); if (gk >= 570 && gk < 643) { pts.length = 0; continue; } pts.push(ballBox(k).slice(0, 2)); }
      smoothTrail(avg(pts, 3), col, 9, false);   // the ball itself marks the head
    }
    // the drops, each along its own arc
    if (f >= 70 && f < 200) ORDER.forEach((kk) => {
      if (f < ENTER[kk] - 4) return;
      const pts = []; for (let q = Math.max(ENTER[kk] - 4, f - 60); q <= Math.min(f, 176); q++) { const st = dropState(kk, q); pts.push([st.x, st.y]); }
      smoothTrail(avg(pts, 2), "#FF8FA0", 9);
    });
    // the star's arc into the body
    if (f >= 198 && f < T0 + 20) {
      const pts = []; for (let q = 198; q <= Math.min(f, T0 + 4); q++) pts.push(starAt(q));
      smoothTrail(pts, "#FFD45C", 9);
    }
    ctx.restore();
  }
  // ---- the timeline view
  const TRACKS = (() => {
    const t = [["液滴", [[76, 172]], GR], ["图标", [[150, 216]], GR], ["收藏星", [[196, T0 + 7]], YL], ["入体 T0", [[T0, T0 + 28]], YL]];
    SKINS.forEach((s, i) => { if (i < 8) t.push([`换皮 ${i + 1} ${SKIN_NAMES[i]}`, [[s[0], SKINS[i + 1][0]]], MG]); });
    t.push(["回红 · 张望", [[456, 545]], CY], ["蓄力 · 爆开", [[545, 598]], YL], ["字标", [[601, 1000]], WH], ["弹跳 · 落位", [[656, 779]], CY], ["绳子", [[656, 1000]], CY], ["退场", [[943, 1050]], MG]);
    return t;
  })();
  const KEYS = [76, 128, 176, T0, 264, 304, 338, 368, 394, 416, 434, 450, 571, 679, 716, 766, 959, 1050];
  // the ball's measured curves over the whole film, for the graph editor (computed once)
  let CURVES = null;
  const curves = () => {
    if (CURVES) return CURVES;
    const py = [], sx = [], sy = [];
    for (let k = 0; k < 1050; k++) { const b = ballBox(k); py.push(b[1]); sx.push((b[4](0) / b[5]) * 100); sy.push((b[4](Math.PI / 2) / b[5]) * 100); }
    // while the ball is hidden by the burst (film F583-F656) the curves run straight from one end to the other
    for (const a of [py, sx, sy]) { for (let k = 583; k < 656; k++) a[k] = lerp(a[582], a[656], (k - 582) / 74); }
    for (const a of [sx, sy]) { for (let k = 656; k < 672; k++) a[k] = lerp(a[655], a[672], (k - 655) / 17); }   // cut by the top edge as it drops in
    const sm = (a) => a.map((_, k) => { let t = 0, c = 0; for (let q = Math.max(0, k - 2); q <= Math.min(1049, k + 2); q++) { t += a[q]; c++; } return t / c; });
    return (CURVES = { py: sm(py), sx: sm(sx), sy: sm(sy) });
  };
  function drawTimeline(f) {
    // an After Effects-like timeline in the top-left 1313 x 1011 of the canvas (the 3:4 cut shows it at 1080 x 832)
    const TW = 1313, TH = 1011, LW = 560, X0 = LW + 16, X1 = TW - 18, tx = (fr) => X0 + ((X1 - X0) * fr) / 1050;
    const mono = (w, px) => `${w} ${px}px "SF Mono", Menlo, monospace`, sans = (w, px) => `${w} ${px}px "Inter Film", "Helvetica Neue", sans-serif`;
    const BLUE = "#2D8CFF", TXT = "#D4D4D4", DIM = "#8A8A8A", fr = Math.round(f);
    ctx.save(); ctx.filter = "none"; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#232323"; ctx.fillRect(0, 0, TW, TH);
    // tabs
    ctx.fillStyle = "#1A1A1A"; ctx.fillRect(0, 0, TW, 34);
    ctx.fillStyle = "#2C2C2C"; ctx.fillRect(10, 5, 250, 29);
    ctx.font = sans(600, 15); ctx.fillStyle = TXT; ctx.fillText("×   red_ball_main   ≡", 22, 25);
    ctx.fillStyle = "#6A6A6A"; ctx.fillText("ball_precomp", 282, 25); ctx.fillText("render_queue", 408, 25);
    ctx.font = mono(500, 13); ctx.fillStyle = "#6A6A6A"; ctx.fillText("1920×1080 · 60.00 fps · Δ 0:00:17:30 · Full · Classic 3D", TW - 520, 24);
    // timecode, search and comp switches
    const ss = Math.floor(fr / 60), ff = fr % 60;
    ctx.font = mono(600, 30); ctx.fillStyle = BLUE; ctx.fillText(`0:00:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`, 16, 74);
    ctx.font = mono(500, 14); ctx.fillStyle = DIM; ctx.fillText(`${String(fr).padStart(5, "0")} (60.00 fps)`, 222, 68);
    ctx.fillStyle = "#1A1A1A"; ctx.fillRect(380, 50, 170, 26); ctx.font = sans(500, 13); ctx.fillStyle = "#666"; ctx.fillText("⌕  ball", 390, 68);
    const icons = ["⇆", "◐", "▦", "◎", "⧉", "✎"];
    icons.forEach((c2, k) => { ctx.fillStyle = k === 2 ? "#3A3A3A" : "#2B2B2B"; ctx.fillRect(X0 + k * 34, 48, 28, 28); ctx.font = sans(500, 15); ctx.fillStyle = k === 2 ? BLUE : DIM; ctx.fillText(c2, X0 + 7 + k * 34, 68); });
    // ruler, work area, comp markers
    const ry = 88;
    ctx.fillStyle = "#2A2A2A"; ctx.fillRect(0, ry, TW, 40);
    ctx.font = sans(600, 13); ctx.fillStyle = DIM;
    ctx.fillText("◉ ♪ ● 🔒", 10, ry + 26); ctx.fillText("#", 92, ry + 26); ctx.fillText("Layer Name", 120, ry + 26); ctx.fillText("✳ fx ▢ ◐ ⬡", 330, ry + 26); ctx.fillText("Parent & Link", 440, ry + 26);
    ctx.fillStyle = "#4A4F5C"; ctx.fillRect(tx(0), ry + 2, tx(1050) - tx(0), 6);
    ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.font = mono(500, 12); ctx.fillStyle = "#9A9A9A";
    for (let k = 0; k <= 1050; k += 15) { const x = tx(k), big = k % 60 === 0; ctx.beginPath(); ctx.moveTo(x, ry + (big ? 22 : 31)); ctx.lineTo(x, ry + 40); ctx.stroke(); if (k % 120 === 0) ctx.fillText(`${String(k / 60).padStart(2, "0")}s`, x + 3, ry + 21); }
    for (const [k, name] of [[T0, "T0"], [571, "burst"], [766, "land"], [959, "untie"]]) {
      const x = tx(k); ctx.fillStyle = "#6FBF7E"; ctx.beginPath(); ctx.moveTo(x - 6, ry + 10); ctx.lineTo(x + 6, ry + 10); ctx.lineTo(x + 6, ry + 20); ctx.lineTo(x, ry + 26); ctx.lineTo(x - 6, ry + 20); ctx.fill();
      ctx.font = mono(600, 11); ctx.fillStyle = "#9FD9AA"; ctx.fillText(name, x + 9, ry + 18);
    }
    // layer tree
    const b = ballBox(Math.min(f, 1049)), [yaw, pitch, roll] = measured(D.FACE, Math.min(f, 1049));
    const si = SKINS.findIndex((sk, q) => f >= sk[0] && (!SKINS[q + 1] || f < SKINS[q + 1][0]));
    const skinName = si < 0 ? "red" : ["snow", "candy_cane", "pine_knit", "ice", "plaid", "holly", "velvet", "silver", "red"][si];
    const BALL_POS = [0, 76, T0, 264, 304, 338, 368, 394, 416, 434, 450, 545, 656, 679, 716, 766, 959, 1000, 1050];
    const SQ = [12, 20, 30, 54, T0, 221, 227, 264, 304, 338, 368, 394, 416, 434, 679, 716, 766, 964];
    const ROWS = [
      // [depth, name, label colour | null, span | null, keys, value, kind, fx, expr]
      [0, "1  T  wordmark", "#B48BE0", [601, 1000], [601, 640, 955, 990], "", "", true],
      [0, "2  ★  rope_sim", "#5FB8C2", [656, 1030], [656, 766, 959], "", "", true],
      [0, "3  ★  pine_twig", "#6FBF7E", [628, 1030], [628, 648, 930, 1010], "", "", false],
      [0, "4  ★  burst_beams", "#D9A93C", [545, 598], [545, 558, 566, 578], "", "", true],
      [0, "5  ★  ball", "#D9566A", [0, 1050], [], "", "open", true],
      [1, "▾ Effects", null, null, [], "", "group"],
      [2, "Sphere Shader", null, null, [T0, 264, 304, 338, 368, 394, 416, 434, 450], skinName, "hold"],
      [2, "Outline · Fourier k1–k6", null, null, SQ, `r0 ${b[5].toFixed(1)}`, "", false, true],
      [1, "▾ Transform", null, null, [], "", "group"],
      [2, "Position", null, null, BALL_POS, `${b[0].toFixed(1)}, ${b[1].toFixed(1)}`, "", false, true],
      [2, "Scale", null, null, SQ, `${(b[4](0) / b[5] * 100).toFixed(1)}, ${(b[4](Math.PI / 2) / b[5] * 100).toFixed(1)}%`],
      [2, "Y Rotation", null, null, [0, 76, 128, T0, 450, 545, 766, 862], `${(yaw * 57.3).toFixed(1)}°`],
      [0, "6  ★  save_star", "#D9A93C", [196, T0 + 7], [196, 202, T0], "", ""],
      [0, "7  ★  app_tile", "#D9566A", [76, 216], [76, 128, 170, 176], "", "", true],
      [0, "8  ♪  audio_bed.wav", "#8E99AA", [0, 1050], [], "", "audio"],
    ];
    const top = ry + 42, rh = 25;
    ROWS.forEach(([depth, name, col, span, keys, val, kind, fx, expr], i) => {
      const y = top + i * rh, layer = depth === 0, live = span ? f >= span[0] && f < span[1] : true;
      ctx.fillStyle = layer ? (i % 2 ? "#272727" : "#2A2A2A") : "#1F1F1F"; ctx.fillRect(0, y, TW, rh - 1);
      ctx.font = sans(layer ? 600 : 500, 14);
      if (layer) {
        ctx.fillStyle = "#BDBDBD"; ctx.fillText("◉", 12, y + 17);
        if (kind === "audio") ctx.fillText("♪", 32, y + 17);
        ctx.fillStyle = col; ctx.fillRect(56, y + 6, 13, 13);
        ctx.fillStyle = live ? "#EAEAEA" : DIM; ctx.fillText((kind === "open" ? "▾ " : "▸ ") + name, 78, y + 17);
        ctx.fillStyle = DIM; ctx.fillText(fx ? "✳  fx  ▢" : "✳      ▢", 330, y + 17);
        ctx.fillStyle = "#1A1A1A"; ctx.fillRect(440, y + 3, 110, rh - 7); ctx.fillStyle = DIM; ctx.font = sans(500, 12); ctx.fillText("◎ None", 448, y + 16);
        ctx.fillStyle = col; ctx.globalAlpha = live ? 0.85 : 0.5; ctx.fillRect(tx(span[0]), y + 3, tx(span[1]) - tx(span[0]), rh - 7); ctx.globalAlpha = 1;
        if (kind === "audio") {
          const wv = window.WAVE || []; ctx.fillStyle = "rgba(18,22,28,0.8)";
          for (let x = tx(0); x < tx(1050); x += 2) { const v = wv[Math.floor(((x - tx(0)) / (tx(1050) - tx(0))) * 17.5 * 120)] || 0, h = v * (rh - 8); ctx.fillRect(x, y + rh / 2 - h / 2, 1.4, Math.max(1, h)); }
        }
      } else {
        const x0 = 78 + depth * 22;
        if (kind === "group") { ctx.fillStyle = "#BDBDBD"; ctx.fillText(name, x0, y + 17); }
        else {
          ctx.fillStyle = BLUE; ctx.fillText("◷", x0, y + 17);
          ctx.fillStyle = "#C8C8C8"; ctx.fillText(name, x0 + 20, y + 17);
          ctx.font = mono(500, 13); ctx.fillStyle = BLUE; ctx.fillText(val, 370, y + 17);
          if (expr) { ctx.fillStyle = "#E57373"; ctx.font = mono(700, 13); ctx.fillText("=", 350, y + 17); }
        }
      }
      for (const k of keys) {
        const x = tx(k), yy = y + rh / 2, r = 6;
        ctx.fillStyle = f >= k ? "#F0F0F0" : (layer ? "rgba(0,0,0,0.45)" : "#8A8A8A");
        ctx.beginPath();
        if (kind === "hold") ctx.rect(x - 5, yy - 5, 10, 10); else { ctx.moveTo(x, yy - r); ctx.lineTo(x + r, yy); ctx.lineTo(x, yy + r); ctx.lineTo(x - r, yy); }
        ctx.fill();
      }
      if (expr) {
        const t2 = name === "Position" ? "measured(OUTLINE, ref(time))" : "fourier(k, ref(time)) * hit(T0)";
        ctx.font = mono(500, 12); const w2 = ctx.measureText(t2).width + 14;
        ctx.fillStyle = "#151515"; ctx.fillRect(tx(470), y + 3, w2, rh - 7); ctx.fillStyle = "#7FC7A0"; ctx.fillText(t2, tx(470) + 7, y + 16);
      }
    });
    // graph editor: the ball's position Y and scale over the film
    const gy = top + ROWS.length * rh + 8, gh = TH - gy - 30;
    ctx.fillStyle = "#1B1B1B"; ctx.fillRect(0, gy, TW, gh);
    ctx.font = sans(600, 14); ctx.fillStyle = TXT; ctx.fillText("Graph Editor", 14, gy + 22);
    ctx.font = sans(500, 13);
    [["Position Y", "#5CE1E6"], ["Scale X", "#FF5FA2"], ["Scale Y", "#FFD45C"]].forEach(([n2, c2], k) => { ctx.fillStyle = c2; ctx.fillRect(14, gy + 40 + k * 24, 12, 12); ctx.fillStyle = "#BDBDBD"; ctx.fillText(n2, 34, gy + 51 + k * 24); });
    ctx.font = mono(500, 12); ctx.fillStyle = DIM;
    ctx.fillText("value / speed graph  ·  ease: measured", 14, gy + gh - 16);
    const C = curves(), gx0 = X0, gx1 = X1, gt = gy + 14, gb = gy + gh - 18;
    ctx.strokeStyle = "#2E2E2E"; ctx.lineWidth = 1; ctx.font = mono(500, 11);
    for (let k = 0; k <= 4; k++) {
      const yy = gt + ((gb - gt) * k) / 4; ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke();
      ctx.fillStyle = "#5CE1E6"; ctx.fillText(`${(1080 * (1 - k / 4)).toFixed(0)} px`, gx0 - 76, yy + 4);
      ctx.fillStyle = "#C9A23C"; ctx.fillText(`${(160 - 25 * k).toFixed(0)}%`, gx0 - 128, yy + 4);
    }
    for (let k = 0; k <= 1050; k += 60) { const x = tx(k); ctx.beginPath(); ctx.moveTo(x, gt); ctx.lineTo(x, gb); ctx.stroke(); }
    const plot = (arr, lo, hi, col2) => {
      ctx.strokeStyle = col2; ctx.lineWidth = 2; ctx.beginPath();
      arr.forEach((v, k) => { const x = tx(k), yy = gb - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (gb - gt); k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
      ctx.stroke();
      const v = arr[Math.min(1049, fr)], yy = gb - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (gb - gt);
      ctx.fillStyle = col2; ctx.beginPath(); ctx.arc(tx(fr), yy, 5, 0, 7); ctx.fill();
    };
    plot(C.py, 0, 1080, "#5CE1E6"); plot(C.sx, 60, 160, "#FF5FA2"); plot(C.sy, 60, 160, "#FFD45C");
    // keyframe handles on the position curve
    BALL_POS.forEach((k) => { const kk = Math.min(1049, k), yy = gb - (C.py[kk] / 1080) * (gb - gt); ctx.fillStyle = "#EAEAEA"; ctx.fillRect(tx(kk) - 4, yy - 4, 8, 8); ctx.strokeStyle = "#5CE1E6"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx(kk) - 18, yy); ctx.lineTo(tx(kk) + 18, yy); ctx.stroke(); });
    // status bar
    ctx.fillStyle = "#1A1A1A"; ctx.fillRect(0, TH - 26, TW, 26);
    ctx.font = mono(500, 12); ctx.fillStyle = DIM;
    ctx.fillText(`Frame Render Time: ${(9 + (fr * 7) % 6)}ms   ·   Toggle Switches / Modes   ·   Layers: 8   ·   Keyframes: 142   ·   Expressions: 3`, 12, TH - 9);
    // playhead
    const px = tx(f);
    ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, ry); ctx.lineTo(px, TH - 26); ctx.stroke();
    ctx.fillStyle = BLUE; ctx.beginPath(); ctx.moveTo(px - 8, ry); ctx.lineTo(px + 8, ry); ctx.lineTo(px + 8, ry + 9); ctx.lineTo(px, ry + 16); ctx.lineTo(px - 8, ry + 9); ctx.fill();
    ctx.restore();
  }





  function render(T) {
    if (MODE === "timeline") { note.style.display = "none"; drawTimeline(T * FPS); return; }
    renderFilm(T);
    if (MODE === "trace") drawTrace(T * FPS);
  }
  function renderFilm(T) {
    const f = T * FPS, g = ref(f);
    noteColor(g, Eio(P(g, 956, 999)));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.filter = "none"; ctx.globalCompositeOperation = "source-over";
    if (ICON_TEST) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); drawIcon(f); return; }
    const box = ballBox(f);
    if (g < 585) {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      if (REVIEW.halo) { drawShock(f, box); drawAura(f, box); }
      drawSparkles(f);
      drawIcon(f);
      if (g >= 540 && g < 558) drawBurst(g, box);       // the charge glow, behind the ball
      if (g < 570) drawBall(f);
      drawStar(f);
      if (g >= 558) drawBurst(g, box);
      return;
    }
    // cream after the burst, back to the night as the ball shrinks to a dot
    const night = Eio(P(g, 956, 999));
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    if (night > 0) { ctx.globalAlpha = night; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    drawBurst(g, box);
    drawFlakes(g);
    drawTwig(g);
    drawWord(g, box);
    drawSubline(g);
    drawShadow(g, box);
    // the ribbon hangs behind the ball and its bow sits in front; both need where the ring is this frame
    const pl = g >= 643 ? capPlace(f, ballBox(f)) : null;
    capTop = pl ? pl.ringTop : null; capDia = pl ? pl.D : 0;
    drawRibbon(g);
    if (g >= 643) drawBall(f);
    drawRibbon(g, true);
  }

  window.Film = { render, FPS };
})();
