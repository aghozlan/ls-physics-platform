/* =========================================================
   Auth gate — included on every page.
   - not signed in        -> sign-in page
   - pending / blocked    -> sign-in page with a message
   - approved             -> page shown, visit logged, presence kept alive
   - teacher blocks you or presses "Sign out now" -> signed out within seconds
   ========================================================= */
import { CONFIG, ADMIN_EMAILS, SDK, isConfigured } from "./firebase-config.js";

const ROOT = new URL("../../", import.meta.url).href;
const reveal = () => document.documentElement.classList.remove("lsp-locked");
const go = (state) => {
  const next = encodeURIComponent(location.pathname + location.search + location.hash);
  location.replace(ROOT + "login.html?" + (state ? "state=" + state + "&" : "") + "next=" + next);
};

if (!isConfigured()) {
  reveal();
} else {
  const slow = setTimeout(() => {
    document.body.insertAdjacentHTML("afterbegin", '<p style="visibility:visible;position:fixed;inset:40% 16px auto;text-align:center;font:16px system-ui">Connecting to the sign-in service… check your internet connection.</p>');
  }, 8000);
  start().catch((e) => { console.error(e); clearTimeout(slow); go("error"); });

  async function start() {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")
    ]);
    const app = initializeApp(CONFIG);
    const auth = A.getAuth(app), db = F.getFirestore(app);
    let epoch = null, beat = null, unsub = null;

    A.onAuthStateChanged(auth, async (user) => {
      clearTimeout(slow);
      if (!user) return go();
      const ref = F.doc(db, "members", user.uid);
      let snap = await F.getDoc(ref);
      if (!snap.exists()) {
        await F.setDoc(ref, {
          uid: user.uid, email: user.email || "", name: user.displayName || (user.email || "").split("@")[0],
          photo: user.photoURL || "", provider: (user.providerData[0] || {}).providerId || "password",
          status: ADMIN_EMAILS.includes((user.email || "").toLowerCase()) ? "approved" : "pending", sessionEpoch: 0, visits: 0,
          createdAt: F.serverTimestamp(), lastSeen: F.serverTimestamp(), currentPage: "", currentTitle: ""
        });
        snap = await F.getDoc(ref);
      }
      const m = snap.data();
      if (m.status === "pending") return go("pending");
      if (m.status !== "approved") { await A.signOut(auth); return go("blocked"); }

      // approved: show the page, log the visit, keep presence alive
      reveal();
      epoch = m.sessionEpoch || 0;
      const page = location.pathname.replace(/\/index\.html$/, "/"), title = document.title;
      F.updateDoc(ref, { lastSeen: F.serverTimestamp(), currentPage: page, currentTitle: title, visits: F.increment(1) }).catch(() => {});
      F.addDoc(F.collection(db, "visits"), {
        uid: user.uid, email: user.email || "", name: m.name || "", page, title,
        at: F.serverTimestamp(), device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "phone" : "computer"
      }).catch(() => {});
      clearInterval(beat);
      beat = setInterval(() => {
        if (document.visibilityState === "visible") F.updateDoc(ref, { lastSeen: F.serverTimestamp(), currentPage: page, currentTitle: title }).catch(() => {});
      }, 60000);

      // live watch: blocked or "sign out now" -> leave immediately
      if (unsub) unsub();
      unsub = F.onSnapshot(ref, async (s) => {
        const d = s.data();
        if (!d || d.status !== "approved") { clearInterval(beat); await A.signOut(auth); return go("blocked"); }
        if ((d.sessionEpoch || 0) > epoch) { clearInterval(beat); await A.signOut(auth); return go("ended"); }
      });

      addAccountChip(user, m, () => A.signOut(auth).then(() => go("signedout")));
    });
  }
}

function addAccountChip(user, m, signOut) {
  if (document.getElementById("lsp-account")) return;
  const bar = document.querySelector(".topbar .wrap");
  const isAdmin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
  const el = document.createElement("div");
  el.id = "lsp-account";
  el.className = "acct";
  el.innerHTML = `${isAdmin ? `<a class="iconbtn" href="${ROOT}admin.html" title="Dashboard">▦<span class="hide-sm"> Dashboard</span></a>` : ""}
    <button class="iconbtn" type="button">⏻<span class="hide-sm"> Sign out</span></button>`;
  const b = el.querySelector("button");
  b.title = "Signed in as " + (m.name || user.email || "");
  b.addEventListener("click", signOut);
  if (bar) bar.appendChild(el); else document.body.prepend(el);
}
