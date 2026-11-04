// A tree grown on a QR code: seen at an angle it is a tree, seen from straight above it is the code.
//
// Every module of the code is one cell of the ground. A light module stays bare stone with nothing above it;
// a dark module carries something coloured on top: inside the crown's footprint a column of leaves, outside it
// a tuft of grass (which is how the three corner squares turn into little hedges). From above, the tops of
// those columns and tufts are the dark modules; the gaps in the crown let the light stone show through.
// Seasons and leaf colours change only colours and the weather, never where anything stands, so every
// version is the same code.
import * as THREE from "three";

const params = new URLSearchParams(location.search);
const DEFAULT_URL = "https://github.com/firework-studio";

// ---------- seasons and leaf colours ----------
// A swatch becomes a whole family of leaf colours, from a pale tint to a deep tone, like real blossom or foliage
// (white-pink to deep pink). The code does not depend on them: it is read from the tiles that grow as the camera
// turns, and those take the deeper end of the family, kept at most TILE_L light so they read as dark modules.
const TILE_L = 0.46;
const SEASONS = {
  // mood: how light the leaf family runs; white: how far each leaf's edge fades towards white (blossom in spring);
  // grass: the cushions, deep enough to read as dark modules from above; blades: the lighter blades on top
  spring: { mood: "pastel", white: 0.35, glow: 0.0, flatten: 0.8, grass: ["#7cbc45", "#73b33e", "#86c44e"], blades: ["#aef04e", "#9ae63c", "#c6f474"], tips: 0, swatches: ["#ee6aa0", "#a77ad0", "#e26a6f", "#e0a43a", "#5f9ee0"], fall: 34, rain: false },
  summer: { butterflies: true, mood: "fresh", white: 0.04, glow: 0.08, flatten: 0, grass: ["#7cbc45", "#73b33e", "#86c44e"], blades: ["#aef04e", "#9ae63c", "#c6f474"], tips: 0, swatches: ["#4fa04a", "#3a9178", "#7aa83a", "#d6b02a", "#4a86d0"], fall: 8, rain: false },
  winter: { mood: "snow", white: 0.0, glow: 0.0, flatten: 0.25, snow: true, grass: ["#7cbc45", "#73b33e", "#86c44e"], blades: ["#aef04e", "#9ae63c", "#c6f474"], tips: 0, swatches: ["#3f86d0", "#2f6fae", "#4b9ad6", "#5a7fc6", "#3a98b6"], fall: 0, rain: false, snowing: true }, // snow: a blanket on each pad; snowing: snow falls
  autumn: { mood: "warm", white: 0.12, glow: 0.12, flatten: 0, grass: ["#7cbc45", "#73b33e", "#86c44e"], blades: ["#aef04e", "#9ae63c", "#c6f474"], tips: 0, swatches: ["#d4621f", "#c43e2f", "#d99a1f", "#a8552c", "#8a9a2c"], fall: 26, rain: true },
};
// light modules are pale stone; the stone under dark modules is a shade deeper, so the code shows faintly in the ground
const STONE = ["#f6f4f0", "#f1efea", "#f8f7f3"];
const STONE_DARK = ["#dedad3", "#d7d3cb", "#e2ded8"];
const BARK = ["#6e4326", "#5c371f", "#7b4c2c", "#4f2f1a"];

// winter leaf tones by swatch: [hue, saturation, lightness shift]
const WINTER_LEAF = [[0.4, 0.42, 0], [0.5, 0.36, 0.02], [0.33, 0.4, -0.02], [0.45, 0.3, 0.06], [0.43, 0.5, -0.04]];
function palette(hex, mood) {
  const base = new THREE.Color(hex), hsl = {};
  base.getHSL(hsl);
  // eight tones, lightest first: the pale ones a touch warmer and softer, the deep ones fuller
  // warm colours (reds, oranges, yellows) lighten towards gold, as autumn leaves do; others towards a soft tint
  const warm = hsl.h < 0.16 || hsl.h > 0.93;
  const tones = {
    pastel: [0.93, 0.915, 0.905, 0.89, 0.875, 0.86, 0.845, 0.83],
    fresh: [0.62, 0.58, 0.54, 0.5, 0.46, 0.43, 0.4, 0.37],
    warm: [0.72, 0.67, 0.62, 0.57, 0.52, 0.47, 0.42, 0.37],
    snow: [0.5, 0.46, 0.43, 0.4, 0.37, 0.34, 0.31, 0.28],
  }[mood];
  const leaf = tones.map((l, i) => {
    const k = i / 7;
    // autumn leaves are never one colour: every other tone leans to gold, the rest stay with the swatch
    const gold = mood === "warm" && i % 2 === 0 ? 0.055 : 0;
    // pastel blossom, measured from the original: white touched with a cool pink (leaning a little to the blue side
    // of its swatch), the palest tones the most washed with white. Set in sRGB, as the eye sees it.
    // winter: evergreen leaves, each swatch its own conifer (pine, blue spruce, fir, juniper, sea pine), while the
    // swatch's ice blue colours the code
    if (mood === "snow") {
      const [h, sat, dl] = WINTER_LEAF[app.swatch] || WINTER_LEAF[0];
      return new THREE.Color().setHSL(h, sat + 0.12 * k, l + dl, THREE.SRGBColorSpace);
    }
    if (mood === "pastel") return new THREE.Color().setHSL((hsl.h - 0.025 + 1) % 1, Math.min(1, hsl.s * (0.55 + 0.55 * k)), l, THREE.SRGBColorSpace);
    return new THREE.Color().setHSL((hsl.h + gold + (1 - k) * (warm ? 0.03 : 0.016) + 1) % 1, Math.min(1, hsl.s * ((warm ? 0.95 : 0.66) + 0.12 * k)), l);
  });
  const tile = [0.44, 0.4, 0.36].map((l) => new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.min(TILE_L, l)));
  return { leaf, tile };
}

// ---------- state ----------
const app = {
  url: params.get("u") || DEFAULT_URL,
  season: params.get("season") || "autumn",
  swatch: 0,
  view: params.get("view") === "top" ? 1 : 0,
};

// ---------- renderer and lights ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // blurred shadow edges, in keeping with the soft light
document.getElementById("stage").appendChild(renderer.domElement);
const scene = new THREE.Scene();
// the page behind the canvas carries a soft radial light; the scene itself is see-through
scene.background = null;
// soft light: mostly an even sky, so nothing goes dark; only a gentle key and a warm rim on top
const HEMI = 2.35; // the sky light on the code, which is lit evenly for scanning
const hemi = new THREE.HemisphereLight("#fffbf5", "#e6ded3", HEMI);
scene.add(hemi);
// a warm light from behind, so leaf edges and the trunk's far side catch a rim of glow
const rim = new THREE.DirectionalLight("#ffd2a0", 0.45);
rim.position.set(-12, 9, -15);
scene.add(rim);
const sun = new THREE.DirectionalLight("#fffaf0", 0.5);
sun.position.set(-8, 10, 12); // from the front left, so the tops stay a touch darker than the sunlit sides
scene.add(sun);

// ---------- the sun ----------
// A small voxel sun over the tree, somewhere else each season: spring is a morning sun low on the right, summer
// stands high at noon, and autumn's rain and winter's snow fall from an overcast sky, so the sun sinks to the left and fades. The sun's light
// is the only one that casts shadows. On a change of season it travels along its arc to the new place, and the
// tree's shadow turns and stretches with it. It fades out as the camera turns to the code.
// arc: where it sits on its arc over the tree, in radians from the right of the screen (pi/2 is straight above);
// elev: its height in the sky; key: its strength; hemi: the sky light alongside it; blob: the soft patch of shade
// under the tree, which carries the grounding when there is no sun
const LIGHTS = {
  spring: { arc: 0.6, elev: 0.6, key: 1.15, hemi: 1.85, color: "#ffeedd", show: 1, blob: 0.3 },
  summer: { arc: 1.62, elev: 1.3, key: 1.2, hemi: 1.8, color: "#fffaf0", show: 1, blob: 0.2 },
  autumn: { arc: 2.85, elev: 0.12, key: 0, hemi: HEMI, color: "#ffe2b8", show: 0, blob: 1 },
  winter: { arc: 2.85, elev: 0.12, key: 0, hemi: HEMI, color: "#e8f0ff", show: 0, blob: 1 }, // snowing: overcast, as autumn's rain
};
const lightNow = (() => {
  const l = LIGHTS[app.season];
  return { arc: l.arc, elev: l.elev, key: l.key, hemi: l.hemi, show: l.show, blob: l.blob, color: new THREE.Color(l.color) };
})();
const key = new THREE.DirectionalLight("#ffffff", 0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 });
key.shadow.radius = 7;
key.shadow.blurSamples = 16;
key.shadow.bias = -0.0006;
key.target.position.set(0, 4, 0);
scene.add(key, key.target);

