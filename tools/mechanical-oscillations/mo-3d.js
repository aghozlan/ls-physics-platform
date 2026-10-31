/* =========================================================
   Mechanical Oscillations — 3D labs (three.js, self-hosted)
   #sim3d-lab : horizontal elastic pendulum on an air track
   #sim3d-car : car suspension over a speed bump (damping in real life)
   ========================================================= */
import * as THREE from "../../assets/vendor/three.module.min.js";

const L = window.LSP;
const css = (n) => L.css(n);
const col = (n) => new THREE.Color(css(n) || "#888");
const visible = (el) => el && el.offsetParent !== null && el.clientWidth > 0;
const F = (v, d) => L.fmt(v, d);
const chips = (el, items) => { el.innerHTML = items.map(([k, v, cls]) => `<span class="chip ${cls || ""}">${k} <b>${v}</b></span>`).join(""); };

function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

/* helix geometry of unit length along +x (scaled each frame) */
function helix(turns, R, r, seg) {
  class H extends THREE.Curve { getPoint(t) { const a = t * turns * 2 * Math.PI; return new THREE.Vector3(t, R * Math.cos(a), R * Math.sin(a)); } }
  return new THREE.TubeGeometry(new H(), seg || 400, r, 8, false);
}
function helixY(turns, R, r) {
  class H extends THREE.Curve { getPoint(t) { const a = t * turns * 2 * Math.PI; return new THREE.Vector3(R * Math.cos(a), t, R * Math.sin(a)); } }
  return new THREE.TubeGeometry(new H(), 200, r, 6, false);
}
function textSprite(txt, color, size) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
  x.font = "700 64px Atkinson Hyperlegible, system-ui, sans-serif"; x.fillStyle = color; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 128, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(size * 2, size, 1); return s;
}
function rulerTexture(color) {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 128; const x = c.getContext("2d");
  x.fillStyle = "#f6f2e8"; x.fillRect(0, 0, 2048, 128); x.strokeStyle = "#333"; x.fillStyle = "#222"; x.font = "600 34px Atkinson Hyperlegible, sans-serif"; x.textAlign = "center";
  for (let cm = -20; cm <= 20; cm++) { const px = 1024 + cm * 50; x.lineWidth = cm % 5 ? 2 : 4; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, cm % 5 ? 36 : 60); x.stroke(); if (cm % 5 === 0 && cm) x.fillText(cm + " cm", px, 100); }
  for (let mm = -200; mm <= 200; mm += 5) { const px = 1024 + mm * 5; x.lineWidth = 1; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 16); x.stroke(); }
  x.fillStyle = color; x.font = "700 30px sans-serif"; x.fillText("O", 1024, 70);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

/* simple orbit for mouse; on touch only buttons, so the page keeps scrolling */
function orbit(camera, dom, target, state) {
  let down = null;
  const apply = () => {
    const { r, yaw, pitch } = state;
    camera.position.set(target.x + r * Math.cos(pitch) * Math.sin(yaw), target.y + r * Math.sin(pitch), target.z + r * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(target);
  };
  dom.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || state.lock) return; down = [e.clientX, e.clientY, state.yaw, state.pitch]; });
  window.addEventListener("pointermove", (e) => { if (!down) return; state.yaw = down[2] - (e.clientX - down[0]) * 0.008; state.pitch = Math.max(0.05, Math.min(1.35, down[3] + (e.clientY - down[1]) * 0.006)); apply(); });
  window.addEventListener("pointerup", () => (down = null));
  dom.addEventListener("wheel", (e) => { if (!e.ctrlKey && !e.altKey && !e.shiftKey) return; e.preventDefault(); state.r = Math.max(6, Math.min(30, state.r * (1 + Math.sign(e.deltaY) * 0.08))); apply(); }, { passive: false });
  apply(); return apply;
}

