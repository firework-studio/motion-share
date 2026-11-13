// A corner cafe on the way home: one shop front, one barista in the
// take-out window, one passer-by with a cup and a tote. The day runs into evening on its own and the lights come on
// one by one (take-out window → street lamp → upstairs left → upstairs right). Click the passer-by: they slow to a stop,
// raise the cup to you, and walk on. Built on line-art-animation (MIT, lib/, see LICENSE-line-art-animation).
// the metal letter-rail sign, geraniums, ivy and a snake plant (design/*.svg), and the
// two-second light-up: the barista presses the switch, the pendants and the name wake, the window peaks at +0.90 s
// and its light lands on the pavement, then the door and street lamp, then the two flats upstairs.
//   ?tau=0.8   freeze the time of day   ?lightT=0.9   freeze the light-up   ?name=今晚见   the shop's name
//   ?t=3   freeze the clock   ?debug   step with window.__step()
import { el, pen, shape, blot, paint, limb, shoe, place, inkDefs, run, joint, f, pt, PEN, PAPER, type Vec } from './lib/ink.ts';
import { gait } from './lib/gait.ts';
import { spring, pendulum, pointerWind, ease, clamp, smooth, seeded } from './lib/motion.ts';
import { palette, applyPalette, nightTint, rgb, mix, toRGB, type RGB } from './lib/daynight.ts';
import plantsSvg from './design/b-plants.svg?raw';
import lightSvg from './design/b-lighting-surfaces.svg?raw';

const W = 600, H = 450, GROUND = 372, SCALE = 1.05;
const TERRA = '#b76b51', TEAL = '#69857d';
const q = new URLSearchParams(location.search);

// framings: the same world seen through a taller or wider window; the building is never stretched, the sky
// and the pavement just go on. ?frame=34 (3:4 video) · 916 (9:16 phone) · 169 (16:9 desktop) · cover; default 4:3
const FRAMES: Record<string, { vb: [number, number, number, number]; moon: Vec }> = {
  '43': { vb: [0, 0, 600, 450], moon: [82, 70] }, '34': { vb: [92, -40, 478, 637.333], moon: [500, 50] },
  '916': { vb: [92, -270, 478, 849.778], moon: [500, -70] }, '169': { vb: [-200, 20, 800, 450], moon: [82, 70] }, cover: { vb: [60, 80, 536, 336.718], moon: [-99, -99] },
};
const FR = FRAMES[q.get('frame') ?? '43'] ?? FRAMES['43'];
const svg = el('svg', { viewBox: FR.vb.join(' '), role: 'img', 'aria-label': 'Line drawing of a corner cafe at dusk' });
document.documentElement.style.setProperty('--ar', `${FR.vb[2]} / ${FR.vb[3]}`);
const { defs, filter } = inkDefs(svg, 'c');
document.querySelector('#stage')!.appendChild(svg);

