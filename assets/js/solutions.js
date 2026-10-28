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

  const lock = () => {
    root.classList.add("sol-locked");
    document.querySelectorAll("[data-sol]").forEach((d) => { d.innerHTML = ""; d.hidden = true; });
    document.querySelectorAll("[data-toggle-sol]").forEach((b) => { b.textContent = "Show solution"; b.setAttribute("aria-expanded", "false"); });
    document.querySelectorAll('[data-show="ans"]').forEach((b) => { b.textContent = "Show answer"; b.setAttribute("aria-expanded", "false"); });
  };
  const unlock = async (keyB64) => {
    try {
      const map = JSON.parse(await decrypt(keyB64, box));
      document.querySelectorAll("[data-sol]").forEach((d) => { d.innerHTML = map[d.dataset.sol] || ""; });
      root.classList.remove("sol-locked");
    } catch (e) { console.warn("solutions: wrong key", e); lock(); }
  };

  if (isAdmin) {
    try {
      const v = await F.getDoc(F.doc(db, "vault", "solutions"));
      if (v.exists() && v.data().passphrase) {
        await unlock(await deriveKey(v.data().passphrase, box.page));
        const s = document.createElement("p");
        s.className = "teacherview";
        s.textContent = "Teacher view: you always see the solutions. Students see them only after you release this page in the dashboard.";
        (document.querySelector("main") || document.body).prepend(s);
        return;
      }
    } catch (e) { /* fall back to the student behaviour */ }
  }
  lock();
  F.onSnapshot(F.doc(db, "release", box.page),
    (s) => (s.exists() && s.data().open && s.data().key ? unlock(s.data().key) : lock()),
    () => lock());
}

function addNotices() {
  const note = (txt) => { const s = document.createElement("span"); s.className = "lockmsg"; s.textContent = "🔒 " + txt; return s; };
  document.querySelectorAll(".solbar").forEach((bar) => { if (!bar.querySelector(".lockmsg")) bar.prepend(note("Solution locked: your teacher will open it after you try.")); });
  document.querySelectorAll("[data-reveal-all]").forEach((b) => { const q = b.parentElement; if (!q.querySelector(".lockmsg")) q.appendChild(note("Answers locked: try every question first; your teacher opens them later.")); });
}