/* ================================================= 1. air-track lab */
function lab(root) {
  const host = root.querySelector(".stage"), hud = root.querySelector("canvas.hud"), out = root.querySelector(".readout");
  let hg = null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement); renderer.domElement.style.touchAction = "pan-y";
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
  const target = new THREE.Vector3(-0.6, 0.1, 0), cam = { r: 10.5, yaw: 0.5, pitch: 0.36 };
  const applyCam = orbit(camera, renderer.domElement, target, cam);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 6, bottom: -6 }); scene.add(sun);
  // table
  const table = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x9c7a55, roughness: 0.8 }));
  table.position.y = -0.9; table.receiveShadow = true; scene.add(table);
  // air track (aluminium beam with holes impression)
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.75, roughness: 0.32 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 1.0), alu); beam.position.set(0.5, -0.45, 0); beam.castShadow = beam.receiveShadow = true; scene.add(beam);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x555b66 });
  for (let i = -60; i <= 70; i += 2.4) for (const z of [-0.25, 0.25]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), holeMat); h.rotation.x = -Math.PI / 2; h.position.set(i / 10, -0.199, z); scene.add(h); }
  for (const xx of [-6, 7]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.8), alu); leg.position.set(xx, -0.75, 0); scene.add(leg); }
  // ruler on the front face
  const S = 20; // scene units per metre (1 unit = 5 cm)
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.62), new THREE.MeshBasicMaterial({ map: rulerTexture(css("--chap") || "#1d3557") }));
  ruler.position.set(0, -0.45, 0.505); scene.add(ruler);
  // support (left)
  const SUP = -5.4;
  const support = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 1.1), new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.5 }));
  support.position.set(SUP - 0.2, 0.6, 0); support.castShadow = true; scene.add(support);
  // spring
  const springMat = new THREE.MeshStandardMaterial({ color: 0xe3e7ee, metalness: 0.35, roughness: 0.3 });
  const spring = new THREE.Mesh(helix(14, 0.22, 0.04), springMat); spring.position.set(SUP, 0.35, 0); spring.castShadow = true; scene.add(spring);
  // glider (aerotrack cart)
  const gl = new THREE.Group();
  const gmat = new THREE.MeshStandardMaterial({ color: col("--chap"), roughness: 0.35, metalness: 0.2 });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.2), gmat); shell.position.y = 0.35; shell.castShadow = true; gl.add(shell);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0xffffff })); fin.position.set(0, 0.95, 0); gl.add(fin);
  const gdot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); gdot.position.set(0, 0.35, 0.61); gl.add(gdot);
  const lbl = textSprite("G", "#ffffff", 0.35); lbl.position.set(0, 0.62, 0.62); gl.add(lbl);
  gl.position.y = -0.2; scene.add(gl);
  const HALF = 0.8, L0 = -HALF - SUP; // natural length from support to glider face when x = 0
  // arrows
  const vArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1.6, 0), 1, col("--ok"), 0.3, 0.2); scene.add(vArrow);
  const fArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0.35, 0), 1, col("--accent"), 0.3, 0.2); scene.add(fArrow);
  const vTxt = textSprite("v", css("--ok") || "#1f7a4d", 0.42), fTxt = textSprite("T", css("--accent") || "#c2611b", 0.42); scene.add(vTxt); scene.add(fTxt);
  // amplitude markers
  const mk = (c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 1.25), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 })); m.position.y = 0.25; scene.add(m); return m; };
  const mPlus = mk(0xc2611b), mMinus = mk(0xc2611b);

  // physics state (SI); scene: 1 unit = 10 cm
  const P = { m: 0.25, k: 25, h: 0 }; let s = { x: 0.04, v: 0, t: 0 }, run = false, hist = [], Xamp = 0.04, slow = 1, dragging = false;
  const R = (n) => root.querySelector(`input[name="${n}"]`);
  ["m", "k", "h"].forEach((n) => L.bindRange(root, n, (v) => { P[n] = v; if (!run) drawHud(); }));
  const playB = root.querySelector('[data-act="play"]');
  const setRun = (r) => { run = r; playB.textContent = r ? "❚❚ Pause" : "▶ Release"; };
  playB.addEventListener("click", () => setRun(!run));
  root.querySelector('[data-act="launch"]').addEventListener("click", () => { s = { x: 0, v: 0.4, t: 0 }; hist = []; Xamp = 0.4 / Math.sqrt(P.k / P.m); setRun(true); });
  root.querySelector('[data-act="reset"]').addEventListener("click", () => { s = { x: 0.04, v: 0, t: 0 }; hist = []; Xamp = 0.04; setRun(false); });
  root.querySelector('[data-act="slow"]').addEventListener("click", (e) => { slow = slow === 1 ? 0.25 : 1; e.target.textContent = slow === 1 ? "🐢 Slow motion" : "🐇 Real speed"; });
  root.querySelectorAll("[data-cam]").forEach((b) => b.addEventListener("click", () => {
    const v = { "3d": [10.5, 0.5, 0.36], front: [10, 0, 0.1], top: [10, 0, 1.3] }[b.dataset.cam]; [cam.r, cam.yaw, cam.pitch] = v; applyCam();
  }));
  // drag the glider (mouse or finger) to choose the initial elongation
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.0);
  const pick = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  renderer.domElement.addEventListener("pointerdown", (e) => {
    pick(e); if (ray.intersectObject(shell).length) { dragging = true; cam.lock = true; setRun(false); renderer.domElement.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  renderer.domElement.addEventListener("touchstart", (e) => { const t0 = e.touches[0]; pick(t0); if (ray.intersectObject(shell).length) e.preventDefault(); }, { passive: false });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (!dragging) { pick(e); renderer.domElement.style.cursor = ray.intersectObject(shell).length ? "grab" : (e.pointerType === "mouse" ? "move" : ""); return; }
    pick(e); const p = new THREE.Vector3(); ray.ray.intersectPlane(plane, p);
    if (p) { s = { x: Math.max(-0.08, Math.min(0.08, p.x / S)), v: 0, t: 0 }; hist = []; Xamp = Math.abs(s.x); }
  });
  const endDrag = () => { if (dragging) { dragging = false; cam.lock = false; if (Math.abs(s.x) > 0.003) setRun(true); } };
  renderer.domElement.addEventListener("pointerup", endDrag); renderer.domElement.addEventListener("pointercancel", endDrag);

  function hudSize() { hg = L.canvas(hud, +hud.dataset.aspect); }
  function drawHud() {
    if (!hg) return; const ctx = hg.ctx, W = hg.w, H = hg.h, c = { ink: css("--ink"), muted: css("--muted"), chap: css("--chap"), acc: css("--accent"), ok: css("--ok"), grid: css("--grid") };
    ctx.clearRect(0, 0, W, H);
    const ME = 0.5 * P.m * s.v * s.v + 0.5 * P.k * s.x * s.x, KE = 0.5 * P.m * s.v * s.v, EP = 0.5 * P.k * s.x * s.x, Emax = Math.max(ME, 0.5 * P.k * Xamp * Xamp, 1e-6) * 1.1;
    const bw = 22; [["KE", KE, c.ok], ["EPE", EP, c.acc], ["ME", ME, c.chap]].forEach(([n, E, cc], i) => {
      const x0 = 10 + i * (bw + 8), hh = (H - 34) * E / Emax; ctx.fillStyle = cc; ctx.fillRect(x0, H - 20 - hh, bw, hh);
      ctx.fillStyle = c.ink; ctx.font = "700 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(n, x0 + bw / 2, H - 6);
    });
    const l = 10 + 3 * (bw + 8) + 30, r = W - 8, t = 8, b = H - 18, span = 4, t0 = Math.max(0, s.t - span), Y = (x) => (t + b) / 2 - x / 0.09 * (b - t) / 2, X = (tt) => l + (tt - t0) / span * (r - l);
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, Y(0)); ctx.lineTo(r, Y(0)); ctx.moveTo(l, t); ctx.lineTo(l, b); ctx.stroke();
    ctx.fillStyle = c.muted; ctx.font = "12px sans-serif"; ctx.textAlign = "left"; ctx.fillText("x(t) live", l + 6, t + 10);
    ctx.strokeStyle = c.chap; ctx.lineWidth = 2.4; ctx.beginPath(); hist.forEach(([tt, x], i) => (i ? ctx.lineTo(X(tt), Y(x)) : ctx.moveTo(X(tt), Y(x)))); ctx.stroke();
    const w0 = Math.sqrt(P.k / P.m), crit = 2 * Math.sqrt(P.k * P.m);
    chips(out, [["x =", F(s.x * 100, 2) + " cm"], ["v =", F(s.v, 2) + " m/s"], ["ω₀ =", F(w0, 2) + " rad/s"], ["T₀ = 2π√(m/k) =", F(2 * Math.PI / w0, 3) + " s", "good"],
      ["mode:", P.h === 0 ? "undamped (ideal)" : P.h < crit ? "pseudo-periodic" : "aperiodic"]]);
  }
  function size() {
    const w = host.clientWidth, h = Math.round(w * (w < 560 ? 0.75 : 0.46)); renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px"; camera.aspect = w / h; camera.updateProjectionMatrix(); hudSize(); drawHud();
  }
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!visible(host)) { last = 0; return; }
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    if (run && !dragging) {
      const n = Math.ceil(dt * slow / 0.002) || 1, h = dt * slow / n;
      for (let i = 0; i < n; i++) { const a = (-P.k * s.x - P.h * s.v) / P.m; s.v += a * h; s.x += s.v * h; s.t += h; }
      if (Math.abs(s.x) > 0.095) { s.x = Math.sign(s.x) * 0.095; s.v = 0; }
      hist.push([s.t, s.x]); if (hist.length > 1500) hist.shift();
    }
    const X = s.x * S;
    gl.position.x = X; spring.scale.x = (L0 + X); fin.material.color.set(0xffffff);
    gmat.color.copy(col("--chap"));
    const sp = Math.abs(s.v), fv = P.k * Math.abs(s.x);
    vArrow.visible = vTxt.visible = sp > 0.02; if (vArrow.visible) { vArrow.position.set(X, 1.6, 0); vArrow.setDirection(new THREE.Vector3(Math.sign(s.v), 0, 0)); vArrow.setLength(0.4 + sp * 6, 0.3, 0.2); vTxt.position.set(X + Math.sign(s.v) * (0.7 + sp * 6), 1.9, 0); }
    fArrow.visible = fTxt.visible = fv > 0.05; if (fArrow.visible) { fArrow.position.set(X, 0.15, 0.7); fArrow.setDirection(new THREE.Vector3(-Math.sign(s.x), 0, 0)); fArrow.setLength(0.4 + fv * 0.9, 0.3, 0.2); fTxt.position.set(X - Math.sign(s.x) * (0.7 + fv * 0.9), 0.45, 0.7); }
    const showM = P.h === 0 && Xamp > 0.003; mPlus.visible = mMinus.visible = showM; mPlus.position.x = Xamp * S; mMinus.position.x = -Xamp * S;
    renderer.render(scene, camera); drawHud();
  }
  new ResizeObserver(() => size()).observe(host);
  size(); requestAnimationFrame(frame);
}