const sunGroup = (() => {
  const g = new THREE.Group(), box = new THREE.BoxGeometry(1, 1, 1);
  const glowTex = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const c = cv.getContext("2d"), grd = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,222,140,0.55)");
    grd.addColorStop(0.45, "rgba(255,214,130,0.18)");
    grd.addColorStop(1, "rgba(255,214,130,0)");
    c.fillStyle = grd;
    c.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false }));
  glow.scale.setScalar(9);
  const core = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: "#ffcf5c", transparent: true, depthTest: false }));
  core.scale.setScalar(1.7);
  core.rotation.set(0.6, 0.75, 0);
  const rays = new THREE.Group();
  const rayMat = new THREE.MeshBasicMaterial({ color: "#ffdc84", transparent: true, depthTest: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, r = new THREE.Mesh(box, rayMat);
    r.scale.set(0.34, 0.75, 0.34);
    r.position.set(Math.cos(a) * 2.05, Math.sin(a) * 2.05, 0);
    r.rotation.z = a - Math.PI / 2;
    rays.add(r);
  }
  g.add(glow, rays, core);
  g.renderOrder = 10;
  g.traverse((o) => (o.renderOrder = 10));
  g.userData = { core, rays, mats: [glow.material, core.material, rayMat] };
  scene.add(g);
  return g;
})();

// ease the light towards the season's, so a change of season is a short journey of the sun rather than a jump
function stepLight(dt) {
  const target = LIGHTS[app.season], f = 1 - Math.exp(-dt * 2.6);
  for (const k of ["arc", "elev", "key", "hemi", "show", "blob"]) lightNow[k] += (target[k] - lightNow[k]) * f;
  lightNow.color.lerp(new THREE.Color(target.color), f);
}
// u: 0 on the tree, 1 on the code
function placeLight(u, t) {
  const g = 1 - u, L = lightNow;
  hemi.intensity = HEMI + (L.hemi - HEMI) * g;
  key.intensity = L.key * g;
  key.color.copy(L.color);
  // the light's direction follows the sun's place on screen: across the view from right to left, and away from
  // the camera as it climbs, so a sun high on the screen stands behind the tree and throws its shadow forwards
  const right = new THREE.Vector3(1, 0, -1).normalize(), away = new THREE.Vector3(-1, 0, -1).normalize();
  const dir = right.multiplyScalar(Math.cos(L.arc)).addScaledVector(away, Math.sin(L.arc)).normalize();
  dir.multiplyScalar(Math.cos(L.elev)).add(new THREE.Vector3(0, Math.sin(L.elev), 0));
  key.position.copy(key.target.position).addScaledVector(dir, 80);
  // the sun itself, on an arc over the tree in screen space
  const show = L.show * g;
  sunGroup.visible = show > 0.01;
  if (!sunGroup.visible) return;
  const h = camera.top - camera.bottom;
  const x = Math.cos(L.arc) * h * 0.52, y = -h * 0.04 + Math.sin(L.arc) * h * 0.4 - (1 - L.show) * h * 0.12;
  const qr = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), qu = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  sunGroup.position.copy(camera.position).addScaledVector(fwd, 30).addScaledVector(qr, x).addScaledVector(qu, y);
  sunGroup.quaternion.copy(camera.quaternion);
  sunGroup.scale.setScalar(0.6 + 0.4 * show);
  sunGroup.userData.rays.rotation.z = t * 0.18;
  sunGroup.userData.core.rotation.y = 0.75 + t * 0.3;
  sunGroup.userData.mats.forEach((m) => (m.opacity = show));
}

// ---------- shared geometry ----------
const box = new THREE.BoxGeometry(1, 1, 1);
// a soft maple leaf, one unit across: five rounded lobes and a notch at the stem, cupped along its midrib with the
// tip drooping, and shaded from a deeper base to a lighter tip so it reads as a leaf rather than a cut-out card
const LEAF = (() => {
  // built as rings from the centre out, so the curl and the shading run smoothly across the whole blade
  const SECT = 72, RINGS = 5, rOf = (phi) => 0.5 * (0.58 + 0.42 * Math.pow(Math.abs(Math.cos(2.5 * phi)), 0.75));
  const v = [0, 0, 0], idx = [];
  for (let j = 1; j <= RINGS; j++) for (let i = 0; i < SECT; i++) {
    const th = (i / SECT) * Math.PI * 2, r = rOf(th - Math.PI / 2) * (j / RINGS);
    v.push(Math.cos(th) * r, 0, -Math.sin(th) * r); // flat, normal up; the tip points to -z
  }
  const at = (j, i) => (j === 0 ? 0 : 1 + (j - 1) * SECT + (i % SECT));
  for (let i = 0; i < SECT; i++) idx.push(0, at(1, i), at(1, i + 1));
  for (let j = 1; j < RINGS; j++) for (let i = 0; i < SECT; i++) idx.push(at(j, i), at(j + 1, i), at(j + 1, i + 1), at(j, i), at(j + 1, i + 1), at(j, i + 1));
  const col = [];
  for (let k = 0; k < v.length; k += 3) {
    const x = v[k], z = v[k + 2], tip = Math.max(0, -z), rr = Math.hypot(x, z);
    v[k + 1] = -0.26 * x * x - 0.18 * tip * tip + 0.03 * Math.cos(rr * 9); // cupped, drooping, a faint ripple of veins
    const f = 0.9 + 0.16 * Math.min(1, Math.max(0, 0.5 - z)); // a little deeper at the stem, lighter at the tip
    col.push(f, f, f);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  // 0 at the heart of the leaf, 1 at its edge: how far towards white the material may take that point
  const petal = [];
  for (let k = 0; k < v.length; k += 3) petal.push(Math.pow(Math.min(1, Math.hypot(v[k], v[k + 2]) * 2.1), 2.2));
  g.setAttribute("petal", new THREE.Float32BufferAttribute(petal, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
})();
// leaves fade from their own colour at the heart to near white at the edge, by a season's amount: white-edged
// pink blossom in spring, barely at all for summer and autumn leaves
const leafMaterial = (() => {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true });
  m.uniforms = { white: { value: 0 }, glow: { value: 0 }, flatten: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.white = m.uniforms.white;
    sh.uniforms.glow = m.uniforms.glow;
    sh.uniforms.flatten = m.uniforms.flatten;
    sh.vertexShader = "attribute float petal;\nvarying float vPetal;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPetal = petal;");
    // glow: sunlight coming through the thin blade, strongest at the edge where it is thinnest
    // flatten: how far the light's shading is evened out, for blossom that reads as thin, lit petals rather than solid
    sh.fragmentShader = "uniform float white;\nuniform float glow;\nuniform float flatten;\nvarying float vPetal;\n" + sh.fragmentShader
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.965, 0.975), vPetal * white);")
      .replace("#include <opaque_fragment>", "outgoingLight = mix(outgoingLight, diffuseColor.rgb, flatten);\n#include <opaque_fragment>")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * glow * (0.55 + 0.45 * vPetal);");
  };
  return m;
})();

// ---------- smooth wood ----------
// A tube swept along a curve with a radius that changes along it; the bark is coloured in streaks running with the
// grain. Every piece of wood is appended to one geometry, so the trunk, roots and limbs are a single smooth mesh.
function sweep(acc, path, radius, segs, radial, bark) {
  const base = acc.pos.length / 3, up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0);
  const dark = new THREE.Color(bark[3]), light = new THREE.Color(bark[2]), mid = new THREE.Color(bark[0]), c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = path(t), q = path(Math.min(1, t + 0.01)), q0 = path(Math.max(0, t - 0.01));
    const T = new THREE.Vector3().subVectors(q, q0).normalize();
    const Nn = new THREE.Vector3().crossVectors(T, Math.abs(T.y) > 0.9 ? side : up).normalize();
    const B = new THREE.Vector3().crossVectors(T, Nn);
    const r = radius(t);
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2, n = Nn.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      acc.pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      const streak = 0.5 + 0.5 * Math.sin(a * 5 + t * 4 + Math.sin(a * 3) * 1.5);
      c.copy(mid).lerp(streak > 0.5 ? light : dark, Math.abs(streak - 0.5) * 1.2);
      acc.col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) {
    const a = base + i * (radial + 1) + k, b = a + radial + 1;
    acc.idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
}
const bezier = (a, b, c, d) => (t) => new THREE.Vector3().addScaledVector(a, (1 - t) ** 3).addScaledVector(b, 3 * (1 - t) ** 2 * t).addScaledVector(c, 3 * (1 - t) * t * t).addScaledVector(d, t ** 3);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8); // unit-radius, unit-height, along y
// a blade of grass, one unit tall: broad at the base, tapering to a point, folded a little along its middle so it
// catches the light on two faces; shaded from a deep base to a bright tip
const BLADE = (() => {
  const w = 0.2, fold = 0.07;
  const v = [-w, 0, 0, 0, 0, fold, w, 0, 0, -w * 0.55, 0.5, 0, 0, 0.5, fold * 0.6, w * 0.55, 0.5, 0, 0, 1, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  const col = [];
  for (let k = 1; k < v.length; k += 3) { const f = 0.66 + 0.34 * v[k]; col.push(f, f, f); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 3, 4, 6, 4, 5, 6]);
  g.computeVertexNormals();
  return g;
})();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

