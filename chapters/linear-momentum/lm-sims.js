/* =========================================================
   Linear Momentum — live models
   ========================================================= */
(function () {
  "use strict";
  const L = window.LSP;
  const C = () => ({
    ink: L.css("--ink"), muted: L.css("--muted"), chap: L.css("--chap"), acc: L.css("--accent"),
    paper: L.css("--paper"), grid: L.css("--grid"), ok: L.css("--ok"), line: L.css("--line"), bad: L.css("--bad")
  });
  const F = L.fmt;
  const sims = {};
  const visible = (el) => el && el.offsetParent !== null && el.clientWidth > 0;
  function chips(el, items) {
    el.innerHTML = items.map(([k, v, cls]) => `<span class="chip ${cls || ""}">${k} <b>${v}</b></span>`).join("");
  }
  function text(ctx, s, x, y, col, size, align, bold) {
    ctx.fillStyle = col; ctx.font = `${bold ? "700 " : ""}${size || 13}px Atkinson Hyperlegible, system-ui, sans-serif`;
    ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
  }
  function rrect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function pointer(cv, cb) {
    // Drag only when the finger/mouse starts on a handle; anywhere else the page scrolls normally.
    let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const hit = (x, y, touch) => cb.down(x, y, touch ? 34 : 22);
    cv.addEventListener("touchstart", (e) => {
      const t0 = e.touches[0], r = cv.getBoundingClientRect();
      if (e.touches.length === 1 && hit(t0.clientX - r.left, t0.clientY - r.top, true)) e.preventDefault(); // stop scroll only on a handle
    }, { passive: false });
    cv.addEventListener("touchmove", (e) => { if (drag) e.preventDefault(); }, { passive: false });
    cv.addEventListener("pointerdown", (e) => {
      const p = pos(e); drag = hit(p[0], p[1], e.pointerType === "touch");
      if (drag) { try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); cv.style.cursor = "grabbing"; }
    });
    cv.addEventListener("pointermove", (e) => {
      const p = pos(e);
      if (drag) { cb.move(drag, Math.max(0, Math.min(cv.clientWidth, p[0])), Math.max(0, Math.min(cv.clientHeight, p[1]))); e.preventDefault(); }
      else cv.style.cursor = hit(p[0], p[1], false) ? "grab" : "default";
    });
    const up = () => { drag = null; cv.style.cursor = "default"; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
  }
  // keep a point inside the drawing area (margin in px)
  const clampPt = (x, y, w, h, m) => [Math.max(m, Math.min(w - m, x)), Math.max(m, Math.min(h - m, y))];

  /* ------------------------------------------------ 1. feel it */
  sims["sim-feel"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    const OBJ = {
      truck: { m: 1e4, v: 10, n: "Truck" }, car: { m: 1e3, v: 10, n: "Car" }, ball5: { m: 0.06, v: 5, n: "Tossed ball" },
      ball50: { m: 0.06, v: 50, n: "Served ball" }, bullet: { m: 0.01, v: 400, n: "Bullet" }, student: { m: 60, v: 1.5, n: "Student" },
      tanker: { m: 3e8, v: 1, n: "Oil tanker" }
    };
    const sa = root.querySelector('select[name="a"]'), sb = root.querySelector('select[name="b"]');
    let g, xs = [0, 0], last = 0;
    function size() { g = L.canvas(cv, +cv.dataset.aspect); }
    function update() {
      const A = OBJ[sa.value], B = OBJ[sb.value], pa = A.m * A.v, pb = B.m * B.v;
      const big = pa >= pb ? "A" : "B", r = Math.max(pa, pb) / Math.min(pa, pb);
      chips(out, [["P<sub>A</sub> =", F(pa) + " kg·m/s"], ["P<sub>B</sub> =", F(pb) + " kg·m/s"],
        [r < 1.05 ? "Same momentum" : `${big} is harder to stop: ×`, r < 1.05 ? "" : F(r, 1), "good"]]);
    }
    function draw(ts) {
      if (!visible(cv)) { last = 0; return requestAnimationFrame(draw); }
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      const c = C(), ctx = g.ctx, W = g.w, H = g.h, sm = W < 560, laneW = sm ? W - 10 : W * 0.6;
      ctx.clearRect(0, 0, W, H);
      [sa, sb].forEach((s, i) => {
        const o = OBJ[s.value], y = sm ? H * (i ? 0.62 : 0.14) + 16 : H * (i ? 0.72 : 0.3);
        const px = 30 + 55 * Math.log10(o.v + 1);
        const bw = 14 + 9 * Math.log10(o.m * 100 + 1), bh = 8 + 3.4 * Math.log10(o.m * 100 + 1);
        xs[i] = (xs[i] + px * dt) % (laneW + bw);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, y + bh / 2 + 4); ctx.lineTo(laneW, y + bh / 2 + 4); ctx.stroke();
        const x = xs[i] - bw + 10;
        ctx.save(); ctx.beginPath(); ctx.rect(10, 0, laneW - 10, H); ctx.clip();
        rrect(ctx, x, y - bh / 2, bw, bh, 4, i ? c.acc : c.chap);
        L.arrow(ctx, x + bw + 4, y, x + bw + 4 + Math.min(60, px * 0.45), y, c.ink, 2);
        ctx.restore();
        text(ctx, (i ? "B · " : "A · ") + o.n, 14, y - bh / 2 - 12, c.ink, 13, "left", true);
        // log bar
        const bx = sm ? 14 : laneW + 26, bwMax = sm ? W - 28 : W - bx - 14, p = o.m * o.v, by = sm ? y + 48 : y;
        const frac = (Math.log10(p) + 2) / 11; // 10^-2 .. 10^9
        rrect(ctx, bx, by - 10, bwMax, 20, 5, c.paper, c.line);
        rrect(ctx, bx, by - 10, Math.max(4, bwMax * frac), 20, 5, i ? c.acc : c.chap);
        text(ctx, "P = " + F(p) + " kg·m/s", bx, by - 22, c.ink, 12.5, "left");
      });
      text(ctx, "momentum bars: log scale", sm ? W - 14 : laneW + 26, H - 10, c.muted, 11.5, sm ? "right" : "left");
      requestAnimationFrame(draw);
    }
    sa.addEventListener("change", update); sb.addEventListener("change", update);
    size(); update(); requestAnimationFrame(draw);
    return { resize: size };
  };

  /* ------------------------------------------------ 2. vector */
  sims["sim-vector"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, v = { x: 4, y: 2.5 }, m = 1;
    const S = 26;
    function O() { return { x: g.w * 0.22, y: g.h * 0.78 }; }
    function draw() {
      if (!g) return; const c = C(), ctx = g.ctx, o = O();
      ctx.clearRect(0, 0, g.w, g.h);
      // grid
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (let x = o.x % S; x < g.w; x += S) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.h); ctx.stroke(); }
      for (let y = o.y % S; y < g.h; y += S) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.w, y); ctx.stroke(); }
      L.arrow(ctx, 10, o.y, g.w - 8, o.y, c.muted, 1.2); L.arrow(ctx, o.x, g.h - 6, o.x, 8, c.muted, 1.2);
      text(ctx, "x", g.w - 14, o.y + 12, c.muted, 13); text(ctx, "y", o.x + 10, 12, c.muted, 13);
      const P = { x: m * v.x, y: m * v.y };
      // P components
      ctx.setLineDash([5, 4]); ctx.strokeStyle = c.chap; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(o.x + P.x * S, o.y); ctx.lineTo(o.x + P.x * S, o.y - P.y * S); ctx.lineTo(o.x, o.y - P.y * S); ctx.stroke(); ctx.setLineDash([]);
      L.arrow(ctx, o.x, o.y, o.x + P.x * S, o.y, c.chap, 3); L.arrow(ctx, o.x, o.y, o.x, o.y - P.y * S, c.chap, 3);
      text(ctx, "Px = " + F(P.x), o.x + P.x * S / 2, o.y + (P.y >= 0 ? 16 : -16), c.chap, 13, "center", true);
      text(ctx, "Py = " + F(P.y), o.x - 8, o.y - P.y * S / 2, c.chap, 13, "right", true);
      L.arrow(ctx, o.x, o.y, o.x + P.x * S, o.y - P.y * S, c.ink, 4.5);
      { const tx = o.x + P.x * S, ty = o.y - P.y * S, right = tx > g.w - 90;
        text(ctx, "P = m v", tx + (right ? -10 : 10), Math.max(12, ty - 14), c.ink, 14, right ? "right" : "left", true); }
      L.arrow(ctx, o.x, o.y, o.x + v.x * S, o.y - v.y * S, c.acc, 2.2);
      ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(o.x + v.x * S, o.y - v.y * S, 8, 0, 7); ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
      { const tx = o.x + v.x * S, ty = o.y - v.y * S, right = tx > g.w - 110;
        text(ctx, "v (drag me)", tx + (right ? -12 : 12), Math.min(g.h - 10, ty + 16), c.acc, 13, right ? "right" : "left", true); }
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, 7); ctx.fill();
      const ang = Math.atan2(v.y, v.x) * 180 / Math.PI;
      chips(out, [["v =", F(Math.hypot(v.x, v.y)) + " m/s"], ["angle =", F(ang, 0) + "°"], ["P<sub>x</sub> =", F(P.x)], ["P<sub>y</sub> =", F(P.y)], ["P =", F(Math.hypot(P.x, P.y)) + " kg·m/s", "good"]]);
    }
    // largest factor k <= 1 so that the tip of k*m*v (and of v) stays inside the frame
    function fit() {
      const o = O(), M = 16, f = Math.max(1, m);
      let k = 1;
      const tx = v.x * S * f, ty = v.y * S * f;
      if (tx > 0) k = Math.min(k, (g.w - M - o.x) / tx); if (tx < 0) k = Math.min(k, (M - o.x) / tx);
      if (ty > 0) k = Math.min(k, (o.y - M) / ty); if (ty < 0) k = Math.min(k, (o.y - (g.h - M)) / ty);
      if (k < 1) { v.x = Math.floor(v.x * k * 2) / 2; v.y = Math.floor(v.y * k * 2) / 2; }
    }
    pointer(cv, {
      down: (x, y, r) => { const o = O(); return Math.hypot(x - (o.x + v.x * S), y - (o.y - v.y * S)) < r ? 1 : null; },
      move: (_, x, y) => {
        const o = O(); [x, y] = clampPt(x, y, g.w, g.h, 16);
        v.x = Math.round(((x - o.x) / S) * 2) / 2; v.y = Math.round(((o.y - y) / S) * 2) / 2;
        fit(); draw();
      }
    });
    L.bindRange(root, "m", (x) => { m = x; if (g) { fit(); draw(); } });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ 3. system */
  sims["sim-system"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g; const S = 24;
    const p = [{ x: 4, y: 0.5 }, { x: 1.5, y: 3 }];
    const bases = () => [{ x: g.w * 0.12, y: g.h * 0.72 }, { x: g.w * 0.36, y: g.h * 0.55 }];
    function draw() {
      const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const B = bases();
      B.forEach((b, i) => {
        L.arrow(ctx, b.x, b.y, b.x + p[i].x * S, b.y - p[i].y * S, c.ink, 3);
        ctx.fillStyle = i ? c.acc : c.muted; ctx.beginPath(); ctx.arc(b.x, b.y, 9 + i * 3, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.22; ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(b.x + p[i].x * S, b.y - p[i].y * S, 10, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        text(ctx, "P" + (i + 1), b.x + p[i].x * S + 12, b.y - p[i].y * S - 8, c.ink, 15, "left", true);
        text(ctx, "(" + (i + 1) + ")", b.x - 4, b.y + 22, c.muted, 13, "center");
      });
      // head-to-tail sum, scaled down if needed so it stays inside the right part of the frame
      const pts = [[0, 0], [p[0].x, p[0].y], [p[0].x + p[1].x, p[0].y + p[1].y]];
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const spanX = (Math.max(...xs) - Math.min(...xs)) * S || 1, spanY = (Math.max(...ys) - Math.min(...ys)) * S || 1;
      const kc = Math.min(1, (g.w * 0.4 - 30) / spanX, (g.h - 50) / spanY);
      const s = { x: g.w * 0.58 + 15 - Math.min(...xs) * S * kc, y: 25 + Math.max(...ys) * S * kc };
      const e1 = { x: s.x + p[0].x * S * kc, y: s.y - p[0].y * S * kc }, e2 = { x: e1.x + p[1].x * S * kc, y: e1.y - p[1].y * S * kc };
      if (kc < 1) text(ctx, "(drawn at " + Math.round(kc * 100) + "% scale)", g.w - 10, g.h - 10, c.muted, 11.5, "right");
      ctx.setLineDash([5, 4]); L.arrow(ctx, s.x, s.y, e1.x, e1.y, c.muted, 1.8); L.arrow(ctx, e1.x, e1.y, e2.x, e2.y, c.muted, 1.8); ctx.setLineDash([]);
      L.arrow(ctx, s.x, s.y, e2.x, e2.y, c.chap, 4.5);
      ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill();
      text(ctx, "P sys", (s.x + e2.x) / 2 - 10, (s.y + e2.y) / 2 - 10, c.chap, 15, "right", true);
      text(ctx, "head-to-tail sum", g.w * 0.78, g.h - 26, c.muted, 12.5, "center");
      const P = { x: p[0].x + p[1].x, y: p[0].y + p[1].y }, mag = Math.hypot(P.x, P.y);
      chips(out, [["P<sub>1</sub> = (" + F(p[0].x) + "; " + F(p[0].y) + ")", ""], ["P<sub>2</sub> = (" + F(p[1].x) + "; " + F(p[1].y) + ")", ""],
        ["P<sub>sys</sub> = (" + F(P.x) + "; " + F(P.y) + ")", ""], ["|P<sub>sys</sub>| =", F(mag) + " kg·m/s", mag < 0.3 ? "good" : ""],
        ...(mag < 0.3 ? [["🎉 Challenge solved: the parts move, the system does not", "", "good"]] : [])]);
    }
    pointer(cv, {
      down: (x, y, r) => { const B = bases(); for (let i = 0; i < 2; i++) if (Math.hypot(x - (B[i].x + p[i].x * S), y - (B[i].y - p[i].y * S)) < r) return { i }; return null; },
      move: (d, x, y) => { const b = bases()[d.i]; [x, y] = clampPt(x, y, g.w, g.h, 16); p[d.i].x = Math.round(((x - b.x) / S) * 2) / 2; p[d.i].y = Math.round(((b.y - y) / S) * 2) / 2; draw(); }
    });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ 4. centre of mass */
  sims["sim-cm"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, t = 0, run = false, last = 0;
    const v = {};
    ["m1", "v1", "m2", "v2"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; if (!run) { t = 0; draw(); } }));
    const X = (x) => 30 + ((x + 6) / 12) * (g.w - 60);
    function state() {
      const x1 = -3 + v.v1 * t, x2 = 3 + v.v2 * t, M = v.m1 + v.m2;
      return { x1, x2, xG: (v.m1 * x1 + v.m2 * x2) / M, vG: (v.m1 * v.v1 + v.m2 * v.v2) / M, M };
    }
    function draw() {
      if (!g) return; const c = C(), ctx = g.ctx, s = state(); ctx.clearRect(0, 0, g.w, g.h);
      const y1 = g.h * 0.24, yG = g.h * 0.52, y2 = g.h * 0.8;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      [y1, y2].forEach((y) => { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(g.w - 20, y); ctx.stroke(); });
      ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(20, yG); ctx.lineTo(g.w - 20, yG); ctx.stroke(); ctx.setLineDash([]);
      for (let k = -6; k <= 6; k += 2) text(ctx, k + " m", X(k), g.h - 8, c.muted, 11, "center");
      const r1 = 9 * Math.cbrt(v.m1), r2 = 9 * Math.cbrt(v.m2);
      ctx.fillStyle = c.muted; ctx.beginPath(); ctx.arc(X(s.x1), y1, r1, 0, 7); ctx.fill();
      ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(X(s.x2), y2, r2, 0, 7); ctx.fill();
      const k = 26;
      L.arrow(ctx, X(s.x1), y1, X(s.x1) + v.v1 * k, y1, c.ink, 2.2); L.arrow(ctx, X(s.x2), y2, X(s.x2) + v.v2 * k, y2, c.ink, 2.2);
      text(ctx, "(1)", X(s.x1), y1 - r1 - 10, c.ink, 13, "center", true); text(ctx, "(2)", X(s.x2), y2 - r2 - 10, c.ink, 13, "center", true);
      const gx = X(s.xG);
      ctx.strokeStyle = c.chap; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(gx - 8, yG - 8); ctx.lineTo(gx + 8, yG + 8); ctx.moveTo(gx - 8, yG + 8); ctx.lineTo(gx + 8, yG - 8); ctx.stroke();
      L.arrow(ctx, gx, yG, gx + s.vG * k, yG, c.chap, 3);
      text(ctx, "G", gx, yG - 16, c.chap, 15, "center", true);
      const sum = v.m1 * v.v1 + v.m2 * v.v2;
      chips(out, [["t =", F(t, 1) + " s"], ["x<sub>G</sub> =", F(s.xG) + " m"], ["m₁v₁ + m₂v₂ =", F(sum) + " kg·m/s"], ["M·v<sub>G</sub> =", F(s.M * s.vG) + " kg·m/s", "good"]]);
    }
    function loop(ts) {
      if (!run) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt;
      const s = state(); if (Math.abs(s.x1) > 6.4 || Math.abs(s.x2) > 6.4 || t > 12) { run = false; btn.textContent = "▶ Play"; }
      draw(); if (run) requestAnimationFrame(loop);
    }
    const btn = root.querySelector('[data-act="play"]');
    btn.addEventListener("click", () => { run = !run; last = 0; btn.textContent = run ? "⏸ Pause" : "▶ Play"; if (run) requestAnimationFrame(loop); });
    root.querySelector('[data-act="reset"]').addEventListener("click", () => { run = false; t = 0; btn.textContent = "▶ Play"; draw(); });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ 5. Newton: P(t) */
  sims["sim-newton"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g; const v = {};
    ["F", "P0", "t1", "t2"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; draw(); }));
    function draw() {
      if (!g || v.t2 === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const P = (t) => v.P0 + v.F * t;
      let lo = Math.min(0, P(0), P(10)), hi = Math.max(0, P(0), P(10)); if (hi - lo < 10) { hi += 5; lo -= 5; }
      const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
      const l = 54, r = g.w - 16, tp = 14, bt = g.h - 30;
      const X = (t) => l + (t / 10) * (r - l), Y = (p) => tp + ((hi - p) / (hi - lo)) * (bt - tp);
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (let t = 0; t <= 10; t++) { ctx.beginPath(); ctx.moveTo(X(t), tp); ctx.lineTo(X(t), bt); ctx.stroke(); text(ctx, String(t), X(t), bt + 14, c.muted, 11.5, "center"); }
      const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))) * (((hi - lo) / 4) / Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))) > 5 ? 5 : ((hi - lo) / 4) / Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))) > 2 ? 2 : 1);
      for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) { ctx.beginPath(); ctx.moveTo(l, Y(p)); ctx.lineTo(r, Y(p)); ctx.stroke(); text(ctx, F(p, 0), l - 6, Y(p), c.muted, 11.5, "right"); }
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(l, Y(0)); ctx.lineTo(r, Y(0)); ctx.moveTo(l, tp); ctx.lineTo(l, bt); ctx.stroke();
      text(ctx, "t (s)", r, bt + 14, c.muted, 12, "right"); text(ctx, "P (kg·m/s)", l + 6, tp + 4, c.muted, 12, "left");
      ctx.strokeStyle = c.chap; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(0), Y(P(0))); ctx.lineTo(X(10), Y(P(10))); ctx.stroke();
      let a = Math.min(v.t1, v.t2), b = Math.max(v.t1, v.t2); if (b === a) b = a + 0.5;
      ctx.setLineDash([5, 4]); ctx.strokeStyle = c.acc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(a), Y(P(a))); ctx.lineTo(X(b), Y(P(a))); ctx.lineTo(X(b), Y(P(b))); ctx.stroke(); ctx.setLineDash([]);
      [a, b].forEach((t) => { ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(X(t), Y(P(t)), 5, 0, 7); ctx.fill(); });
      text(ctx, "Δt = " + F(b - a, 1) + " s", (X(a) + X(b)) / 2, Y(P(a)) + (v.F >= 0 ? 14 : -14), c.acc, 13, "center", true);
      text(ctx, "ΔP = " + F(P(b) - P(a), 1), X(b) + 8, (Y(P(a)) + Y(P(b))) / 2, c.acc, 13, "left", true);
      chips(out, [["slope = ΣF =", F(v.F, 1) + " N"], ["ΔP =", F(P(b) - P(a), 1) + " kg·m/s"], ["ΣF·Δt =", F(v.F * (b - a), 1) + " kg·m/s", "good"],
        [v.F === 0 ? "ΣF = 0 → P constant (conserved)" : "ΣF constant → ΔP = ΣF·Δt", ""]]);
    }
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ 7. projectile */
  sims["sim-proj"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    const G = 10; let g, t = 0, run = false, last = 0; const v = {};
    ["v0", "al", "m"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; if (!run) { t = 0; draw(); } }));
    function draw() {
      if (!g || v.m === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const a = v.al * Math.PI / 180, vx = v.v0 * Math.cos(a), vy0 = v.v0 * Math.sin(a), T = 2 * vy0 / G;
      const R = vx * T, Hm = vy0 * vy0 / (2 * G);
      const top = 10, trajH = g.h * 0.6, l = 30, r = g.w - 20;
      // ONE scale for every launch (v0 up to 20 m/s): a faster launch really goes farther and faster on screen
      const XMAX = 42, YMAX = 21;
      const s = Math.min((r - l) / XMAX, (trajH - 34) / YMAX);
      const X = (x) => l + x * s, Y = (y) => top + trajH - 14 - y * s;
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, Y(0)); ctx.lineTo(g.w - 10, Y(0)); ctx.stroke();
      for (let m5 = 0; m5 <= XMAX; m5 += 5) { ctx.beginPath(); ctx.moveTo(X(m5), Y(0)); ctx.lineTo(X(m5), Y(0) + 5); ctx.stroke(); text(ctx, m5 + " m", X(m5), Y(0) + 13, c.muted, 10.5, "center"); }
      ctx.setLineDash([5, 5]); ctx.strokeStyle = c.line; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 0; k <= 60; k++) { const tt = (T * k) / 60; const x = vx * tt, y = vy0 * tt - 0.5 * G * tt * tt; k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
      ctx.stroke(); ctx.setLineDash([]);
      const tt = Math.min(t, T), x = vx * tt, y = vy0 * tt - 0.5 * G * tt * tt, Px = v.m * vx, Py = v.m * (vy0 - G * tt);
      const sp = 95 / (v.m * 20);   // arrow length proportional to the speed
      L.arrow(ctx, X(x), Y(y), X(x) + Px * sp, Y(y), c.chap, 3);
      if (Math.abs(Py) * sp > 3) L.arrow(ctx, X(x), Y(y), X(x), Y(y) - Py * sp, c.chap, 3);
      L.arrow(ctx, X(x), Y(y), X(x) + Px * sp, Y(y) - Py * sp, c.ink, 3.5);
      ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(X(x), Y(y), 8, 0, 7); ctx.fill();
      text(ctx, "Px", X(x) + Px * sp + 6, Y(y) + 10, c.chap, 13, "left", true);
      if (Math.abs(Py) * sp > 3) text(ctx, "Py", X(x) - 8, Y(y) - Py * sp / 2, c.chap, 13, "right", true);
      if (Math.abs(tt - T / 2) < T * 0.03) text(ctx, "top: Py = 0", X(x), Y(y) - 22, c.acc, 13, "center", true);
      // graphs
      const gy0 = top + trajH + 10, gh = g.h - gy0 - 22, gw = (g.w - 60) / 2;
      const Pmax = v.m * 20 * 1.05, TMAX = 4;
      [["Px (kg·m/s)", (q) => Px], ["Py (kg·m/s)", (q) => v.m * (vy0 - G * q)]].forEach(([lab, f], i) => {
        const gx = 40 + i * (gw + 20), Xg = (q) => gx + (q / TMAX) * (gw - 10), Yg = (p) => gy0 + gh / 2 - (p / Pmax) * (gh / 2 - 4);
        rrect(ctx, gx - 6, gy0 - 4, gw + 6, gh + 8, 6, null, c.line);
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, Yg(0)); ctx.lineTo(gx + gw - 4, Yg(0)); ctx.moveTo(gx, gy0); ctx.lineTo(gx, gy0 + gh); ctx.stroke();
        text(ctx, lab, gx + 6, gy0 + 9, c.muted, 12, "left", true); text(ctx, "t", gx + gw - 6, Yg(0) - 9, c.muted, 12, "right");
        ctx.strokeStyle = c.chap; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const q = (tt * k) / 40; k ? ctx.lineTo(Xg(q), Yg(f(q))) : ctx.moveTo(Xg(q), Yg(f(q))); }
        ctx.stroke();
        ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(Xg(tt), Yg(f(tt)), 4, 0, 7); ctx.fill();
      });
      text(ctx, "slope of Py(t) = −mg = " + F(-v.m * G, 1), 40 + gw + 20 + gw - 8, gy0 + gh - 4, c.acc, 12, "right", true);
      chips(out, [["t =", F(tt, 2) + " s"], ["P<sub>x</sub> =", F(Px) + " (constant)"], ["P<sub>y</sub> =", F(Py)], ["|P| =", F(Math.hypot(Px, Py)) + " kg·m/s"], ["top at t =", F(T / 2) + " s", "good"]]);
      return T;
    }
    const btn = root.querySelector('[data-act="play"]');
    function loop(ts) {
      if (!run) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt;
      const T = draw(); if (t >= T) { run = false; t = T; draw(); btn.textContent = "▶ Launch"; return; }
      requestAnimationFrame(loop);
    }
    btn.addEventListener("click", () => { t = 0; run = true; last = 0; btn.textContent = "… flying"; requestAnimationFrame(loop); });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ 8. explosion */
  sims["sim-explo"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, t = 0, run = false, last = 0; const v = {};
    ["m1", "m2", "v1"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; if (!run) { t = 0; draw(); } }));
    function draw() {
      if (!g || v.v1 === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const v2 = -v.m1 * v.v1 / v.m2, cx = g.w / 2, cy = g.h * 0.5;
      const k = (g.w * 0.42) / (Math.max(v.v1, Math.abs(v2)) * 1.6);
      const r1 = 10 * Math.cbrt(v.m1 / 0.2), r2 = 10 * Math.cbrt(v.m2 / 0.2), R = 10 * Math.cbrt((v.m1 + v.m2) / 0.2);
      ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(10, cy + R + 6); ctx.lineTo(g.w - 10, cy + R + 6); ctx.stroke();
      if (t === 0) {
        ctx.fillStyle = c.muted; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
        text(ctx, "at rest: P = 0", cx, cy - R - 14, c.ink, 14, "center", true);
      } else {
        const x1 = cx + v.v1 * k * t, x2 = cx + v2 * k * t;
        ctx.fillStyle = c.chap; ctx.beginPath(); ctx.arc(x1, cy, r1, 0, 7); ctx.fill();
        ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(x2, cy, r2, 0, 7); ctx.fill();
        L.arrow(ctx, x1 + r1 + 3, cy, x1 + r1 + 3 + v.v1 * 3, cy, c.ink, 2.5); L.arrow(ctx, x2 - r2 - 3, cy, x2 - r2 - 3 + v2 * 3, cy, c.ink, 2.5);
        text(ctx, "(1)", x1, cy - r1 - 12, c.ink, 13, "center", true); text(ctx, "(2)", x2, cy - r2 - 12, c.ink, 13, "center", true);
        if (t < 0.25) { ctx.globalAlpha = 1 - t * 4; ctx.fillStyle = c.acc; ctx.beginPath(); ctx.arc(cx, cy, R * (1 + t * 8), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 6, cy + R + 16); ctx.lineTo(cx + 6, cy + R + 28); ctx.moveTo(cx + 6, cy + R + 16); ctx.lineTo(cx - 6, cy + R + 28); ctx.stroke();
      text(ctx, "G stays here", cx + 12, cy + R + 22, c.muted, 12, "left");
      const KE = 0.5 * v.m1 * v.v1 * v.v1 + 0.5 * v.m2 * v2 * v2;
      chips(out, [["v<sub>2</sub> =", F(v2) + " m/s"], ["P before =", "0"], ["P after = m₁v₁ + m₂v₂ =", F(v.m1 * v.v1 + v.m2 * v2) + "", "good"], ["KE gained =", F(KE, 1) + " J"]]);
    }
    const btn = root.querySelector('[data-act="play"]');
    function loop(ts) { if (!run) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt; draw(); if (t > 1.6) { run = false; return; } requestAnimationFrame(loop); }
    btn.addEventListener("click", () => { t = 0.0001; run = true; last = 0; requestAnimationFrame(loop); });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ 9. collision lab */
  sims["sim-coll"] = function (root) {
    const cv = root.querySelector("canvas"), out = root.querySelector(".readout");
    let g, t = 0, run = false, last = 0, mode = "el", hit = null; const v = {};
    ["m1", "m2", "v1", "v2"].forEach((n) => L.bindRange(root, n, (x) => { v[n] = x; if (!run) { t = 0; hit = null; draw(); } }));
    root.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode; root.querySelectorAll("[data-mode]").forEach((q) => q.setAttribute("aria-pressed", q === b ? "true" : "false"));
      if (!run) { t = 0; hit = null; draw(); }
    }));
    const after = () => {
      const { m1, m2, v1, v2 } = v, M = m1 + m2;
      if (mode === "in") { const V = (m1 * v1 + m2 * v2) / M; return [V, V]; }
      return [((m1 - m2) * v1 + 2 * m2 * v2) / M, ((m2 - m1) * v2 + 2 * m1 * v1) / M];
    };
    function geo() {
      const s = (g.w - 40) / 12; // px per metre, world -6..6
      const w1 = 26 * Math.cbrt(v.m1), w2 = 26 * Math.cbrt(v.m2);
      return { s, w1: w1 / s, w2: w2 / s, X: (x) => 20 + (x + 6) * s };
    }
    function pos() {
      const q = geo(), x10 = -4, x20 = 1;
      const gap = x20 - x10 - (q.w1 + q.w2) / 2, rel = v.v1 - v.v2;
      const tc = rel > 0 ? gap / rel : Infinity;
      if (t < tc) return { x1: x10 + v.v1 * t, x2: x20 + v.v2 * t, tc, q };
      const [a, b] = after(), xc1 = x10 + v.v1 * tc, xc2 = x20 + v.v2 * tc;
      return { x1: xc1 + a * (t - tc), x2: xc2 + b * (t - tc), tc, q };
    }
    function draw() {
      if (!g || v.v2 === undefined) return; const c = C(), ctx = g.ctx; ctx.clearRect(0, 0, g.w, g.h);
      const p = pos(), q = p.q, base = g.h * 0.72;
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, base); ctx.lineTo(g.w - 10, base); ctx.stroke();
      const draws = [[p.x1, q.w1, c.muted, "m₁"], [p.x2, q.w2, c.acc, "m₂"]];
      const [a, b] = after(), cur = t >= p.tc ? [a, b] : [v.v1, v.v2];
      draws.forEach(([x, w, col, lab], i) => {
        const px = q.X(x - w / 2), pw = w * q.s, ph = pw * 0.8;
        rrect(ctx, px, base - ph, pw, ph, 5, col);
        text(ctx, lab, px + pw / 2, base - ph / 2, "#fff", 13, "center", true);
        const vv = cur[i]; if (Math.abs(vv) > 0.01) L.arrow(ctx, px + pw / 2, base - ph - 12, px + pw / 2 + vv * 28, base - ph - 12, c.ink, 2.4);
      });
      const M = v.m1 + v.m2, xG = (v.m1 * p.x1 + v.m2 * p.x2) / M, gx = q.X(xG);
      ctx.strokeStyle = c.chap; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 6, base + 10); ctx.lineTo(gx + 6, base + 22); ctx.moveTo(gx + 6, base + 10); ctx.lineTo(gx - 6, base + 22); ctx.stroke();
      text(ctx, "G", gx + 10, base + 16, c.chap, 13, "left", true);
      const Pb = v.m1 * v.v1 + v.m2 * v.v2, Pa = v.m1 * a + v.m2 * b;
      const Kb = 0.5 * v.m1 * v.v1 ** 2 + 0.5 * v.m2 * v.v2 ** 2, Ka = 0.5 * v.m1 * a * a + 0.5 * v.m2 * b * b;
      if (v.v1 <= v.v2) { chips(out, [["No collision: (1) must be faster than (2) towards it.", "", ""]]); return; }
      chips(out, [["v₁′ =", F(a) + " m/s"], ["v₂′ =", F(b) + " m/s"], ["P before =", F(Pb)], ["P after =", F(Pa), "good"],
        ["KE before =", F(Kb) + " J"], ["KE after =", F(Ka) + " J", mode === "el" ? "good" : ""], ...(mode === "in" ? [["KE → internal energy:", F(Kb - Ka) + " J"]] : [])]);
    }
    const btn = root.querySelector('[data-act="play"]');
    function loop(ts) {
      if (!run) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; t += dt;
      const p = pos(); draw();
      if (t > p.tc + 2.5 || Math.abs(p.x1) > 7 || Math.abs(p.x2) > 7 || t > 12) { run = false; btn.textContent = "▶ Play"; return; }
      requestAnimationFrame(loop);
    }
    btn.addEventListener("click", () => { t = 0; run = true; last = 0; btn.textContent = "… running"; requestAnimationFrame(loop); });
    function size() { g = L.canvas(cv, +cv.dataset.aspect); draw(); }
    size();
    return { resize: size, draw };
  };

  /* ------------------------------------------------ lazy init + resize */
  const live = {};
  function initVisible() {
    Object.keys(sims).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const cv = el.querySelector("canvas");
      if (!live[id] && visible(cv)) live[id] = sims[id](el);
      else if (live[id] && visible(cv) && Math.abs(cv.clientWidth - (cv._w || 0)) > 4) { live[id].resize(); }
      if (cv) cv._w = cv.clientWidth;
    });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(initVisible, 30));
  window.addEventListener("lsp-open", () => setTimeout(initVisible, 30));
  window.addEventListener("lsp-panel", () => setTimeout(initVisible, 30));
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { Object.keys(live).forEach((id) => { const cv = document.getElementById(id).querySelector("canvas"); if (visible(cv)) live[id].resize(); }); }, 150); });
  window.addEventListener("lsp-theme", () => Object.values(live).forEach((s) => s.draw && s.draw()));
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener && mq.addEventListener("change", () => Object.values(live).forEach((s) => s.draw && s.draw()));
})();
