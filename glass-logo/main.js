(function () {
      // Beat one: the drop swells into the glass tile, built from a height map and a fixed-size blur rather
      // than drawn frame by frame. One height map of the shape is softened by a blur of a fixed size in pixels and
      // used to bend the glyph by a fixed number of pixels, and the same map is lit for its highlights. Because the
      // blur and the bend do not grow with the shape, the look changes by itself as it grows: while it is small the
      // blur is bigger than it, so it is a soft round drop that throws the glyph out to its rim; once it is large the
      // blur is small beside it, so it is a flat pane of glass with a bent, lit edge.
      const W = 1920, H = 1080, LEAD = 0.25, DURATION = 3.4;

      // measured width of the shape in px, by time from the speck (frame 14 = 0)
      const WIDTH = [[0, 45], [0.04, 68], [0.08, 118], [0.12, 143], [0.16, 196], [0.2, 220], [0.24, 270], [0.28, 293],
        [0.32, 346], [0.36, 372], [0.4, 414], [0.44, 429], [0.48, 443], [0.52, 448], [0.56, 457], [0.6, 460],
        [0.7, 469], [0.8, 482], [0.9, 488], [1.0, 492], [1.04, 486], [1.08, 478]];
      const lerpTable = (tab, t) => {
        if (t <= tab[0][0]) return tab[0][1];
        for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) {
          const [t0, v0] = tab[i - 1], [t1, v1] = tab[i];
          return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
        }
        return tab[tab.length - 1][1];
      };
      const clamp = (x) => Math.min(1, Math.max(0, x));
      const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

      // the settings, in pixels of this 1080-high frame
      const SOFT_BEND = 27; // CC Glass softness 80 on the map that bends the glyph (as a Gaussian's sigma)
      const SOFT_LIGHT = 7; // CC Glass softness 20 on the map that is lit for the highlights
      const SOFT_BLOB = 10; // CC Blobbylize softness 30: the map as a lit gel surface
      const BEND = 4200; // CC Glass displacement 400: px of bend per unit slope of the map
      const SATIN_IN = 6, SATIN_DEPTH = 150; // the satin darkens the map from this far inside the edge, to half by this

      // Beat two: a speck of the wordmark swells into a round glass
      // lens; the wordmark grows inside it, bent at the lens's edges, while the lens grows past it; then the lens lets
      // go and the wordmark settles, its ends still smeared for a few frames. Measured lens radius by time from 1.22 s.
      const LENS = [[0, 8], [0.06, 30], [0.14, 70], [0.22, 105], [0.3, 135], [0.38, 165], [0.54, 190], [0.7, 210]];
      const B2 = 1.22;
      function lensAt(s) {
        const b = s - B2;
        return {
          half: lerpTable(LENS, b),
          round: 1,
          glass: smooth((b - 0.02) / 0.06) * (1 - smooth((b - 0.7) / 0.1)),
          // the wordmark is there at its full size from the start, seen only through the lens: the lens is what
          // reveals it, opening from a speck until the whole word shows
          glyph: 70,
          appear: smooth(b / 0.03),
          show: 1,
          lens: 1,
          word: 1,
          // after the lens lets go, the wordmark's ends stay smeared a few frames: the right end first, then the left
          // the word is seen plainly only once the lens has let go of it
          plain: smooth((b - 0.66) / 0.1),
          smearR: Math.exp(-Math.pow((b - 0.82) / 0.07, 2)),
          smearL: Math.exp(-Math.pow((b - 1.0) / 0.08, 2)),
        };
      }
      function stateAt(t) {
        const s = t - LEAD;
        if (s < 0) return null;
        if (s >= B2) return lensAt(s);
        const half = lerpTable(WIDTH, s) / 2;
        return {
          half,
          // roundness 151 (a circle) keyed down to 81: round until 0.26 s, squared up by 0.54 s
          round: 1 - 0.68 * smooth((s - 0.26) / 0.28),
          // the glass holds until 1.0 s and lets go by 1.14 s
          glass: smooth(s / 0.04) * (1 - smooth((s - 1.0) / 0.14)),
          // the glyph rides inside the shape, and once the glass has gone draws in to its centre by 1.22 s
          // the glyph's own scale is keyed separately (0 to 45.9 %): still small while the drop
          // swells round it, so the drop's lens throws its light out to the rim, then catching up as it squares off
          // a speck of the glyph is the first thing seen; then, while the drop is too small to hold it, the glyph
          // is scaled right down inside it, leaving only the drop's light, and grows back out as the drop fills
          // the glyph is bigger than the young drop, which sits over it like a lens over its empty middle: its strokes
          // lie round the rim and are thrown out there as soft white masses; it settles to fit the tile as it squares up
          // sized to sit within the flat middle of the glass, clear of the bevel, so its outline is never pulled about
          glyph: Math.max(22, half * 0.86) * (1 - smooth((s - 1.1) / 0.12)),
          appear: smooth(s / 0.04),
          // the glyph is there from the first speck and grows with the drop, dimmed a little while the drop is young
          // (most of its light is thrown out to the rim then) and coming up to full as the drop fills out
          show: 0.45 + 0.55 * smooth((s - 0.06) / 0.22),
        };
      }

      // ---- the logo texture: a placeholder shape until the logo image has loaded (see useLogo below) ----
      const TEX = 1024;
      const art = document.createElement("canvas");
      art.width = art.height = TEX;
      const g = art.getContext("2d");
      g.fillStyle = "#eef6ff";
      const T = (v) => v * TEX;
      g.save();
      g.translate(T(0.5), T(0.5));
      g.beginPath();
      g.moveTo(T(-0.16), T(-0.2)); g.lineTo(T(0.25), T(-0.33)); g.lineTo(T(0.25), T(-0.2)); g.lineTo(T(-0.16), T(-0.07)); g.closePath();
      g.rect(T(-0.16), T(-0.2), T(0.075), T(0.48));
      g.rect(T(0.175), T(-0.33), T(0.075), T(0.5));
      g.fill();
      for (const [x, y] of [[-0.24, 0.29], [0.1, 0.18]]) { g.beginPath(); g.ellipse(T(x), T(y), T(0.135), T(0.105), -0.35, 0, Math.PI * 2); g.fill(); }
      g.restore();
      // round off every corner and joint (so the glyph has none): blur, then cut back to a clean edge
      {
        const tmp = document.createElement("canvas");
        tmp.width = tmp.height = TEX;
        const tg = tmp.getContext("2d");
        tg.filter = "blur(16px)";
        tg.drawImage(art, 0, 0);
        const im = tg.getImageData(0, 0, TEX, TEX), px = im.data;
        for (let i = 0; i < px.length; i += 4) {
          const a = px[i + 3] / 255, k = Math.min(1, Math.max(0, (a - 0.38) / 0.12));
          px[i] = 238; px[i + 1] = 246; px[i + 2] = 255; px[i + 3] = Math.round(k * k * (3 - 2 * k) * 255);
        }
        g.clearRect(0, 0, TEX, TEX);
        g.putImageData(im, 0, 0);
      }
      // the glyph as Blobbylize leaves it (softness 30): blurred, then cut back to an edge, so its strokes become
      // rounded soft masses where the glass bends them
      const blob = document.createElement("canvas");
      blob.width = blob.height = TEX;
      const bg = blob.getContext("2d");
      bg.filter = "blur(26px)";
      bg.drawImage(art, 0, 0);

      // ---- WebGL: four passes ----
      const cv = document.getElementById("gl");
      const gl = cv.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
      const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
      const HEAD = `precision highp float;\nuniform vec2 uRes;\nfloat box(vec2 p, float b, float r){ vec2 q = abs(p) - vec2(b - r); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }\n`;
      // 1. the height map: the white shape, with the satin sinking its middle to grey
      const FS_MAP = HEAD + `
uniform float uHalf, uRound;
void main(){
  vec2 p = gl_FragCoord.xy - uRes * 0.5;
  float d = box(p, uHalf, uHalf * uRound);
  float body = smoothstep(0.75, -0.75, d);
  float satin = smoothstep(-${SATIN_IN}.0, -${SATIN_DEPTH}.0, d);
  gl_FragColor = vec4(vec3(body * (1.0 - 0.5 * satin)), 1.0);
}`;
      // 2. a separable Gaussian blur of the map
      const FS_BLUR = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uSigma;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float sum = 0.0, wsum = 0.0;
  for (int i = -24; i <= 24; i++) {
    float x = float(i) * uSigma / 8.0;
    float w = exp(-0.5 * (x * x) / (uSigma * uSigma));
    sum += texture2D(uSrc, uv + uDir * x / uRes).r * w;
    wsum += w;
  }
  gl_FragColor = vec4(vec3(sum / wsum), 1.0);
}`;
      // 3. the glass, as real glass: a slab whose edge is rounded over (a quarter circle of radius EDGE, or the whole
      // half-width while it is small, so a small one is a round bead and a large one a pane with a flat middle). Each
      // pixel's line of sight is refracted at the surface (three slightly different indices, so the colours part at
      // the edge), runs down through the glass to the glyph behind it, and the glass reflects a simple studio (a large
      // soft light at the upper left, a smaller one at the lower right) by the Fresnel amount, strongest at the edge.
      const FS_COMP = HEAD + `
