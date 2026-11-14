// The drops that become the app tile, as one signed-distance field: each drop is a soft, slightly lumpy ellipse
// stretched along its flight; drops join with a smooth union whose blend radius grows (a thin neck that thickens);
// each drop's shape morphs into its own corner region of the tile; at the end the field is pulled onto the exact
// rounded tile with a small overshoot. Rendered into a square canvas around the tile, alpha = coverage.
(function () {
  const S = 900;
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });

  const VS = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;
  const FS = `
precision highp float;
uniform vec4 uDrop[4];     // centre x, y, radius, stretch (canvas px, y down)
uniform vec4 uDropB[4];    // travel angle, lumpiness phase, morph to region 0..1, present 0/1
uniform vec4 uReg[4];      // region centre x, y, half width, half height
uniform vec4 uRegR[4];     // region corner radii: top-left, top-right, bottom-right, bottom-left
uniform vec4 uTile;        // tile centre x, y, half size, corner radius
uniform vec3 uMix;         // smooth-union radius, weight of the exact tile, colour gain
uniform vec3 uCol;

float smin(float a, float b, float k) { if (k <= 0.0) return min(a, b); float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// rounded box with a radius per corner (tl, tr, br, bl), y down
float sdBox4(vec2 p, vec2 b, vec4 r) {
  float rr = p.x < 0.0 ? (p.y < 0.0 ? r.x : r.w) : (p.y < 0.0 ? r.y : r.z);
  vec2 q = abs(p) - b + rr;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - rr;
}
float drop(int i, vec2 p) {
  vec4 A = uDrop[0], B = uDropB[0], G = uReg[0], R = uRegR[0];
  if (i == 1) { A = uDrop[1]; B = uDropB[1]; G = uReg[1]; R = uRegR[1]; }
  if (i == 2) { A = uDrop[2]; B = uDropB[2]; G = uReg[2]; R = uRegR[2]; }
  if (i == 3) { A = uDrop[3]; B = uDropB[3]; G = uReg[3]; R = uRegR[3]; }
  if (B.w < 0.5) return 1e5;
  vec2 d = p - A.xy;
  float c = cos(B.x), s = sin(B.x);
  vec2 l = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);             // along / across the flight
  vec2 ax = vec2(A.z * A.w, A.z / sqrt(A.w));
  float ang = atan(l.y, l.x);
  float lump = 1.0 + 0.07 * sin(3.0 * ang + B.y) + 0.04 * sin(5.0 * ang - 1.7 * B.y);
  float de = (length(l / (ax * lump)) - 1.0) * min(ax.x, ax.y);
  float dr = sdBox4(p - G.xy, G.zw, R);
  return mix(de, dr, B.z);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, ${S}.0 - gl_FragCoord.y);
  float d = drop(0, p);
  d = smin(d, drop(1, p), uMix.x);
  d = smin(d, drop(2, p), uMix.x);
  d = smin(d, drop(3, p), uMix.x);
  float t = sdBox4(p - uTile.xy, vec2(uTile.z), vec4(uTile.w));
  d = mix(d, t, uMix.y);
  float a = clamp(0.5 - d, 0.0, 1.0);
  gl_FragColor = vec4(uCol * a, a);
}`;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const k of ["uDrop", "uDropB", "uReg", "uRegR", "uTile", "uMix", "uCol"]) U[k] = gl.getUniformLocation(prog, k);

  // drops: [{x, y, r, stretch, angle, phase, morph, on}], regions: [{x, y, hw, hh, radii[4]}] in canvas px
  function render({ drops, regions, tile, k, tileW, color }) {
    gl.viewport(0, 0, S, S);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4fv(U.uDrop, new Float32Array(drops.flatMap((d) => [d.x, d.y, d.r, d.stretch])));
    gl.uniform4fv(U.uDropB, new Float32Array(drops.flatMap((d) => [d.angle, d.phase, d.morph, d.on ? 1 : 0])));
    gl.uniform4fv(U.uReg, new Float32Array(regions.flatMap((g) => [g.x, g.y, g.hw, g.hh])));
    gl.uniform4fv(U.uRegR, new Float32Array(regions.flatMap((g) => g.radii)));
    gl.uniform4f(U.uTile, tile.x, tile.y, tile.half, tile.r);
    gl.uniform3f(U.uMix, k, tileW, 1);
    gl.uniform3f(U.uCol, color[0], color[1], color[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return canvas;
  }
  window.IconGL = { render, S };
})();
