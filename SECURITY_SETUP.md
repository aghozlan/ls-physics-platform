# Switching on sign-in (about 15 minutes, free)

Until step 6 is done the platform stays open to everyone, exactly as today.

## 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and sign in with **aghozlan.81@gmail.com**.
2. **Create a project** → name it `ls-physics` → Google Analytics can be turned **off** → Create.

## 2. Register the website
1. On the project home, click the **web icon `</>`** ("Add app").
2. Nickname `ls-physics-platform` → **Register app** (do not tick Hosting).
3. Firebase shows a block `const firebaseConfig = { apiKey: "...", ... }`. **Copy it** — this is what you send to Claude (or paste into `assets/js/firebase-config.js`).

## 3. Turn on the sign-in methods
Build → **Authentication** → Get started → Sign-in method:
- **Google** → Enable → choose your support email → Save.
- **Email/Password** → Enable (first switch only) → Save.

Then Authentication → **Settings** → **Authorized domains** → Add domain → `aghozlan.github.io`.

## 4. Create the database
Build → **Firestore Database** → Create database → location `eur3 (europe-west)` → **Start in production mode** → Create.

## 5. Paste the rules
Firestore Database → **Rules** tab → delete everything → paste the whole content of [`firestore.rules`](firestore.rules) → **Publish**.

## 6. Switch the lock on
Paste the values from step 2 into `assets/js/firebase-config.js` (replacing every `PASTE_HERE`), commit, and wait one minute for GitHub Pages.

## 7. First sign-in
Open the site, sign in with Google as **aghozlan.81@gmail.com**. You are approved automatically and a **Dashboard** button appears at the top right.

---

## Daily use
| You want to… | In the dashboard |
|---|---|
| Let a new student in | Waiting → **Approve** |
| Throw someone out right now | **Sign out now** (they can sign in again) |
| Stop someone for good | **Block** (signed out within seconds, cannot re-enter) |
| Forget an account | **✕** (if they come back they wait for approval again) |
| See who is on and where | **Online** filter, "Now on" column, Recent activity (tap a name for their history) |

## What this protects, honestly
- Every page is hidden until the visitor is signed in **and** approved by you; strangers only see the sign-in page.
- Students cannot approve themselves, change their status or read other students' data: the database rules forbid it on Google's servers, not just in the page.
- The page files themselves still sit on public GitHub Pages: someone who knows the exact address of a file and switches off JavaScript could still open it. For a tutoring platform this is usually enough; if you ever need more, the next step is moving the content behind Firebase Hosting with server-side checks.

Free Firebase plan limits (≈ 50 000 reads and 20 000 writes per day) cover several hundred active students.