// ---------- the world, rebuilt whenever the link, the season or the colour changes ----------
const QUIET = 2; // light border cells round the code
let world = null, N = 25;
let leaves = null;   // { mesh, items: [{ pos, quat, scale, phase, sway }] } swaying in the wind
let falling = null;  // { mesh, items } leaves (or petals) that drop, rest a while and come again
let rain = null;     // { mesh, drops, material }
let builtAt = -99; // when the season last changed, for the snow settling onto a new winter tree
let builtSeason = null;
let flies = [];      // summer: butterflies, [{ group, wings: [l, r], path }]
let crownTops = [];  // where falling leaves start: [x, y, z]
let branches = null; // { mesh }: the wood, one mesh placed at the root
let grassBlades = null; // { mesh, items, at }: the grass blades, drawn in for the code
let grassMats = [];  // [{ mat, base, deep }]: grass may be lighter on the tree than the code can read, so it deepens

function build() {
  if (world) {
    scene.remove(world);
    world.traverse((o) => { if (o.isMesh && o.material !== leafMaterial) o.material.dispose(); });
  }
  world = new THREE.Group();
  scene.add(world);
  branches = null;

  const qr = qrcode(0, "H"); // highest error correction: a stray leaf over a light module is forgiven
  qr.addData(app.url);
  qr.make();
  N = qr.getModuleCount();
  const dark = (r, c) => r >= 0 && c >= 0 && r < N && c < N && qr.isDark(r, c);
  const cellX = (c) => c - N / 2 + 0.5, cellZ = (r) => r - N / 2 + 0.5;

  // the same link always grows the same tree: the shape comes from a random seeded by the link alone
  let seed = 0;
  for (const ch of app.url) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const season = SEASONS[app.season];
  const pal = palette(season.swatches[app.swatch], season.mood);
  leafMaterial.uniforms.white.value = season.white;
  leafMaterial.uniforms.glow.value = season.glow;
  leafMaterial.uniforms.flatten.value = season.flatten;

  const leafColors = pal.leaf;
  // light from above: leaves on top of a pad come from the pale end, leaves inside and underneath from the deep end
  // colour comes in broad, soft patches over the tree (as light falls on a canopy), not a different colour per leaf:
  // a slow field across the tree picks the tone, with only a small nudge per leaf
  const field = (x, y, z) => 0.5 + 0.25 * Math.sin(x * 0.33 + z * 0.21 + spin) + 0.25 * Math.sin(z * 0.29 - x * 0.17 + y * 0.35);
  const toneAt = (x, y, z, lo, hi) => leafColors[Math.max(lo, Math.min(hi, Math.round(lo + field(x, y, z) * (hi - lo) + (rand() - 0.5) * 1.2)))];
  // blossom, as in the original: about three in four flowers near white, one in four a soft pink, mixed through
  // the tree rather than in patches
  const blossom = () => leafColors[rand() < 0.36 ? 5 + Math.floor(rand() * 3) : Math.floor(rand() * 4)];
  const pastel = season.mood === "pastel";
  const topColor = (x, y, z) => (pastel ? blossom() : toneAt(x, y, z, 0, 4));
  const innerColor = (x, y, z) => (pastel ? blossom() : toneAt(x, y, z, 3, 7));

  // boxes and cylinders are batched by colour and drawn as instanced meshes
  const batches = new Map();
  const add = (geo, color, matrix) => {
    const k = geo.uuid + color;
    if (!batches.has(k)) batches.set(k, { geo, color, list: [] });
    batches.get(k).list.push(matrix);
  };
  const S = new THREE.Vector3(), P = new THREE.Vector3(), I = new THREE.Quaternion();
  const voxel = (color, x, y, z, sx, sy, sz) => add(box, color, new THREE.Matrix4().compose(P.set(x, y, z), I, S.set(sx, sy, sz)));
  // a cylinder from a to b of radius r
  const limb = (color, a, b, r) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    add(CYL, color, new THREE.Matrix4().compose(P.copy(a).lerp(b, 0.5), q, S.set(r, len, r)));
  };

  // ---- ground: one stone slab per cell, the quiet zone included ----
  const SLAB = 0.6;
  for (let r = -QUIET; r < N + QUIET; r++) for (let c = -QUIET; c < N + QUIET; c++) voxel(pick(dark(r, c) ? STONE_DARK : STONE), cellX(c), -SLAB / 2, cellZ(r), 1, SLAB, 1);

  // ---- the tree, shaped like a bonsai: an S-curved trunk and flat pads of leaves stacked to one side and the other ----
  // Its shape is free: as the camera turns to the code the leaves draw in, the trunk and limbs fold down into the
  // root, and only the tiles are left, one on every dark cell under a pad, at that pad's height. Dark cells that no
  // pad covers grow grass, so from above every dark module is leaf or grass and every light one is bare stone.
  const R = N * 0.38;
  const inFinder = (r, c) => (r < 9 && c < 9) || (r < 9 && c >= N - 9) || (r >= N - 9 && c < 9);
  const Y = new THREE.Vector3(0, 1, 0);
  const spin = rand() * Math.PI * 2; // the whole tree turns with the link, so different links give different trees
  const turnXZ = (x, z) => [x * Math.cos(spin) - z * Math.sin(spin), x * Math.sin(spin) + z * Math.cos(spin)];

  // the trunk's line: a cubic curve that rises straight out of a root at the code's centre (so it stands on its
  // roots), leans out, then comes back over the middle
  const pt = (x, y, z) => { const [a, b] = turnXZ(x, z); return new THREE.Vector3(a, y, b); };
  const C0 = pt(0, 0, 0), C1 = pt(-R * 0.14, 9.5, R * 0.07), C2 = pt(R * 0.4, 18.5, -R * 0.15), C3 = pt(R * 0.02, 27, 0);
  const spine = (t) => new THREE.Vector3()
    .addScaledVector(C0, (1 - t) ** 3).addScaledVector(C1, 3 * (1 - t) ** 2 * t).addScaledVector(C2, 3 * (1 - t) * t * t).addScaledVector(C3, t ** 3);
  const root = C0.clone();

  // The clearing is the tree's shade: the bare round patch under the canopy, its edge the drip line. Five shelves
  // wind up the trunk, each turned 144 degrees from the one below, so neighbours always lean to opposite sides;
  // every shelf reaches out to the drip line and stops there, and the crown covers the middle. Seen from above they
  // fill the round clearing exactly; seen from the side they are thin shelves with air between them.
  const scale = N / 33, RIM = R * 0.95; // RIM: the clearing's radius, which is also the canopy's reach
  const PADS = [0.2, 0.34, 0.48, 0.62, 0.76].map((t, i) => {
    const a = spin + ((160 + 144 * i) * Math.PI) / 180, rx = 4.5 * scale, rz = 7.6 * scale, reach = RIM - rx - 0.3;
    const at = spine(t);
    return { t, dist: reach, lift: 0.5, rx, rz, thick: 1.25, base: at, x: Math.cos(a) * reach, z: Math.sin(a) * reach, y: at.y + 0.5, yaw: a };
  });
  {
    const at = spine(1);
    PADS.push({ t: 1, dist: 0, lift: 1, rx: 6.6 * scale, rz: 6.6 * scale, thick: 1.8, base: at, x: at.x, z: at.z, y: at.y + 1, yaw: 0 });
  }
  // where a cell sits in a pad: 0 at its centre, 1 at its rim (null outside)
  const inPad = (p, x, z) => {
    const dx = x - p.x, dz = z - p.z, c = Math.cos(-p.yaw), s = Math.sin(-p.yaw);
    const u = (dx * c - dz * s) / p.rx, v = (dx * s + dz * c) / p.rz, d = Math.hypot(u, v);
    return d < 1 ? d : null;
  };

  const leafItems = [], tiles = [];
  // out: the direction (an angle in the ground plane) the leaf opens towards, or null for any direction
  const leaf = (x, y, z, size, tilt, color, sway, out = null) => {
    const q = new THREE.Quaternion().setFromAxisAngle(Y, rand() * Math.PI * 2);
    const a = out === null ? rand() * Math.PI * 2 : out + (rand() - 0.5) * 0.8;
    const axis = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)); // turning about this lifts the leaf's far side towards a
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, tilt));
    leafItems.push({ pos: new THREE.Vector3(x, y, z), quat: q, scale: size, color, phase: rand() * Math.PI * 2, sway, far: Math.hypot(x, z) / R });
  };
  crownTops = [];
  const inCrown = new Set();
  const voxels = []; // the block tree: [{ pos, color, tile (its cell's tile, or -1), top (the cell's highest cube), seed }]
  // the clearing under the tree, where no grass grows: the round patch the canopy shades, out to the drip line; the
  // odd cell at its rim that no leaves reach grows grass
  const centre = new THREE.Vector3(0, 0, 0); // the clearing and the tile ripple are both centred on the root
  const inClearing = (x, z) => Math.hypot(x - centre.x, z - centre.z) < RIM;
  for (let r = -QUIET; r < N + QUIET; r++) for (let c = -QUIET; c < N + QUIET; c++) {
    const x = cellX(c), z = cellZ(r);
    let top = null, bot = Infinity; // the highest and lowest leaves over this cell
    const vox = []; // this cell's cubes in the block tree: [y, colour], stacked through each pad over it
    const caps = []; // the colours of the leaves on top of this cell, which its tile starts from
    for (const p of PADS) {
      const d = inPad(p, x, z);
      if (d === null) continue;
      // a pad is a cushion: domed on top, nearly flat underneath, its rim rounded off with tipped leaves
      const dome = Math.sqrt(1 - d * d), yTop = p.y + p.thick * (0.35 + 0.65 * dome), yBot = p.y - p.thick * 0.25 * dome;
      const sway = Math.min(1, 0.35 + 0.5 * d + p.t * 0.3);
      // big leaves, few of them, each one readable on its own: one on top of most cells, lying open to the sky,
      // and a loose filling underneath; at the rim they tip outwards, so the pad's edge is a fringe of leaf shapes
      const col = topColor(x, yTop, z);
      caps.push(col);
      const out = Math.atan2(z - p.z, x - p.x);
      if (rand() < 0.62) leaf(x + (rand() - 0.5) * 0.8, yTop + rand() * 0.3, z + (rand() - 0.5) * 0.8, 1.75 + rand() * 0.45, d > 0.75 ? 0.25 + rand() * 0.3 : rand() * 0.25, col, sway, d > 0.75 ? out : null);
      for (let y = yTop - 0.8; y > yBot - 0.2; y -= 0.9) {
        if (rand() < 0.4) leaf(x + (rand() - 0.5) * 0.8, y, z + (rand() - 0.5) * 0.8, 1.55 + rand() * 0.4, 0.2 + rand() * 0.35, innerColor(x, y, z), sway, out);
      }
      top = Math.max(top ?? -1, yTop);
      bot = Math.min(bot, yBot);
      // the block tree: a stack of cubes at this cell, from the pad's top down through a body of blocks, deepest in
      // the middle of the pad and shallow at its rim, ragged underneath, so each pad becomes a solid mass of 3D
      // blocks with depth rather than a skin; each cube the colour of the leaves there, deeper further in
      const vTop = Math.round(yTop - 0.5), depth = Math.max(1, Math.round(1 + 4 * dome + rand() * 1.5));
      for (let y = vTop; y > vTop - depth && y >= 0; y--) {
        const inside = (vTop - y) / depth;
        vox.push([y, (y === vTop ? col : innerColor(x, y, z)).clone().offsetHSL(0, 0.03 * inside, (rand() - 0.5) * 0.08 - 0.1 * inside)]);
      }
      if (rand() < 0.35) crownTops.push([x, yTop, z]);
    }
    // the code's tile for this cell: every dark module in the clearing with leaves over it gets one. A tile starts
    // as the colour of those leaves and deepens to the same hue made just dark enough to read.
    const isTile = dark(r, c) && !inFinder(r, c) && inClearing(x, z) && top !== null;
    const vTop = vox.reduce((a, v) => Math.max(a, v[0]), -Infinity);
    // cubes stand only over the code's dark modules, so the block tree has the code's gaps in it from the start
    if (isTile) vox.forEach(([y, color]) => voxels.push({ pos: new THREE.Vector3(x, y + 0.5, z), color, tile: tiles.length, top: y === vTop, seed: rand() }));
    if (isTile) {
      // a pillar takes the colour of the topmost leaves over it, the ones seen from above, a touch lighter or deeper
      // than its neighbours; mixing all the layers would muddy autumn's gold and orange into brown
      const from = caps[caps.length - 1].clone().offsetHSL(0, 0.04, (rand() - 0.5) * 0.09);
      const hsl = {};
      from.getHSL(hsl);
      // deepened, a colour keeps its richness: fuller saturation as it darkens. Gold deepens towards orange rather
      // than olive, and blossom back towards its swatch's pink rather than magenta.
      const ts = Math.min(1, Math.max(hsl.s * 1.3, 0.6));
      if (season.mood === "pastel") hsl.h = (hsl.h + 0.03) % 1;
      const to = new THREE.Color().setHSL(hsl.h, ts, Math.min(TILE_L, hsl.l));
      // autumn: orange, red and gold, as the original's tiles
      if (season.mood === "warm") to.set(["#c9541c", "#b5361f", "#c2801a"][Math.floor(rand() * 3)]).getHSL(hsl);
      // winter: ice blue, from the swatch, a little lighter or deeper from module to module
      if (season.mood === "snow") to.set(season.swatches[app.swatch]).offsetHSL(0, 0, (rand() - 0.5) * 0.08).getHSL(hsl);
      // yellows read lighter than their lightness says: deepen until the tile is dark enough for a scanner
      for (let l = Math.min(TILE_L, hsl.l); 0.2126 * to.r + 0.7152 * to.g + 0.0722 * to.b > 0.2 && l > 0.2; l -= 0.02) to.setHSL(hsl.h, ts, l);
      const far = Math.hypot(x - centre.x, z - centre.z) / R;
      tiles.push({ pos: new THREE.Vector3(x, 0, z), from, to, far });
      inCrown.add(r * N + c);
    }
  }
  if (!crownTops.length) crownTops.push([0, 10, 0]);

  // the leaves are one instanced mesh with a colour per leaf, so each can sway on its own
  const leafMesh = new THREE.InstancedMesh(LEAF, leafMaterial, leafItems.length);
  leafItems.forEach((it, i) => {
    leafMesh.setMatrixAt(i, new THREE.Matrix4().compose(it.pos, it.quat, S.setScalar(it.scale)));
    leafMesh.setColorAt(i, it.color);
  });
  world.add(leafMesh);
  // winter: a blanket of snow on each pad, one soft surface laid over the top of the leaves. Its thickness comes
  // from slow drifts across the tree, deepest in the middle of the pad and thinning to nothing well short of its
  // rim, with a gentle lumpiness; where it runs out it dips down among the leaves, so its edge is ragged and soft.
  const snowMeshes = [];
  if (season.snow) for (const p of PADS) {
    const STEP = 0.32, ext = Math.max(p.rx, p.rz), n = Math.ceil((2 * ext) / STEP) + 1;
    const pos = [], idx = [], keep = [];
    const at = (i, j) => i * n + j;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const lx = -ext + i * STEP, lz = -ext + j * STEP, x = p.x + lx, z = p.z + lz;
      const d = inPad(p, x, z), dd = d === null ? 1.2 : d;
      const drift = Math.sin(x * 0.42 + z * 0.19 + spin) + Math.sin(z * 0.37 - x * 0.17 + 1.3) + 0.5 * Math.sin(x * 1.3 + z * 1.1);
      const lump = 0.1 * Math.sin(x * 1.9 + z * 1.4) + 0.08 * Math.sin(z * 2.4 - x * 1.6 + 0.7);
      const h = 0.95 * Math.max(0, 1 - Math.pow(dd / 0.84, 2.4)) * smooth((drift + 0.6) / 1.4) + (dd < 0.8 ? lump : 0);
      const dome = Math.sqrt(Math.max(0, 1 - Math.min(1, dd) ** 2)), yTop = p.y + p.thick * (0.35 + 0.65 * dome);
      pos.push(lx, h > 0.04 ? yTop + 0.3 + h : yTop - 0.2, lz);
      keep.push(h > 0.04);
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), e = at(i, j + 1);
      if (keep[a] || keep[b] || keep[c]) idx.push(a, e, b, b, e, c);
      else if (keep[e]) idx.push(a, e, b, b, e, c);
    }
    if (!idx.length) continue;
    const ig = new THREE.BufferGeometry();
    ig.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    ig.setIndex(idx);
    ig.computeVertexNormals();
    // the whole blanket of each pad falls out of the sky as one soft mass, full depth, and settles onto the
    // leaves with a little give; the crown's lands first, then each pad below in turn
    const g = ig.toNonIndexed(), land = new Float32Array(g.attributes.position.count).fill(0.05 + 0.3 * (1 - p.t));
    g.setAttribute("land", new THREE.BufferAttribute(land, 1));
    const mat = new THREE.MeshLambertMaterial({ color: "#f3f6fc", emissive: "#24272e", side: THREE.DoubleSide, transparent: true });
    mat.userData.since = { value: 99 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.since = mat.userData.since;
      // the snow drops in quickly, just as the season changes, fading in on the way down, and gives a little as it lands
      sh.vertexShader = "attribute float land;\nuniform float since;\nvarying float vIn;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat k = clamp((since - land) / 0.42, 0.0, 1.0);\nvIn = k;\nfloat b = clamp((since - land - 0.42) / 0.25, 0.0, 1.0);\ntransformed.y += 9.0 * pow(1.0 - k, 2.0) - 0.18 * sin(3.14159 * b);");
      sh.fragmentShader = "varying float vIn;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\nif (vIn <= 0.0) discard;\ndiffuseColor.a *= smoothstep(0.0, 0.35, vIn);");
    };
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(p.x, 0, p.z);
    mesh.userData.far = Math.hypot(p.x, p.z) / R;
    world.add(mesh);
    snowMeshes.push(mesh);
  }
  // leaves lying under the tree, in small drifts with a few strays between them: deep ones in the shade near the
  // trunk, pale ones out towards the drip line where the light reaches, so the ground has its own light and dark.
  // They go when the tree turns into the code.
  const groundItems = [];
  const drop = (x, z, size) => {
    const r = Math.hypot(x, z) / RIM, i = groundItems.length;
    if (r > 0.98 || r < 0.1) return;
    const tone = Math.max(0, Math.min(7, Math.round(7 - r * 7 + (rand() - 0.5) * 3)));
    const q = new THREE.Quaternion().setFromAxisAngle(Y, rand() * Math.PI * 2);
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).normalize(), rand() * 0.25));
    groundItems.push({ pos: new THREE.Vector3(x, 0.04 + i * 0.0025, z), quat: q, scale: size, color: leafColors[tone] });
  };
  for (let k = 0; k < 7; k++) {
    const a = rand() * Math.PI * 2, d = RIM * (0.3 + rand() * 0.6), n = 3 + Math.floor(rand() * 5);
    for (let j = 0; j < n; j++) drop(Math.cos(a) * d + (rand() - 0.5) * 2.4, Math.sin(a) * d + (rand() - 0.5) * 2.4, 0.75 + rand() * 0.6);
  }
  for (let k = 0; k < 10; k++) {
    const a = rand() * Math.PI * 2, d = RIM * (0.2 + rand() * 0.75);
    drop(Math.cos(a) * d, Math.sin(a) * d, 0.8 + rand() * 0.45);
  }
  const groundMesh = new THREE.InstancedMesh(LEAF, leafMaterial, groundItems.length);
  groundItems.forEach((it, i) => groundMesh.setColorAt(i, it.color));
  world.add(groundMesh);
  // cubes: the top face carries the full colour (it is what the code is read from), each side face a different
  // shade and the underside deepest, so a stack of them reads as 3D blocks
  const pillar = box.clone();
  pillar.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: pillar.attributes.position.count }, (_, i) => {
    const ny = pillar.attributes.normal.getY(i), y = pillar.attributes.position.getY(i), nx = Math.abs(pillar.attributes.normal.getX(i)), f = ny > 0.5 ? 1 : ny < -0.5 ? 0.5 : nx > 0.5 ? 0.8 : 0.66;
    return [f, f, f];
  }).flat(), 3));
  const tileMesh = new THREE.InstancedMesh(pillar, new THREE.MeshLambertMaterial({ vertexColors: true }), tiles.length);
  tiles.forEach((it, i) => tileMesh.setColorAt(i, it.to));
  tileMesh.visible = false; // the code is read from the block tree's cubes; the tiles keep the colours it deepens to
  world.add(tileMesh);

  // a soft shadow under the tree, so it stands on the ground; it fades as the tree folds away
  const shadowTex = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const g = cv.getContext("2d"), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(70,50,35,0.32)");
    grd.addColorStop(0.55, "rgba(70,50,35,0.14)");
    grd.addColorStop(1, "rgba(70,50,35,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.6, R * 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  const mid = spine(0.6);
  shadow.position.set(mid.x * 0.4, 0.02, mid.z * 0.4);
  world.add(shadow);
  leaves = { snowMeshes, mesh: leafMesh, items: leafItems, tiles, tileMesh, voxels, voxMesh: null, groundItems, groundMesh, shadow };

  // ---- grass on every dark cell no pad covers: a full tuft of broad blades fanning out from a low base ----
  const bladeItems = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!dark(r, c) || inCrown.has(r * N + c)) continue;
    const x = cellX(c), z = cellZ(r);
    voxel(pick(season.grass), x, 0.1, z, 0.96, 0.2, 0.96);
    const blades = 10 + Math.floor(rand() * 5);
    for (let i = 0; i < blades; i++) {
      const bx = x + (rand() - 0.5) * 0.8, bz = z + (rand() - 0.5) * 0.8;
      // each blade leans out from the tuft's middle, more the further out it stands
      const out = Math.atan2(bz - z, bx - x), lean = 0.18 + 0.7 * Math.hypot(bx - x, bz - z) + rand() * 0.2;
      const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rand() * Math.PI * 2);
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-Math.sin(out), 0, Math.cos(out)), -lean));
      // the grass is the same fresh green in every season
      const bc = new THREE.Color(pick(season.blades));
      bladeItems.push({ pos: new THREE.Vector3(bx, 0.18, bz), q, size: new THREE.Vector3(0.8 + rand() * 0.5, 0.75 + rand() * 0.85, 1), c: bc });
    }
  }
  // lit softly, a little of its own colour showing through, so the blades stay fresh rather than going dark
  const bladeMesh = new THREE.InstancedMesh(BLADE, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: "#060606" }), bladeItems.length);
  bladeItems.forEach((b, i) => bladeMesh.setColorAt(i, b.c));
  world.add(bladeMesh);
  // the blades lean out over their neighbours, so for the code they draw down into their tufts, leaving the clean
  // squares of the grass beneath
  grassBlades = { mesh: bladeMesh, items: bladeItems, at: -1 };

  // ---- wood: one smooth mesh. The trunk follows its curve, thick and flaring at the root; roots curl into the
  // ground; a limb sweeps out under each pad and fans into fine limbs beneath it; a few rise into the top pad.
  const wood = { pos: [], col: [], idx: [] };
  sweep(wood, (t) => spine(t).add(new THREE.Vector3(0, -0.3 * (1 - t) ** 12, 0)), (t) => (1.12 * (1 - t) ** 0.85 + 0.26) * (1 + 0.75 * Math.exp(-t * 14)), 56, 16, BARK);
  for (let k = 0; k < 5; k++) {
    const a = spin + k * 1.26 + rand() * 0.4, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    // buttress roots: they leave the trunk well up its side, thick, and run down to lie along the ground
    const p0 = root.clone().addScaledVector(out, 0.5).setY(1.6), p3 = root.clone().addScaledVector(out, 2.6 + rand() * 0.8).setY(0.02);
    const p1 = p0.clone().addScaledVector(out, 0.7).setY(0.7), p2 = p3.clone().addScaledVector(out, -1.0).setY(0.12);
    sweep(wood, bezier(p0, p1, p2, p3), (t) => 0.62 * (1 - t) ** 1.4 + 0.07, 16, 10, BARK);
  }
  for (const p of PADS) {
    if (!p.dist) continue;
    const t0 = p.t - 0.05, start = spine(t0), under = new THREE.Vector3(p.x, p.y - 0.45, p.z);
    const out = new THREE.Vector3().subVectors(under, start);
    const c1 = start.clone().addScaledVector(out, 0.35).add(new THREE.Vector3(0, 0.9, 0)), c2 = under.clone().addScaledVector(out, -0.3).add(new THREE.Vector3(0, 0.2, 0));
    const r0 = (1.12 * (1 - t0) ** 0.85 + 0.26) * 0.55;
    sweep(wood, bezier(start, c1, c2, under), (t) => r0 * (1 - t) + 0.16, 18, 10, BARK);
    for (let k = 0; k < 5; k++) {
      const a = p.yaw + (k / 5) * Math.PI * 2 + rand() * 0.5;
      const tip = under.clone().add(new THREE.Vector3(Math.cos(a) * p.rx * 0.62, 0.5 + rand() * 0.4, Math.sin(a) * p.rz * 0.62));
      const mid = under.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, -0.25, 0));
      sweep(wood, bezier(under, mid, mid, tip), (t) => 0.17 * (1 - t) + 0.04, 8, 6, BARK);
    }
  }
  const apex = spine(0.96);
  for (let k = 0; k < 4; k++) {
    const a = spin + k * 1.57 + rand() * 0.4;
    const tip = apex.clone().add(new THREE.Vector3(Math.cos(a) * PADS[3].rx * 0.55, 0.9, Math.sin(a) * PADS[3].rz * 0.55));
    sweep(wood, bezier(apex, apex.clone().lerp(tip, 0.4).add(new THREE.Vector3(0, 0.5, 0)), tip, tip), (t) => 0.2 * (1 - t) + 0.04, 8, 6, BARK);
  }
  // kept relative to the root, so the whole tree can fold down into it
  for (let k = 0; k < wood.pos.length; k += 3) { wood.pos[k] -= root.x; wood.pos[k + 1] -= root.y; wood.pos[k + 2] -= root.z; }
  const woodGeo = new THREE.BufferGeometry();
  woodGeo.setAttribute("position", new THREE.Float32BufferAttribute(wood.pos, 3));
  woodGeo.setAttribute("color", new THREE.Float32BufferAttribute(wood.col, 3));
  woodGeo.setIndex(wood.idx);
  woodGeo.computeVertexNormals();
  const woodMesh = new THREE.Mesh(woodGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  woodMesh.position.copy(root);
  world.add(woodMesh);
  branches = { mesh: woodMesh };

  const voxMesh = new THREE.InstancedMesh(pillar, new THREE.MeshLambertMaterial({ vertexColors: true }), voxels.length);
  voxels.forEach((it, i) => voxMesh.setColorAt(i, it.color));
  world.add(voxMesh);
  leaves.voxMesh = voxMesh;

  const grassy = new Set([...season.grass, ...season.blades, "#" + leafColors[2].getHexString()]);
  grassMats = [];
  for (const { geo, color, list } of batches.values()) {
    const mat = new THREE.MeshLambertMaterial({ color });
    if (grassy.has(color)) {
      // as the eye sees it (sRGB): no lighter than the grass the code has always scanned with
      const hsl = {};
      mat.color.getHSL(hsl, THREE.SRGBColorSpace);
      grassMats.push({ mat, base: mat.color.clone(), deep: new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.min(hsl.l, 0.42), THREE.SRGBColorSpace) });
    }
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    world.add(mesh);
  }
  // the sun's shadows: everything casts; everything but the leaves receives, so the canopy stays soft and even
  world.traverse((o) => { if (o.isMesh) { o.castShadow = o !== leaves.shadow; o.receiveShadow = o !== leafMesh && o !== leaves.shadow; } });
  stepMorph(0);
  buildFalling(season, leafColors);
  buildRain(season);
  // the snow comes down only when the season turns to winter, not when the colour or the link changes
  if (app.season !== builtSeason) builtAt = performance.now() / 1000;
  builtSeason = app.season;
  buildButterflies(season, crownTops);
  setFrames();
}

