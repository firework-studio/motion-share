// The dumpling's body as a real sphere: one WebGL quad whose fragment shader wraps a material around the ball,
// turns it with the face, wipes one material into the next across the surface, and shades it.
(function () {
  const S = 800; // the GL canvas is a square around the ball, composited onto the film canvas
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });

  const VS = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;
  const FS = `
precision highp float;
uniform vec2 uC;
uniform float uR0, uK[12];  // outline: r(t) = r0 (1 + sum a_k cos kt + b_k sin kt), measured per frame
uniform mat3 uToBody;      // view space -> body space
uniform float uA, uB;      // material ids: old, new
uniform mat3 uVA, uVB;     // each skin's view frame in body space (right, up, front), frozen when it arrived
uniform float uWipe;       // wipe front, radians from its origin
uniform vec3 uWipeO;       // wipe origin, view space
uniform float uSeed, uTime;
uniform float uWob;        // jelly wobble of the outline at a skin change
uniform vec3 uBulge;       // swell carried by the wipe front: entry angle, progress, amplitude
uniform vec2 uBand;        // squeeze band: height on the body (-1..1, up), strength
uniform vec3 uImp;         // something going in: entry angle, dent depth, swell on the far side

const float PI = 3.14159265;
vec3 hex(float r, float g, float b) { return vec3(r, g, b) / 255.0; }
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 hash3(vec3 p) { return vec3(hash(p), hash(p + 17.31), hash(p + 41.77)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// nearest feature point: xyz = offset from it, w = distance
vec4 worley(vec3 x) {
  vec3 i = floor(x), f = fract(x); vec4 best = vec4(0.0, 0.0, 0.0, 9.0);
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) for (int c = -1; c <= 1; c++) {
    vec3 g = vec3(float(a), float(b), float(c)), o = 0.15 + 0.7 * hash3(i + g), d = g + o - f;
    float l = length(d); if (l < best.w) best = vec4(d, l);
  }
  return best;
}

float dot2(vec2 v) { return dot(v, v); }
// heart distance (Inigo Quilez), point down at the origin, about one unit tall
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
float ell(vec2 p, vec2 c, vec2 r, float a) {          // inside an ellipse rotated by a: 1 inside, soft edge
  p -= c; p = mat2(cos(a), sin(a), -sin(a), cos(a)) * p;
  return smoothstep(1.06, 0.94, dot2(p / r));
}

// Materials, all in one warm palette so the run reads as one dumpling changing clothes: brand red #FF2442,
// coral, peach, apricot, cream, butter, cocoa and sage; every skin keeps a touch of the red.
// Global ones wrap the whole sphere (knit, tabby). The others are one big picture facing the camera:
// V holds the view's right, up and front directions in body space, frozen when that skin arrived, so the picture
// sits on the lower front and then turns with the body. detail = 0 gives just the ground colour a new skin shows
// at its front; the picture follows a little behind.
vec3 material(float id, vec3 q, mat3 V, float detail) {
  float lon = atan(q.x, q.z), lat = asin(clamp(q.y, -1.0, 1.0));
  vec2 P = vec2(dot(q, V[0]), dot(q, V[1]));
  float vis = smoothstep(-0.05, 0.2, dot(q, V[2])) * detail;
  if (id < 0.5) return hex(255.0, 36.0, 66.0);                                     // 0 the dumpling's own red
  if (abs(id - 4.0) < 0.5) {                                                                   // 4 knit sweater, striped rows of V stitches
    float rows = lat * 11.0 / PI, row = floor(rows);
    vec2 g = vec2(fract(lon * 10.0 / PI), fract(rows));
    float side = g.x < 0.5 ? 1.0 : -1.0;
    vec2 l = vec2((g.x - 0.25 - 0.5 * step(0.5, g.x)) * 2.0, g.y - 0.5);
    l = mat2(0.8, side * 0.6, -side * 0.6, 0.8) * l;
    float loop = length(l * vec2(2.4, 1.15));
    bool red = mod(row, 4.0) < 2.0;
    vec3 yarn = red ? hex(240.0, 40.0, 66.0) : hex(255.0, 241.0, 222.0);
    vec3 gap = red ? hex(120.0, 14.0, 32.0) : hex(178.0, 150.0, 130.0);
    float puff = 0.78 + 0.34 * (1.0 - smoothstep(0.0, 0.62, loop)) + 0.1 * (0.5 - l.y);   // each loop is a round, thick strand
    return mix(gap, yarn * puff, smoothstep(0.64, 0.5, loop));
  }
  if (abs(id - 7.0) < 0.5) {                                                                   // 7 orange tabby
    vec3 c = hex(246.0, 178.0, 92.0);
    float s = sin(lon * 9.0 + 2.6 * noise(q * 2.2) + lat * 2.0);
    c = mix(c, hex(222.0, 128.0, 60.0), smoothstep(0.45, 0.62, s) * smoothstep(-0.7, -0.3, q.y));
    return mix(c, hex(255.0, 241.0, 220.0), smoothstep(-0.5, -0.62, q.y + 0.08 * sin(lon * 5.0)));
  }
  if (abs(id - 12.0) < 0.5) {                                                       // 12 pasta: one twirled nest
    vec3 c = mix(hex(255.0, 220.0, 168.0), hex(255.0, 240.0, 208.0), smoothstep(-0.6, 0.8, P.y));
    vec2 n0 = vec2(0.0, -0.34), d = P - n0;
    float r = length(d), th = atan(d.y, d.x);
    float nest = smoothstep(0.64, 0.58, r + 0.025 * sin(th * 5.0)) * vis;
    float s1 = sin(r * 40.0 - th), s2 = sin(r * 40.0 + th + 1.3);
    vec3 noodle = hex(250.0, 206.0, 98.0), shade = hex(222.0, 154.0, 52.0);
    vec3 nc = mix(shade, noodle, smoothstep(-0.2, 0.7, s1));
    nc = mix(nc, mix(shade, noodle * 1.04, smoothstep(-0.1, 0.8, s2)), 0.45 * smoothstep(0.3, 0.9, s2));
    nc = mix(nc, nc * 0.86, smoothstep(0.48, 0.6, r));
    c = mix(c, nc, nest);
    for (int k = 0; k < 2; k++) {                                                   // two cherry tomatoes
      vec2 tc = n0 + (k == 0 ? vec2(0.24, -0.14) : vec2(-0.22, -0.08));
      float dt = length(P - tc);
      vec3 tom = mix(hex(216.0, 30.0, 58.0), hex(255.0, 36.0, 66.0), smoothstep(0.13, 0.0, dt));
      tom = mix(tom, hex(255.0, 214.0, 204.0), smoothstep(0.035, 0.0, length(P - tc - vec2(-0.04, 0.05))));
      c = mix(c, tom, smoothstep(0.13, 0.115, dt) * vis);
    }
    float leaf = ell(P, n0 + vec2(0.02, -0.26), vec2(0.15, 0.07), 0.2) * vis;     // a basil leaf
    return mix(c, mix(hex(94.0, 154.0, 106.0), hex(156.0, 197.0, 154.0), smoothstep(-0.3, -0.24, P.y)), leaf);
  }
  if (abs(id - 13.0) < 0.5) {                                                       // 13 latte: a heart in the foam
    vec3 c = hex(122.0, 74.0, 58.0);
    vec2 cc = vec2(0.0, -0.22);
    float r = length(P - cc);
    vec3 crema = mix(hex(217.0, 162.0, 127.0), hex(176.0, 122.0, 94.0), smoothstep(0.0, 0.7, r));
    c = mix(c, crema, smoothstep(0.74, 0.72, r) * (0.35 + 0.65 * detail));
    c = mix(c, hex(255.0, 220.0, 190.0), smoothstep(0.03, 0.0, abs(r - 0.72)) * vis);
    float hd = sdHeart((P - cc - vec2(0.0, -0.3)) / 0.5) * 0.5;
    vec3 foam = mix(hex(255.0, 241.0, 220.0), hex(240.0, 214.0, 186.0), 0.5 + 0.5 * sin(hd * 90.0));
    return mix(c, foam, smoothstep(0.012, -0.004, hd) * vis);
  }
  if (abs(id - 14.0) < 0.5) {                                                       // 14 travel: a map with a route
    vec3 c = mix(hex(150.0, 204.0, 214.0), hex(190.0, 226.0, 228.0), smoothstep(-0.8, 0.8, P.y));
    float n = noise(q * 1.7 + 3.0) + 0.3 * noise(q * 4.0);
    c = mix(c, hex(255.0, 208.0, 176.0), smoothstep(0.66, 0.7, n) * (0.4 + 0.6 * detail));
    c = mix(c, hex(156.0, 197.0, 154.0), smoothstep(0.78, 0.82, n) * (0.4 + 0.6 * detail));
    float yr = -0.3 + 0.2 * sin(P.x * 2.6 + 0.6);
    float route = smoothstep(0.026, 0.014, abs(P.y - yr)) * step(0.42, fract(P.x * 6.0)) * step(abs(P.x + 0.06), 0.66);
    c = mix(c, hex(255.0, 255.0, 255.0), route * vis);
    vec2 pin = vec2(0.6, -0.3 + 0.2 * sin(0.6 * 2.6 + 0.6) + 0.1);
    float pr = length((P - pin) * vec2(1.0, 0.85));
    c = mix(c, hex(255.0, 36.0, 66.0), smoothstep(0.085, 0.07, pr) * vis);
    return mix(c, hex(255.0, 255.0, 255.0), smoothstep(0.032, 0.022, pr) * vis);
  }
  if (abs(id - 15.0) < 0.5) {                                                       // 15 lipstick: a kiss print
    vec3 c = mix(hex(255.0, 168.0, 160.0), hex(255.0, 208.0, 196.0), smoothstep(-0.7, 0.8, P.y));
    c *= 0.97 + 0.04 * sin((P.x + P.y) * 9.0);
    vec2 l = (P - vec2(0.0, -0.36)) / 0.47;
    float up = ell(l, vec2(0.0, 0.16), vec2(1.0, 0.4), 0.0) * step(0.02, l.y) * (1.0 - ell(l, vec2(0.0, 0.62), vec2(0.2, 0.2), 0.0));
    float lo = ell(l, vec2(0.0, -0.04), vec2(0.9, 0.5), 0.0) * step(l.y, 0.02);
    vec3 lip = mix(hex(205.0, 22.0, 52.0), hex(255.0, 36.0, 66.0), smoothstep(-0.5, 0.3, l.y));
    c = mix(c, lip, max(up, lo) * vis);
    c = mix(c, hex(150.0, 16.0, 40.0), smoothstep(0.05, 0.0, abs(l.y - 0.02)) * step(abs(l.x), 0.86) * vis);
    return mix(c, hex(255.0, 214.0, 210.0), ell(l, vec2(0.3, -0.24), vec2(0.18, 0.07), -0.2) * 0.6 * vis);
  }
  if (abs(id - 16.0) < 0.5) {                                                       // 16 camping: a tent at dusk
    vec3 c = mix(hex(255.0, 208.0, 176.0), hex(255.0, 160.0, 140.0), smoothstep(-0.2, 0.25, P.y));
    c = mix(c, hex(232.0, 132.0, 150.0), smoothstep(0.25, 0.85, P.y));
    c = mix(c, hex(255.0, 241.0, 220.0), smoothstep(0.1, 0.085, length(P - vec2(-0.45, 0.52))) * vis);
    float hill = -0.08 + 0.08 * sin(P.x * 3.0 + 1.0);
    c = mix(c, hex(94.0, 154.0, 106.0), smoothstep(hill + 0.01, hill - 0.01, P.y) * (0.5 + 0.5 * detail));
    c = mix(c, hex(130.0, 180.0, 128.0), smoothstep(hill - 0.12, hill - 0.14, P.y + 0.05 * sin(P.x * 5.0)) * (0.5 + 0.5 * detail));
    float h = clamp((0.22 - P.y) / 0.68, 0.0, 1.0), tent = step(-0.46, P.y) * step(P.y, 0.22) * smoothstep(0.43 * h + 0.008, 0.43 * h - 0.008, abs(P.x));
    c = mix(c, P.x < 0.0 ? hex(255.0, 36.0, 66.0) : hex(212.0, 26.0, 56.0), tent * vis);
    float hd = clamp((-0.06 - P.y) / 0.4, 0.0, 1.0), door = step(-0.46, P.y) * step(P.y, -0.06) * smoothstep(0.15 * hd + 0.006, 0.15 * hd - 0.006, abs(P.x));
    return mix(c, hex(122.0, 74.0, 58.0), door * vis);
  }
  if (abs(id - 17.0) < 0.5) {                                                       // 17 book: open pages, a ribbon
    vec3 c = hex(232.0, 34.0, 62.0);
    float top = 0.3 - 0.07 * smoothstep(0.0, 0.78, abs(P.x)) + 0.05 * smoothstep(0.5, 0.78, abs(P.x));
    float page = step(abs(P.x), 0.78) * step(-0.62, P.y) * step(P.y, top);
    vec3 pc = hex(255.0, 241.0, 220.0) * (1.0 - 0.18 * exp(-abs(P.x) / 0.05));
    float row = floor((P.y + 0.6) / 0.075), ln = abs(fract((P.y + 0.6) / 0.075) - 0.5) * 0.075;
    float len = 0.66 - 0.22 * hash(vec3(row, sign(P.x), 3.0));
    float text = smoothstep(0.009, 0.004, ln) * step(0.1, abs(P.x)) * step(abs(P.x), len) * step(-0.52, P.y) * step(P.y, top - 0.08);
    pc = mix(pc, hex(200.0, 176.0, 160.0), text);
    c = mix(c, pc, page * (0.5 + 0.5 * vis));
    float rib = step(0.17, P.x) * step(P.x, 0.24) * step(P.y, top + 0.02) * step(-0.8 + 0.06 * (1.0 - abs(P.x - 0.205) / 0.035), P.y);
    return mix(c, hex(255.0, 211.0, 110.0), rib * vis);
  }
  if (abs(id - 18.0) < 0.5) {                                                       // 18 plant: a pot and three leaves
    vec3 c = mix(hex(255.0, 220.0, 196.0), hex(255.0, 241.0, 220.0), smoothstep(-0.7, 0.8, P.y));
    vec2 base = vec2(0.0, -0.42);
    float hw = mix(0.22, 0.3, clamp((P.y + 0.92) / 0.5, 0.0, 1.0));
    float pot = step(-0.92, P.y) * step(P.y, -0.42) * smoothstep(hw + 0.008, hw - 0.008, abs(P.x));
    c = mix(c, mix(hex(232.0, 100.0, 90.0), hex(255.0, 132.0, 112.0), smoothstep(0.2, -0.2, P.x)), pot * vis);
    float rim = step(-0.48, P.y) * step(P.y, -0.39) * step(abs(P.x), 0.33);
    c = mix(c, hex(216.0, 84.0, 78.0), rim * vis);
    vec3 leafc = hex(110.0, 166.0, 116.0), vein = hex(80.0, 134.0, 92.0);
    for (int k = 0; k < 3; k++) {
      vec2 lc = k == 0 ? vec2(0.0, 0.0) : (k == 1 ? vec2(-0.28, -0.14) : vec2(0.28, -0.12));
      float a = k == 0 ? 1.5708 : (k == 1 ? 2.45 : 0.7);
      vec2 rr = k == 0 ? vec2(0.36, 0.17) : vec2(0.28, 0.13);
      float lf = ell(P, lc, rr, a);
      vec2 lp = mat2(cos(a), sin(a), -sin(a), cos(a)) * (P - lc);
      vec3 col = mix(leafc * 1.12, leafc, smoothstep(-0.1, 0.1, lp.y));
      col = mix(col, vein, smoothstep(0.012, 0.0, abs(lp.y)) * step(abs(lp.x), rr.x * 0.85));
      c = mix(c, col, lf * vis);
      vec2 sd = lc - base; float t = clamp(dot(P - base, sd) / dot(sd, sd), 0.0, 1.0);   // stem from the pot to the leaf
      c = mix(c, vein, smoothstep(0.016, 0.008, length(P - base - sd * t)) * vis * step(-0.42, P.y));
    }
    return c;
  }
  // ---- the run: surfaces, not pictures. One feature each; red, pink and cream, one cool accent.
  vec3 cream = hex(255.0, 241.0, 222.0), red = hex(255.0, 36.0, 66.0), pink = hex(255.0, 150.0, 170.0);
  if (abs(id - 20.0) < 0.5) {                                                       // 20 red marbling on cream
    float w = noise(q * 1.8 + 2.0) * 2.0 + noise(q * 3.6) * 0.8;
    float b = sin(dot(q, vec3(2.2, 3.4, 1.0)) * 3.0 + w * 4.0);
    vec3 c = mix(cream, pink, smoothstep(0.1, 0.5, b));
    return mix(cream, mix(c, red, smoothstep(0.55, 0.8, b)), detail);
  }
  if (abs(id - 21.0) < 0.5) {                                                       // 21 orange plush, a few wide stripes
    float fuzz = noise(q * 140.0) * 0.6 + noise(q * 60.0) * 0.4;
    float st = sin(lon * 3.0 + 1.6 * noise(q * 1.5) + lat * 1.5);
    vec3 c = mix(hex(252.0, 184.0, 110.0), hex(214.0, 104.0, 50.0), smoothstep(0.2, 0.4, st) * detail);
    return c * (0.92 + 0.14 * fuzz);
  }
  if (abs(id - 22.0) < 0.5) {                                                       // 22 coffee folding into cream
    float w = noise(q * 1.5 + 7.0) * 2.4 + noise(q * 3.2 + 1.0);
    float b = sin(dot(q, vec3(-1.4, 2.6, 1.8)) * 2.4 + w * 3.6);
    vec3 c = mix(hex(122.0, 74.0, 58.0), hex(196.0, 140.0, 104.0), smoothstep(-0.6, 0.0, b));
    return mix(hex(176.0, 122.0, 94.0), mix(c, cream, smoothstep(0.35, 0.75, b)), detail);
  }
  if (abs(id - 23.0) < 0.5) {                                                       // 23 bold stripes
    float st = sin(dot(q, normalize(vec3(0.5, 1.0, 0.25))) * 9.0);
    return mix(pink, mix(cream, red, smoothstep(-0.08, 0.08, st)), detail);
  }
  if (abs(id - 24.0) < 0.5) {                                                       // 24 big gingham
    float a = step(0.5, fract(lon * 2.6 / PI + 0.25)), b = step(0.5, fract(lat * 2.6 / PI + 0.25));
    vec3 c = a + b < 0.5 ? cream : (a + b < 1.5 ? pink : red);
    return mix(pink, c * (0.96 + 0.05 * noise(q * 70.0)), detail);
  }
  if (abs(id - 25.0) < 0.5) {                                                       // 25 frosted rose: matte, a fine grain
    vec3 c = mix(hex(238.0, 150.0, 162.0), hex(250.0, 196.0, 200.0), smoothstep(-0.8, 0.9, q.y + 0.3 * q.x));
    return c * (0.95 + 0.08 * noise(q * 220.0) * detail);
  }
  if (abs(id - 26.0) < 0.5) {                                                       // 26 mint jelly (the cool accent)
    return mix(hex(132.0, 214.0, 204.0), hex(196.0, 240.0, 232.0), smoothstep(-0.6, 0.9, q.y));
  }
  if (abs(id - 27.0) < 0.5) {                                                       // 27 pearl
    float t = dot(q, vec3(0.6, 0.8, 0.3)) * 2.2 + 0.4 * sin(uTime * 2.0 + q.z * 3.0);
    vec3 c = mix(hex(255.0, 236.0, 230.0), hex(255.0, 206.0, 214.0), 0.5 + 0.5 * sin(t));
    return mix(c, hex(222.0, 214.0, 255.0), 0.35 * smoothstep(0.4, 1.0, sin(t * 1.7 + 1.0)));
  }
  // ---- Christmas ornaments
  if (abs(id - 50.0) < 0.5) {                                                       // 50 frosted snow white: soft, no grain
    return mix(hex(236.0, 224.0, 200.0), hex(250.0, 242.0, 226.0), smoothstep(-0.8, 0.9, q.y + 0.25 * q.x));
  }
  vec3 xred = hex(205.0, 43.0, 58.0), xcream = hex(247.0, 237.0, 216.0), xpine = hex(34.0, 78.0, 63.0);
  if (abs(id - 51.0) < 0.5) {                                                       // 51 candy cane: three or four wide stripes
    float st = sin(dot(q, normalize(vec3(1.0, 0.9, 0.3))) * 8.0);
    return mix(xcream, mix(xcream, xred, smoothstep(-0.06, 0.06, st)), detail);
  }
  if (abs(id - 52.0) < 0.5) {                                                       // 52 pine-green chunky knit
    float rows = lat * 9.0 / PI, row = floor(rows);
    vec2 g = vec2(fract(lon * 8.0 / PI), fract(rows));
    float side = g.x < 0.5 ? 1.0 : -1.0;
    vec2 l = vec2((g.x - 0.25 - 0.5 * step(0.5, g.x)) * 2.0, g.y - 0.5);
    l = mat2(0.8, side * 0.6, -side * 0.6, 0.8) * l;
    float loop = length(l * vec2(2.4, 1.15));
    float puff = 0.78 + 0.34 * (1.0 - smoothstep(0.0, 0.62, loop)) + 0.1 * (0.5 - l.y);
    vec3 yarn = hex(52.0, 108.0, 86.0) * puff;
    return mix(xpine, mix(hex(18.0, 46.0, 36.0), yarn, smoothstep(0.64, 0.5, loop)), detail);
  }
  if (abs(id - 53.0) < 0.5) {                                                       // 53 gift plaid: wide bands both ways
    float h = smoothstep(0.03, -0.03, abs(fract(lat * 2.4 / PI + 0.25) - 0.5) - 0.1);
    float v = smoothstep(0.03, -0.03, abs(fract(lon * 2.4 / PI + 0.25) - 0.5) - 0.1);
    vec3 c = xpine;
    c = mix(c, xred, max(h, v));
    c = mix(c, hex(150.0, 26.0, 40.0), h * v);
    return mix(xpine, c, detail);
  }
  if (abs(id - 54.0) < 0.5) {                                                       // 54 soft gold mirror: two wide reflections
    float Y = dot(q, V[1]);                                                         // reflections stay put while the body turns
    vec3 c = mix(hex(150.0, 108.0, 46.0), hex(190.0, 145.0, 66.0), smoothstep(-1.0, 0.6, Y));
    c = mix(c, hex(253.0, 235.0, 185.0), smoothstep(0.16, 0.0, abs(Y - 0.38)) * detail);
    return mix(c, hex(232.0, 196.0, 120.0), smoothstep(0.12, 0.0, abs(Y + 0.32)) * 0.7 * detail);
  }
  if (abs(id - 55.0) < 0.5) {                                                       // 55 ice-blue glass with one big snowflake
    vec3 c = mix(hex(150.0, 196.0, 210.0), hex(200.0, 230.0, 236.0), smoothstep(-0.7, 0.9, q.y));
    vec2 sp = P - vec2(0.08, -0.22);
    float rr = length(sp), a = atan(sp.y, sp.x) + uTime * 0.3;
    float sec = mod(a + PI / 6.0, PI / 3.0) - PI / 6.0;                             // fold into one of six arms
    vec2 k = rr * vec2(cos(sec), sin(sec));
    float arm = smoothstep(0.022, 0.012, abs(k.y)) * step(k.x, 0.34);
    vec2 br = vec2(k.x - 0.2, abs(k.y));
    float twig = smoothstep(0.02, 0.01, abs(br.y - br.x * 0.7)) * step(0.0, br.x) * step(br.x, 0.09);
    float flake = max(arm, twig) * smoothstep(0.36, 0.33, rr);
    return mix(c, hex(255.0, 255.0, 255.0), flake * 0.9 * detail * smoothstep(-0.05, 0.2, dot(q, V[2])));
  }
  if (abs(id - 56.0) < 0.5) {                                                       // 56 gingerbread with one thick icing line
    vec3 c = mix(hex(150.0, 92.0, 56.0), hex(186.0, 124.0, 80.0), smoothstep(-0.8, 0.8, q.y)) * (0.95 + 0.07 * noise(q * 30.0));
    float line = smoothstep(0.05, 0.035, abs(lat + 0.48 - 0.08 * sin(lon * 5.0)));
    return mix(c, xcream, line * detail);
  }
  if (abs(id - 57.0) < 0.5) {                                                       // 57 red pearl lacquer
    float Y = dot(q, V[1]), X = dot(q, V[0]);
    float sheen = 0.5 + 0.5 * sin(X * 2.0 + Y * 3.0 + uTime * 1.4);
    return mix(hex(214.0, 28.0, 50.0), hex(255.0, 151.0, 153.0), sheen * sheen * 0.55 * detail);
  }
  if (abs(id - 58.0) < 0.5) {                                                       // 58 burgundy velvet: bright at the edges
    float Z = dot(q, V[2]);
    vec3 c = mix(hex(110.0, 22.0, 38.0), hex(150.0, 32.0, 52.0), smoothstep(-0.8, 0.8, q.y));
    return mix(c, hex(200.0, 74.0, 96.0), (1.0 - smoothstep(0.1, 0.75, Z)) * 0.7 * detail) * (0.96 + 0.06 * noise(q * 160.0));
  }
  if (abs(id - 59.0) < 0.5) {                                                       // 59 moonlight silver, a faint warm pearl
    float Y = dot(q, V[1]), X = dot(q, V[0]);
    vec3 c = mix(hex(196.0, 199.0, 208.0), hex(242.0, 241.0, 238.0), smoothstep(-0.9, 0.7, Y));
    return mix(c, hex(255.0, 226.0, 222.0), 0.35 * smoothstep(0.3, 1.0, sin(X * 2.4 + Y * 1.6 + uTime)) * detail);
  }
  if (abs(id - 60.0) < 0.5) {                                                       // 60 ice: clear, with cracks deep inside
    vec3 vb = normalize(uToBody * vec3(0.0, 0.0, 1.0));                            // toward the camera, in body space
    float zc = clamp(dot(q, vb), 0.0, 1.0);                                        // thick in the middle, thin at the rim
    vec3 c = mix(hex(214.0, 238.0, 248.0), hex(128.0, 186.0, 216.0), smoothstep(0.1, 0.95, zc));
    // cracks at three depths inside the ball: they slide past each other as it turns (parallax), fainter deeper in
    float cr = 0.0;
    for (int k = 0; k < 3; k++) {
      float t = 0.12 + 0.2 * float(k);
      vec3 pin = q - vb * t * (0.4 + 0.6 * zc);
      vec3 cp = pin * 1.6 + 7.0 + float(k) * 3.1;
      vec3 ci = floor(cp), cf = fract(cp);
      float d1 = 9.0, d2 = 9.0;
      for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) for (int e = -1; e <= 1; e++) {
        vec3 g = vec3(float(a), float(b), float(e)), o = 0.15 + 0.7 * hash3(ci + g), dd = g + o - cf;
        float l = dot(dd, dd);
        if (l < d1) { d2 = d1; d1 = l; } else if (l < d2) d2 = l;
      }
      float edge = sqrt(d2) - sqrt(d1);
      float keep = step(0.45, hash(ci + 1.7));                                     // only some walls crack
      cr += smoothstep(0.05, 0.0, edge) * keep * (0.9 - 0.25 * float(k));
    }
    c = mix(c, hex(250.0, 253.0, 255.0), clamp(cr, 0.0, 1.0) * 0.75 * detail);
    // a frosted, bright rim where the ice is thin
    return mix(c, hex(244.0, 250.0, 253.0), (1.0 - smoothstep(0.0, 0.35, zc)) * 0.6 * detail);
  }
  if (abs(id - 61.0) < 0.5) {                                                       // 61 holly on cream
    vec3 c = mix(hex(240.0, 228.0, 206.0), hex(250.0, 243.0, 228.0), smoothstep(-0.7, 0.8, P.y));
    vec3 lc = hex(36.0, 96.0, 64.0), lv = hex(24.0, 70.0, 46.0);
    for (int k = 0; k < 2; k++) {
      float sd = k == 0 ? -1.0 : 1.0;
      vec2 o = vec2(0.02 + 0.36 * sd, -0.36), d = P - o;
      float a = sd * 0.55, ca = cos(a), sa = sin(a);
      vec2 l = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
      float wv = 0.2 * (1.0 - pow(abs(l.x) / 0.44, 2.0)) - 0.045 * abs(sin(l.x * 21.0));   // spiky holly edge
      float leaf = step(abs(l.x), 0.44) * smoothstep(wv + 0.008, wv - 0.008, abs(l.y));
      vec3 col = mix(lc * 1.15, lc, smoothstep(-0.05, 0.05, l.y));
      col = mix(col, lv, smoothstep(0.012, 0.0, abs(l.y)) * step(abs(l.x), 0.4));
      c = mix(c, col, leaf * detail);
    }
    for (int k = 0; k < 3; k++) {
      vec2 b = vec2(-0.07 + 0.11 * float(k), -0.2 + (k == 1 ? 0.09 : 0.0));
      float r = length(P - b);
      vec3 bc = mix(hex(196.0, 22.0, 44.0), hex(240.0, 50.0, 66.0), smoothstep(0.1, 0.0, r));
      bc = mix(bc, hex(255.0, 210.0, 210.0), smoothstep(0.03, 0.0, length(P - b - vec2(-0.025, 0.03))));
      c = mix(c, bc, smoothstep(0.1, 0.088, r) * detail);
    }
    return c;
  }
  return hex(255.0, 36.0, 66.0);
}
// how a surface takes light: x = gloss, y = translucency
vec2 finish(float id) {
  if (abs(id - 25.0) < 0.5) return vec2(0.15, 0.0);   // frosted
  if (abs(id - 50.0) < 0.5) return vec2(0.25, 0.0);   // frosted snow
  if (abs(id - 52.0) < 0.5 || abs(id - 56.0) < 0.5) return vec2(0.3, 0.0);   // knit, gingerbread
  if (abs(id - 53.0) < 0.5) return vec2(0.5, 0.0);   // plaid
  if (abs(id - 54.0) < 0.5) return vec2(2.8, 0.0);   // gold mirror
  if (abs(id - 55.0) < 0.5) return vec2(2.6, 1.0);   // glass
  if (abs(id - 57.0) < 0.5) return vec2(2.2, 0.0);   // pearl lacquer
  if (abs(id - 58.0) < 0.5) return vec2(0.25, 0.0);  // velvet
  if (abs(id - 59.0) < 0.5) return vec2(2.4, 0.0);   // silver
  if (abs(id - 60.0) < 0.5) return vec2(2.8, 0.85);  // ice: glossy, light comes through
  if (abs(id - 61.0) < 0.5) return vec2(0.6, 0.0);   // holly
  if (abs(id - 51.0) < 0.5) return vec2(1.4, 0.0);   // candy
  if (abs(id - 26.0) < 0.5) return vec2(2.6, 1.0);    // jelly
  if (abs(id - 27.0) < 0.5) return vec2(1.8, 0.0);    // pearl
  if (abs(id - 4.0) < 0.5 || abs(id - 21.0) < 0.5) return vec2(0.3, 0.0);   // yarn and plush
  return vec2(1.0, 0.0);
}

void main() {
  vec2 d = gl_FragCoord.xy - uC;
  float ang = atan(d.y, d.x), shape = 1.0;
  for (int k = 0; k < 6; k++) shape += uK[2 * k] * cos(float(k + 1) * ang) + uK[2 * k + 1] * sin(float(k + 1) * ang);
  float b1 = ang - uBulge.x - PI * uBulge.y, b2 = ang - uBulge.x + PI * uBulge.y;
  b1 = atan(sin(b1), cos(b1)); b2 = atan(sin(b2), cos(b2));
  float swell = uBulge.z * (exp(-b1 * b1 / 0.405) + exp(-b2 * b2 / 0.405));
  float bd = sin(ang) - uBand.x;
  float ea = atan(sin(ang - uImp.x), cos(ang - uImp.x)), fa = atan(sin(ang - uImp.x - PI), cos(ang - uImp.x - PI));
  float hit = 1.0 - uImp.y * exp(-ea * ea / 0.2888) + uImp.z * exp(-fa * fa / 0.72);
  float R = uR0 * shape * (1.0 + uWob * (0.6 * sin(5.0 * ang + uSeed * 3.0) + 0.4 * sin(8.0 * ang - uSeed * 5.0)) + swell) * (1.0 - uBand.y * exp(-bd * bd / 0.08)) * hit;
  vec2 p = d / R;
  float r = length(p);
  float edge = clamp((1.0 - r) * R, 0.0, 1.0);
  if (edge <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
  vec3 q = uToBody * n;
  vec3 col = material(uA, q, uVA, 1.0);
  vec2 fin = finish(uA);
  if (uWipe > 0.0) {
    float d = acos(clamp(dot(n, uWipeO), -1.0, 1.0)) + 0.16 * (noise(q * 3.0 + uSeed) - 0.5) + 0.05 * sin(atan(n.y, n.x) * 7.0 + uSeed);
    vec3 next = material(uB, q, uVB, smoothstep(0.05, 0.35, uWipe - d));
    float m = smoothstep(uWipe + 0.035, uWipe - 0.035, d);
    col = mix(col, next, m);
    fin = mix(fin, finish(uB), m);
    if (abs(uB - 4.0) < 0.5) {                       // a sweater has a ribbed hem at its leading edge
      float hem = smoothstep(uWipe - 0.2, uWipe - 0.16, d) * smoothstep(uWipe + 0.01, uWipe - 0.03, d);
      vec3 rib = mix(hex(170.0, 20.0, 40.0), hex(232.0, 33.0, 58.0), 0.5 + 0.5 * sin(atan(q.x, q.z) * 60.0));
      col = mix(col, rib, hem);
    }
  }
  vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
  float diff = 0.8 + 0.26 * max(dot(n, L), 0.0);
  float rim = smoothstep(0.62, 1.0, r * r) * 0.2;
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), mix(14.0, 40.0, clamp(fin.x - 1.0, 0.0, 1.0))) * 0.16 * fin.x;
  vec3 lit = col * diff * (1.0 - rim) + spec;
  // jelly: light passes through, a bright core and a clear rim instead of a dark one
  vec3 jelly = col * (0.72 + 0.5 * n.z * n.z) + pow(1.0 - n.z, 3.0) * vec3(0.9, 1.0, 0.98) * 0.45 + spec;
  col = mix(lit, jelly, fin.y);
  float iceW = max(1.0 - abs(uA - 60.0), 0.0) * (1.0 - (uWipe > 0.0 ? smoothstep(uWipe + 0.035, uWipe - 0.035, acos(clamp(dot(n, uWipeO), -1.0, 1.0))) : 0.0))
             + (uWipe > 0.0 ? max(1.0 - abs(uB - 60.0), 0.0) * smoothstep(uWipe + 0.035, uWipe - 0.035, acos(clamp(dot(n, uWipeO), -1.0, 1.0))) : 0.0);
  vec2 hp = n.xy - vec2(-0.52, 0.12);
  float win = smoothstep(0.012, 0.0, max(abs(hp.x) - 0.09, abs(hp.y) - 0.05)) + 0.6 * smoothstep(0.01, 0.0, max(abs(hp.x - 0.15) - 0.035, abs(hp.y) - 0.05));
  col = mix(col, vec3(1.0), clamp(win, 0.0, 1.0) * 0.9 * iceW);
  gl_FragColor = vec4(col * edge, edge);
}`;

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const k of ["uC", "uR0", "uK", "uToBody", "uA", "uB", "uVA", "uVB", "uWipe", "uWipeO", "uSeed", "uTime", "uWob", "uBulge", "uBand", "uImp"]) U[k] = gl.getUniformLocation(prog, k);

  // R: body -> view rotation (rows). Column-major upload of R's rows gives R transposed: view -> body.
  function render({ r0, k, R, a, b, wipe, wipeAngle, wipeZ = 0.25, seed, time, wob = 0, bulge = [0, 0, 0], band = [0, 0], impact = [0, 0, 0], viewA = null, viewB = null }) {
    gl.viewport(0, 0, S, S);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uC, S / 2, S / 2);
    gl.uniform1f(U.uR0, r0); gl.uniform1fv(U.uK, new Float32Array(k));
    gl.uniformMatrix3fv(U.uToBody, false, new Float32Array([...R[0], ...R[1], ...R[2]]));
    const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    gl.uniformMatrix3fv(U.uVA, false, new Float32Array(viewA || I)); gl.uniformMatrix3fv(U.uVB, false, new Float32Array(viewB || I));
    gl.uniform1f(U.uA, a); gl.uniform1f(U.uB, b); gl.uniform1f(U.uWipe, wipe);
    const ang = (wipeAngle * Math.PI) / 180, o = [Math.cos(ang), -Math.sin(ang), wipeZ], l = Math.hypot(...o);
    gl.uniform3f(U.uWipeO, o[0] / l, o[1] / l, o[2] / l);
    gl.uniform1f(U.uSeed, seed); gl.uniform1f(U.uTime, time); gl.uniform1f(U.uWob, wob); gl.uniform3f(U.uBulge, bulge[0], bulge[1], bulge[2]); gl.uniform2f(U.uBand, band[0], band[1]); gl.uniform3f(U.uImp, impact[0], impact[1], impact[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return canvas;
  }

  window.BodyGL = { render, S };
})();
