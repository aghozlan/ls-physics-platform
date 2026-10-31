/* =========================================================
   Mechanical Oscillations — live models (2D canvas)
   x = Xm sin(ω0 t + φ) convention, as in the LS official exams
   ========================================================= */
(function () {
  "use strict";
  const L = window.LSP;
  const C = () => ({
    ink: L.css("--ink"), muted: L.css("--muted"), chap: L.css("--chap"), acc: L.css("--accent"),
    paper: L.css("--paper"), grid: L.css("--grid"), ok: L.css("--ok"), line: L.css("--line"), bad: L.css("--bad"), bg: L.css("--bg")
  });
  const F = L.fmt, PI = Math.PI;
  const sims = {};
  const visible = (el) => el && el.offsetParent !== null && el.clientWidth > 0;
  const chips = (el, items) => { el.innerHTML = items.map(([k, v, cls]) => `<span class="chip ${cls || ""}">${k} <b>${v}</b></span>`).join(""); };
  function text(ctx, s, x, y, col, size, align, bold) {
    ctx.fillStyle = col; ctx.font = `${bold ? "700 " : ""}${size || 13}px Atkinson Hyperlegible, system-ui, sans-serif`;
    ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
  }
  function rrect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  // fraction of π as text: 5π/6, −π/2 ...
  function piText(p) {
    const n = Math.round(p / (PI / 12)), err = Math.abs(n * PI / 12 - p);
    if (err > 0.03) return F(p, 2) + " rad";
    const approx = err > 1e-3 ? "≈ " : "";
    if (n === 0) return "0";
    const g = (a, b) => (b ? g(b, a % b) : a), d = g(Math.abs(n), 12), num = n / d, den = 12 / d;
    const s = (num < 0 ? "−" : "") + (Math.abs(num) === 1 ? "" : Math.abs(num)) + "π" + (den === 1 ? "" : "/" + den);
    return approx + s + " rad";
  }
  const wrap = (p) => { while (p > PI + 1e-9) p -= 2 * PI; while (p <= -PI + 1e-9) p += 2 * PI; return p; };

  // horizontal spring (zig-zag) between x1 and x2 at height y
  function spring(ctx, x1, x2, y, amp, coils, col, w) {
    const lead = Math.min(10, (x2 - x1) * 0.12), n = coils * 2, span = (x2 - x1 - 2 * lead) / n;
    ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + lead, y);
    for (let i = 0; i < n; i++) ctx.lineTo(x1 + lead + span * (i + 0.5), y + (i % 2 ? -amp : amp));
    ctx.lineTo(x2 - lead, y); ctx.lineTo(x2, y); ctx.stroke();
  }
  // a little horizontal oscillator scene: wall, spring, block, axis; x in metres, scale px/m
  function scene(ctx, c, X0, y, x, scale, opts) {
    const o = opts || {}, bw = o.bw || 46, bh = o.bh || 34, R = o.side === "right";
    const wallX = R ? X0 + (o.L0 || 0.12) * scale + bw / 2 : X0 - (o.L0 || 0.12) * scale - bw / 2;
    ctx.fillStyle = c.line; ctx.fillRect(R ? wallX : wallX - 8, y - bh - 18, 8, bh + 30);
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2; ctx.beginPath();
    if (R) { ctx.moveTo(X0 - (o.right || 0.2) * scale, y + 12); ctx.lineTo(wallX + 8, y + 12); } else { ctx.moveTo(wallX - 8, y + 12); ctx.lineTo(X0 + (o.right || 0.2) * scale, y + 12); }
    ctx.stroke();
    const bx = X0 + x * scale;
    if (R) spring(ctx, bx + bw / 2, wallX, y - bh / 2 + 2, 7, o.coils || 9, c.ink, 1.8);
    else spring(ctx, wallX, bx - bw / 2, y - bh / 2 + 2, 7, o.coils || 9, c.ink, 1.8);
    rrect(ctx, bx - bw / 2, y - bh + 10, bw, bh, 6, o.color || c.chap);
    text(ctx, o.label || "S", bx, y - bh / 2 + 10, "#fff", 13, "center", true);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, y - bh / 2 + 22, 2.4, 0, 7); ctx.fill();
    // axis
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, y + 18); ctx.lineTo(X0, y + 26); ctx.stroke();
    text(ctx, "O", X0, y + 34, c.muted, 12, "center", true);
    return bx;
  }
  // generic plot frame; returns mapping functions
  function frame(ctx, c, box, xr, yr, labels) {
    const { l, r, t, b } = box, X = (v) => l + (v - xr[0]) / (xr[1] - xr[0]) * (r - l), Y = (v) => b - (v - yr[0]) / (yr[1] - yr[0]) * (b - t);
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    (labels.xt || []).forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), t); ctx.lineTo(X(v), b); ctx.stroke(); if (labels.xl) text(ctx, labels.xl(v), X(v), b + 12, c.muted, 11, "center"); });
    (labels.yt || []).forEach((v) => { ctx.beginPath(); ctx.moveTo(l, Y(v)); ctx.lineTo(r, Y(v)); ctx.stroke(); if (labels.yl) text(ctx, labels.yl(v), l - 5, Y(v), c.muted, 11, "right"); });
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.3; ctx.beginPath();
    const y0 = Math.min(b, Math.max(t, Y(0))); ctx.moveTo(l, y0); ctx.lineTo(r, y0); ctx.moveTo(l, t); ctx.lineTo(l, b); ctx.stroke();
    if (labels.xn) text(ctx, labels.xn, r, y0 - 9, c.muted, 12, "right");
    if (labels.yn) text(ctx, labels.yn, l + 5, t + 2, c.muted, 12, "left", true);
    return { X, Y };
  }
  const line = (ctx, pts, col, w, dash) => {
    ctx.strokeStyle = col; ctx.lineWidth = w || 2.4; ctx.setLineDash(dash || []); ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
  };
  // damped oscillator integrator (viscous h, optional drive kick function)
  function stepOsc(s, p, dt) {
    const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = (-p.k * s.x - (p.h || 0) * s.v) / p.m;
      s.v += a * h; s.x += s.v * h; s.t += h;
      if (p.after) p.after(s, h);
    }
  }

  /* ------------------------------------------------ 1. x(t) explorer + "match the curve" */
  sims["sim-xt"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout"), msg = root.querySelector(".gamebox");
    let g, target = null, tries = 0; const v = {};
    ["m", "k", "Xm", "ph"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; draw(); }));
    root.querySelector('output[for="ph"]').dataset.pi = "1";
    function curve(p, T, Xr) { const w = Math.sqrt(p.k / p.m), pts = []; for (let i = 0; i <= 400; i++) { const t = (i / 400) * T; pts.push([t, p.Xm * Math.sin(w * t + p.ph * PI / 12)]); } return pts; }
    function draw() {
      if (!g || v.ph === undefined) return;
      root.querySelector('output[for="ph"]').textContent = "φ = " + piText(v.ph * PI / 12);
      const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const w0 = Math.sqrt(v.k / v.m), T0 = 2 * PI / w0, Tmax = 2.5;
      const box = { l: 46, r: g.w - 12, t: 16, b: g.h - 26 };
      const q = frame(ctx, c, box, [0, Tmax], [-6, 6], { xt: [0.5, 1, 1.5, 2, 2.5], yt: [-5, -2.5, 0, 2.5, 5], xl: (t) => t + " s", yl: (x) => x, xn: "t (s)", yn: "x (cm)" });
      if (target) line(ctx, curve(target, Tmax).map(([t, x]) => [q.X(t), q.Y(x)]), c.acc, 3, [7, 6]);
      line(ctx, curve(v, Tmax).map(([t, x]) => [q.X(t), q.Y(x)]), c.chap, 3);
      // T0 bracket
      const tStart = ((PI / 2 - v.ph * PI / 12) / w0 % T0 + T0) % T0; // first maximum
      if (tStart + T0 < Tmax) {
        ctx.strokeStyle = c.ok; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.X(tStart), q.Y(v.Xm) - 10); ctx.lineTo(q.X(tStart + T0), q.Y(v.Xm) - 10); ctx.stroke();
        L.arrow(ctx, q.X(tStart + T0 / 2), q.Y(v.Xm) - 10, q.X(tStart), q.Y(v.Xm) - 10, c.ok, 2); L.arrow(ctx, q.X(tStart + T0 / 2), q.Y(v.Xm) - 10, q.X(tStart + T0), q.Y(v.Xm) - 10, c.ok, 2);
        text(ctx, "T₀", q.X(tStart + T0 / 2), q.Y(v.Xm) - 20, c.ok, 13, "center", true);
      }
      ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(q.X(0), q.Y(v.Xm * Math.sin(v.ph * PI / 12)), 5, 0, 7); ctx.fill();
      chips(out, [["ω₀ = √(k/m) =", F(w0, 2) + " rad/s"], ["T₀ = 2π/ω₀ =", F(T0, 3) + " s"], ["f₀ =", F(1 / T0, 2) + " Hz"], ["x(0) = Xm sin φ =", F(v.Xm * Math.sin(v.ph * PI / 12), 2) + " cm"]]);
      if (target) {
        const ok = Math.abs(v.Xm - target.Xm) < 0.01 && Math.abs(Math.sqrt(v.k / v.m) - Math.sqrt(target.k / target.m)) < 0.15 && Math.abs(wrap((v.ph - target.ph) * PI / 12)) < 0.01;
        if (ok) { msg.innerHTML = `✔ <b>Matched in ${tries} moves!</b> φ = ${piText(target.ph * PI / 12)}, T₀ = ${F(2 * PI / Math.sqrt(target.k / target.m), 3)} s. <button class="btn small" data-new>New curve</button>`; msg.className = "gamebox win"; target = null; }
      }
    }
    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", () => { if (target) tries++; }));
    root.addEventListener("click", (e) => {
      if (!e.target.closest("[data-new]")) return;
      const ms = [0.1, 0.2, 0.4, 0.5, 0.8, 1], ks = [10, 20, 40, 50, 80, 100];
      target = { m: ms[Math.floor(Math.random() * 6)], k: ks[Math.floor(Math.random() * 6)], Xm: 1 + Math.floor(Math.random() * 9) * 0.5, ph: Math.floor(Math.random() * 24) - 11 };
      tries = 0; msg.className = "gamebox"; msg.innerHTML = "🎯 Match the dashed orange curve: read its amplitude, its period and its value at t = 0 (moving up or down?).";
      draw();
    });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size(); return { resize: size, draw };
  };

  /* ------------------------------------------------ 2. initial conditions → Xm and φ (rotating vector) */
  sims["sim-phase"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, t = 0, run = false, last = 0; const v = {}, W0 = 10;
    ["x0", "v0"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; t = 0; draw(); }));
    function params() { const x0 = v.x0 / 100, v0 = v.v0; const Xm = Math.hypot(x0, v0 / W0); const ph = Xm < 1e-9 ? 0 : Math.atan2(x0 / Xm, (v0 / W0) / Xm); return { Xm, ph }; }
    function draw() {
      if (!g || v.v0 === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const { Xm, ph } = params(), sm = g.w < 560;
      const R = Math.min(sm ? g.w * 0.3 : g.h * 0.36, 120), cx = sm ? g.w / 2 : R + 30, cy = sm ? R + 26 : g.h / 2, s = R / 0.06;
      // circle + axes
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, Xm * s, 0, 7); ctx.stroke();
      ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(cx - R - 12, cy); ctx.lineTo(cx + R + 12, cy); ctx.moveTo(cx, cy + R + 12); ctx.lineTo(cx, cy - R - 12); ctx.stroke();
      text(ctx, "x", cx + 8, cy - R - 8, c.muted, 12, "left", true);
      const th = W0 * t + ph, px = cx + Xm * s * Math.cos(th), py = cy - Xm * s * Math.sin(th);
      // angle arc for φ
      ctx.strokeStyle = c.acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, -ph, ph > 0); ctx.stroke();
      text(ctx, "φ", cx + 32 * Math.cos(-ph / 2), cy + 32 * Math.sin(-ph / 2), c.acc, 14, "center", true);
      L.arrow(ctx, cx, cy, px, py, c.chap, 3);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = c.chap; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(cx, py, 6, 0, 7); ctx.fill();
      text(ctx, "rotates at ω₀", cx, cy + R + 22, c.muted, 11.5, "center");
      // time curve
      const l = sm ? 40 : cx + R + 50, r = g.w - 12, tp = sm ? cy + R + 40 : 18, bt = g.h - 24;
      const q = frame(ctx, c, { l, r, t: tp, b: bt }, [0, 1.3], [-6, 6], { xt: [0.25, 0.5, 0.75, 1, 1.25], yt: [-5, 0, 5], xl: (x) => x, yl: (x) => x, xn: "t (s)", yn: "x (cm)" });
      const pts = []; for (let i = 0; i <= 260; i++) { const tt = i / 200; pts.push([q.X(tt), q.Y(100 * Xm * Math.sin(W0 * tt + ph))]); }
      line(ctx, pts, c.chap, 2.6);
      if (t > 0) { ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(q.X(Math.min(t, 1.3)), q.Y(100 * Xm * Math.sin(th)), 6, 0, 7); ctx.fill(); }
      // initial tangent
      L.arrow(ctx, q.X(0), q.Y(v.x0), q.X(0) + 34, q.Y(v.x0) - Math.sign(v.v0) * 22 * Math.min(1, Math.abs(v.v0) / 0.2), c.acc, 2);
      ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(q.X(0), q.Y(v.x0), 5, 0, 7); ctx.fill();
      const sp = Math.sin(ph), cp = Math.cos(ph);
      chips(out, [["Xm = √(x₀² + (v₀/ω₀)²) =", F(Xm * 100, 2) + " cm"], ["sin φ = x₀/Xm =", F(sp, 2)], ["cos φ = v₀/(ω₀Xm) =", F(cp, 2)], ["φ =", piText(ph), "good"]]);
    }
    const btn = root.querySelector('[data-act="play"]');
    function loop(ts) { if (!run) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt * 0.5; draw(); if (t > 1.3) { run = false; btn.textContent = "▶ Run"; return; } requestAnimationFrame(loop); }
    btn.addEventListener("click", () => { t = 0; run = true; last = 0; btn.textContent = "… running"; requestAnimationFrame(loop); });
    root.querySelectorAll("[data-case]").forEach((b) => b.addEventListener("click", () => {
      const [x0, v0] = b.dataset.case.split(",").map(Number);
      const rx = root.querySelector('input[name="x0"]'), rv = root.querySelector('input[name="v0"]');
      rx.value = x0; rv.value = v0; rx.dispatchEvent(new Event("input")); rv.dispatchEvent(new Event("input"));
    }));
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size(); return { resize: size, draw };
  };

  /* ------------------------------------------------ 3. x, v, a together (+ a–x and v–x) */
  sims["sim-xva"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, t = 0, run = true, last = 0, view = "t"; const m = 0.25, k = 25, w = 10, Xm = 0.04, ph = PI / 2;
    root.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { view = b.dataset.view; root.querySelectorAll("[data-view]").forEach((q) => q.setAttribute("aria-pressed", q === b)); draw(); }));
    const pauseB = root.querySelector('[data-act="pause"]');
    pauseB.addEventListener("click", () => { run = !run; pauseB.textContent = run ? "❚❚ Pause" : "▶ Play"; if (run) { last = 0; requestAnimationFrame(loop); } });
    function draw() {
      if (!g) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const x = Xm * Math.sin(w * t + ph), vv = Xm * w * Math.cos(w * t + ph), a = -w * w * x;
      const sc = Math.min(1800, (g.w - 120) / 0.14);
      const bx = scene(ctx, c, g.w / 2, 58, x, sc, { L0: 0.06, right: 0.07, bw: 40, bh: 30, coils: 8 });
      if (Math.abs(vv) > 0.01) L.arrow(ctx, bx, 14, bx + vv * 90, 14, c.chap, 2.6);
      if (Math.abs(a) > 0.05) L.arrow(ctx, bx, 26, bx + a * 9, 26, c.acc, 2.6);
      text(ctx, "v", bx + vv * 90 + (vv > 0 ? 8 : -8), 14, c.chap, 12, vv > 0 ? "left" : "right", true);
      text(ctx, "a", bx + a * 9 + (a > 0 ? 8 : -8), 26, c.acc, 12, a > 0 ? "left" : "right", true);
      const top = 104, H = g.h - top - 8;
      if (view === "t") {
        const rows = [["x (cm)", (tt) => 100 * Xm * Math.sin(w * tt + ph), 4.4, c.chap], ["v (m/s)", (tt) => Xm * w * Math.cos(w * tt + ph), 0.44, c.ok], ["a (m/s²)", (tt) => -w * w * Xm * Math.sin(w * tt + ph), 4.4, c.acc]];
        const T = 2 * 2 * PI / w, hh = H / 3;
        rows.forEach(([nm, f, mx, col], i) => {
          const q = frame(ctx, c, { l: 54, r: g.w - 10, t: top + i * hh + 6, b: top + (i + 1) * hh - 10 }, [0, T], [-mx * 1.15, mx * 1.15], { xt: [T / 4, T / 2, 3 * T / 4, T], yt: [], yn: nm });
          const pts = []; for (let j = 0; j <= 200; j++) { const tt = (j / 200) * T; pts.push([q.X(tt), q.Y(f(tt))]); }
          line(ctx, pts, col, 2.4);
          const tt = t % T; ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(q.X(tt), top + i * hh + 6); ctx.lineTo(q.X(tt), top + (i + 1) * hh - 10); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.X(tt), q.Y(f(tt)), 5, 0, 7); ctx.fill();
        });
      } else {
        const half = view === "ax", lim = half ? [-4.8, 4.8] : [-0.48, 0.48];
        const q = frame(ctx, c, { l: g.w / 2 - Math.min(g.w / 2 - 50, H * 0.9), r: g.w / 2 + Math.min(g.w / 2 - 50, H * 0.9), t: top + 4, b: g.h - 22 }, [-5, 5], lim,
          { xt: [-4, -2, 0, 2, 4], yt: [], xl: (v) => v, xn: "x (cm)", yn: half ? "a (m/s²)" : "v (m/s)" });
        const pts = []; for (let j = 0; j <= 200; j++) { const th = (j / 200) * 2 * PI; const xx = 100 * Xm * Math.sin(th); pts.push([q.X(xx), q.Y(half ? -w * w * Xm * Math.sin(th) : Xm * w * Math.cos(th))]); }
        line(ctx, pts, half ? c.acc : c.ok, 2.6);
        ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(q.X(100 * x), q.Y(half ? a : vv), 6, 0, 7); ctx.fill();
        text(ctx, half ? "a = −ω₀² x : a straight line of slope −ω₀²" : "an ellipse: ½kx² + ½mv² = constant", g.w / 2, top + 14, c.muted, 12.5, "center", true);
      }
      chips(out, [["x =", F(100 * x, 2) + " cm"], ["v =", F(vv, 2) + " m/s"], ["a =", F(a, 2) + " m/s²"], ["a = −ω₀²x ✔", "", "good"]]);
    }
    function loop(ts) { if (!run) return; if (!visible(cv)) { last = 0; return requestAnimationFrame(loop); } const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt * 0.35; draw(); requestAnimationFrame(loop); }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size(); requestAnimationFrame(loop); return { resize: size, draw };
  };

  /* ------------------------------------------------ 4. energy: t and x views */
  sims["sim-energy"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, t = 0, last = 0; const v = {};
    ["m", "k", "Xm"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; draw(); }));
    function draw() {
      if (!g || v.Xm === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const w = Math.sqrt(v.k / v.m), T0 = 2 * PI / w, X = v.Xm / 100, x = X * Math.sin(w * t), vv = X * w * Math.cos(w * t);
      const ME = 0.5 * v.k * X * X, EP = 0.5 * v.k * x * x, KE = 0.5 * v.m * vv * vv, sm = g.w < 560;
      const sc = Math.min(1600, (g.w - 140) / 0.14);
      scene(ctx, c, g.w / 2, 52, x, sc, { L0: 0.06, right: 0.07, bw: 38, bh: 28, coils: 8 });
      const top = 86, H = g.h - top - 6, Emax = ME * 1.15;
      // bars
      const bars = [["KE", KE, c.ok], ["EPE", EP, c.acc], ["ME", ME, c.chap]], bw = sm ? 28 : 34, bx0 = 14;
      bars.forEach(([n, E, col], i) => {
        const x0 = bx0 + i * (bw + 10), hgt = (H - 40) * E / Emax;
        rrect(ctx, x0, top + H - 22 - hgt, bw, hgt, 4, col); text(ctx, n, x0 + bw / 2, top + H - 10, c.ink, 12, "center", true);
      });
      const gx = bx0 + 3 * (bw + 10) + 18, gw = (g.w - gx - 10);
      // E(t)
      const q = frame(ctx, c, { l: gx + 30, r: gx + (sm ? gw : gw * 0.55) - 8, t: top + 8, b: top + H - 22 }, [0, 2 * T0], [0, Emax], { xt: [T0 / 2, T0, 1.5 * T0, 2 * T0], yt: [], xl: (tt) => ({ [T0 / 2]: "T₀/2", [T0]: "T₀", [1.5 * T0]: "", [2 * T0]: "2T₀" })[tt] || "", xn: "t", yn: "E" });
      [[(tt) => 0.5 * v.m * (X * w * Math.cos(w * tt)) ** 2, c.ok], [(tt) => 0.5 * v.k * (X * Math.sin(w * tt)) ** 2, c.acc], [() => ME, c.chap]].forEach(([f, col]) => {
        const pts = []; for (let j = 0; j <= 200; j++) { const tt = (j / 200) * 2 * T0; pts.push([q.X(tt), q.Y(f(tt))]); } line(ctx, pts, col, 2.4);
      });
      const tt = t % (2 * T0); ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(q.X(tt), top + 8); ctx.lineTo(q.X(tt), top + H - 22); ctx.stroke(); ctx.setLineDash([]);
      if (!sm) {
        const q2 = frame(ctx, c, { l: gx + gw * 0.58 + 10, r: g.w - 12, t: top + 8, b: top + H - 22 }, [-X * 1.1, X * 1.1], [0, Emax], { xt: [-X, 0, X], yt: [], xl: (xx) => (xx === 0 ? "0" : xx > 0 ? "Xm" : "−Xm"), xn: "x", yn: "E" });
        [[(xx) => 0.5 * v.k * (X * X - xx * xx), c.ok], [(xx) => 0.5 * v.k * xx * xx, c.acc], [() => ME, c.chap]].forEach(([f, col]) => {
          const pts = []; for (let j = 0; j <= 120; j++) { const xx = -X + (2 * X * j) / 120; pts.push([q2.X(xx), q2.Y(f(xx))]); } line(ctx, pts, col, 2.4);
        });
        ctx.fillStyle = c.ok; ctx.beginPath(); ctx.arc(q2.X(x), q2.Y(KE), 5, 0, 7); ctx.fill();
        ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(q2.X(x), q2.Y(EP), 5, 0, 7); ctx.fill();
      }
      chips(out, [["ME = ½kXm² =", F(ME * 1000, 2) + " mJ", "good"], ["KE =", F(KE * 1000, 2) + " mJ"], ["EPE =", F(EP * 1000, 2) + " mJ"], ["period of KE and EPE =", "T₀/2 = " + F(T0 / 2, 3) + " s"]]);
    }
    function loop(ts) { if (!visible(cv)) { last = 0; return requestAnimationFrame(loop); } const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt * 0.35; draw(); requestAnimationFrame(loop); }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size(); requestAnimationFrame(loop); return { resize: size, draw };
  };

  /* ------------------------------------------------ 5. damping lab */
  sims["sim-damp"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, s, hist = [], last = 0, peaks = []; const v = {}; const m = 0.5, k = 50, X0 = 0.10;
    ["h"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; reset(); }));
    function reset() { s = { x: X0, v: 0, t: 0 }; hist = [[0, X0, 0.5 * k * X0 * X0]]; peaks = []; }
    function regime() { const hc = 2 * Math.sqrt(k * m); return v.h === 0 ? ["free undamped: periodic", c => c.chap] : v.h < hc * 0.999 ? ["free damped: pseudo-periodic", c => c.ok] : v.h < hc * 1.02 ? ["critical: back to O fastest, no oscillation", c => c.acc] : ["aperiodic: no oscillation", c => c.bad]; }
    function draw() {
      if (!g || !s) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const sc = Math.min(1100, (g.w - 140) / 0.3);
      scene(ctx, c, g.w / 2, 52, s.x, sc, { L0: 0.12, right: 0.13, bw: 38, bh: 28 });
      const top = 86, H = g.h - top - 8, Tm = 6;
      const q = frame(ctx, c, { l: 50, r: g.w - 10, t: top + 6, b: top + H * 0.62 }, [0, Tm], [-11, 11], { xt: [1, 2, 3, 4, 5, 6], yt: [-10, 0, 10], xl: (x) => x + " s", yl: (x) => x, yn: "x (cm)" });
      if (v.h > 0 && v.h < 2 * Math.sqrt(k * m)) {
        const env = (tt, sg) => [q.X(tt), q.Y(sg * 10 * Math.exp(-v.h * tt / (2 * m)))];
        line(ctx, Array.from({ length: 121 }, (_, j) => env((j / 120) * Tm, 1)), c.line, 1.5, [5, 4]);
        line(ctx, Array.from({ length: 121 }, (_, j) => env((j / 120) * Tm, -1)), c.line, 1.5, [5, 4]);
      }
      line(ctx, hist.filter((p) => p[0] <= Tm).map(([tt, x]) => [q.X(tt), q.Y(100 * x)]), regime()[1](c), 2.6);
      const q2 = frame(ctx, c, { l: 50, r: g.w - 10, t: top + H * 0.7, b: top + H - 14 }, [0, Tm], [0, 0.3], { xt: [1, 2, 3, 4, 5, 6], yt: [], yn: "ME (J)" });
      line(ctx, hist.filter((p) => p[0] <= Tm).map(([tt, , E]) => [q2.X(tt), q2.Y(E)]), c.chap, 2.4);
      const T0 = 2 * PI * Math.sqrt(m / k), hc = 2 * Math.sqrt(k * m);
      const Tp = v.h < hc ? 2 * PI / Math.sqrt(k / m - (v.h / (2 * m)) ** 2) : Infinity;
      const ME = 0.5 * m * s.v * s.v + 0.5 * k * s.x * s.x;
      chips(out, [["mode:", regime()[0], "good"], ["T₀ =", F(T0, 3) + " s"], ["pseudo-period T =", isFinite(Tp) ? F(Tp, 3) + " s" : "—"],
        ["ME lost so far =", F(0.5 * k * X0 * X0 - ME, 3) + " J"], ...(peaks.length > 1 ? [["amplitude after " + (peaks.length - 1) + " osc. =", F(100 * peaks[peaks.length - 1], 2) + " cm"]] : [])]);
    }
    function loop(ts) {
      if (!visible(cv)) { last = 0; return requestAnimationFrame(loop); }
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (s.t < 6) {
        const pv = s.v; stepOsc(s, { m, k, h: v.h }, dt * 0.6);
        if (pv > 0 && s.v <= 0) peaks.push(s.x);
        hist.push([s.t, s.x, 0.5 * m * s.v * s.v + 0.5 * k * s.x * s.x]);
      }
      draw(); requestAnimationFrame(loop);
    }
    root.querySelector('[data-act="again"]').addEventListener("click", reset);
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    reset(); size(); requestAnimationFrame(loop); return { resize: size, draw };
  };

  /* ------------------------------------------------ 6. driving (maintaining) the oscillations */
  sims["sim-drive"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, s, hist = [], last = 0, given = 0, on = false, onAt = 0; const m = 0.5, k = 50, h = 0.12, X0 = 0.10;
    const tg = root.querySelector('[data-act="drive"]');
    function reset() { s = { x: X0, v: 0, t: 0 }; hist = []; given = 0; on = false; tg.textContent = "⚡ Switch the driving device ON"; }
    tg.addEventListener("click", () => { on = !on; onAt = s.t; given = 0; tg.textContent = on ? "Switch it OFF" : "⚡ Switch the driving device ON"; });
    root.querySelector('[data-act="again"]').addEventListener("click", reset);
    function draw() {
      if (!g || !s) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const sc = Math.min(1100, (g.w - 140) / 0.3);
      const bx = scene(ctx, c, g.w / 2, 52, s.x, sc, { L0: 0.12, right: 0.13, bw: 38, bh: 28 });
      if (on && Math.abs(s.x) < 0.01) { ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(bx, 14, 8, 0, 7); ctx.fill(); text(ctx, "push", bx + 12, 14, c.acc, 12, "left", true); }
      const top = 86, H = g.h - top - 8, span = 8, t0 = Math.max(0, s.t - span);
      const q = frame(ctx, c, { l: 50, r: g.w - 10, t: top + 6, b: top + H - 18 }, [t0, t0 + span], [-11, 11], { xt: [], yt: [-10, 0, 10], yl: (x) => x, yn: "x (cm)", xn: "t" });
      line(ctx, hist.filter((p) => p[0] >= t0).map(([tt, x]) => [q.X(tt), q.Y(100 * x)]), on ? c.ok : c.chap, 2.6);
      const ME = 0.5 * m * s.v * s.v + 0.5 * k * s.x * s.x, dur = s.t - onAt;
      chips(out, [["device:", on ? "ON — energy given each half-cycle" : "OFF — the amplitude decays", on ? "good" : ""], ["ME =", F(ME, 3) + " J"],
        ...(on && dur > 1 ? [["energy supplied =", F(given, 3) + " J"], ["average power =", F(given / dur * 1000, 1) + " mW", "good"]] : [])]);
    }
    function loop(ts) {
      if (!visible(cv)) { last = 0; return requestAnimationFrame(loop); }
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      const target = 0.5 * k * X0 * X0;
      stepOsc(s, { m, k, h, after: (st, hh) => {
        if (!on) return;
        // the device acts near O, in the sense of motion, to restore the initial energy
        if (Math.abs(st.x) < 0.006) { const E = 0.5 * m * st.v * st.v + 0.5 * k * st.x * st.x; if (E < target) { const dE = Math.min(target - E, 0.4 * hh); const nv = Math.sqrt(st.v * st.v + 2 * dE / m) * Math.sign(st.v || 1); given += 0.5 * m * (nv * nv - st.v * st.v); st.v = nv; } }
      } }, dt * 0.6);
      hist.push([s.t, s.x]); if (hist.length > 4000) hist.shift();
      draw(); requestAnimationFrame(loop);
    }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    reset(); size(); requestAnimationFrame(loop); return { resize: size, draw };
  };

  /* ------------------------------------------------ 7. T0² = f(m) lab with a mystery spring */
  sims["sim-t2m"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout"), tbody = root.querySelector("tbody");
    const K = [20, 25, 32, 40, 50, 64][Math.floor(Math.random() * 6)];
    let g, s = null, last = 0, pts = [], mass = 0.2, timing = null;
    root.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      mass = +b.dataset.m; s = { x: 0.05, v: 0, t: 0 }; timing = { n: 0, t0: null, prev: 0 };
      root.querySelectorAll("[data-m]").forEach((q) => q.setAttribute("aria-pressed", q === b));
    }));
    root.querySelector('[data-act="check"]').addEventListener("click", () => {
      const val = parseFloat(root.querySelector('input[name="kguess"]').value.replace(",", "."));
      const r = root.querySelector(".kres");
      if (isNaN(val)) { r.textContent = ""; return; }
      r.textContent = Math.abs(val - K) / K < 0.05 ? `✔ Yes! k = ${K} N/m` : "✘ Not yet: use the slope of T₀² = f(m), slope = 4π²/k";
      r.className = "kres " + (Math.abs(val - K) / K < 0.05 ? "ok" : "no");
    });
    function draw() {
      if (!g) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const sm = g.w < 560, sw = sm ? g.w : g.w * 0.5;
      const x = s ? s.x : 0, sc = Math.min(1400, (sw - 110) / 0.16);
      scene(ctx, c, sw / 2 + 10, 60, x, sc, { L0: 0.07, right: 0.08, bw: 30 + mass * 30, bh: 22 + mass * 20, label: mass + " kg" });
      if (timing) text(ctx, timing.t0 === null ? "waiting for a passage at O…" : `⏱ ${F(s.t - timing.t0, 2)} s · ${timing.n} / 10 oscillations`, sw / 2, 100, c.ink, 13, "center", true);
      const l = sm ? 46 : sw + 46, tp = sm ? 120 : 16, r = g.w - 12, b = g.h - 26;
      const q = frame(ctx, c, { l, r, t: tp, b }, [0, 1.05], [0, 2.2], { xt: [0.2, 0.4, 0.6, 0.8, 1], yt: [0.5, 1, 1.5, 2], xl: (v) => v, yl: (v) => v, xn: "m (kg)", yn: "T₀² (s²)" });
      pts.forEach(([mm, T]) => { ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(q.X(mm), q.Y(T * T), 5, 0, 7); ctx.fill(); });
      if (pts.length >= 2) { const sl = pts.reduce((a, [mm, T]) => a + mm * T * T, 0) / pts.reduce((a, [mm]) => a + mm * mm, 0);
        line(ctx, [[q.X(0), q.Y(0)], [q.X(1.05), q.Y(sl * 1.05)]], c.acc, 2, [6, 4]);
        chips(out, [["points:", pts.length], ["slope = 4π²/k ≈", F(sl, 3) + " s²/kg", "good"], ["straight line through O: T₀² ∝ m ✔", ""]]);
      } else chips(out, [["Pick a mass: the timer measures 10 oscillations, then adds the point.", ""]]);
    }
    function loop(ts) {
      if (!visible(cv)) { last = 0; return requestAnimationFrame(loop); }
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (s) {
        const px = s.x; stepOsc(s, { m: mass, k: K, h: 0 }, dt);
        if (px < 0 && s.x >= 0) { // passage at O in the + sense
          if (timing.t0 === null) { timing.t0 = s.t; }
          else if (++timing.n === 10) {
            const T = (s.t - timing.t0) / 10; pts = pts.filter(([mm]) => mm !== mass); pts.push([mass, T]);
            tbody.innerHTML = pts.sort((a, b2) => a[0] - b2[0]).map(([mm, TT]) => `<tr><td>${mm}</td><td>${F(TT * 10, 2)}</td><td>${F(TT, 3)}</td><td>${F(TT * TT, 3)}</td></tr>`).join("");
            s = null; timing = null;
          }
        }
      }
      draw(); requestAnimationFrame(loop);
    }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size(); requestAnimationFrame(loop); return { resize: size, draw };
  };

  /* ------------------------------------------------ 8. simple pendulum (measure g) */
  sims["sim-pend"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, th, om, t = 0, last = 0, cross = [], Tm = NaN; const v = {};
    const G = { earth: 9.8, moon: 1.62, mars: 3.71, jupiter: 24.8 };
    let planet = "earth";
    ["l", "a0"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; reset(); }));
    root.querySelectorAll("[data-planet]").forEach((b) => b.addEventListener("click", () => { planet = b.dataset.planet; root.querySelectorAll("[data-planet]").forEach((q) => q.setAttribute("aria-pressed", q === b)); reset(); }));
    function reset() { th = (v.a0 || 10) * PI / 180; om = 0; t = 0; cross = []; Tm = NaN; }
    function draw() {
      if (!g || v.l === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const gg = G[planet], sm = g.w < 560, px0 = sm ? g.w / 2 : g.w * 0.3, Lpx = Math.min(g.h - 70, (sm ? g.h * 0.55 : g.h - 70)) * (v.l / 2);
      ctx.fillStyle = c.line; ctx.fillRect(px0 - 60, 14, 120, 6);
      const bx = px0 + Lpx * Math.sin(th), by = 20 + Lpx * Math.cos(th);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(px0, 20); ctx.lineTo(px0, 20 + Lpx + 20); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, 20); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(bx, by, 13, 0, 7); ctx.fill();
      text(ctx, "ℓ = " + F(v.l, 2) + " m", px0 + 10, 20 + Lpx / 2, c.muted, 12, "left");
      const T0 = 2 * PI * Math.sqrt(v.l / gg);
      if (!sm) {
        const q = frame(ctx, c, { l: g.w * 0.58, r: g.w - 12, t: 18, b: g.h - 26 }, [0, 2.1], [0, 9], { xt: [0.5, 1, 1.5, 2], yt: [2, 4, 6, 8], xl: (x) => x, yl: (x) => x, xn: "ℓ (m)", yn: "T₀² (s²)" });
        line(ctx, [[q.X(0), q.Y(0)], [q.X(2.1), q.Y(4 * PI * PI * 2.1 / gg)]], c.acc, 2, [6, 4]);
        ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(q.X(v.l), q.Y(T0 * T0), 6, 0, 7); ctx.fill();
        text(ctx, "slope = 4π²/g", q.X(1.2), q.Y(Math.min(8.5, 4 * PI * PI * 1.2 / gg)) - 16, c.acc, 12.5, "center", true);
      }
      chips(out, [["T₀ = 2π√(ℓ/g) =", F(T0, 3) + " s"], ["measured T =", isFinite(Tm) ? F(Tm, 3) + " s" : "…", Math.abs(Tm - T0) / T0 < 0.01 ? "good" : ""],
        [v.a0 > 20 ? "large angle: T > T₀ (formula only for small oscillations)" : "small angle: T ≈ T₀ ✔", ""]]);
    }
    function loop(ts) {
      if (!visible(cv)) { last = 0; return requestAnimationFrame(loop); }
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      const gg = G[planet], n = Math.ceil(dt / 0.001), h = dt / Math.max(1, n);
      for (let i = 0; i < n; i++) { const pth = th; om += -(gg / v.l) * Math.sin(th) * h; th += om * h; t += h; if (pth < 0 && th >= 0) { cross.push(t); if (cross.length > 1) Tm = (cross[cross.length - 1] - cross[0]) / (cross.length - 1); } }
      draw(); requestAnimationFrame(loop);
    }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    reset(); size(); requestAnimationFrame(loop); return { resize: size, draw };
  };

  /* ------------------------------------------------ 9. collision then oscillation */
  sims["sim-hit"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, s = null, bul = null, last = 0, run = false; const v = {}, M = 0.99, k = 100;
    ["mb", "vb"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; if (!run) draw(); }));
    const btn = root.querySelector('[data-act="fire"]');
    btn.addEventListener("click", () => { bul = { x: -0.35 }; s = null; run = true; last = 0; requestAnimationFrame(loop); });
    function draw() {
      if (!g || v.vb === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const mb = v.mb / 1000, Mt = M + mb, V0 = mb * v.vb / Mt, w = Math.sqrt(k / Mt), Xm = V0 / w;
      const sc = Math.min(1000, (g.w - 60) / 0.7), X0 = g.w * 0.62;
      const x = s ? s.x : 0, bx = scene(ctx, c, X0, g.h * 0.55, x, sc, { side: "right", L0: 0.17, right: 0.55, bw: 50, bh: 36, label: "B", color: c.chap });
      if (bul) { const xx = X0 + bul.x * sc; ctx.fillStyle = c.acc; ctx.beginPath(); ctx.ellipse(xx, g.h * 0.55 - 8, 9, 4, 0, 0, 7); ctx.fill(); }
      chips(out, [["V₀ = m·v/(M+m) =", F(V0, 3) + " m/s"], ["ω₀ = √(k/(M+m)) =", F(w, 2) + " rad/s"], ["Xm = V₀/ω₀ =", F(Xm * 100, 2) + " cm", "good"],
        ["KE lost in the shock =", F(0.5 * mb * v.vb ** 2 - 0.5 * Mt * V0 * V0, 2) + " J"]]);
    }
    function loop(ts) {
      if (!run) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      const mb = v.mb / 1000, Mt = M + mb;
      if (bul) { bul.x += dt * 0.6; if (bul.x >= -0.025) { bul = null; s = { x: 0, v: mb * v.vb / Mt, t: 0 }; } }
      else if (s) { stepOsc(s, { m: Mt, k, h: 0 }, dt * 0.5); if (s.t > 6) { run = false; } }
      draw(); if (run) requestAnimationFrame(loop);
    }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size(); return { resize: size, draw };
  };

  /* ------------------------------------------------ derivation stepper (no canvas) */
  function initSteppers() {
    document.querySelectorAll(".stepper").forEach((st) => {
      const lines = [...st.querySelectorAll(".sl")], b = st.querySelector("[data-next]");
      let i = 1; const show = () => lines.forEach((l, j) => (l.hidden = j >= i));
      show();
      b.addEventListener("click", () => {
        if (i >= lines.length) { i = 1; show(); b.textContent = "Next line ▸"; return; }
        lines[i].hidden = false; lines[i].classList.add("pop"); i++;
        b.textContent = i >= lines.length ? "↺ Start again" : "Next line ▸";
      });
    });
  }

  /* ------------------------------------------------ lazy init + resize */
  const live = {};
  function initVisible() {
    Object.keys(sims).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const cv = el.querySelector("canvas");
      if (!live[id] && visible(cv)) live[id] = sims[id](el);
      else if (live[id] && visible(cv) && Math.abs(cv.clientWidth - (cv._w || 0)) > 4) live[id].resize();
      if (cv) cv._w = cv.clientWidth;
    });
  }
  document.addEventListener("DOMContentLoaded", () => { initSteppers(); setTimeout(initVisible, 30); });
  window.addEventListener("lsp-open", () => setTimeout(initVisible, 30));
  window.addEventListener("lsp-panel", () => setTimeout(initVisible, 30));
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { Object.keys(live).forEach((id) => { const cv = document.getElementById(id).querySelector("canvas"); if (visible(cv)) live[id].resize(); }); }, 150); });
  window.addEventListener("lsp-theme", () => Object.values(live).forEach((s) => s.draw && s.draw()));
})();