// ---------- leaves (or petals) that fall, settle on the ground for a while, and come again ----------
// Their times are a fixed cycle per leaf, so nothing needs a random source while running.
function buildFalling(season, leafColors) {
  if (falling) scene.remove(falling.mesh);
  const n = season.fall;
  const mesh = new THREE.InstancedMesh(LEAF, leafMaterial, n);
  const items = Array.from({ length: n }, (_, i) => {
    const from = crownTops[(i * 37) % crownTops.length];
    const color = leafColors[1 + (i % 6)].clone();
    mesh.setColorAt(i, color);
    return { from, period: 7 + (i % 5) * 1.3, offset: i * 1.37, drift: 0.6 + (i % 4) * 0.25, spin: 1.5 + (i % 3) * 0.7, size: 0.45 + (i % 3) * 0.08, dir: (i * 2.399) % (Math.PI * 2) };
  });
  falling = { mesh, items };
  scene.add(mesh);
}
// ---------- summer butterflies ----------
// Three small butterflies made of a few flat blocks: a body and two wings of two squares each, in yellows. One by
// one they lift off the leaves and flutter away out of the view.
function buildButterflies(season, tops) {
  flies.forEach((f) => scene.remove(f.group));
  flies = [];
  if (!season.butterflies) return;
  const COLORS = [["#ffe066", "#f6c93c"], ["#ffeea0", "#f8d860"], ["#ffd65a", "#f2b733"]];
  const flat = new THREE.BoxGeometry(1, 0.06, 1);
  for (let k = 0; k < 3; k++) {
    const [c1, c2] = COLORS[k];
    const g = new THREE.Group(), m1 = new THREE.MeshLambertMaterial({ color: c1, emissive: "#2a2515" }), m2 = new THREE.MeshLambertMaterial({ color: c2, emissive: "#3a3520" });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.46), new THREE.MeshLambertMaterial({ color: "#6b5444" }));
    g.add(body);
    const wings = [-1, 1].map((side) => {
      const w = new THREE.Group();
      // a wing of two squares, the fore one larger and set forward, the hind one smaller, tipped back
      const up = new THREE.Mesh(flat, m1); up.scale.set(0.5, 1, 0.44); up.position.set(side * 0.3, 0, -0.12); up.rotation.y = side * 0.25;
      const lo = new THREE.Mesh(flat, m2); lo.scale.set(0.34, 1, 0.3); lo.position.set(side * 0.22, 0, 0.2); lo.rotation.y = -side * 0.3;
      w.add(up, lo);
      g.add(w);
      return w;
    });
    g.scale.setScalar(1.9);
    scene.add(g);
    flies.push({ group: g, wings, k, tops });
  }
}
function stepButterflies(t, u) {
  flies.forEach((f) => {
    const g = f.group;
    // every 7 s a butterfly lifts off a leaf at the top of a pad and flutters up and away out of the view, then
    // another goes from somewhere else; the three are spaced through the cycle so one is usually in the air
    const CYC = 7, run = t + f.k * 2.4, n = Math.floor(run / CYC), c = (run % CYC) / CYC;
    const top = f.tops[(n * 5 + f.k * 11) % f.tops.length], a = n * 2.3 + f.k * 1.7;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const start = new THREE.Vector3(top[0], top[1] + 0.3, top[2]);
    const e = c * c * (3 - 2 * c);
    const pos = start.clone().addScaledVector(out, 26 * e).add(new THREE.Vector3(0, 14 * e + 0.6 * Math.sin(run * 5), 0));
    pos.addScaledVector(new THREE.Vector3(-out.z, 0, out.x), 2.2 * Math.sin(run * 1.7 + f.k)); // a wandering line
    g.position.copy(pos);
    g.rotation.set(0, Math.atan2(out.x, out.z), 0);
    g.visible = u < 0.5 && c < 0.96;
    const beat = -0.15 + 0.85 * (0.5 + 0.5 * Math.sin(run * 14));
    f.wings[0].rotation.z = beat;
    f.wings[1].rotation.z = -beat;
  });
}

