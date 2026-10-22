/* =========================================================
   LS Physics Platform — shared behaviour
   ========================================================= */
(function () {
  "use strict";
  const LSP = (window.LSP = window.LSP || {});

  /* ---------- safe storage (per-viewer conveniences only) ---------- */
  LSP.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------- theme toggle ---------- */
  function applyTheme(t) { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); }
  applyTheme(LSP.store.get("lsp-theme", null));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-toggle]");
    if (!b) return;
    const dark = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#111418";
    const next = dark ? "light" : "dark";
    applyTheme(next); LSP.store.set("lsp-theme", next);
    window.dispatchEvent(new Event("lsp-theme"));
  });

  /* ---------- colours from CSS (for canvas) ---------- */
  LSP.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- sub-tabs (panels) with URL hash ---------- */
  function initSubtabs() {
    const tabs = [...document.querySelectorAll(".subtab")];
    if (!tabs.length) return;
    const show = (id, push) => {
      tabs.forEach((t) => t.setAttribute("aria-selected", t.dataset.panel === id ? "true" : "false"));
      document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== id));
      if (push) history.replaceState(null, "", "#" + id);
      window.dispatchEvent(new CustomEvent("lsp-panel", { detail: id }));
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    };
    tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.panel, true)));
    const h = location.hash.slice(1);
    show(tabs.some((t) => t.dataset.panel === h) ? h : tabs[0].dataset.panel, false);
    document.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); show(a.dataset.goto, true); }));
  }

  /* ---------- accordions: remember progress ---------- */
  function initSteps() {
    const key = "lsp-steps-" + (document.body.dataset.chapter || "x");
    const done = LSP.store.get(key, {});
    document.querySelectorAll("details.step").forEach((d) => {
      const id = d.id;
      if (done[id]) d.dataset.done = "1";
      d.addEventListener("toggle", () => {
        if (d.open) {
          done[id] = 1; d.dataset.done = "1"; LSP.store.set(key, done);
          window.dispatchEvent(new CustomEvent("lsp-open", { detail: id }));
        }
      });
    });
    const exp = document.querySelector("[data-expand-all]");
    if (exp) exp.addEventListener("click", () => {
      const all = [...document.querySelectorAll("details.step")];
      const open = all.some((d) => !d.open);
      all.forEach((d) => (d.open = open));
      exp.textContent = open ? "Collapse all" : "Expand all";
    });
  }

  /* ---------- glossary modal ---------- */
  function initModal() {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><button class="x" aria-label="Close">×</button><h3></h3><div class="mbody"></div></div>';
    document.body.appendChild(back);
    const close = () => back.classList.remove("show");
    back.addEventListener("click", (e) => { if (e.target === back || e.target.classList.contains("x")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    LSP.popup = (title, html) => {
      back.querySelector("h3").textContent = title;
      back.querySelector(".mbody").innerHTML = html;
      back.classList.add("show");
      back.querySelector(".x").focus();
    };
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-pop]");
      if (!t) return;
      const tpl = document.getElementById("pop-" + t.dataset.pop);
      if (tpl) LSP.popup(tpl.dataset.title || t.textContent, tpl.innerHTML);
    });
  }

  /* ---------- answers / hints ---------- */
  function initReveal() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-show]");
      if (!b) return;
      const box = b.closest("li,.sit,.exercise").querySelector("." + b.dataset.show);
      if (!box) return;
      const open = box.hidden;
      box.hidden = !open;
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.textContent = (open ? "Hide " : "Show ") + (b.dataset.show === "ans" ? "answer" : "hint");
    });
    document.querySelectorAll("[data-reveal-all]").forEach((b) => b.addEventListener("click", () => {
      const ex = b.closest(".exercise");
      const boxes = [...ex.querySelectorAll(".ans")];
      const open = boxes.some((x) => x.hidden);
      boxes.forEach((x) => (x.hidden = !open));
      ex.querySelectorAll('[data-show="ans"]').forEach((q) => { q.setAttribute("aria-expanded", open); q.textContent = (open ? "Hide" : "Show") + " answer"; });
      b.textContent = open ? "Hide all answers" : "Show all answers";
    }));
  }

  /* ---------- part solutions (library tests) ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-toggle-sol]");
    if (!b) return;
    const box = b.parentElement.nextElementSibling;
    if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    b.setAttribute("aria-expanded", open ? "true" : "false");
    b.textContent = open ? "Hide solution" : "Show solution";
  });

  /* ---------- numeric self-check ---------- */
  function initChecks() {
    document.querySelectorAll(".check[data-ans]").forEach((c) => {
      const ans = parseFloat(c.dataset.ans), tol = parseFloat(c.dataset.tol || "0.03");
      c.insertAdjacentHTML("afterbegin", `<span>${c.dataset.label || "Your answer:"}</span><input inputmode="decimal" aria-label="answer"><span>${c.dataset.unit || ""}</span><button class="btn ghost" type="button">Check</button><span class="res" aria-live="polite"></span>`);
      const inp = c.querySelector("input"), res = c.querySelector(".res");
      const go = () => {
        const v = parseFloat(inp.value.replace(",", ".").replace("−", "-"));
        if (isNaN(v)) { res.textContent = ""; return; }
        const ok = Math.abs(v - ans) <= Math.abs(ans) * tol + 1e-9;
        res.textContent = ok ? "✔ correct" : "✘ try again";
        res.className = "res " + (ok ? "ok" : "no");
      };
      c.querySelector("button").addEventListener("click", go);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    });
  }

  /* ---------- flashcards ---------- */
  function initFlash() {
    document.addEventListener("click", (e) => { const f = e.target.closest(".flash"); if (f) f.classList.toggle("on"); });
    const all = document.querySelector("[data-flip-all]");
    if (all) all.addEventListener("click", () => {
      const cards = [...document.querySelectorAll(".flash")];
      const on = cards.some((c) => !c.classList.contains("on"));
      cards.forEach((c) => c.classList.toggle("on", on));
    });
  }

  /* ---------- quick quizzes ---------- */
  function initQuiz() {
    document.querySelectorAll(".qq .item").forEach((it) => {
      it.querySelectorAll("button[data-a]").forEach((b) => b.addEventListener("click", () => {
        const right = b.dataset.a === it.dataset.correct;
        it.classList.remove("right", "wrong"); it.classList.add(right ? "right" : "wrong");
        let fb = it.querySelector(".fb");
        if (!fb) { fb = document.createElement("div"); fb.className = "fb"; it.appendChild(fb); }
        fb.textContent = (right ? "✔ " : "✘ ") + it.dataset.why;
      }));
    });
  }

  /* ---------- canvas helper ---------- */
  LSP.canvas = function (cv, aspect) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = cv.clientWidth || cv.parentElement.clientWidth || 600;
    if (w < 560 && cv.dataset.aspectSm) aspect = +cv.dataset.aspectSm;
    else if (w < 560) aspect = Math.min(0.9, aspect * 1.45);
    const h = Math.round(w * aspect);
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  };
  LSP.arrow = function (ctx, x1, y1, x2, y2, color, width) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) return;
    const a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(12, 4 + width * 2.6);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hd * 0.8, y2 - Math.sin(a) * hd * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hd * Math.cos(a - 0.42), y2 - hd * Math.sin(a - 0.42));
    ctx.lineTo(x2 - hd * Math.cos(a + 0.42), y2 - hd * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
  };
  LSP.fmt = (v, d = 2) => {
    if (!isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
      const e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e);
      return m.toFixed(1) + "×10" + String(e).replace(/-/g, "⁻").replace(/\d/g, (c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[c]);
    }
    return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString().replace("-", "−");
  };
  LSP.bindRange = function (root, name, cb) {
    const r = root.querySelector(`input[name="${name}"]`), o = root.querySelector(`output[for="${name}"]`);
    const upd = () => { if (o) o.textContent = (r.dataset.fmt ? LSP.fmt(+r.value, +r.dataset.fmt) : r.value) + (r.dataset.unit ? " " + r.dataset.unit : ""); cb && cb(+r.value); };
    r.addEventListener("input", upd); upd();
    return () => +r.value;
  };

  document.addEventListener("DOMContentLoaded", () => {
    initSubtabs(); initSteps(); initModal(); initReveal(); initChecks(); initFlash(); initQuiz();
  });
})();
