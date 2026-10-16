# Roadmap — Grade 12 LS Physics platform

Each chapter follows the same recipe so students always know where to look:

1. **Lesson** in numbered steps, from a real-world intuition to the official-exam formula.
2. **Live models** inside the steps (drag, sliders, play), never more than one idea per model.
3. **Flip cards** after each part.
4. **Practice sets** (about one hour each) aligned with the CRDP official exams: hints, self-checks, hidden answers.
5. **Printable PDF** (≥ 12 pt, paper-economical) for the classroom.

## Sequence

| # | Chapter | Status | Notes |
|---|---|---|---|
| 1 | Energy (mechanical, elastic, internal) | sheets exist (5 practice sheets) | can be added as a tab |
| 2 | Linear Momentum | **live** | 8 live models, 2 practice sets |
| 3 | Mechanical Oscillations | next | elastic pendulum: free undamped, energy, x(t) graphs |
| 4 | Electromagnetic Induction | planned | flux, Faraday–Lenz, induced emf graphs |
| 5+ | Following chapters | to confirm against the current LS syllabus | |

## Per-session checklist

- [ ] Check the scope against the LS syllabus and recent CRDP papers.
- [ ] Write `tools/<chapter>/src.html` + live models.
- [ ] Build, test on phone width and in dark mode.
- [ ] Build the printable PDF.
- [ ] Set `status: "live"` in `assets/js/chapters.js`, commit, push.