function stepFalling(t, hide) {
  if (!falling) return;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  falling.items.forEach((it, i) => {
    const local = (t + it.offset) % it.period;
    const fallTime = it.from[1] / 1.05; // about one unit a second: a leaf floats down rather than drops
    let scale = it.size;
    if (local < fallTime) {
      // floating down like a real leaf: swinging side to side as a pendulum, tipping into each swing, carried downwind
      const f = local / fallTime, y = it.from[1] * (1 - f);
      const ph = local * 1.7 + i, swing = Math.sin(ph) * it.drift;
      const side = new THREE.Vector3(Math.cos(it.dir), 0, Math.sin(it.dir));
      p.set(it.from[0], y + 0.05, it.from[2]).addScaledVector(side, swing).addScaledVector(WIND, f * 2.2);
      q.setFromAxisAngle(new THREE.Vector3(-side.z, 0, side.x), 0.55 * Math.cos(ph)).multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, it.dir + local * 0.6));
    } else {
      // resting on the ground, then shrinking away just before the next fall
      const side = new THREE.Vector3(Math.cos(it.dir), 0, Math.sin(it.dir));
      p.set(it.from[0], 0.03, it.from[2]).addScaledVector(side, Math.sin((fallTime) * 1.7 + i) * it.drift).addScaledVector(WIND, 2.2);
      q.setFromEuler(e.set(0, it.dir, 0));
      const rest = it.period - local;
      if (rest < 0.6) scale *= rest / 0.6;
    }
    if (hide) scale = 0;
    falling.mesh.setMatrixAt(i, m.compose(p, q, s.setScalar(Math.max(0.0001, scale))));
  });
  falling.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- autumn rain ----------