// ---- sky (a gradient is allowed for sky and light only), under the ink
const skyGrad = el('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
const skyTop = el('stop', { offset: 0 }, skyGrad), skyBot = el('stop', { offset: 1 }, skyGrad);
el('rect', { x: -400, y: -400, width: 1400, height: 1300, fill: 'url(#sky)' }, svg);
const sunMoon = el('circle', { r: 14, fill: '#f2c678' }, svg);

const scene = el('g', q.has('nofilter') ? {} : { filter }, svg);   // ?nofilter: for performance checks
const rand = seeded(23);
// The SVG fragments in design/ are drawn in this same 600×450 space: their defs join ours, their groups go where they belong
function graft(raw: string): Map<string, SVGElement> {
  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml'), ids = new Map<string, SVGElement>();
  for (const d of [...doc.querySelectorAll('defs > *')]) defs.appendChild(document.importNode(d, true));
  doc.querySelectorAll('defs').forEach((d) => d.remove());
  const holder = el('g', {});
  for (const n of [...doc.documentElement.childNodes]) holder.appendChild(document.importNode(n, true));
  holder.querySelectorAll<SVGElement>('[id]').forEach((n) => ids.set(n.id, n));
  return ids;
}
const LIGHT = graft(lightSvg);
// light and shadows on the street sit on the ground, under everything standing on it, and outside the ink filter: the
// filter's noise is fixed in space, so a long shape sliding through it (a shadow growing under the lamp) would shimmer
const floor = el('g', {});
svg.insertBefore(floor, scene);

// ---- the street: kerb, paving joints, a few loose lines on the road
pen(scene, 0.8).setAttribute('d', `M-400 ${GROUND} L1000 ${GROUND} M-400 ${GROUND + 10} L1000 ${GROUND + 10}`);
pen(scene, 0.45).setAttribute('d', Array.from({ length: 46 }, (_, i) => `M${i * 31 - 397} ${GROUND} l-3 10`).join(' '));
pen(scene, 0.4).setAttribute('d', `M-170 ${GROUND + 40} l110 0 M40 ${GROUND + 36} l90 0 M260 ${GROUND + 44} l140 0 M470 ${GROUND + 32} l80 0 M130 ${GROUND + 120} l120 0 M380 ${GROUND + 150} l90 0`);
floor.appendChild(LIGHT.get('b-ground-light')!); floor.appendChild(LIGHT.get('b-door-and-road')!);
const walkerShadow = el('path', { fill: '#141b2e', opacity: 0 }, floor);
// the street lamp's light: a faint bounded cone (behind the sign and the board), a wider pool on the pavement, and the
// shadow it throws from the passer-by, away from the lamp and longer the further they are from it
const LAMP = { x: 528, y: 152, h: GROUND - 152 };
const lampG = el('linearGradient', { id: 'lampCone', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
el('stop', { offset: 0, 'stop-color': '#FFD99A', 'stop-opacity': 0.09 }, lampG); el('stop', { offset: 0.7, 'stop-color': '#FFD99A', 'stop-opacity': 0.035 }, lampG); el('stop', { offset: 1, 'stop-color': '#FFD99A', 'stop-opacity': 0.05 }, lampG);
const lampPoolG = el('radialGradient', { id: 'lampPool' }, defs);
el('stop', { offset: 0, 'stop-color': '#FFDB98', 'stop-opacity': 0.5 }, lampPoolG); el('stop', { offset: 0.6, 'stop-color': '#FFDB98', 'stop-opacity': 0.22 }, lampPoolG); el('stop', { offset: 1, 'stop-color': '#FFDB98', 'stop-opacity': 0 }, lampPoolG);
const lampLight = el('g', { opacity: 0 }, floor);
const coneMaskG = el('linearGradient', { id: 'coneEdge', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
[[0, 0], [0.3, 1], [0.7, 1], [1, 0]].forEach(([o, a]) => el('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': a }, coneMaskG));
const coneMask = el('mask', { id: 'coneMask', maskUnits: 'userSpaceOnUse', x: 470, y: 150, width: 120, height: 230 }, defs);
el('rect', { x: 470, y: 150, width: 116, height: 230, fill: 'url(#coneEdge)' }, coneMask);
el('path', { d: `M523 152 L533 152 L584 ${GROUND} L472 ${GROUND}Z`, fill: 'url(#lampCone)', mask: 'url(#coneMask)' }, lampLight);
el('ellipse', { cx: LAMP.x, cy: GROUND + 5, rx: 84, ry: 9, fill: 'url(#lampPool)' }, lampLight);
const lampShadow = el('path', { fill: '#0b1020', opacity: 0 }, floor);

// ---- the building, drawn as an elevation
const B = { x0: 140, x1: 460, top: 98 };
shape(scene, 0.9).setAttribute('d', `M${B.x0} ${GROUND} L${B.x0} ${B.top} L${B.x1} ${B.top} L${B.x1} ${GROUND}Z`);
shape(scene, 0.9).setAttribute('d', `M${B.x0 - 8} ${B.top} L${B.x1 + 8} ${B.top} L${B.x1 + 8} ${B.top - 9} L${B.x0 - 8} ${B.top - 9}Z`);    // parapet cap
pen(scene, 0.45).setAttribute('d', `M${B.x0} ${B.top + 6} L${B.x1} ${B.top + 6} M${B.x0} 214 L${B.x1} 214 M${B.x0} 219 L${B.x1} 219`);
pen(scene, 0.5).setAttribute('d', Array.from({ length: 32 }, (_, i) => `M${B.x0 + 4 + i * 10} ${B.top + 6} l0 4 l5 0 l0 -4`).join(' '));   // dentils
// brick hints, sparse, so the façade has texture without filling the paper
pen(scene, 0.35).setAttribute('d', Array.from({ length: 46 }, () => { const x = B.x0 + 8 + rand(0, 290), y = B.top + 14 + rand(0, 98); return `M${f(x)} ${f(y)} l${f(rand(7, 14))} 0`; }).join(' '));
pen(scene, 0.35).setAttribute('d', Array.from({ length: 18 }, () => { const x = B.x0 + 6 + rand(0, 296), y = 226 + rand(0, 24); return `M${f(x)} ${f(y)} l${f(rand(6, 11))} 0`; }).join(' '));

// upstairs windows: a warm pane that lights up, the frame, mullions, a sill; a flower box on the left
function windowAt(x: number, y: number, w: number, h: number): SVGPathElement {
  const pane = el('path', { d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z` }, scene);
  const fr = pen(scene, 0.9); fr.setAttribute('d', `M${x - 4} ${y - 4} L${x + w + 4} ${y - 4} L${x + w + 4} ${y + h + 4} L${x - 4} ${y + h + 4}Z M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z`);
  pen(scene, 0.6).setAttribute('d', `M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h * 0.42} L${x + w} ${y + h * 0.42}`);
  shape(scene, 0.8).setAttribute('d', `M${x - 9} ${y + h + 4} L${x + w + 9} ${y + h + 4} L${x + w + 7} ${y + h + 10} L${x - 7} ${y + h + 10}Z`);
  // a curtain gathered to one side
  pen(scene, 0.45).setAttribute('d', `M${x + 4} ${y + 2} Q${x + 10} ${y + h * 0.4} ${x + 6} ${y + h - 3} M${x + 9} ${y + 2} Q${x + 15} ${y + h * 0.45} ${x + 11} ${y + h - 6}`);
  return pane;
}
const upL = windowAt(176, 130, 96, 66), upR = windowAt(328, 130, 96, 66);
scene.appendChild(LIGHT.get('b-upper-sill-light')!);
// plants (design/b-plants.svg): geraniums and ivy in the two boxes, a snake plant by the door; each moving group turns
// about its own root (data-pivot) with the wind
const PLANTS = graft(plantsSvg);
scene.appendChild(PLANTS.get('b-plants')!);
const SWAY: Array<[string, number, number]> = [['b-geranium-left', 0.8, 0], ['b-geranium-right', 0.8, 0.05], ['b-bloom-left', 1.2, 0.1], ['b-ivy-left', 1.6, 0.12],
  ['b-ivy-right', 1.6, 0.2], ['b-snake-left', 0.5, 0.15], ['b-snake-mid', 0.3, 0.2], ['b-snake-right', 0.5, 0.1], ['b-snake-front', 0.45, 0.18]];
const swayers = SWAY.map(([id, deg, lag]) => { const g = PLANTS.get(id)!, [px, py] = g.dataset.pivot!.split(' ').map(Number); return { g, px, py, deg, s: spring(14 - lag * 30, 2.6) }; });

// the sign: a narrow lightbox hung from an iron bracket at the building's right corner, the name set vertically. It
// leaves the façade's middle as plain wall, sways a little in the wind, and at night its face glows (the name's beat in
// the light-up). The name can be changed (2–5 characters, sized to the board).
const BLADE = { x: 467, y: 232, w: 24, h: 66, hang: [479, 225] as Vec };
pen(scene, 0.9).setAttribute('d', `M460 221 L496 221 M460 228 Q472 228 474 221 M490 221 L490 225 M468 221 L468 225`);   // bracket and its brace
blot(scene).setAttribute('d', 'M494 219.6 a1.6 1.6 0 1 0 0.1 0Z');
const blade = el('g', {}, scene), bladeSwing = pendulum(9, 1.2);
pen(blade, 0.55).setAttribute('d', `M468 225 L${BLADE.x + 2} ${BLADE.y} M490 225 L${BLADE.x + BLADE.w - 2} ${BLADE.y}`);
const bladeFace = el('path', { d: `M${BLADE.x} ${BLADE.y + 3} Q${BLADE.x} ${BLADE.y} ${BLADE.x + 3} ${BLADE.y} L${BLADE.x + BLADE.w - 3} ${BLADE.y} Q${BLADE.x + BLADE.w} ${BLADE.y} ${BLADE.x + BLADE.w} ${BLADE.y + 3} L${BLADE.x + BLADE.w} ${BLADE.y + BLADE.h - 3} Q${BLADE.x + BLADE.w} ${BLADE.y + BLADE.h} ${BLADE.x + BLADE.w - 3} ${BLADE.y + BLADE.h} L${BLADE.x + 3} ${BLADE.y + BLADE.h} Q${BLADE.x} ${BLADE.y + BLADE.h} ${BLADE.x} ${BLADE.y + BLADE.h - 3}Z`, stroke: 'currentColor', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, blade);
pen(blade, 0.4).setAttribute('d', `M${BLADE.x + 3} ${BLADE.y + 3} L${BLADE.x + BLADE.w - 3} ${BLADE.y + 3} L${BLADE.x + BLADE.w - 3} ${BLADE.y + BLADE.h - 3} L${BLADE.x + 3} ${BLADE.y + BLADE.h - 3}Z`);
const bladeChars: SVGTextElement[] = [];
function setName(name: string): void {
  bladeChars.forEach((c) => c.remove()); bladeChars.length = 0;
  const chars = Array.from(name).slice(0, 5), n = chars.length, size = Math.min(12, (BLADE.h - 14) / n * 0.9), step = (BLADE.h - 12) / n;
  chars.forEach((ch, i) => { const c = el('text', { x: BLADE.x + BLADE.w / 2, y: BLADE.y + 6 + step * (i + 0.5) + size * 0.36, 'text-anchor': 'middle', 'font-size': f(size), 'font-weight': 600 }, blade);
    c.textContent = ch; bladeChars.push(c); });
}
setName(q.get('name') ?? '慢一点');

// the take-out window: lit pane, inside the barista and the machine, then the frame and counter in front
const TO = { x: 172, y: 288, w: 206, h: 60 };
const toPane = el('path', { d: `M${TO.x} ${TO.y} L${TO.x + TO.w} ${TO.y} L${TO.x + TO.w} ${TO.y + TO.h} L${TO.x} ${TO.y + TO.h}Z` }, scene);
const inside = el('g', {}, scene);
// the shop's light switch on the back wall, the cause of the whole light-up
inside.appendChild(LIGHT.get('b-switch')!);
const lever = LIGHT.get('b-switch')!.querySelectorAll('path')[2];
// espresso machine and a shelf of cups
shape(inside, 0.8).setAttribute('d', 'M196 312 L246 312 L246 348 L196 348Z');
pen(inside, 0.6).setAttribute('d', 'M202 320 L240 320 M210 330 L210 340 M232 330 L232 340');
blot(inside).setAttribute('d', 'M206 340 L214 340 L213 344 L207 344Z M228 340 L236 340 L235 344 L229 344Z');
pen(inside, 0.6).setAttribute('d', 'M300 300 L370 300');
for (let i = 0; i < 4; i++) shape(inside, 0.6).setAttribute('d', `M${310 + i * 15} 300 L${306 + i * 15} 292 L${318 + i * 15} 292 L${314 + i * 15} 300Z`);
// the barista: a figure seen above the counter, apron in the accent colour
// two pendant lamps hanging inside the window; their bulbs light first
const bulbs: SVGPathElement[] = [];
for (const lx of [222, 330]) { pen(inside, 0.5).setAttribute('d', `M${lx} ${TO.y} L${lx} ${TO.y + 9}`); shape(inside, 0.7).setAttribute('d', `M${lx - 6} ${TO.y + 15} Q${lx} ${TO.y + 6} ${lx + 6} ${TO.y + 15}Z`);
  bulbs.push(el('path', { d: `M${lx - 2.4} ${TO.y + 15} a2.4 2.4 0 0 0 4.8 0Z` }, inside)); }
const bar = el('g', {}, inside);
const barFarArm = limb(bar, 3.6), barTorso = paint(bar, '#efe6d6'), barApron = paint(bar, TERRA, PEN * 0.8);
const barHead = el('ellipse', { rx: 3.6, ry: 4.6, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN }, bar);
const barHair = blot(bar), barNearArm = limb(bar, 3.6), barCup = paint(bar, '#fdfcf8', PEN * 0.8);
// frame, mullion, counter and its front
const toFrame = pen(scene, 0.9);
toFrame.setAttribute('d', `M${TO.x - 5} ${TO.y - 5} L${TO.x + TO.w + 5} ${TO.y - 5} L${TO.x + TO.w + 5} ${TO.y + TO.h} M${TO.x - 5} ${TO.y + TO.h} L${TO.x - 5} ${TO.y - 5}`);
shape(scene, 0.9).setAttribute('d', `M${TO.x - 12} ${TO.y + TO.h} L${TO.x + TO.w + 12} ${TO.y + TO.h} L${TO.x + TO.w + 12} ${TO.y + TO.h + 6} L${TO.x - 12} ${TO.y + TO.h + 6}Z`);
shape(scene, 0.8).setAttribute('d', `M${TO.x - 5} ${TO.y + TO.h + 6} L${TO.x + TO.w + 5} ${TO.y + TO.h + 6} L${TO.x + TO.w + 5} ${GROUND} L${TO.x - 5} ${GROUND}Z`);
pen(scene, 0.45).setAttribute('d', Array.from({ length: 13 }, (_, i) => `M${TO.x + 4 + i * 16} ${TO.y + TO.h + 10} L${TO.x + 4 + i * 16} ${GROUND - 3}`).join(' '));
// two cups waiting on the counter, steaming
for (const x of [268, 286]) paint(scene, '#fdfcf8', 0.8).setAttribute('d', `M${x} ${TO.y + TO.h} L${x - 2} ${TO.y + TO.h - 11} L${x + 10} ${TO.y + TO.h - 11} L${x + 8} ${TO.y + TO.h}Z`);
const steam = [pen(scene, 0.55), pen(scene, 0.55), pen(scene, 0.55)];
// the awning over the window: stripes, a scalloped edge
const awning = el('g', {}, scene);
const awnFill = paint(awning, TERRA, 0.9);
awnFill.setAttribute('d', 'M166 258 L384 258 L398 280 L152 280Z');
const awnStripes = el('path', { fill: PAPER }, awning);
awnStripes.setAttribute('d', Array.from({ length: 11 }, (_, i) => { const a = 166 + i * 20, b = 152 + i * 22.4; return `M${a + 5} 258 L${a + 13} 258 L${b + 15} 280 L${b + 6} 280Z`; }).join(' '));
pen(awning, 0.8).setAttribute('d', 'M152 280 ' + Array.from({ length: 11 }, (_, i) => `Q${152 + i * 22.4 + 11.2} 289 ${152 + (i + 1) * 22.4} 280`).join(' '));
pen(awning, 0.9).setAttribute('d', 'M166 258 L384 258 L398 280 M166 258 L152 280');
scene.appendChild(LIGHT.get('b-shop-rim')!);

// the door: glass, a handle, a little bell
shape(scene, 0.9).setAttribute('d', `M398 288 L444 288 L444 ${GROUND} L398 ${GROUND}Z`);
const doorPane = el('path', { d: 'M405 296 L437 296 L437 336 L405 336Z' }, scene);
pen(scene, 0.7).setAttribute('d', 'M405 296 L437 296 L437 336 L405 336Z M432 350 L432 358 M405 344 L437 344');
// an OPEN tag hanging in the door glass, swinging when the wind gusts
const tag = el('g', {}, scene), tagSwing = pendulum(22, 1.4);
pen(tag, 0.5).setAttribute('d', 'M-5 0 L0 -6 L5 0');
paint(tag, '#efe6d6', 0.6).setAttribute('d', 'M-9 0 L9 0 L9 9 L-9 9Z');
const tagText = el('text', { x: 0, y: 6.8, 'text-anchor': 'middle', 'font-size': 5.2, 'letter-spacing': 0.6, fill: '#3e403a', style: 'font-family: Menlo, monospace' }, tag);
tagText.textContent = 'OPEN';
const bell = el('g', {}, scene), bellSwing = pendulum(30, 2.2);
paint(bell, '#c9a14a', 0.6).setAttribute('d', 'M0 0 Q-4 0 -4 5 L4 5 Q4 0 0 0Z');
pen(scene, 0.5).setAttribute('d', 'M404 284 L404 289');
// plinth and a doormat
pen(scene, 0.5).setAttribute('d', `M${B.x0} ${GROUND - 12} L${B.x0 + 26} ${GROUND - 12} M${B.x1 - 14} ${GROUND - 12} L${B.x1} ${GROUND - 12}`);
paint(scene, '#8a6a52', 0.6).setAttribute('d', `M400 ${GROUND - 2} L442 ${GROUND - 2} L444 ${GROUND + 2} L398 ${GROUND + 2}Z`);

// ---- a menu board on the right, the street lamp
// a chalkboard A-frame: wooden legs, a dark board, a cup and a few chalk strokes for the menu (no lettering)
// the board fills the frame down to a low crossbar, so it reads as an A-board, not a sign on a stool
pen(scene, 0.8).setAttribute('d', `M474 ${GROUND} L482 ${GROUND - 52} L498 ${GROUND - 52} L506 ${GROUND} M477 ${GROUND - 9} L503 ${GROUND - 9}`);
paint(scene, '#2f3a36', 0.8).setAttribute('d', `M481.5 ${GROUND - 49} L498.5 ${GROUND - 49} L503 ${GROUND - 13} L477 ${GROUND - 13}Z`);
const chalk = el('g', { stroke: '#efe9dc', fill: 'none', 'stroke-width': 0.55, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, scene);
el('path', { d: `M486 ${GROUND - 44} L494 ${GROUND - 44} L493 ${GROUND - 38} Q490 ${GROUND - 36} 487 ${GROUND - 38}Z M494 ${GROUND - 42.5} q2.4 0.2 1.6 2.6 q-0.6 1 -2 0.6 M488.4 ${GROUND - 46.5} q1 -1 0 -2.4 M491.4 ${GROUND - 46.8} q1 -1 0 -2.6` }, chalk);
el('path', { d: `M483 ${GROUND - 31} q4 -0.8 7 0 t7 0 M483.5 ${GROUND - 26} l9 0 M495 ${GROUND - 26} l2 0 M483 ${GROUND - 21} l7 0 M494.5 ${GROUND - 21} l3 0 M483 ${GROUND - 16.5} l10 0` }, chalk);
pen(scene, 1.0).setAttribute('d', `M548 ${GROUND} L548 150 Q548 138 536 138 L528 138`);
pen(scene, 0.6).setAttribute('d', `M543 ${GROUND} L553 ${GROUND} M545 ${GROUND - 4} L551 ${GROUND - 4}`);
const lampHead = el('path', { d: 'M520 140 L536 140 L533 152 L523 152Z' }, scene);
pen(scene, 0.8).setAttribute('d', 'M520 140 L536 140 L533 152 L523 152Z M528 136 L528 140');

// ---- the passer-by, back to front, in figure space (feet on y 120)
const fig = el('g', { style: 'cursor:pointer' }, scene);
const farArm = limb(fig, 3.6);
const tote = paint(fig, TEAL, PEN * 0.8), toteStrap = pen(fig, PEN * 0.7);
const legs = [limb(fig, 4.4), limb(fig, 4.4)];
const shoes = [blot(fig), blot(fig)];
const jacket = paint(fig, TERRA);
const jacketSeam = pen(fig, PEN * 0.6);
const figRim = el('path', { fill: 'none', stroke: '#FFD9A0', 'stroke-width': 0.95, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, fig);   // the edge that faces the light
const head = el('ellipse', { rx: 3.6, ry: 4.6, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN }, fig);
const hair = blot(fig);
const nearArm = limb(fig, 3.6);
const cup = paint(fig, '#fdfcf8', PEN * 0.8), lid = blot(fig);
const cupSteam = [pen(fig, PEN * 0.5), pen(fig, PEN * 0.5)];
legs.forEach((l) => { const n = l.g.querySelector('path')!; n.classList.remove('pp'); n.setAttribute('fill', '#3e403a'); });

const walk = gait({ kind: 'walk' });
const wind = pointerWind(svg, 0.2);
const armSwing = [spring(60, 9), spring(60, 9)];
const toteSwing = pendulum(12, 1.6);
const SPEED = walk.speed * SCALE, ENTER = FR.vb[0] - 48, EXIT = FR.vb[0] + FR.vb[2] + 48;
let phase = 0, x = Number(q.get('x') ?? ENTER), raiseT = -1, prevTl = 0, waiting = false;
const RAISE = { stop: 0.4, up: 0.45, hold: 0.9, down: 0.4 };
const RAISE_END = RAISE.stop + RAISE.up + RAISE.hold + RAISE.down + 0.3;
fig.addEventListener('pointerdown', () => { if (raiseT < 0) raiseT = 0; });
(window as unknown as { __raise: () => void }).__raise = () => { if (raiseT < 0) raiseT = 0; };

const tauFixed = q.has('tau') ? Number(q.get('tau')) : null, lightFixed = q.has('lightT') ? Number(q.get('lightT')) : null;
// a 24 s loop, one small story: an empty street by day; the passer-by walks in; dusk; at 7.7 s the barista presses the
// switch and the light-up runs two seconds as the sky goes to night, peaking when the passer-by reaches the window; they
// walk on under the street lamp and out; from 18 s the lights go off with causes — upstairs right (+0.3), upstairs left
// (+0.9), the barista switches the shop off (+1.3–1.6, window last), the street lamp and the door as it gets light (+2.4)
// the walker enters at 0 s and is in the window's light (x ≈ 300) at the peak (DUSK + 0.9 s); night holds until they've
// gone (+0.8 s), then the lights-off and the return to day take 6 s. 4:3 → 24 s; the wide desktop frame runs longer.
const DUSK = (300 - ENTER) / SPEED - 0.9, NIGHT_END = (EXIT - ENTER) / SPEED + 0.8, CYCLE = NIGHT_END + 6;
(window as unknown as { __cycle: number }).__cycle = CYCLE;
const O = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);                    // ≈ cubic-bezier(.16,1,.3,1)
const P = (x: number, a: number, b: number) => clamp((x - a) / (b - a), 0, 1);
const hex = (h: string): RGB => toRGB(h);
const mixHex = (a: string, b: string, k: number) => rgb(mix(hex(a), hex(b), k));
const lerpP = (a: Vec, b: Vec, t: number): Vec => { t = clamp(t, 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };

run((t, dt) => {
  // ---- time of day and the light-up clock (lt: seconds since the switch; negative before it)
  const tl = t % CYCLE;
  // day holds 1.5 s, darkens to dusk by the switch; the ink flips inside the two-second light-up (never held); night holds
  // until the passer-by has gone; then the lights go off and it brightens back to day by 23 s
  const tau = tauFixed ?? (tl < DUSK ? 0.66 + 0.074 * ease(P(tl, 1.5, DUSK)) : tl < DUSK + 2 ? 0.734 + 0.126 * ease((tl - DUSK) / 2) : tl < NIGHT_END ? 0.86 : 0.86 - 0.2 * ease((tl - NIGHT_END) / 5));
  const lt = lightFixed ?? (tauFixed !== null ? (tauFixed >= 0.8 ? 9 : -1) : tl >= DUSK ? tl - DUSK : -1);
  const ot = tauFixed === null && lightFixed === null && tl >= NIGHT_END ? tl - NIGHT_END : -1;            // seconds into the lights-off
  const offAt = (a: number, d: number) => (ot < 0 ? 1 : 1 - ease(P(ot, a, a + d)));
  const Pl = palette(tau);
  applyPalette(svg, Pl);
  skyTop.setAttribute('stop-color', rgb(Pl.top)); skyBot.setAttribute('stop-color', rgb(Pl.bottom));
  const sunY = 110 + 70 * smooth(0.66, 0.75, tau);   // sets low on the left, behind nothing, gone before the light-up
  sunMoon.setAttribute('cx', f(Pl.night > 0.5 ? FR.moon[0] : 82)); sunMoon.setAttribute('cy', f(Pl.night > 0.5 ? FR.moon[1] : sunY));
  sunMoon.setAttribute('fill', Pl.night > 0.5 ? '#efe6cf' : '#f2c678'); sunMoon.setAttribute('opacity', f(Pl.night > 0.5 ? smooth(0.5, 0.9, Pl.night) : 1 - smooth(0.71, 0.75, tau)));

  // the beats: pendants .46, the name .54, the window .72 → peak .90 then settles, light lands .76,
  // door and street lamp 1.10, upstairs left 1.42, right 1.76
  const on = lt < 0 ? 0 : 1, shopOff = offAt(1.62, 0.36);
  const pend = O(P(lt, 0.46, 0.54)) * on * offAt(1.6, 0.18), signK = O(P(lt, 0.54, 0.64)) * on * offAt(1.66, 0.3);
  const win = O(P(lt, 0.72, 0.9)) * on * shopOff, settle = ease(P(lt, 0.94, 1.16));
  const ground = O(P(lt, 0.76, 0.94)) * (1 - 0.18 * settle) * on * shopOff, rim = O(P(lt, 0.75, 0.93)) * (1 - 0.18 * settle) * on * shopOff;
  const door = O(P(lt, 1.1, 1.28)) * on * offAt(2.4, 0.5);
  const upLk = ease(P(lt, 1.42, 1.64)) * on * offAt(0.9, 0.35), upRk = ease(P(lt, 1.76, 1.96)) * on * offAt(0.3, 0.35);
  const lit = (warm: string, k: number) => rgb(mix(Pl.paper, hex(warm), k));
  toPane.setAttribute('fill', rgb(mix(Pl.paper, mix(hex('#FFE4AE'), hex('#F0C77F'), settle), win)));   // peak, then settles warmer
  bulbs.forEach((b) => b.setAttribute('fill', lit('#FFF1C4', pend)));
  doorPane.setAttribute('fill', lit('#F0C77F', door)); lampHead.setAttribute('fill', lit('#FFD18A', door));
  upL.setAttribute('fill', lit('#F0C77F', upLk)); upR.setAttribute('fill', lit('#F0C77F', upRk));
  LIGHT.get('b-ground-light')!.setAttribute('opacity', f(ground)); LIGHT.get('b-shop-rim')!.setAttribute('opacity', f(rim));
  LIGHT.get('b-door-and-road')!.setAttribute('opacity', f(door));
  LIGHT.get('b-upper-sill-left')!.setAttribute('opacity', f(upLk)); LIGHT.get('b-upper-sill-right')!.setAttribute('opacity', f(upRk));
  // the blade sign: paper face and ink letters by day; at night an unlit face with pale letters, then the lightbox comes on
  // (a warm face, the letters dark against it, the way a lit sign reads)
  const n = Pl.inkT;
  bladeFace.setAttribute('fill', rgb(mix(Pl.paper, hex('#FFE7B4'), signK)));
  const letter = rgb(mix(Pl.ink, hex('#5A3B2A'), signK));
  bladeChars.forEach((c) => c.setAttribute('fill', letter));
  // the plants darken at night ; they don't glow
  for (const [k, d, nn] of [['leaf-dark', '#526F5F', '#344C42'], ['leaf', '#6F8870', '#405C50'], ['leaf-light', '#A2B28A', '#71806A'], ['flower', '#BA7967', '#7C5250'],
    ['flower-heart', '#E2C38A', '#8C7A58'], ['box', '#98755B', '#5A4A44'], ['pot', '#A99278', '#5F5650'], ['plant-ink', '#596653', '#7D8978']] as const)
    svg.style.setProperty(`--b-${k}`, mixHex(d, nn, n));
  // the switch's lever flips at .38–.44
  lever.setAttribute('transform', `rotate(${f(lt < 0 ? -25 : 25 - 50 * ease(P(ot, 1.52, 1.58)) - (ot < 0 ? 50 * (1 - ease(P(lt, 0.38, 0.44))) : 0))} 303.5 319)`);
  awnFill.setAttribute('fill', nightTint(TERRA, Pl));
  jacket.setAttribute('fill', nightTint(TERRA, Pl)); tote.setAttribute('fill', nightTint(TEAL, Pl)); barApron.setAttribute('fill', nightTint(TERRA, Pl));
  wind.step(t);

  // ---- the barista: weight shifts, the near arm tends the cup
  const sway = Math.sin(t * 1.3) * 0.8;
  place(bar, 330 + sway, 392, -1, 0.95);
  const bs: Vec = [41, 44], bh: Vec = [42.4, 33.6 + Math.sin(t * 1.3 + 1) * 0.4];
  barTorso.setAttribute('d', `M${bs[0] - 7} ${bs[1]} Q${bs[0]} ${bs[1] - 3} ${bs[0] + 7} ${bs[1]} L${bs[0] + 8} ${bs[1] + 40} L${bs[0] - 8} ${bs[1] + 40}Z`);
  barApron.setAttribute('d', `M${bs[0] - 4} ${bs[1] + 8} L${bs[0] + 5} ${bs[1] + 8} L${bs[0] + 7} ${bs[1] + 40} L${bs[0] - 6} ${bs[1] + 40}Z`);
  barHead.setAttribute('cx', f(bh[0])); barHead.setAttribute('cy', f(bh[1]));
  barHair.setAttribute('d', `M${f(bh[0] - 3.8)} ${f(bh[1] - 1)} Q${f(bh[0] - 3)} ${f(bh[1] - 5.6)} ${f(bh[0] + 1)} ${f(bh[1] - 5)} Q${f(bh[0] + 4.4)} ${f(bh[1] - 4)} ${f(bh[0] + 3.4)} ${f(bh[1] - 1.4)} Q${f(bh[0])} ${f(bh[1] - 3)} ${f(bh[0] - 3.8)} ${f(bh[1] - 1)}Z M${f(bh[0] - 5.4)} ${f(bh[1] - 3.2)} a2.2 2.2 0 1 0 0.1 0Z`);
  const work = Math.sin(t * 2.1) * 0.5 + 0.5;
  // the far arm reaches the switch (.18–.38), presses (.38–.44) and comes back (.44–.70); the target is the switch's world
  // point (303.5, 319) taken into the barista's mirrored space
  const reach = lt < 0 ? 0 : ot >= 0 ? ease(P(ot, 1.3, 1.5)) * (1 - ease(P(ot, 1.58, 1.84))) : ease(P(lt, 0.18, 0.38)) * (1 - ease(P(lt, 0.44, 0.7)));
  const swTarget: Vec = [40 - (303.5 - (330 + sway)) / 0.95, 120 + (319 - 392) / 0.95];
  const fsh: Vec = [bs[0] - 4, bs[1] + 3], fHand = lerpP([bs[0] + 8, bs[1] + 26], swTarget, reach);
  const e1 = joint(fsh, fHand, 17, 17, 1), e2 = joint(fsh, fHand, 17, 17, -1), fElb = reach > 0.01 ? (e1[1] > e2[1] ? e1 : e2) : [bs[0] - 2, bs[1] + 18] as Vec;
  barFarArm.draw([fsh, fElb, fHand], [0.2, 0.5]);
  const bHand: Vec = [bs[0] + 15 + 2 * work, bs[1] + 22 - 4 * work];
  barNearArm.draw([[bs[0] + 4, bs[1] + 3], [bs[0] + 6, bs[1] + 17], bHand], [0.2, 0.4]);
  barCup.setAttribute('d', `M${f(bHand[0] - 1)} ${f(bHand[1] - 7)} L${f(bHand[0] + 7)} ${f(bHand[1] - 7)} L${f(bHand[0] + 6)} ${f(bHand[1] + 1)} L${f(bHand[0])} ${f(bHand[1] + 1)}Z`);

  // ---- steam over the counter cups, plant leaves, the door bell
  steam.forEach((s, i) => {
    const u = ((t * 0.45 + i / 3) % 1), x0 = 273 + (i % 2) * 18, y0 = TO.y + TO.h - 13 - u * 22, w = Math.sin(t * 2 + i) * 1.6;
    s.setAttribute('d', `M${f(x0)} ${f(y0)} q${f(2 + w)} -3 0 -6 q${f(-2 + w)} -3 0 -6`); s.setAttribute('opacity', f(Math.sin(Math.PI * u) * 0.8));
  });
  swayers.forEach((w, i) => { const a = w.s.step(clamp(wind.value / 2.4, -1, 1) * w.deg + Math.sin(t * 0.9 + i) * 0.08 * w.deg, dt);
    w.g.setAttribute('transform', `rotate(${f(a)} ${w.px} ${w.py})`); });
  bell.setAttribute('transform', `translate(404 289) rotate(${f(bellSwing.step(wind.value * 0.6, dt) * 57.3)})`);
  blade.setAttribute('transform', `rotate(${f(bladeSwing.step(wind.value * 0.35 + Math.sin(t * 0.5) * 0.05, dt) * 57.3)} ${pt(BLADE.hang)})`);
  tag.setAttribute('transform', `translate(421 312) rotate(${f(tagSwing.step(wind.value * 0.4 + Math.sin(t * 0.7) * 0.15, dt) * 57.3)})`);

  // ---- the passer-by: walking, or the cup-raise sequence (stop → raise → hold → lower → walk on)
  let up = 0, go = 1;
  if (raiseT >= 0) {
    raiseT += dt;
    const s1 = RAISE.stop, s2 = s1 + RAISE.up, s3 = s2 + RAISE.hold, s4 = s3 + RAISE.down;
    go = raiseT < s1 ? 1 - ease(raiseT / s1) : raiseT < s4 ? 0 : ease((raiseT - s4) / 0.3);
    up = raiseT < s1 ? 0 : raiseT < s2 ? ease((raiseT - s1) / RAISE.up) : raiseT < s3 ? 1 : raiseT < s4 ? 1 - ease((raiseT - s3) / RAISE.down) : 0;
    if (raiseT > RAISE_END) raiseT = -1;
  }
  phase += (dt / walk.period) * go;
  // one crossing per cycle, on the same clock as the day: the passer-by enters from the left as the loop starts (x −50 at
  // 0 s puts them in the window's light at the light-up's peak, 8.6 s) and leaves on the right before the lights go off.
  // Off-screen they wait for the next loop; if a click held them up, they finish their walk first, never jump.
  const free = tauFixed !== null || lightFixed !== null;
  if (!waiting) x += SPEED * dt * go;
  if (x > EXIT) { if (free) x = ENTER; else waiting = true; }
  if (!free && waiting && tl < prevTl) { waiting = false; x = ENTER; }
  prevTl = tl;
  place(fig, x, GROUND, 1, SCALE);
  const inLight = smooth(176, 196, x) * (1 - smooth(372, 396, x));
  walkerShadow.setAttribute('d', `M${f(x - 6)} 373 L${f(x + 6)} 373 L${f(x + 52)} 391 L${f(x + 42)} 392Z`);
  walkerShadow.setAttribute('opacity', f(0.26 * ground * inLight));
  // under the street lamp: a point light ~220 above the ground, the figure ~100 tall → shadow ≈ 0.85 × distance, thrown
  // away from the lamp along the pavement, fading with distance from the pool
  const dxl = x - LAMP.x, near = 1 - smooth(70, 150, Math.abs(dxl)), lampOn = door;
  const len = Math.max(8, Math.abs(dxl) * 0.85), dir = dxl >= 0 ? 1 : -1;
  lampShadow.setAttribute('d', `M${f(x - 5)} ${GROUND + 1} L${f(x + 5)} ${GROUND + 1} L${f(x + dir * len + 6)} ${GROUND + 9} Q${f(x + dir * (len + 4))} ${GROUND + 10} ${f(x + dir * len - 2)} ${GROUND + 9}Z`);
  lampShadow.setAttribute('opacity', f(0.7 * lampOn * near));
  lampLight.setAttribute('opacity', f(lampOn));
  // the light on the figure: clothes warm up near the lamp or in the window's pool
  const warmK = Math.max(near * lampOn, inLight * ground) * 0.35;
  // which side faces the light: the window's (centre x≈275) or the lamp's, whichever is stronger here; walking right, the
  // front edge faces a light ahead, the back edge one behind
  const winW = inLight * ground, lampW = near * lampOn, front = winW > lampW ? x < 275 : x < LAMP.x;
  const rimK = Math.min(1, Math.max(winW, lampW) * 1.4);
  const tinted = (c: string) => { const b = hex(c); return mix(b, mix(b, [12, 16, 30], 0.6), Pl.inkT * 0.55); };   // = nightTint, as RGB
  jacket.setAttribute('fill', rgb(mix(tinted(TERRA), hex('#FFD18A'), warmK)));
  tote.setAttribute('fill', rgb(mix(tinted(TEAL), hex('#FFD18A'), warmK * 0.8)));

  const p = walk.pose(phase, go);
  // gait.ts lets the hip drop 1.6 units in one frame as each foot plants, which reads as a hitch every step; use a smooth
  // bob instead (lowest at double support, phase ≈ 0.47 / 0.97) and solve the knees again for that hip
  const b = 1.62 * (0.5 + 0.5 * Math.cos(4 * Math.PI * (phase - 0.467))) * go;
  const hip: Vec = [p.hip[0], p.hip[1] - p.bob + b];
  p.feet.forEach((fo, i) => { const kn = joint(hip, fo.ankle, walk.thigh, walk.shin, 1); legs[i].draw([hip, kn, fo.ankle], [0.3, 0.8]); shoe(shoes[i], fo.ankle, fo.pitch); });
  fig.insertBefore(legs[p.front].g, jacket); fig.insertBefore(shoes[p.front], jacket);

  // short jacket drawn around the hips; it lifts a touch at the near side when the arm is raised
  const sh: Vec = [41, 41 + b], hemY = 74 + b;
  jacket.setAttribute('d', `M${f(sh[0] - 6)} ${f(sh[1] + 1)} Q${f(sh[0] - 1)} ${f(sh[1] - 2.4)} ${f(sh[0] + 5)} ${f(sh[1] + 1)} L${f(sh[0] + 7.4)} ${f(hemY - 1.5 * up)} Q${f(sh[0] + 1)} ${f(hemY + 2)} ${f(sh[0] - 8)} ${f(hemY + 0.6)} L${f(sh[0] - 7.6)} ${f(sh[1] + 12)}Z`);
  jacketSeam.setAttribute('d', `M${f(sh[0] + 2.6)} ${f(sh[1] + 4)} L${f(sh[0] + 3.4)} ${f(hemY - 1)}`);
  // the rim: a fine warm line on the lit side only — the head's edge, the shoulder, the jacket's side (not a glow round
  // the whole figure); the clothes keep their own colours
  const hy = 31.6 + b;
  figRim.setAttribute('d', front
    ? `M${f(42.6 + 2.6)} ${f(hy - 3.6)} Q${f(42.6 + 4.2)} ${f(hy)} ${f(42.6 + 2.8)} ${f(hy + 3.4)} M${f(sh[0] + 5.2)} ${f(sh[1] + 1.4)} L${f(sh[0] + 7.2)} ${f(hemY - 2 - 1.5 * up)}`
    : `M${f(42.6 - 2.6)} ${f(hy - 3.6)} Q${f(42.6 - 4.2)} ${f(hy)} ${f(42.6 - 2.8)} ${f(hy + 3.4)} M${f(sh[0] - 6.2)} ${f(sh[1] + 1.6)} L${f(sh[0] - 7.6)} ${f(sh[1] + 12)} L${f(sh[0] - 7.9)} ${f(hemY - 0.6)}`);
  figRim.setAttribute('opacity', f(rimK * Pl.inkT));

  const hc: Vec = [42.6, 31.6 + b];
  head.setAttribute('cx', f(hc[0])); head.setAttribute('cy', f(hc[1]));
  hair.setAttribute('d', `M${f(hc[0] - 4)} ${f(hc[1] + 1.4)} Q${f(hc[0] - 4.6)} ${f(hc[1] - 5.6)} ${f(hc[0] + 0.6)} ${f(hc[1] - 5.2)} Q${f(hc[0] + 4.6)} ${f(hc[1] - 4.8)} ${f(hc[0] + 3.8)} ${f(hc[1] - 1.6)} Q${f(hc[0] + 0.4)} ${f(hc[1] - 3.2)} ${f(hc[0] - 1.6)} ${f(hc[1] - 1.2)} Q${f(hc[0] - 2.6)} ${f(hc[1] + 0.6)} ${f(hc[0] - 4)} ${f(hc[1] + 1.4)}Z`);

  // arms swing opposite the legs through springs; the near hand holds the cup and raises it to us
  const legSwing = (p.feet[0].ankle[0] - 40) / (walk.stride / 2);
  const farA = armSwing[0].step(-legSwing * 16 * go, dt) * Math.PI / 180;
  const nearA = armSwing[1].step(legSwing * 12 * go, dt) * Math.PI / 180;
  const shF: Vec = [sh[0] - 1, sh[1] + 2], shN: Vec = [sh[0] + 1.6, sh[1] + 2.4];
  const elbF: Vec = [shF[0] + 17 * Math.sin(farA), shF[1] + 17 * Math.cos(farA)];
  const handF: Vec = [elbF[0] + 15 * Math.sin(farA + 0.35), elbF[1] + 15 * Math.cos(farA + 0.35)];
  farArm.draw([shF, elbF, handF], [0.2, 0.5]);
  // the tote hangs from the far shoulder and swings with the walk
  const ta = toteSwing.step(-Math.cos(4 * Math.PI * phase) * 1.4 * go - wind.value * 0.25, dt);
  const strapTop: Vec = [shF[0] - 1, shF[1]], bagTop: Vec = [shF[0] - 6 + ta * 6, shF[1] + 24];
  toteStrap.setAttribute('d', `M${pt(strapTop)} Q${f(strapTop[0] - 5)} ${f(strapTop[1] + 12)} ${pt(bagTop)} M${pt(strapTop)} Q${f(strapTop[0] + 1)} ${f(strapTop[1] + 12)} ${f(bagTop[0] + 9)} ${f(bagTop[1])}`);
  tote.setAttribute('d', `M${f(bagTop[0] - 2)} ${f(bagTop[1])} L${f(bagTop[0] + 11)} ${f(bagTop[1])} L${f(bagTop[0] + 12 + ta * 3)} ${f(bagTop[1] + 15)} L${f(bagTop[0] - 3 + ta * 3)} ${f(bagTop[1] + 15)}Z`);

  const elbWalk: Vec = [shN[0] + 15 * Math.sin(nearA), shN[1] + 15 * Math.cos(nearA)];
  const handWalk: Vec = [elbWalk[0] + 9, elbWalk[1] + 6];                 // forearm forward, cup held in front
  const handUp: Vec = [hc[0] + 13, hc[1] + 1], elbUp: Vec = [shN[0] + 11, shN[1] + 10];
  const elb = lerpP(elbWalk, elbUp, up), hand = lerpP(handWalk, handUp, up);
  nearArm.draw([shN, elb, hand], [0.2, 0.4]);
  const tilt = -14 * up;
  cup.setAttribute('transform', `rotate(${f(tilt)} ${pt(hand)})`); lid.setAttribute('transform', `rotate(${f(tilt)} ${pt(hand)})`);
  cup.setAttribute('d', `M${f(hand[0] - 2.6)} ${f(hand[1] - 9)} L${f(hand[0] + 5.6)} ${f(hand[1] - 9)} L${f(hand[0] + 4.6)} ${f(hand[1] + 2)} L${f(hand[0] - 1.6)} ${f(hand[1] + 2)}Z`);
  lid.setAttribute('d', `M${f(hand[0] - 3.4)} ${f(hand[1] - 9)} L${f(hand[0] + 6.4)} ${f(hand[1] - 9)} L${f(hand[0] + 5.6)} ${f(hand[1] - 11)} L${f(hand[0] - 2.6)} ${f(hand[1] - 11)}Z`);
  cupSteam.forEach((s, i) => {
    const u = ((t * 0.6 + i * 0.5) % 1), sx = hand[0] + 1.4 + i * 2.4, sy = hand[1] - 12 - u * 9;
    s.setAttribute('d', `M${f(sx)} ${f(sy)} q1.6 -2 0 -4 q-1.6 -2 0 -4`); s.setAttribute('opacity', f(Math.sin(Math.PI * u) * 0.7));
  });
});
