# LS Physics Platform — Tutoring Centre

Interactive chapter toolkits for **Grade 12 Life Sciences physics (Lebanese curriculum)**.
Students open one link, choose a chapter tab, and get:

- a **lesson** in short steps, each with a **live model** they can drag and play with;
- **flip cards** to revise;
- **practice sets** in the spirit of the official exams, with **hints, self-checks and answers hidden** until the student asks;
- a **printable PDF** of the same chapter for classroom work.

Student link (after GitHub Pages is on): `https://aghozlan.github.io/<repo-name>/`

## What is live

| Chapter | Status |
|---|---|
| Linear Momentum | live |
| Mechanical Oscillations | planned |
| Electromagnetic Induction | planned |

## Structure

```
index.html                      platform home: one tab per chapter
assets/css/platform.css         shared look (light and dark)
assets/js/platform.js           shared behaviour: tabs, steps, pop-ups, hidden answers, checks, flip cards
assets/js/chapters.js           THE chapter list (edit this to add a tab)
assets/katex/                   math fonts (math is pre-rendered, no CDN needed)
chapters/<chapter>/index.html   built chapter page (do not edit by hand)
chapters/<chapter>/*.js         the chapter's live models
chapters/<chapter>/*.pdf        printable version
tools/<chapter>/src.html        chapter source (edit this)
tools/<chapter>/lm-sims.js      live models source
tools/<chapter>/figs/*.svg      static figures used in exercises
tools/<chapter>/print_src.html  source of the printable PDF
tools/build.js                  builds every chapter (renders the math)
```

## Adding a chapter

1. Copy `tools/linear-momentum/` to `tools/<new-chapter>/` and write the new content in `src.html`.
2. Run `npm install` once, then `npm run build`. The page appears in `chapters/<new-chapter>/`.
3. Add the chapter to `assets/js/chapters.js` with `status: "live"`.
4. Commit and push. GitHub Pages updates the student link within a minute.

Planned chapters stay hidden from students until `status` is `"live"`
(set `LSP_SHOW_UPCOMING = true` in `chapters.js` to show them as locked tabs).