function buildRain(season) {
  if (rain) { scene.remove(rain.mesh); rain.material.dispose(); rain = null; }
  if (season.snowing) return buildSnow();
  if (!season.rain) return;
  const count = 220, half = N / 2 + QUIET;
  const material = new THREE.MeshBasicMaterial({ color: "#b9b3aa", transparent: true, opacity: 0.55 });
  const mesh = new THREE.InstancedMesh(box, material, count);
  const drops = Array.from({ length: count }, (_, i) => ({
    x: (((i * 7919) % 1000) / 1000) * 2 * half - half,
    z: (((i * 104729) % 1000) / 1000) * 2 * half - half,
    y0: (((i * 15485863) % 1000) / 1000) * 32,
    speed: 22 + (i % 7),
  }));
  rain = { mesh, drops, material, snow: false };
  scene.add(mesh);
}
// snow: soft round flakes, always facing the camera, white with a faint cool edge so they show against the pale
// page. Each has its own size, speed and sway: the small ones far and slow, a few large soft ones near. They fall
// slowly, carried a little down the wind, swaying and turning as they go, as snow does.
function buildSnow() {
  const count = 380, half = N / 2 + QUIET + 4;
  const tex = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.4, "rgba(252,253,255,1)");
    grd.addColorStop(0.62, "rgba(196,210,230,0.8)");
    grd.addColorStop(1, "rgba(196,210,230,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 1 });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.renderOrder = 5;
  const r = (i, k) => (((i * k) % 1000) / 1000);
  const drops = Array.from({ length: count }, (_, i) => {
    const near = r(i, 3301) > 0.9; // one in ten a large flake close to the eye
    return {
      x: r(i, 7919) * 2 * half - half, z: r(i, 104729) * 2 * half - half, y0: r(i, 15485863) * SNOW_TOP,
      // when the snow begins, the flakes come in one by one over two seconds, so the snow thickens
      start: r(i, 2017) * 2,
      size: near ? 0.95 + 0.45 * r(i, 271) : 0.32 + 0.3 * r(i, 433),
      speed: (near ? 2.6 : 1.3) + 1.1 * r(i, 613),
      sway: 0.4 + 0.9 * r(i, 877), freq: 0.5 + 0.7 * r(i, 997), phase: r(i, 1291) * 6.28,
    };
  });
  rain = { mesh, drops, material, snow: true, t0: performance.now() / 1000 };
  scene.add(mesh);
}
// flakes start well above the top of the view, so none is seen to appear, and melt away as they reach the ground
const SNOW_TOP = 56;
function stepRain(t, u) {
  if (!rain) return;
  rain.material.opacity = (rain.snow ? 1 : 0.55) * (1 - u);
  rain.mesh.visible = u < 0.98;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(0.06, 1.4, 0.06);
  if (rain.snow) {
    // flakes face the camera; they drift down the wind as they fall and sway from side to side
    q.copy(camera.quaternion);
    const since = t - rain.t0;
    rain.drops.forEach((d, i) => {
      const y = SNOW_TOP - ((d.y0 + t * d.speed) % SNOW_TOP), sw = d.sway * Math.sin(t * d.freq + d.phase);
      p.set(d.x + sw + WIND.x * 0.15 * y, y, d.z - sw * 0.5 + WIND.z * 0.15 * y);
      const melt = Math.min(1, y / 1.6); // smaller and smaller over the last stretch, gone at the ground
      const come = smooth((since - d.start) / 0.8); // fading in softly, only as the snow begins
      rain.mesh.setMatrixAt(i, m.compose(p, q, s.setScalar(Math.max(0.0001, d.size * melt * come))));
    });
  } else {
    rain.drops.forEach((d, i) => rain.mesh.setMatrixAt(i, m.compose(p.set(d.x, 32 - ((d.y0 + t * d.speed) % 32), d.z), q, s)));
  }
  rain.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- the wind in the crown ----------
// The wind is one field, not a shiver per leaf: waves roll across the crown in the wind's direction, so
// neighbouring leaves lean together, under a slow rise and fall of gusts; each leaf adds only a light flutter of
// its own. Leaves high up and at the edge move most. Everything settles as the camera turns to the code.
const WIND = new THREE.Vector3(1, 0, -0.55).normalize();
const WIND_AXIS = new THREE.Vector3(-WIND.z, 0, WIND.x); // leaves tip about the axis across the wind
function gustAt(t) { return 0.62 + 0.26 * Math.sin(t * 0.21) + 0.12 * Math.sin(t * 0.53 + 1.7); }
function stepLeaves(t, calm) {
  if (!leaves || calm >= 1) return;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), w = new THREE.Quaternion(), f = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const k = (1 - calm) * gustAt(t);
  leaves.items.forEach((it, i) => {
    // the wave reaches a leaf later the further downwind it hangs
    const along = it.pos.x * WIND.x + it.pos.z * WIND.z;
    const wave = Math.sin(t * 1.25 - along * 0.32) + 0.35 * Math.sin(t * 0.7 - along * 0.17 + 0.8);
    const lean = 0.2 * it.sway * k * wave;
    w.setFromAxisAngle(WIND_AXIS, lean);
    f.setFromAxisAngle(Y_AXIS, 0.1 * it.sway * k * Math.sin(t * 3.2 + it.phase)); // its own flutter
    q.copy(it.quat).premultiply(f).premultiply(w);
    p.copy(it.pos).addScaledVector(WIND, 0.09 * it.sway * k * (wave + 0.6));
    leaves.mesh.setMatrixAt(i, m.compose(p, q, s.setScalar(Math.max(0.0001, it.scale * (1 - leafGone(pNow, it.far))))));
  });
  leaves.mesh.instanceMatrix.needsUpdate = true;
}
function restLeaves() {
  if (!leaves) return;
  const m = new THREE.Matrix4(), s = new THREE.Vector3();
  const p = new THREE.Vector3();
  leaves.items.forEach((it, i) => leaves.mesh.setMatrixAt(i, m.compose(p.copy(it.pos), it.quat, s.setScalar(Math.max(0.0001, it.scale * (1 - leafGone(pNow, it.far)))))));
  leaves.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- leaves into squares ----------
// As in the original, over one turn of the camera; p runs from 0 (the tree) to 1 (the code), evenly in time.
// - p 0.1 to 0.55: the block tree. As the camera starts to turn, small cubes appear where the leaves are and grow
//   to full size, stacked on the grid through each pad, in the leaves' own colours with a little variation, until
//   the tree stands built of 3D blocks in its own shape.
//   Cubes stand only over the code's dark modules, so the block tree is full of the code's gaps from the start.
// - p 0.34 to 0.75: as it comes round, the leaves shrink and scatter, uncovering the gaps, and the wood folds away; the cubes
//   deepen to the code's colour.
// - the camera settles straight above, where the tops of the cubes that are left are the code.
// Played backwards, the code grows back into the tree. far: distance from the centre, in tree radii.
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// a cube grows in, the lower ones first, so the tree is stacked up from below as it turns
const cubeIn = (p, it) => smooth((p - 0.1 - 0.16 * Math.min(it.pos.y / 24, 1) - 0.08 * it.seed) / 0.2);
const deepenOf = (p) => smooth((p - 0.55) / 0.35); // the cubes left take the code's colour
const leafGone = (p, far) => smooth((p - 0.34 - 0.06 * Math.min(far, 1.2)) / 0.34); // the leaves shrink and scatter
const woodGone = (p) => smooth((p - 0.36) / 0.34); // the wood, the leaves on the ground and the shade go with the leaves
let pNow = 0;
function stepMorph(p) {
  if (!leaves) return;
  const gone = woodGone(p), deep = deepenOf(p);
  pNow = p;
  const m = new THREE.Matrix4(), I = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  leaves.voxels.forEach((it, i) => {
    let k = cubeIn(p, it);
    // each cube a little smaller than its cell, by a varying amount, so the stacked blocks read one by one
    leaves.voxMesh.setMatrixAt(i, m.compose(it.pos, I, s.setScalar(Math.max(0.0001, (0.86 + 0.1 * it.seed) * k))));
    // a cube comes in already halfway to its module's colour in the code, so the blocks read as the code from the
    // start, and deepens the rest of the way
    leaves.voxMesh.setColorAt(i, c.copy(it.color).lerp(leaves.tiles[it.tile].to, (0.5 + 0.5 * deep) * (it.top ? 1 : 0.8)));
  });
  leaves.voxMesh.instanceMatrix.needsUpdate = true;
  leaves.voxMesh.instanceColor.needsUpdate = true;
  grassMats.forEach((g) => g.mat.color.copy(g.base).lerp(g.deep, deep));
  if (grassBlades && grassBlades.at !== deep) {
    grassBlades.at = deep;
    const k = Math.max(0.0001, 1 - deep), sz = new THREE.Vector3();
    grassBlades.items.forEach((b, i) => grassBlades.mesh.setMatrixAt(i, m.compose(b.pos, b.q, sz.copy(b.size).multiplyScalar(k))));
    grassBlades.mesh.instanceMatrix.needsUpdate = true;
  }
  leaves.groundItems.forEach((it, i) => leaves.groundMesh.setMatrixAt(i, m.compose(it.pos, it.quat, s.setScalar(Math.max(0.0001, it.scale * (1 - gone))))));
  leaves.groundMesh.instanceMatrix.needsUpdate = true;
  // the snow goes with the leaves; when the season turns to winter, it comes down out of the sky onto the pads
  const since = performance.now() / 1000 - builtAt;
  leaves.snowMeshes.forEach((sm) => {
    sm.material.userData.since.value = since;
    sm.scale.setScalar(Math.max(0.0001, 1 - leafGone(p, sm.userData.far)));
  });
  if (leaves.shadow) leaves.shadow.material.opacity = (1 - gone) * lightNow.blob;
  // the wood stays as it is and folds down into its root as the leaves go
  if (branches && branches.mesh) branches.mesh.scale.setScalar(Math.max(0.0001, 1 - gone));
}

// ---------- camera: two framings, and a turn between them ----------
// "tree" looks down at about 35° from a corner; "code" looks straight down with the code upright, a little above
// centre so the controls below stay clear. The turn slerps the camera's orientation (one smooth rotation covering
// both the tilt and the 45° spin), moves the point it looks at, and changes the orthographic zoom, on one curve.
const DIST = 150;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
let FRAMES, Q;
function setFrames() {
  FRAMES = {
    tree: { dir: new THREE.Vector3(1, 0.82, 1).normalize(), up: new THREE.Vector3(0, 1, 0), target: new THREE.Vector3(0, 11, 2), height: N + 2 * QUIET + 30 },
    code: { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), target: new THREE.Vector3(0, 0, 5), height: N + 2 * QUIET + 13 },
  };
  const quatOf = (f) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(f.dir.clone().multiplyScalar(DIST), new THREE.Vector3(), f.up));
  Q = { tree: quatOf(FRAMES.tree), code: quatOf(FRAMES.code) };
}
// u: how far round the camera has turned; z: how far through the turn, which sets the push in (by default the same)
function frameCamera(u, z = u) {
  const q = Q.tree.clone().slerp(Q.code, u);
  const target = FRAMES.tree.target.clone().lerp(FRAMES.code.target, u);
  camera.position.copy(target).addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(q), DIST);
  camera.quaternion.copy(q);
  // the push in comes early and stays: the code ends up closer than the tree was, as in the original
  const zin = 1 - Math.pow(1 - Math.min(1, Math.max(0, z)), 2.2);
  const h = FRAMES.tree.height + (FRAMES.code.height - FRAMES.tree.height) * zin, a = window.innerWidth / window.innerHeight;
  camera.left = (-h * a) / 2; camera.right = (h * a) / 2; camera.top = h / 2; camera.bottom = -h / 2;
  camera.updateProjectionMatrix();
}

