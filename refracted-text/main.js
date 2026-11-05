// Refracted text: heavy letters of polished glass. Each frame the word is drawn as a white mask (letters lifting
// into place one after another), softened into a height map, and shaded by one fragment shader: a dark-to-light
// body, a bright band of light across the glass that the letters' curved faces bend, warm and cool spectral rays
// either side of it, and a fine lit rim. The band drifts slowly, follows the pointer near it, and takes the colours
// of the chosen set.
(function () {
  const W = 1800, H = 640;
  const cv = document.getElementById("gl");
  cv.width = W; cv.height = H;

  // ---- the word as a mask, and its softened copy (the glass's height) ----
  const mask = document.createElement("canvas"), soft = document.createElement("canvas");
  mask.width = soft.width = W; mask.height = soft.height = H;
  const mg = mask.getContext("2d"), sg = soft.getContext("2d");
  const FONT = '"Russo One", "PingFang SC", "Noto Sans SC", "Arial Black", sans-serif'; // Chinese falls back to a heavy system face
  // the letters are drawn wider and lower than the face, and fattened with round joins, so they read as squat,
  // soft-cornered blocks of glass
  const SX = 1.32, SY = 0.86;
  let word = "FIREWORK", glyphs = [], size = 0, baseline = 0;
  function layout() {
    size = 400;
    mg.font = `900 ${size}px ${FONT}`;
    const fit = (W * 0.9) / (mg.measureText(word).width * SX);
    size = Math.min(380, size * fit);
    mg.font = `900 ${size}px ${FONT}`;
    const total = mg.measureText(word).width * SX;
    let x = (W - total) / 2;
    glyphs = [...word].map((ch) => { const w = mg.measureText(ch).width * SX, g = { ch, x, w }; x += w; return g; });
    baseline = H / 2 + size * 0.3;
  }

  // ---- timing, as measured: the letters rise one after another over 1.75 s (0.55 s from first to last), easing
  // out hard (power4.out) with no fade; the light flows across once in 6.9 s, then cycles every 13.2 s ----
  const LIFT = 1.75, STAGGER = 0.55;
  const ease4 = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);
  function drawMask(t) {
    mg.clearRect(0, 0, W, H);
    mg.save();
    mg.beginPath(); mg.rect(0, 0, W, baseline + size * 0.02); mg.clip(); // the letters rise up out of their baseline
    mg.fillStyle = "#fff";
    mg.font = `900 ${size}px ${FONT}`;
    // a touch of extra weight, with rounded joins
    mg.strokeStyle = "#fff"; mg.lineWidth = size * 0.012; mg.lineJoin = "round";
    const n = glyphs.length, each = LIFT - STAGGER;
    glyphs.forEach((g, i) => {
      const start = n > 1 ? (STAGGER * i) / (n - 1) : 0;
      const k = ease4((t - start) / each);
      const y = baseline + (1 - k) * size * 0.95;
      mg.save(); mg.translate(g.x, y); mg.scale(SX, SY);
      mg.fillText(g.ch, 0, 0); mg.strokeText(g.ch, 0, 0);
      mg.restore();
    });
    mg.restore();
    sg.clearRect(0, 0, W, H);
    sg.filter = `blur(${Math.max(2, Math.round(size * 0.014))}px)`; // a narrow bevel: the face is flat almost to its edge
    sg.drawImage(mask, 0, 0);
    sg.filter = "none";
  }

  // ---- WebGL ----
  const gl = cv.getContext("webgl", { premultipliedAlpha: false });
  const VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  const FS = `
precision highp float;
uniform vec2 uRes;
uniform sampler2D uMask, uSoft;
uniform float uBeam, uSize, uTop, uBottom, uPx, uPy, uPull;
// each letter's centre and half-width across the frame (0..1), so its face can be shaded as its own gentle curve
uniform vec2 uLetters[12];
uniform int uCount;
uniform vec3 uBeamCol, uWarm, uCool, uBg;
float m(vec2 uv){ return texture2D(uMask, uv).a; }
float h(vec2 uv){ return texture2D(uSoft, uv).a; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y;
  float a = m(uv);
  vec2 e = vec2(4.0) / uRes; // wide enough to step over the 8-bit banding of the softened mask
  vec2 g = vec2(h(uv + vec2(e.x, 0.0)) - h(uv - vec2(e.x, 0.0)), h(uv + vec2(0.0, e.y)) - h(uv - vec2(0.0, e.y)));
  float steep = length(g);
  // where on the word's height this point lies, 0 at the top of the letters and 1 at the bottom
  float y = clamp((uv.y - uTop) / (uBottom - uTop), 0.0, 1.0);
  float hh = h(uv);
  // the curved faces bend the light: near an edge the band is seen shifted, so it kinks across each letter's rim
  float yb = y - g.y * 3.0;
  // the band's height here, drawn toward the pointer where the pointer is near
  float near = exp(-pow((uv.x - uPx) / 0.16, 2.0)) * uPull;
  float beam = mix(uBeam, uPy, near);
  // each face bows outward across its width, like a flat pillow: the nearer this point is to its letter's left or
  // right side, the more the face turns away, and the reflected band spreads wider and a little brighter there
  float u = 0.0;
  for (int i = 0; i < 12; i++) {
    if (i >= uCount) break;
    float du = abs(uv.x - uLetters[i].x) / uLetters[i].y;
    if (du < 1.0) u = du;
  }
  // widening from the middle out, gently all the way, rather than all at once near the sides
  float spread = 1.0 + 1.25 * pow(u, 1.25);
  float d = (yb - beam) / spread;
  // frosted: the band is broad and soft, its colours spread wide and faint
  float core = exp(-pow(d / 0.095, 2.0));
  float warm = exp(-pow((d + 0.1) / 0.07, 2.0));
  float cool = exp(-pow((d - 0.1) / 0.07, 2.0));
  // what the polished face reflects, top to bottom: a dark sky, a bright soft band of light, a mid-grey floor
  // lightening toward the bottom edge. The band is where the light sits now (bent near the edges, drawn to the pointer).
  vec3 sky = vec3(0.07, 0.075, 0.085), floorC = mix(vec3(0.36, 0.365, 0.37), vec3(0.58, 0.58, 0.59), smoothstep(0.6, 1.0, y));
  vec3 body = mix(sky, floorC, smoothstep(beam - 0.02, beam + 0.12, yb));
  vec3 col = body + uBeamCol * core * 0.65 * (1.0 + 0.2 * u) + uWarm * warm * 0.25 + uCool * cool * 0.22;
  // at the letters' upright edges the band breaks into colour, warm one side and cool the other
  float side = smoothstep(0.03, 0.12, steep) * clamp(abs(g.x) * 25.0, 0.0, 1.0) * core;
  col += (g.x > 0.0 ? uCool : uWarm) * side * 0.6;
  // the narrow bevel: a crisp bright rim right at the edge, the light falling on its upper side
  float rim = smoothstep(0.06, 0.2, steep) * a;
  col += vec3(0.9, 0.92, 0.95) * rim * (0.1 + 0.22 * clamp(-g.y * 20.0, 0.0, 1.0));
  // a fine frost over the glass
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.02;
  col = mix(uBg, col, a);
  gl_FragColor = vec4(col, 1.0);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const mkTex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  const tMask = mkTex(0), tSoft = mkTex(1);
  gl.uniform1i(U("uMask"), 0); gl.uniform1i(U("uSoft"), 1);
  gl.uniform2f(U("uRes"), W, H);
  gl.viewport(0, 0, W, H);

  // ---- look, set from the page ----
  const look = { beam: [1, 0.98, 0.94], warm: [1, 0.72, 0.35], cool: [0.55, 0.7, 0.95], bg: [0.02, 0.02, 0.02] };
  window.refractLook = look;
  const ptr = { x: 0.5, y: 0.5, pull: 0, pullTo: 0 };
  addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width;
    const top = (baseline - size * 0.74 * SY) / H, bottom = (baseline + size * 0.02) / H;
    ptr.y = ((e.clientY - r.top) / r.height - top) / (bottom - top);
    ptr.pullTo = 1;
  });
  addEventListener("pointerleave", () => (ptr.pullTo = 0));

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    drawMask(t);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tMask); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tSoft); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, soft);
    // the band: one opening sweep from above the letters to their middle, then a slow drift up and down
    const open = Math.min(1, t / 6.9), beam = t < 6.9 ? -0.3 + 0.62 * (1 - Math.pow(1 - open, 3)) : 0.36 + 0.14 * Math.sin(((t - 6.9) / 13.2) * Math.PI * 2);
    ptr.pull += (ptr.pullTo - ptr.pull) * 0.08;
    gl.uniform1f(U("uBeam"), beam);
    gl.uniform1i(U("uCount"), Math.min(12, glyphs.length));
    gl.uniform2fv(U("uLetters"), new Float32Array(Array.from({ length: 12 }, (_, i) => glyphs[i] ? [(glyphs[i].x + glyphs[i].w / 2) / W, glyphs[i].w / 2 / W] : [0, 1]).flat()));
    gl.uniform1f(U("uTop"), (baseline - size * 0.74 * SY) / H);
    gl.uniform1f(U("uBottom"), (baseline + size * 0.02) / H);
    gl.uniform1f(U("uPx"), ptr.x); gl.uniform1f(U("uPy"), ptr.y); gl.uniform1f(U("uPull"), ptr.pull);
    gl.uniform3fv(U("uBeamCol"), look.beam); gl.uniform3fv(U("uWarm"), look.warm); gl.uniform3fv(U("uCool"), look.cool); gl.uniform3fv(U("uBg"), look.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  window.setWord = (w) => { word = (w.trim() || "FIREWORK").toUpperCase(); layout(); t0 = performance.now(); };
  window.replay = () => (t0 = performance.now());
  document.fonts.load(`100px ${FONT}`).then(() => { layout(); t0 = performance.now(); window.ready = true; requestAnimationFrame(frame); });
  cv.addEventListener("click", () => window.replay());
})();
