// Lookbook: the looks stand in a ring, the front one sharp and the rest smaller, higher and softer as they go back.
// Tap the front look to step into it: the others clear away and numbered pins appear on its pieces. The panel always
// lists the front look's pieces; a piece opens its sizes, a size puts it in the bag, and the whole look goes in at a bundle price.
(() => {
  const D = window.LOOKBOOK, N = D.looks.length;
  const $ = (id) => document.getElementById(id);
  const stage = $("stage"), ring = $("ring"), itemsEl = $("items");
  const AUTOPLAY = 4.5;                                   // seconds per look when playing
  // by distance from the front: sideways (share of stage width), lift (share of stage height), scale, blur, opacity
  const DEPTH = [
    { x: 0, y: 0, s: 1, b: 0, o: 1 },
    { x: 0.25, y: 0.035, s: 0.8, b: 2.2, o: 0.96 },
    { x: 0.42, y: 0.06, s: 0.66, b: 4.5, o: 0.7 },
    { x: 0.52, y: 0.08, s: 0.56, b: 7, o: 0 },
  ];
  let cur = 0, focus = false, playing = true, timer = null, bag = 0, active = -1;
  const money = (v) => D.currency + v.toLocaleString("en-US");

  // language: the address (?lang=en) wins, then the visitor's last choice, then the page default
  let lang = new URLSearchParams(location.search).get("lang");
  if (!D.text[lang]) { try { lang = localStorage.getItem("lookbook-lang"); } catch (e) { lang = null; } }
  if (!D.text[lang]) lang = D.lang;
  const T = () => D.text[lang];
  const tr = (v) => (v && typeof v === "object" ? v[lang] : v);
  // try-on: a look's outer-layer options are its own and its tryOn ones; wear holds the one each look has on (0: its own)
  const options = (i) => [{ from: i, model: D.looks[i].model }].concat(D.looks[i].tryOn);
  const wear = D.looks.map(() => 0);
  const itemsOf = (i) => {
    const its = D.looks[i].items.slice();
    its[0] = D.looks[options(i)[wear[i]].from].items[0];
    return its;
  };

  $("brand").textContent = D.brand;

  // the looks and their pins
  const looks = D.looks.map((l, i) => {
    const el = document.createElement("div");
    el.className = "look";
    el.style.setProperty("--m", `url(${l.model})`);
    el.innerHTML = `<img src="${l.model}" alt="" draggable="false"><span class="shine"></span>` +
      l.pins.map(([x, y], k) => `<button class="pin" data-k="${k}" style="left:${x}%;top:${y}%">${k + 1}<span class="tip"></span></button>`).join("");
    el.addEventListener("click", (e) => {
      const pin = e.target.closest(".pin");
      if (pin) { if (focus && i === cur) pick(+pin.dataset.k, true); return; }
      if (i === cur) { if (!focus) setFocus(true); } else go(i);
    });
    ring.appendChild(el);
    return el;
  });

  // the step bar under the stage
  $("steps").innerHTML = D.looks.map((l, i) =>
    `<div class="step" data-i="${i}"><i></i>${String(i + 1).padStart(2, "0")}<span class="nm"></span></div>`).join("");
  const steps = [...document.querySelectorAll(".step")];
  steps.forEach((s, i) => s.addEventListener("click", () => go(i)));

  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    looks.forEach((el, i) => {
      let r = (i - cur + N) % N; if (r > N / 2) r -= N;   // signed distance from the front
      const d = DEPTH[Math.min(Math.abs(r), DEPTH.length - 1)], sign = Math.sign(r);
      let x = sign * d.x * w, y = -d.y * h, s = d.s, b = d.b, o = d.o;
      if (focus) {
        if (r === 0) { s = w < 700 ? 1.22 : 1.04; y = -0.01 * h; }   // on a phone the picked look fills more of the stage
        else { x = sign * (d.x * w + w * 0.35); o = 0; b = d.b + 8; }
      }
      el.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px) scale(${s})`;
      el.style.filter = b ? `blur(${b}px)` : "none";
      el.style.opacity = o;
      el.style.zIndex = 20 - Math.abs(r);
      el.classList.toggle("front", r === 0);
      el.style.pointerEvents = o < 0.1 ? "none" : "";
    });
    steps.forEach((s, i) => s.classList.toggle("on", i === cur));
  }

  // the panel changes like the reference: the old pieces and the price go at once (the flash), a blank of about 0.43 s while
  // the ring turns, then the new pieces come out of a heavy blur one after another, the price fades back and the button darkens
  let swap = 0;
  function panel() {
    const token = ++swap, bundle = document.querySelector(".bundle"), btn = $("addAll");
    itemsEl.innerHTML = "";
    bundle.classList.add("hide"); btn.classList.add("loading");
    setTimeout(() => { if (token === swap) fill(); }, 430);
    setTimeout(() => { if (token === swap) bundle.classList.remove("hide"); }, 450);
    setTimeout(() => { if (token === swap) btn.classList.remove("loading"); }, 600);
  }
  function fill() {
    const l = D.looks[cur], items = itemsOf(cur);
    itemsEl.innerHTML = items.map((it, k) =>
      `<li class="item" data-k="${k}"><div class="ph"><img src="${it.img}" alt=""><em>${k + 1}</em></div>` +
      `<div class="meta"><small>${tr(it.cat)}</small><b>${tr(it.name)}</b><span>${money(it.price)}</span></div>` +
      `<button class="add" aria-label="${T().choose}">+</button>` +
      `<div class="sizes">${tr(it.sizes).split(" ").map((z) => `<button>${z}</button>`).join("")}</div></li>`).join("");
    const rows = [...itemsEl.children];
    rows.forEach((row, k) => {
      requestAnimationFrame(() => setTimeout(() => row.classList.add("in"), k * 100));
      row.querySelector(".add").addEventListener("click", () => pick(k, !row.classList.contains("open")));
      row.addEventListener("mouseenter", () => glow(k, true));
      row.addEventListener("mouseleave", () => glow(k, false));
      row.querySelectorAll(".sizes button").forEach((b) => b.addEventListener("click", () => {
        row.querySelectorAll(".sizes button").forEach((x) => x.classList.remove("picked"));
        b.classList.add("picked");
        addToBag(1, `${tr(items[k].name)} · ${b.textContent}`);
        setTimeout(() => pick(k, false), 500);
      }));
    });
    const total = items.reduce((a, it) => a + it.price, 0);
    $("bundleNote").textContent = T().bundleNote(items.length, Math.round(D.bundleOff * 100));
    $("was").textContent = money(total);
    $("now").textContent = money(Math.round(total * (1 - D.bundleOff)));
    $("focusKicker").textContent = `${T().look} ${String(cur + 1).padStart(2, "0")}`;
    $("focusTitle").textContent = tr(l.title);
    active = -1;
    rack();
  }

  // open one piece: its row opens its sizes, its pin turns dark
  function pick(k, open) {
    [...itemsEl.children].forEach((row, j) => row.classList.toggle("open", open && j === k));
    looks[cur].querySelectorAll(".pin").forEach((p, j) => p.classList.toggle("on", open && j === k));
    active = open ? k : -1;
    if (open) { stop(); itemsEl.children[k].scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }
  function glow(k, on) {
    itemsEl.children[k].classList.toggle("hl", on);
    if (active < 0) looks[cur].querySelectorAll(".pin")[k].classList.toggle("on", on && focus);
  }

  function addToBag(n, what) {
    bag += n; $("bagCount").textContent = bag;
    const b = $("bag"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    const t = $("toast"); t.textContent = T().toast(what); t.classList.add("on");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 1800);
  }
  $("addAll").addEventListener("click", (e) => {
    const l = D.looks[cur], btn = e.currentTarget;
    addToBag(l.items.length, `${tr(l.title)} · ${T().pieces(l.items.length)}`);
    btn.classList.add("done"); $("addAllText").textContent = T().added;
    clearTimeout(btn._h); btn._h = setTimeout(() => { btn.classList.remove("done"); $("addAllText").textContent = T().addAll; }, 1800);
  });

  // run the sheen over every look, the front first and the rest a beat later by distance
  function sheen() {
    looks.forEach((el, i) => {
      let r = (i - cur + N) % N; if (r > N / 2) r -= N;
      el.style.setProperty("--d", (0.12 + Math.abs(r) * 0.07) + "s");
      el.classList.remove("sheen"); void el.offsetWidth; el.classList.add("sheen");
    });
  }

  function go(i) {
    cur = (i + N) % N; sheen();
    if (focus) setFocus(false, true);
    layout(); panel(); if (playing) arm();
  }
  function setFocus(on, quiet) {
    focus = on;
    stage.classList.toggle("focus", on);
    cursor.classList.remove("ring");
    if (!on) pick(-1, false);
    if (on) stop();
    if (!quiet) layout();
  }
  $("close").addEventListener("click", () => setFocus(false));
  $("prev").addEventListener("click", () => go(cur - 1));
  $("next").addEventListener("click", () => go(cur + 1));

  // autoplay: the front step's bar fills, then the ring turns
  function arm() {
    clearTimeout(timer);
    steps.forEach((s) => s.classList.remove("timing"));
    if (!playing) return;
    const s = steps[cur]; s.style.setProperty("--dur", AUTOPLAY + "s"); void s.offsetWidth; s.classList.add("timing");
    timer = setTimeout(() => go(cur + 1), AUTOPLAY * 1000);
  }
  function stop() { playing = false; $("play").classList.remove("on"); arm(); }
  $("play").addEventListener("click", () => { playing = !playing; $("play").classList.toggle("on", playing); if (playing && focus) setFocus(false); arm(); });

  // keys and swipes
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(cur + 1);
    else if (e.key === "ArrowLeft") go(cur - 1);
    else if (e.key === "Escape" && focus) setFocus(false);
    else if (e.key === "Enter" && !focus) setFocus(true);
  });
  let sx = null;
  stage.addEventListener("pointerdown", (e) => { sx = e.clientX; });
  stage.addEventListener("pointerup", (e) => {
    if (sx !== null && !focus && Math.abs(e.clientX - sx) > 60) { stop(); go(cur + (e.clientX < sx ? 1 : -1)); }
    sx = null;
  });
  addEventListener("resize", layout);

  // the cursor follower trails the pointer with a little lag (it sits off to the side of the arrow, as in the reference)
  const cursor = $("cursor"), label = cursor.querySelector("span");
  let mx = 0, my = 0, fx = 0, fy = 0, lastMove = 0, speed = 0;
  addEventListener("pointermove", (e) => {
    speed = Math.hypot(e.clientX - mx, e.clientY - my); mx = e.clientX; my = e.clientY; lastMove = performance.now();
    const inStage = stage.contains(e.target) && !e.target.closest(".controls, .focusHead, .pin, .rack") && !dragging;
    const look = e.target.closest(".look");
    let ring = "";
    if (inStage && look && !focus) ring = look.classList.contains("front") ? T().view : T().drag;
    cursor.classList.toggle("on", inStage);
    cursor.classList.toggle("ring", !!ring);
    if (ring) label.textContent = ring;
  });
  (function follow() {
    const lag = cursor.classList.contains("ring") ? 0.2 : 0.14;
    fx += (mx + 22 - fx) * lag; fy += (my + 10 - fy) * lag;
    cursor.style.transform = `translate(${fx}px, ${fy}px)`;
    cursor.classList.toggle("fast", !cursor.classList.contains("ring") && speed > 18 && performance.now() - lastMove < 120);
    requestAnimationFrame(follow);
  })();

  // every fixed word on the page, and the switch that flips them (the panel refills in place, no flash)
  function words() {
    const t = T();
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    [...$("nav").children].forEach((a, i) => (a.textContent = t.nav[i]));
    $("title").textContent = t.title; $("sub").textContent = t.sub; $("hint").textContent = t.hint;
    $("inLook").textContent = t.inLook; $("bundleTitle").textContent = t.bundleTitle;
    $("addAllText").textContent = t.addAll; $("lang").textContent = t.switch;
    steps.forEach((s, i) => (s.querySelector(".nm").innerHTML = "&nbsp; " + tr(D.looks[i].title)));
    $("rackLabel").textContent = t.rack; $("rackHint").textContent = t.rackHint;
    looks.forEach((el, i) => el.querySelectorAll(".tip").forEach((tip, k) => {
      const it = itemsOf(i)[k];
      tip.innerHTML = `${tr(it.name)}<b>${money(it.price)}</b>`;
    }));
  }
  $("lang").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    try { localStorage.setItem("lookbook-lang", lang); } catch (e) {}
    const q = new URLSearchParams(location.search); q.set("lang", lang); history.replaceState(null, "", "?" + q);
    words(); swap++; fill();
    [...itemsEl.children].forEach((row) => row.classList.add("in"));
    document.querySelector(".bundle").classList.remove("hide"); $("addAll").classList.remove("loading");
  });

  // the rack: this look's outer layer and the ones it can swap to; hovering it lights the pin of the piece it replaces
  let dragging = null;
  function rack() {
    const opts = options(cur);
    $("rack").style.display = opts.length > 1 ? "" : "none";
    $("hangers").innerHTML = opts.map((o, k) => {
      const it = D.looks[o.from].items[0], worn = wear[cur] === k;
      return `<div class="hanger${worn ? " worn" : ""}" data-k="${k}"><img src="${it.cut || it.img}" alt=""><span>${tr(it.name)}</span>${worn ? `<em>${T().wearing}</em>` : ""}</div>`;
    }).join("");
    [...$("hangers").children].forEach((h) => {
      if (!h.classList.contains("worn")) h.addEventListener("pointerdown", (e) => grab(e, h));
    });
  }
  $("rack").addEventListener("mouseenter", () => focus && looks[cur].querySelector(".pin").classList.add("on"));
  $("rack").addEventListener("mouseleave", () => active < 0 && looks[cur].querySelector(".pin").classList.remove("on"));
  function overFront(x, y) {
    const r = looks[cur].querySelector("img").getBoundingClientRect();
    return x > r.left + r.width * 0.15 && x < r.right - r.width * 0.15 && y > r.top && y < r.bottom;
  }
  function grab(e, h) {
    e.preventDefault(); h.setPointerCapture(e.pointerId);
    const k = +h.dataset.k, sx0 = e.clientX, sy0 = e.clientY, img = h.querySelector("img");
    let ghost = null;
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx0, ev.clientY - sy0) > 6) {
        ghost = document.createElement("div"); ghost.className = "ghost"; ghost.style.backgroundImage = `url(${img.src})`;
        document.body.appendChild(ghost); h.classList.add("lifted"); dragging = true; cursor.classList.remove("on");
      }
      if (!ghost) return;
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) rotate(${Math.max(-10, Math.min(10, (ev.clientX - sx0) / 24))}deg)`;
      const over = overFront(ev.clientX, ev.clientY);
      ghost.classList.toggle("over", over); looks[cur].classList.toggle("drop", over);
    };
    const up = (ev) => {
      h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
      looks[cur].classList.remove("drop"); dragging = null;
      if (!ghost) {                                                               // a tap: the layer lifts off the rack by itself
        const r = img.getBoundingClientRect();
        ghost = document.createElement("div"); ghost.className = "ghost"; ghost.style.backgroundImage = `url(${img.src})`;
        ghost.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px)`;
        document.body.appendChild(ghost); h.classList.add("lifted"); void ghost.offsetWidth;
        dress(k, ghost); return;
      }
      if (overFront(ev.clientX, ev.clientY)) {
        dress(k, ghost);
      } else {
        // missed: it springs back onto the rack
        const r = img.getBoundingClientRect();
        ghost.style.transition = "transform 0.4s cubic-bezier(0.3, 1.4, 0.5, 1)";
        ghost.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) scale(0.7)`;
        setTimeout(() => { ghost.remove(); h.classList.remove("lifted"); }, 400);
      }
    };
    h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
  }

  // the swap, as in the reference GIF: the new photo cross-fades in over about 1.1 s, quick at first and settling slowly.
  // With a base photo under both, the old layer leaves faster than the new one arrives (0.5 s), so the two are seen
  // together only briefly; the old one starts leaving at once
  const loaded = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = src; });
  function overlay(el, src, z) {
    const im = document.createElement("img"); im.className = "next"; im.src = src; im.style.zIndex = z;
    el.insertBefore(im, el.querySelector(".shine")); return im;
  }
  async function dress(k, ghost) {
    const i = cur, el = looks[i], l = D.looks[i], from = options(i)[wear[i]], o = options(i)[k];
    if (wear[i] === k || el.dataset.busy) { ghost && ghost.remove(); return; }
    el.dataset.busy = 1;
    if (ghost) {
      ghost.classList.remove("over");
      ghost.style.transition = "scale 0.3s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.3s ease-out";
      ghost.style.scale = 0.7; ghost.style.opacity = 0; setTimeout(() => ghost.remove(), 320);
    }
    const [hasBase] = await Promise.all([l.base ? loaded(l.base) : false, loaded(o.model)]);
    wear[i] = k;
    fill(); words();
    const rows = [...itemsEl.children];
    rows.forEach((row, j) => { if (j) row.classList.add("in"); });
    setTimeout(() => rows[0] && rows[0].classList.add("in"), 250);
    const img = el.querySelector("img"), arrive = overlay(el, o.model, 3);
    const fadeIn = arrive.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1100, delay: hasBase ? 80 : 0, easing: "cubic-bezier(0.2, 0.55, 0.35, 1)", fill: "both" });
    if (hasBase) {
      const leave = overlay(el, from.model, 2);
      img.src = l.base;
      leave.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "cubic-bezier(0.25, 0.6, 0.4, 1)", fill: "forwards" })
        .finished.then(() => leave.remove());
    }
    await fadeIn.finished;
    img.src = o.model; el.style.setProperty("--m", `url(${o.model})`);
    await img.decode().catch(() => {});
    arrive.remove();
    delete el.dataset.busy;
  }

  words(); layout(); panel();
  $("play").classList.add("on"); arm();
})();