// ---------- the turn ----------
const TURN_MS = 650; // long enough to watch the tree build up in blocks as it turns
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// the camera first presses in, then swings round, and settles: as in the original it is still well short of
// straight above two thirds of the way through
const camOf = (p) => ease(Math.min(1, Math.max(0, (p - 0.05) / 0.95)));
// a soft darkening round the edges while the camera swings, as in the original
const vignette = document.createElement("div");
vignette.style.cssText = "position:fixed;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 42%,rgba(70,55,45,0) 42%,rgba(70,55,45,0.26) 100%)";
document.getElementById("stage").after(vignette);
let from = app.view, to = app.view, t0 = 0;
const hint = document.getElementById("hint");
function turn() {
  if (from !== to) return; // let a turn finish first
  from = app.view; to = 1 - app.view; t0 = performance.now();
}
renderer.domElement.addEventListener("click", turn);

let lastNow = performance.now();
let poseP = null; // for checking the turn frame by frame: window.pose(p) holds the turn at p
function loop(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  const k = from === to ? 1 : Math.min(1, (now - t0) / TURN_MS);
  const p = poseP ?? from + (to - from) * k, u = camOf(p);
  if (from !== to && k >= 1) { app.view = to; from = to; }
  frameCamera(u, p);
  stepLight(dt);
  placeLight(u, now / 1000);
  // a touch of blur and the darkened edges only while the camera swings fast
  const sw = Math.min(1, Math.max(0, p)), speed = from === to && poseP === null ? 0 : Math.sin(Math.PI * sw);
  vignette.style.opacity = speed.toFixed(3);
  // a light, matte grade over the tree (shadows lifted a little, colour kept clean); none on the code,
  // which keeps its full contrast for scanning
  const g = 1 - u;
  const grade = g > 0.01 ? `contrast(${(1 - 0.04 * g).toFixed(3)}) brightness(${(1 + 0.02 * g).toFixed(3)})` : "";
  renderer.domElement.style.filter = (grade + (speed > 0.05 ? ` blur(${(speed * 1.6).toFixed(2)}px)` : "")).trim() || "none";
  const t = now / 1000;
  // the wind, the falling leaves and the rain belong to the tree: they fade out as the camera reaches the code
  stepMorph(p);
  if (u >= 1) restLeaves(); else stepLeaves(t, u);
  stepFalling(t, u > 0.6);
  stepButterflies(t, u);
  stepRain(t, u);
  hint.textContent = app.view === 1 && from === to ? "点一下，看回小树" : "点一下树，看二维码";
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------- controls ----------
const urlInput = document.getElementById("url");
urlInput.value = app.url;
urlInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = urlInput.value.trim();
  if (v && v !== app.url) { app.url = v; build(); }
  urlInput.blur();
});
const seasonBar = document.getElementById("seasons"), swatchBar = document.getElementById("swatches");
function drawControls() {
  seasonBar.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.season === app.season));
  swatchBar.innerHTML = "";
  SEASONS[app.season].swatches.forEach((hex, i) => {
    const b = document.createElement("button");
    b.style.background = hex;
    b.className = i === app.swatch ? "on" : "";
    b.title = "换叶子颜色";
    b.onclick = () => crossfade(() => { app.swatch = i; drawControls(); build(); });
    swatchBar.appendChild(b);
  });
}
// a change of season or colour cross-fades: the old picture is held over the new one and fades away
function crossfade(change) {
  const still = new Image();
  still.src = renderer.domElement.toDataURL();
  still.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none";
  still.style.filter = renderer.domElement.style.filter;
  document.getElementById("stage").after(still);
  change();
  const t0 = performance.now();
  const fade = (now) => {
    const k = Math.min(1, (now - t0) / 450);
    still.style.opacity = String(1 - k * k * (3 - 2 * k));
    if (k < 1) requestAnimationFrame(fade); else still.remove();
  };
  requestAnimationFrame(fade);
}
seasonBar.querySelectorAll("button").forEach((b) => (b.onclick = () => crossfade(() => { app.season = b.dataset.season; app.swatch = 0; drawControls(); build(); })));
document.getElementById("download").onclick = () => {
  // the code as seen from above, leaves at rest, nothing falling, at the size of the window
  frameCamera(1);
  stepMorph(1);
  leaves.items.forEach((it, i) => leaves.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001)));
  leaves.mesh.instanceMatrix.needsUpdate = true;
  stepFalling(0, true);
  stepRain(0, 1);
  placeLight(1, 0);
  scene.background = new THREE.Color("#f3eee6");
  renderer.render(scene, camera);
  scene.background = null;
  const a = document.createElement("a");
  a.href = renderer.domElement.toDataURL("image/png");
  a.download = "qr-tree.png";
  a.click();
};

window.addEventListener("resize", () => renderer.setSize(window.innerWidth, window.innerHeight));

drawControls();
build();
frameCamera(app.view);
renderer.render(scene, camera);
requestAnimationFrame(loop);
window.ready = true;
window.turn = turn;
window.app = app;
window.rebuild = build;
window.pose = (p) => (poseP = p);
