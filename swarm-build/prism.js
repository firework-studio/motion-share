// Prism: a few ribbons of spectral light that flow in from both sides, pinch together at a point and fan out again,
// with fine glints of dust caught in them. Each ribbon carries a rainbow across its width, thin at the pinch and
// wide at the edges; the whole slowly sways. Every canvas marked data-prism gets its own: the pinch sits on the
// element named by data-anchor (the light gathers in a halo round it), or at data-at ("x,y" as fractions of the
// canvas). Prism.set(canvas, v) sets how far the light has flowed out (0 off, 1 full); Prism.reveal(canvas, s) lets it
// flow out over s seconds. A canvas out of view is not drawn.
(function () {
  const all = new Map();
  function make(cv) {
  const gl = cv.getContext("webgl", { premultipliedAlpha: false, antialias: false });
  if (!gl) return;

  const vs = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";
  const fs = `
precision highp float;
uniform vec2 res;
uniform vec2 ctr;
uniform float t;
uniform float rv;
uniform float rad;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// a spectrum leaning to the avatar's colours: violet, pink, amber, mint, cyan
vec3 spectrum(float h) { return 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67))); }

void main() {
  vec2 p = (gl_FragCoord.xy - ctr) / res.y;
  float ax = abs(p.x), side = sign(p.x);
  vec3 col = vec3(0.0);
  float core = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    // each veil leaves the pinch at its own angle, the angles breathing slowly, with a gentle wave along it
    float slope = (fi - 3.0) * 0.06 + 0.03 * sin(t * 0.21 + fi * 1.7);
    float wave = 0.045 * sin(p.x * 2.2 + t * 0.32 + fi * 1.3) * smoothstep(0.0, 0.7, ax);
    float y = slope * ax * (1.0 + 0.3 * side * sin(fi * 1.9)) + wave;
    float w = 0.004 + 0.07 * pow(ax, 1.15);
    float d = (p.y - y) / w;
    // a soft veil: a wide faint body round a brighter thread
    float body = exp(-d * d * 0.45), thread = exp(-d * d * 4.0);
    float I = (0.5 + 0.5 * sin(fi * 2.1 + t * 0.35 + p.x * 1.3)) * (0.75 / (1.0 + fi * 0.15));
    // the spectrum across the veil, pale and milky toward its thread, like light through a prism
    vec3 c = spectrum(d * 0.12 + fi * 0.13 + p.x * 0.05 + t * 0.012);
    c = mix(c, vec3(1.0), 0.12 + 0.5 * thread);
    col += c * (body * 0.26 + thread * 0.34) * I;
    core += thread * I;
  }
  // the bright point where they meet, and a soft bloom round it
  float r2 = dot(p, p);
  // the light gathers in a halo round the mark's rim, and is held back behind it, so the glass keeps its colour
  float r = sqrt(r2);
  if (rad > 0.0) {
    col *= mix(0.12, 1.0, smoothstep(rad * 0.55, rad * 1.05, r));
    col += vec3(0.86, 0.82, 1.0) * exp(-pow((r - rad * 0.98) / (rad * 0.11), 2.0)) * 0.4;
  } else {
    // with nothing at the pinch, the light simply meets in a bright point
    col += vec3(1.0, 0.97, 1.0) * exp(-r2 * 900.0) * 0.8;
  }
  col += vec3(0.46, 0.4, 0.82) * exp(-r2 * 4.0) * 0.18;
  // fine glints of dust, sparse, only where the light is, twinkling
  float h = hash(floor(gl_FragCoord.xy));
  float tw = pow(0.5 + 0.5 * sin(t * 2.2 + h * 80.0), 3.0);
  col += step(0.99, h) * tw * smoothstep(0.05, 0.6, core) * vec3(1.0, 0.98, 1.0) * 1.2;
  // fade toward the far edges and the bottom, and tone it down to sit behind type
  // switched on, the light flows out from the pinch to both sides
  col *= smoothstep(rv * 1.5, rv * 1.5 - 0.3, ax) * smoothstep(0.0, 0.25, rv);
  col *= smoothstep(1.3, 0.25, ax) * smoothstep(-0.7, -0.05, p.y + 0.3);
  // and toward the canvas's own top and bottom edges, so one section runs into the next without a seam
  float vy = gl_FragCoord.y / res.y;
  col *= smoothstep(0.0, 0.14, vy) * smoothstep(1.0, 0.86, vy);
  col = 1.0 - exp(-col * 1.15);
  vec3 ground = vec3(0.02, 0.02, 0.028);
  gl_FragColor = vec4(ground + col, 1.0);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "res"), uCtr = gl.getUniformLocation(prog, "ctr"), uT = gl.getUniformLocation(prog, "t"), uRv = gl.getUniformLocation(prog, "rv"), uRad = gl.getUniformLocation(prog, "rad");

  const anchor = cv.dataset.anchor && document.querySelector(cv.dataset.anchor);
  const at = (cv.dataset.at || "0.5,0.5").split(",").map(Number);
  // how far the light has flowed out: set at once, or let it flow out over a time
  const rev = { v: 1, dur: 0, at: 0 };
  function draw(now) {
    const cr = cv.getBoundingClientRect();
    if (cr.bottom < 0 || cr.top > innerHeight) return;
    // soft light needs no retina resolution: drawn at most 1.25x, a quarter of the pixels of a 2x screen
    const scale = Math.min(1.25, devicePixelRatio || 1), w = cv.offsetWidth, h = cv.offsetHeight;
    if (cv.width !== Math.round(w * scale) || cv.height !== Math.round(h * scale)) { cv.width = Math.round(w * scale); cv.height = Math.round(h * scale); }
    const ar = anchor ? anchor.getBoundingClientRect() : { left: cr.left + cr.width * at[0], top: cr.top + cr.height * at[1], width: 0, height: 0 };
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(uRes, cv.width, cv.height);
    gl.uniform2f(uCtr, (ar.left + ar.width / 2 - cr.left) * scale, (cr.bottom - (ar.top + ar.height / 2)) * scale);
    gl.uniform1f(uT, (now - start) / 1000);
    gl.uniform1f(uRad, anchor ? (ar.width * 0.36 * scale) / cv.height : 0);
    const k = rev.dur ? Math.min(1, (now - rev.at) / 1000 / rev.dur) : rev.v;
    gl.uniform1f(uRv, k < 1 ? 1 - Math.pow(1 - k, 3) : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  all.set(cv, { draw, rev });
  }

  const start = performance.now();
  document.querySelectorAll("canvas[data-prism]").forEach(make);
  const get = (cv) => all.get(typeof cv === "string" ? document.querySelector(cv) : cv);
  window.Prism = {
    set(cv, v) { const p = get(cv); if (p) { p.rev.v = v; p.rev.dur = 0; } },
    reveal(cv, dur) { const p = get(cv); if (p) { p.rev.dur = dur; p.rev.at = performance.now(); } },
    each(fn) { all.forEach((p, cv) => fn(cv)); },
  };
  function frame(now) { all.forEach((p) => p.draw(now)); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
