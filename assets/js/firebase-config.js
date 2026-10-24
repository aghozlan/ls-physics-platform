/* =========================================================
   Sign-in settings — the ONLY file to edit to switch the lock on.
   1. Paste the "firebaseConfig" values from your Firebase project below.
   2. Keep your own email in ADMIN_EMAILS (it opens the dashboard).
   While apiKey is "PASTE_HERE", the lock is OFF and pages open freely.
   (These values are not secret: Firebase protects data with the rules in firestore.rules.)
   ========================================================= */
export const CONFIG = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE"
};

export const ADMIN_EMAILS = ["aghozlan.81@gmail.com"];

export const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

export const isConfigured = () => CONFIG.apiKey && CONFIG.apiKey !== "PASTE_HERE";
