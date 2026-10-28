/* =========================================================
   Solutions lock — loaded by auth-gate.js on pages that carry
   <script id="lsp-locked"> (answers and marking schemes, encrypted at build time).
   - Students: solutions stay locked until the teacher releases the page in the
     dashboard (Firestore release/{page} holds the page key); live, no reload needed.
   - Teacher: always sees them (key derived from the passphrase kept in vault/solutions).
   ========================================================= */
import { ITER } from "./solution-pages.js";

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

export async function deriveKey(passphrase, page) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode("lsp:" + page), iterations: ITER, hash: "SHA-256" }, base, 256);
  return toB64(bits);
}

export async function decrypt(keyB64, box) {
  const key = await crypto.subtle.importKey("raw", b64(keyB64), "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(box.iv) }, key, b64(box.ct));
  return new TextDecoder().decode(pt);
}

export function lockNow() {
  if (document.getElementById("lsp-locked")) document.documentElement.classList.add("sol-locked");
}

export async function initSolutions({ db, F, isAdmin }) {
  const el = document.getElementById("lsp-locked");
  if (!el) return;
  const box = JSON.parse(el.textContent);
  const root = document.documentElement;
  addNotices();

  // units: one per page, or one per exercise when the page has groups
  const units = box.groups
    ? Object.entries(box.groups).map(([id, b]) => ({ id, box: b, scope: document.querySelector(`[data-lock="${id}"]`) || root, sel: `[data-sol][data-group="${id}"]` }))
    : [{ id: box.page, box, scope: root, sel: "[data-sol]" }];
  if (box.groups) root.classList.remove("sol-locked");

  const lock = (u) => {
    u.scope.classList.add("sol-locked");
    document.querySelectorAll(u.sel).forEach((d) => { d.innerHTML = ""; d.hidden = true; });
    u.scope.querySelectorAll("[data-toggle-sol]").forEach((b) => { b.textContent = "Show solution"; b.setAttribute("aria-expanded", "false"); });
    u.scope.querySelectorAll('[data-show="ans"]').forEach((b) => { b.textContent = "Show answer"; b.setAttribute("aria-expanded", "false"); });
  };
  const unlock = async (u, keyB64) => {
    try {
      const map = JSON.parse(await decrypt(keyB64, u.box));
      document.querySelectorAll(u.sel).forEach((d) => { d.innerHTML = map[d.dataset.sol] || ""; });
      u.scope.classList.remove("sol-locked");
    } catch (e) { console.warn("solutions: wrong key", e); lock(u); }
  };

  if (isAdmin) {
    try {
      const v = await F.getDoc(F.doc(db, "vault", "solutions"));
      if (v.exists() && v.data().passphrase) {
        for (const u of units) await unlock(u, await deriveKey(v.data().passphrase, u.id));
        const s = document.createElement("p");
        s.className = "teacherview";
        s.textContent = "Teacher view: you always see the solutions. Students see them only after you release them in the dashboard.";
        (document.querySelector("main") || document.body).prepend(s);
        return;
      }
    } catch (e) { /* fall back to the student behaviour */ }
  }
  for (const u of units) {
    lock(u);
    F.onSnapshot(F.doc(db, "release", u.id),
      (s) => (s.exists() && s.data().open && s.data().key ? unlock(u, s.data().key) : lock(u)),
      () => lock(u));
  }
}

function addNotices() {
  const note = (txt) => { const s = document.createElement("span"); s.className = "lockmsg"; s.textContent = "🔒 " + txt; return s; };
  document.querySelectorAll(".solbar").forEach((bar) => { if (!bar.querySelector(".lockmsg")) bar.prepend(note("Solution locked: your teacher will open it after you try.")); });
  document.querySelectorAll("[data-reveal-all]").forEach((b) => { const q = b.parentElement; if (!q.querySelector(".lockmsg")) q.appendChild(note("Answers locked: try every question first; your teacher opens them later.")); });
}