uniform sampler2D uArt, uArtSoft;
uniform float uHalf, uRound, uGlass, uGlyph, uAppear, uShow, uLens, uAspect, uSmearR, uSmearL, uPlain, uRot, uTintMix;
uniform vec3 uTint, uBg;
// tuned on large frames: the pane has a narrow rounded edge (about 28 px), but while it is
// small it is rounded right through, a bead; between, the rounding narrows as it grows
const float EDGE = 40.0;
const float TALL = 1.15;
float art(vec2 p){
  if (uGlyph < 0.5) return 0.0;
  vec2 uv = p / (uGlyph * 2.0 * vec2(uAspect, 1.0)) + 0.5; uv.y = 1.0 - uv.y;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  return texture2D(uArt, uv).a;
}
float rho(){ return mix(uHalf, min(uHalf, EDGE), smoothstep(60.0, 210.0, uHalf)); }
// the visible bevel of the settled tile: about an eighth of its width, as thick glass has
float bevelW(){ return max(uHalf * 0.22, 6.0); }
float glow(vec2 p){
  if (uGlyph < 0.5) return 0.0;
  vec2 uv = p / (uGlyph * 2.0 * vec2(uAspect, 1.0)) + 0.5; uv.y = 1.0 - uv.y;
  return texture2D(uArtSoft, clamp(uv, 0.0, 1.0)).a * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
}
// height of the glass above the glyph's plane at p
float height(vec2 p){
  float d = box(p, uHalf, uHalf * uRound);
  float r = rho();
  float x = clamp(r + d, 0.0, r); // 0 well inside, r at the outline
  return TALL * sqrt(max(r * r - x * x, 0.0));
}
vec3 normalAt(vec2 p){
  float e = 1.0;
  float hx = height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0));
  float hy = height(p + vec2(0.0, e)) - height(p - vec2(0.0, e));
  return normalize(vec3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));
}
// the studio the glass reflects
float studio(vec3 r){
  // lights are far brighter than the room, so even the few percent glass reflects face-on reads as a highlight
  float key = smoothstep(0.82, 0.97, dot(r, normalize(vec3(-0.55, 0.6, 0.58))));
  float fill = smoothstep(0.88, 0.985, dot(r, normalize(vec3(0.6, -0.55, 0.58))));
  // and the room all round, low down: what a glass edge, seen at a glancing angle, mirrors back brightly
  // the room is lit low from the lower right, so glancing edges facing that way shine, those facing away stay dim
  float around = smoothstep(0.75, 0.05, r.z) * (0.06 + 0.94 * smoothstep(-0.1, 0.85, dot(normalize(r.xy + 1e-4), normalize(vec2(0.7, -0.7)))) + 0.1 * smoothstep(0.3, 0.9, dot(normalize(r.xy + 1e-4), vec2(0.0, 1.0))));
  return key * 9.0 + fill * 14.0 + around * 9.0;
}
// the same studio seen in a slightly frosted surface: broad soft glows rather than sharp images of the lights
float studioSoft(vec3 r){
  float key = smoothstep(0.25, 0.95, dot(r, normalize(vec3(-0.55, 0.6, 0.58))));
  float fill = smoothstep(0.45, 0.97, dot(r, normalize(vec3(0.6, -0.55, 0.58))));
  return key * key * 2.2 + fill * fill * 1.2;
}
// The edge's light, tuned on close-ups. It is not a loop round the tile but a set of short lit
// stretches, each at its own place: angles round the tile in degrees, 0 at the right, 90 at the top, 270 at the bottom.
// turned by the pointer, so the light on the glass moves round it as the pointer moves
float ang(vec2 q){ float a = degrees(atan(q.y, q.x)) - uRot; return mod(a + 720.0, 360.0); }
float bump(float a, float c, float w){ float d = abs(a - c); d = min(d, 360.0 - d); return exp(-pow(d / w, 2.0)); }
// a thin line just inside the outline at q, of the given width
float line(vec2 q, float width){
  float dq = box(q, uHalf, uHalf * uRound);
  return exp(-pow((dq + width) / width, 2.0));
}
// a hard-edged line: flat across its width, cut off sharply either side
float hardLine(vec2 q, float width){
  float dq = box(q, uHalf, uHalf * uRound);
  return exp(-pow((dq + width) / width, 6.0));
}
void main(){
  vec2 p = gl_FragCoord.xy - uRes * 0.5;
  float d = box(p, uHalf, uHalf * uRound);
  float inside = smoothstep(1.0, -1.0, d);
  vec3 N = normalAt(p);
  vec3 V = vec3(0.0, 0.0, -1.0);
  // how far the sight line runs before it meets the glyph: a little behind the glass, so a bead magnifies gently
  // rather than turning the glyph inside out
  // the lens of beat two is a bead at every size
  float bead = max(1.0 - smoothstep(90.0, 210.0, uHalf), uLens);
  float h = height(p), depth = mix(h * 0.8 + rho() * 0.35 + 55.0, h * 0.3 + 18.0, bead);
  // the concave lens bends hard toward its rim, so the word is drawn out and smeared there
  depth = mix(depth, h * 0.25 + 10.0, uLens);
  // the colours part only a little in the glass itself; the rim's own fringes carry the colour
  vec3 iors = vec3(1.5) + vec3(-0.06, 0.0, 0.08) * mix(1.0, 0.15, bead);
  vec3 col;
  vec2 qSeen = p; // where the middle colour sees the glyph, so its glow bends with it
  for (int c = 0; c < 3; c++) {
    vec3 Nr = N;
    vec3 T = refract(V, Nr, 1.0 / iors[c]);
    vec2 q = p + T.xy / max(-T.z, 0.2) * depth;
    // the lens bends the whole glyph, not just
    // a band at the rim: the upper part is drawn out toward the upper left, the right side is pressed in, and the
    // left a little in too. Done as one smooth warp across the glass, so every stroke of the glyph bends with it.
    float ball = (1.0 - 0.75 * smoothstep(170.0, 235.0, uHalf)) * (1.0 - uLens);
    vec2 u = p / uHalf; // -1..1 across the glass
    vec2 ul = normalize(vec2(-0.6, 0.8));
    float along = max(dot(u, ul), 0.0);
    vec2 warp = -ul * along * along * 0.32; // sampled back toward the middle: stretched out toward the upper left
    warp.x += 0.22 * max(u.x, 0.0) * max(u.x, 0.0); // right: sampled further out, so pressed inward
    warp.x -= 0.12 * max(-u.x, 0.0) * max(-u.x, 0.0); // left: a little the same
    // (the logo grows evenly on every side)
    // q += warp * uHalf * inside * uGlass * ball;
    // the thick bevel: across it, what is seen is drawn from just inside the inner wall and smeared out over the
    // curve, so a stroke that reaches the wall is pulled round along the edge; each colour is pulled a different
    // amount, so a bent stroke breaks into a rainbow there (warm on the inside, blue on the outside)
    if (uLens < 0.5) {
      float bw = bevelW();
      float x = clamp(d + bw, 0.0, bw); // 0 at the inner wall, bw at the outline
      vec2 nOut = normalize(N.xy + 1e-5);
      float k = (0.7 + 0.3 * float(c)) * x * x / bw; // grows across the bevel
      q -= nOut * k * 1.15 * uGlass * (1.0 - bead);
    }
    // while it is a drop it is a ball lens: what is behind it is seen small and upside down, gathered into the lower
    // part of the drop, and turns the right way up and grows out as the drop flattens into the tile
    // the glyph seen through glass is a touch soft (its own blur mixed in), not cut sharp
    col[c] = mix(art(q), smoothstep(0.1, 0.7, glow(q)), 0.35) * uShow;
    // through the lens, near its left and right rim the letters are dragged out sideways toward the edge, a bright
    // smear (the glass stretches what lies under its rim)
    if (uLens > 0.5) {
      float edgeX = smoothstep(0.45, 0.95, abs(p.x) / max(uHalf, 1.0)) * inside;
      float sm = 0.0;
      for (int k = 1; k <= 8; k++) {
        float f = float(k) / 8.0;
        vec2 qs = q - vec2(sign(p.x) * f * uHalf * 0.35 * edgeX, 0.0);
        sm = max(sm, mix(art(qs), smoothstep(0.05, 0.6, glow(qs)), 0.6) * (1.0 - 0.7 * f));
      }
      col[c] = max(col[c], sm * edgeX * 0.95);
    }
    if (c == 1) qSeen = q;
  }
  float cosi = max(N.z, 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);
  // white: a short bright highlight round the lower right corner, a crisp arc round the lower left corner, a thin
  // line along the top that fades out towards the upper left, and a little down the right side
  float lw = max(uHalf * 0.016, 2.2), a0 = ang(p);
  // the lower right is a soft, spread glow, the light diffused through the thick corner; the lower left a hard arc
  float dq0 = box(p, uHalf, uHalf * uRound);
  // a thick crescent on the corner itself, tapering away to either side, a little soft at its edges
  float bLR = bump(a0, 318.0, 13.0), wLR = lw * (1.2 + 1.8 * bLR); // fattest in the middle of the corner
  float glowLR = exp(-pow((dq0 + wLR) / wLR, 2.0)) * 1.7 * bLR;
  // while it is a bead the ring is lit all the way round, as a drop is
  // uneven, like a real drop: heavy and bright at the lower left and down the right to the lower right, thin
  // and faint across the top
  float heavyR = bump(a0, 335.0, 40.0), heavyL = bump(a0, 222.0, 24.0), heavy = max(heavyR, heavyL * 0.85);
  // thick, as a drop's rim is: a good part of its radius, thickest where it is heaviest
  float rwB = max(uHalf * (0.05 + 0.09 * heavy), 3.0 + 7.0 * heavy);
  // the lens of beat two has a thin ring, not a drop's heavy one
  rwB = mix(rwB, max(uHalf * 0.018, 2.2) * (1.0 + 0.8 * heavy), uLens);
  float ringAll = line(p, rwB) * mix(0.75 + 1.1 * heavy, 0.2 + 1.5 * heavy, uLens) * bead;
  // a soft glow over the lower right of the drop, spreading in from the rim and a little out past it
  float dB = box(p, uHalf, uHalf * uRound), glowW = max(uHalf * 0.3, 13.0);
  ringAll += exp(-pow((dB + glowW * 0.25) / glowW, 2.0)) * bump(a0, 322.0, 40.0) * 0.7 * bead * (1.0 - uLens);
  float white = ringAll + glowLR + hardLine(p, lw * 0.8) * 1.7 * bump(a0, 224.0, 9.0) + line(p, lw) * 0.9 * bump(a0, 52.0, 11.0) + line(p, lw * (1.0 + 1.5 * bead)) * (0.6 + 0.6 * bead) * bump(a0, 80.0, 28.0) + line(p, lw) * (0.8 * bump(a0, 72.0, 30.0) + 0.4 * bump(a0, 15.0, 22.0));
  // yellow: a small spot on the top line
  float yellow = line(p, lw * 1.5) * 1.7 * bump(a0, 72.0, 3.0);
  float orange = line(p / 0.985, lw * 1.6) * 0.9 * bump(a0, 73.0, 2.5);
  // blue, just outside the outline: round the upper right corner, along the middle of the bottom, round the lower
  // left corner and a little up the left side
  vec2 pb = p / 1.028; float ab = ang(pb);
  float blue = line(pb, lw * 1.3) * 1.5 * (0.7 * bump(ab, 34.0, 8.0) + 0.5 * bump(ab, 268.0, 12.0) + 0.9 * bump(ab, 206.0, 8.0));
  // red, just inside: a spot on the upper right side and a band along the right half of the bottom; and outside,
  // round the lower left corner
  vec2 pr = p / 0.9; float ar = ang(pr);
  vec2 po = p / 1.05; float ao = ang(po);
  // both follow the curve of the corner they sit by: a slim line, its edges softened by a faint wider glow
  float red = (line(pr, lw * 1.6) * 0.75 + line(pr, lw * 3.5) * 0.15) * bump(ar, 27.0, 9.0)
    + (line(pr, lw * 2.0) * 0.6 + line(pr, lw * 4.0) * 0.15) * bump(ar, 296.0, 22.0) + line(po, lw * 1.0) * 0.6 * bump(ao, 216.0, 6.0);
  // cyan, just inside the lower right highlight
  vec2 pc = p / 0.985; float ac = ang(pc);
  float cyan = line(pc, lw * 1.2) * 0.9 * bump(ac, 292.0, 10.0);
  // a faint violet inside the corner, between the red and the white
  vec2 pv = p / 0.95;
  float violet = line(pv, lw * 3.0) * 0.45 * bump(ang(pv), 318.0, 16.0);
  // and a soft, compact sheen at the lower right corner
  float dq = box(p, uHalf, uHalf * uRound);
  float sheen = exp(-max(-dq, 0.0) / 18.0) * smoothstep(1.0, -1.0, dq) * bump(a0, 305.0, 10.0) * 0.12;
  // the glass's thickness: its far edge seen through it, a faint second outline a little way inside along the
  // bottom and right, and the thick wall between the two holding a little light
  float T = max(uHalf * 0.055, 9.0);
  float back = exp(-pow((dq + T) / (lw * 1.4), 2.0)) * 0.5 * bump(a0, 295.0, 50.0);
  float wallBand = smoothstep(0.0, -2.0, dq) * smoothstep(-T * 1.2, -T * 0.4, dq) * 0.08 * (0.4 + bump(a0, 300.0, 70.0));
  sheen += back + wallBand;
  // the bevel's inner wall: a thin pale line a bevel's width inside the outline
  float wallLine = exp(-pow((box(p, uHalf, uHalf * uRound) + bevelW()) / 2.4, 2.0)) * 0.3 * (1.0 - bead) * (1.0 - uLens);
  yellow *= 0.5; orange *= 0.5; blue *= 0.5; red *= 0.5; cyan *= 0.5; violet *= 0.5;
  vec3 refl3 = vec3(1.0) * (white + sheen + wallLine) + vec3(1.0, 0.85, 0.2) * yellow + vec3(1.0, 0.35, 0.05) * orange + vec3(0.15, 0.4, 1.0) * blue
    + vec3(1.0, 0.08, 0.1) * red + vec3(0.2, 1.0, 0.95) * cyan + vec3(0.45, 0.3, 1.0) * violet;
  // the colour of the fringes: the rainbow as it is, or drawn toward one tint
  vec3 baseW = vec3(white + sheen + wallLine), hue = refl3 - baseW;
  refl3 = baseW + mix(hue, uTint * dot(hue, vec3(0.4)) * 1.8, uTintMix);
  // the lens keeps only its ring and a little of the rest
  refl3 = mix(refl3, vec3(1.0) * ringAll + refl3 * 0.35, uLens);
  // soft highlights: the frosted sheen of the lights over the curved glass, stronger where it turns away from us
  // the glyph glows a little, a soft bloom of cool white round its strokes
  // the glow is the glyph's own, so it is seen through the glass exactly as the glyph is
  vec3 bloom = vec3(0.82, 0.92, 1.0) * glow(qSeen) * 0.5 * uShow;
  vec3 glass = col * (1.0 - F) * vec3(0.86, 0.95, 1.0) + bloom;
  vec3 plain = vec3(art(p)) * uPlain;
  // the lit edge blooms a little past the outline, most at the lower right
  float halo = exp(-max(d, 0.0) / 9.0) * step(0.0, d) * 0.12 * bump(ang(p), 305.0, 13.0);
  vec3 outc = mix(plain, glass * inside + refl3 + vec3(0.85, 0.92, 1.0) * halo, uGlass);
  // the wordmark runs on past the lens on either side, seen plainly there
  // past the lens the wordmark is hidden until the lens lets go of it
  // the wordmark's own soft glow, and its smeared ends once the lens has gone
  if (uLens > 0.5) {
    float wHalf = uGlyph * uAspect;
    float sr = 0.0, sl = 0.0;
    for (int k = 1; k <= 6; k++) {
      float f = float(k) / 6.0;
      sr += art(p - vec2(f * 0.16 * wHalf, 0.0)) * (1.0 - f) * smoothstep(0.55 * wHalf, 0.85 * wHalf, p.x);
      sl += art(p + vec2(f * 0.1 * wHalf, 0.0)) * (1.0 - f) * smoothstep(-0.55 * wHalf, -0.85 * wHalf, p.x);
    }
    outc += vec3(0.9, 0.95, 1.0) * (sr * uSmearR + sl * uSmearL) * 0.45;
    outc += vec3(0.82, 0.92, 1.0) * glow(p) * 0.35 * (1.0 - uGlass) * uPlain;
  }
  vec3 lit = min(outc, 1.0) * uAppear;
  gl_FragColor = vec4(1.0 - (1.0 - lit) * (1.0 - uBg), 1.0); // the glass's light over the page colour
}`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const program = (fs) => {
        const pr = gl.createProgram();
        gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
        gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(pr);
        const loc = (n) => gl.getUniformLocation(pr, n);
        return { pr, loc };
      };
      const P = { map: program(FS_MAP), blur: program(FS_BLUR), comp: program(FS_COMP) };
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      // float maps where the browser has them, so the slopes of a softened map are smooth rather than stepped
      const FLOAT = gl.getExtension("OES_texture_float") && gl.getExtension("OES_texture_float_linear") ? gl.FLOAT : gl.UNSIGNED_BYTE;
      const target = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, FLOAT, null);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        return { tex, fb };
      };
      const MAP = target(), TMP = target(), BENT = target(), LIT = target(), BLOB = target();
      const artTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, artTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const softTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, softTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blob);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      // the placeholder wordmark for beat two: a round mark and a word, white, in a 4:1 texture
      const word = document.createElement("canvas");
      word.width = 2048; word.height = 512;
      const wg = word.getContext("2d");
      wg.fillStyle = "#eef6ff";
      wg.beginPath(); wg.arc(330, 256, 118, 0, Math.PI * 2); wg.fill();
      wg.font = `800 300px "Helvetica Neue", Arial, sans-serif`;
      wg.textBaseline = "middle";
      wg.fillText("Firework", 500, 270);
      const wordSoft = document.createElement("canvas");
      wordSoft.width = 2048; wordSoft.height = 512;
      const wsg = wordSoft.getContext("2d");
      wsg.filter = "blur(26px)";
      wsg.drawImage(word, 0, 0);
      const mkTex = (src) => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        return t;
      };
      const wordTex = mkTex(word), wordSoftTex = mkTex(wordSoft);
      gl.viewport(0, 0, W, H);

      const draw = (P_, fb, set) => {
        gl.useProgram(P_.pr);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const a = gl.getAttribLocation(P_.pr, "p");
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(P_.loc("uRes"), W, H);
        set(P_.loc);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const tex = (unit, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); };
      const blur = (src, dst, sigma) => {
        tex(0, src.tex);
        draw(P.blur, TMP.fb, (L) => { gl.uniform1i(L("uSrc"), 0); gl.uniform2f(L("uDir"), 1, 0); gl.uniform1f(L("uSigma"), sigma); });
        tex(0, TMP.tex);
        draw(P.blur, dst.fb, (L) => { gl.uniform1i(L("uSrc"), 0); gl.uniform2f(L("uDir"), 0, 1); gl.uniform1f(L("uSigma"), sigma); });
      };

      function render(t) {
        const st = stateAt(t) || { half: 0, round: 1, glass: 0, glyph: 0, appear: 0 };
        if (st.word) { tex(2, wordTex); tex(4, wordSoftTex); } else { tex(2, artTex); tex(4, softTex); }
        draw(P.comp, null, (L) => {
          gl.uniform1i(L("uArt"), 2); gl.uniform1i(L("uArtSoft"), 4);
          gl.uniform1f(L("uHalf"), st.half); gl.uniform1f(L("uRound"), st.round);
          gl.uniform1f(L("uGlass"), st.glass); gl.uniform1f(L("uGlyph"), st.glyph); gl.uniform1f(L("uAppear"), st.appear); gl.uniform1f(L("uShow"), st.show ?? 1);
          gl.uniform1f(L("uLens"), st.lens || 0); gl.uniform1f(L("uSmearR"), st.smearR || 0); gl.uniform1f(L("uSmearL"), st.smearL || 0); gl.uniform1f(L("uPlain"), st.plain ?? 1); gl.uniform1f(L("uAspect"), st.word ? 4 : 1);
          gl.uniform1f(L("uRot"), look.rot); gl.uniform1f(L("uTintMix"), look.tintMix);
          gl.uniform3fv(L("uTint"), look.tint); gl.uniform3fv(L("uBg"), look.bg);
        });
      }

      // ---- live: plays once, then holds on the settled tile; click to play again ----
      const HOLD = LEAD + 0.95;
      const look = { rot: 0, rotTo: 0, tint: [1, 1, 1], tintMix: 0, bg: [0, 0, 0] };
      let t0 = performance.now();
      const frame = (now) => {
        const t = Math.min((now - t0) / 1000, HOLD);
        look.rot += (look.rotTo - look.rot) * 0.08;
        render(t);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      cv.addEventListener("click", () => (t0 = performance.now()));
      addEventListener("pointermove", (e) => (look.rotTo = (e.clientX / innerWidth - 0.5) * 140 + (e.clientY / innerHeight - 0.5) * 40));
      window.glassLook = look;
      window.replay = () => (t0 = performance.now());

      // ---- the logo: any image, drawn as a white silhouette; logos/firework.svg by default, ?logo=<url>, or drop a file ----
      const useLogo = (url) => {
        const img = new Image();
        img.onload = () => {
          const g2 = art.getContext("2d");
          g2.clearRect(0, 0, TEX, TEX);
          const k = Math.min(TEX / img.width, TEX / img.height) * 0.8;
          g2.drawImage(img, (TEX - img.width * k) / 2, (TEX - img.height * k) / 2, img.width * k, img.height * k);
          const im = g2.getImageData(0, 0, TEX, TEX), px = im.data;
          for (let i = 0; i < px.length; i += 4) { const a = px[i + 3] > 110 ? 255 : 0; px[i] = 238; px[i + 1] = 246; px[i + 2] = 255; px[i + 3] = a; }
          g2.putImageData(im, 0, 0);
          const b2 = blob.getContext("2d");
          b2.clearRect(0, 0, TEX, TEX);
          b2.filter = "blur(26px)";
          b2.drawImage(art, 0, 0);
          b2.filter = "none";
          gl.bindTexture(gl.TEXTURE_2D, artTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
          gl.bindTexture(gl.TEXTURE_2D, softTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blob);
          t0 = performance.now();
        };
        img.src = url;
      };
      useLogo(new URLSearchParams(location.search).get("logo") || "logos/firework.svg");
      window.useLogo = useLogo;
      addEventListener("dragover", (e) => e.preventDefault());
      addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) useLogo(URL.createObjectURL(f)); });
    })();