/* ================================================= 2. car suspension over a bump */
function car(root) {
  const host = root.querySelector(".stage"), hud = root.querySelector("canvas.hud"), out = root.querySelector(".readout");
  let hg = null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement); renderer.domElement.style.touchAction = "pan-y";
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 2, 0.1, 200);
  const target = new THREE.Vector3(0, 0.9, 0), cam = { r: 11, yaw: 0.9, pitch: 0.18 };
  const applyCam = orbit(camera, renderer.domElement, target, cam);
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x667766, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-5, 10, 6); sun.castShadow = true; scene.add(sun);
  // road (moving texture of dashes) + grass
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshStandardMaterial({ color: 0x7aa36a })); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; grass.receiveShadow = true; scene.add(grass);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(80, 3.4), new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; scene.add(road);
  const dashes = []; for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff })); d.rotation.x = -Math.PI / 2; d.position.set(-40 + i * 5, 0.005, 0); scene.add(d); dashes.push(d); }
  // speed bump: profile y = H sin²(π u / Lb) for 0<u<Lb
  const BH = 0.1, BL = 0.6;
  const bumpGeo = new THREE.BoxGeometry(BL, BH, 3.2); const bump = new THREE.Mesh(bumpGeo, new THREE.MeshStandardMaterial({ color: 0xf2c94c })); bump.position.y = BH / 2; scene.add(bump);
  // car
  const WB = 2.6, carG = new THREE.Group(); scene.add(carG);
  const paint = new THREE.MeshStandardMaterial({ color: 0xc2611b, metalness: 0.5, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.6, 1.7), paint); body.castShadow = true; carG.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.5), new THREE.MeshStandardMaterial({ color: 0x9ec7e8, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85 }));
  cabin.position.set(-0.2, 0.55, 0); body.add(cabin);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.8, roughness: 0.3 });
  const wheels = [], springs = [];
  const springMat = new THREE.MeshStandardMaterial({ color: 0x2f80ed, metalness: 0.6, roughness: 0.3 });
  for (const [ax, z] of [[WB / 2, 0.85], [WB / 2, -0.85], [-WB / 2, 0.85], [-WB / 2, -0.85]]) {
    const w = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 24), tyre); t.rotation.x = Math.PI / 2; w.add(t);
    const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16), rim); r2.rotation.x = Math.PI / 2; w.add(r2);
    w.position.set(ax, 0.36, z); t.castShadow = true; scene.add(w); wheels.push(w);
    const sp = new THREE.Mesh(helixY(6, 0.11, 0.025), springMat); sp.position.set(ax, 0.36, z * 0.72); scene.add(sp); springs.push(sp);
  }
  const ride = textSprite("", "#fff", 0.6);
  // physics: two quarter-cars (front / rear), each mass M on spring k + damper h
  const M = 400, P = { k: 16000, h: 2000, v: 4 }; let st, roadX, run = false, hist = [];
  const crit = () => 2 * Math.sqrt(P.k * M);
  ["k", "h", "v"].forEach((n) => L.bindRange(root, n, (v) => { P[n] = v; label(); }));
  function label() { const z = P.h / crit(); const o = root.querySelector(".damp-note"); if (o) o.textContent = z < 0.15 ? "worn shock absorber: the car keeps bouncing" : z < 0.6 ? "under-damped: a few bounces" : z < 1.3 ? "close to critical damping: comfortable, back fast" : "over-damped: stiff, slow to come back"; }
  function reset() { st = [{ y: 0, v: 0 }, { y: 0, v: 0 }]; roadX = 0; hist = []; }
  const D = 6, uOf = (ax, rx) => ax - (D - rx);
  const bumpH = (u) => (u > 0 && u < BL ? BH * Math.sin(Math.PI * u / BL) ** 2 : 0);
  root.querySelector('[data-act="go"]').addEventListener("click", () => { reset(); run = true; });
  root.querySelectorAll("[data-cam]").forEach((b) => b.addEventListener("click", () => { const v = { side: [11, 0, 0.12], "3d": [11, 0.9, 0.18], wheel: [6, 0.2, 0.05] }[b.dataset.cam]; [cam.r, cam.yaw, cam.pitch] = v; applyCam(); }));
  function hudSize() { hg = L.canvas(hud, +hud.dataset.aspect); }
  function drawHud() {
    if (!hg) return; const ctx = hg.ctx, W = hg.w, H = hg.h; ctx.clearRect(0, 0, W, H);
    const l = 44, r = W - 8, t = 8, b = H - 18, span = 5, Y = (y) => (t + b) / 2 - y / 0.16 * (b - t) / 2, X = (tt) => l + tt / span * (r - l);
    ctx.strokeStyle = css("--grid"); ctx.beginPath(); ctx.moveTo(l, Y(0)); ctx.lineTo(r, Y(0)); ctx.moveTo(l, t); ctx.lineTo(l, b); ctx.stroke();
    ctx.fillStyle = css("--muted"); ctx.font = "12px sans-serif"; ctx.fillText("body height at the front axle (cm)", l + 6, t + 10);
    ctx.textAlign = "right"; [-10, 0, 10].forEach((cm) => ctx.fillText(cm, l - 4, Y(cm / 100) + 4)); ctx.textAlign = "left";
    ctx.strokeStyle = css("--chap"); ctx.lineWidth = 2.4; ctx.beginPath(); hist.forEach(([tt, y], i) => (i ? ctx.lineTo(X(tt), Y(y)) : ctx.moveTo(X(tt), Y(y)))); ctx.stroke();
    const z = P.h / crit(), T0 = 2 * Math.PI * Math.sqrt(M / P.k), peak = hist.reduce((a, p) => Math.max(a, Math.abs(p[1])), 0);
    chips(out, [["T₀ = 2π√(M/k) =", F(T0, 2) + " s"], ["h / h_critical =", F(z, 2), z > 0.6 && z < 1.3 ? "good" : ""], ["largest body movement =", F(peak * 100, 1) + " cm"]]);
  }
  function size() {
    const w = host.clientWidth, h = Math.round(w * (w < 560 ? 0.7 : 0.42)); renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px"; camera.aspect = w / h; camera.updateProjectionMatrix(); hudSize(); drawHud();
  }
  let last = 0, simT = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!visible(host)) { last = 0; return; }
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    const axles = [WB / 2, -WB / 2], yw = [0, 0];
    if (run) {
      const n = Math.ceil(dt / 0.001), h = dt / n;
      for (let i = 0; i < n; i++) {
        roadX += P.v * h; simT += h;
        axles.forEach((ax, j) => {
          const u = uOf(ax, roadX), y0 = bumpH(u), y1 = bumpH(u + P.v * 1e-3), vw = (y1 - y0) / 1e-3;
          const a = (-P.k * (st[j].y - y0) - P.h * (st[j].v - vw)) / M; st[j].v += a * h; st[j].y += st[j].v * h; yw[j] = y0;
        });
      }
      hist.push([hist.length ? hist[hist.length - 1][0] + dt : 0, st[0].y]);
      if (roadX > 16) run = false;
    } else if (st) axles.forEach((ax, j) => (yw[j] = bumpH(uOf(ax, roadX))));
    // place bump relative to the car (car stays, road moves)
    bump.position.x = D - roadX + BL / 2; bump.visible = Math.abs(bump.position.x) < 30;
    dashes.forEach((d, i) => { d.position.x = ((-40 + i * 5 - (roadX || 0) * 1) % 80 + 120) % 80 - 40; });
    const yF = st ? st[0].y : 0, yR = st ? st[1].y : 0, ex = 2.2; // exaggerate body motion ×2.2 for visibility
    carG.position.y = 1.05 + ex * (yF + yR) / 2; carG.rotation.z = Math.atan2(ex * (yF - yR), WB);
    wheels.forEach((w, i) => { w.position.y = 0.36 + (i < 2 ? yw[0] : yw[1]); w.rotation.z -= (run ? P.v * dt / 0.36 : 0); });
    springs.forEach((sp, i) => { const yb = 1.05 + ex * (i < 2 ? yF : yR) - 0.3, ywh = 0.36 + (i < 2 ? yw[0] : yw[1]); sp.position.y = ywh; sp.scale.y = Math.max(0.1, yb - ywh); });
    renderer.render(scene, camera); drawHud();
  }
  reset(); label(); new ResizeObserver(() => size()).observe(host); size(); requestAnimationFrame(frame);
}

/* ================================================= lazy start */
const started = {};
function start() {
  [["sim3d-lab", lab], ["sim3d-car", car]].forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (!el || started[id] || !visible(el)) return;
    started[id] = true;
    if (!webglOK()) { el.querySelector(".stage").innerHTML = '<p class="muted" style="padding:20px">3D is not available on this device; the 2D models below show the same physics.</p>'; return; }
    try { fn(el); } catch (e) { console.error(e); el.querySelector(".stage").innerHTML = '<p class="muted" style="padding:20px">3D could not start on this device.</p>'; }
  });
}
window.addEventListener("lsp-open", () => setTimeout(start, 40));
window.addEventListener("lsp-panel", () => setTimeout(start, 40));
if (document.readyState !== "loading") setTimeout(start, 60); else document.addEventListener("DOMContentLoaded", () => setTimeout(start, 60));
