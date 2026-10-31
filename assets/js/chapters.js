/* =========================================================
   Chapter list — the ONLY file to edit when a chapter is added.
   status: "live" (tab opens) or "soon" (planned)
   Set LSP_SHOW_UPCOMING = true to display planned chapters as locked tabs.
   ========================================================= */
window.LSP_SHOW_UPCOMING = false;
window.LSP_CHAPTERS = [
  {
    id: "linear-momentum",
    title: "Linear Momentum",
    status: "live",
    href: "chapters/linear-momentum/index.html",
    pdf: "chapters/linear-momentum/linear_momentum_toolkit.pdf",
    blurb: "From “who is harder to stop?” to collisions and explosions: the vector P = mv, systems and centre of mass, Newton's second law, isolated systems, projectiles, elastic collisions.",
    contents: [
      ["①", "Lesson — Part 1", "lesson", "7 steps with 6 live models"],
      ["②", "Cards 1", "cards1", "8 flip cards"],
      ["③", "Practice 1", "practice1", "3 exercises · hidden answers"],
      ["④", "Lesson — Part 2", "lesson2", "explosion and collision labs"],
      ["⑤", "Cards 2", "cards2", "6 flip cards"],
      ["⑥", "Practice 2", "practice2", "3 exercises · hidden answers"]
    ]
  },
  {
    id: "mechanical-oscillations",
    title: "Mechanical Oscillations",
    status: "live",
    href: "chapters/mechanical-oscillations/index.html",
    pdf: "chapters/mechanical-oscillations/mechanical_oscillations_toolkit.pdf",
    blurb: "From a block on a spring to car suspensions and pendulum clocks: the differential equation, x = Xm sin(ω₀t + φ), initial conditions, energy curves, damping, driven oscillations, measuring k, m and g — with two 3D labs.",
    contents: [
      ["①", "Session 1", "lesson", "7 steps · 3D air-track lab · 4 live models"],
      ["②", "Cards 1", "cards1", "8 flip cards"],
      ["③", "Practice 1", "practice1", "3 exercises · hidden answers"],
      ["④", "Session 2", "lesson2", "6 steps · 3D car suspension · 5 live models"],
      ["⑤", "Cards 2", "cards2", "8 flip cards"],
      ["⑥", "Practice 2", "practice2", "3 exercises · hidden answers"]
    ]
  },
  { id: "library", title: "Library", status: "live", type: "library" },
  { id: "official", title: "Official Exams", status: "live", type: "exams" },
  { id: "electromagnetic-induction", title: "Electromagnetic Induction", status: "soon" }
];

/* =========================================================
   Library — exam-preparation resources, grouped by chapter.
   Add an item here to publish a new resource in the Library tab.
   ========================================================= */
window.LSP_LIBRARY = [
  {
    group: "Chapter 2 — Linear Momentum",
    items: [
      {
        tag: "Practice sheet · 20 pts · 2 h",
        title: "Linear Momentum — Practice Sheet",
        blurb: "Air-track bumpers, a fireworks shell and a curling shot: conservation and centre of mass, elastic or not, ΣF = dP/dt from a graph, principle of interaction, parabolic motion and explosion.",
        href: "library/lm-practice-1/index.html",
        pdf: "library/lm-practice-1/linear_momentum_practice_1.pdf"
      }
    ]
  },
  {
    group: "Chapter 1 — Energy",
    items: [
      {
        tag: "Test preparation · 20 pts · 1 h 30",
        title: "Energy — Test Preparation 1",
        blurb: "The drop tower and a counterweight on stage: energy graphs, derivative of ME → acceleration and nature of motion, time equations, two-body system, spring bumper.",
        href: "library/energy-test-1/index.html",
        pdf: "library/energy-test-1/energy_test_preparation_1.pdf"
      },
      {
        tag: "Test preparation · 20 pts · 1 h 30",
        title: "Energy — Test Preparation 2",
        blurb: "The baggage chute and the rope swing over the river: kinetic energy theorem, incline with a spring, pendulum, positions where KE = 2 GPE, air resistance.",
        href: "library/energy-test-2/index.html",
        pdf: "library/energy-test-2/energy_test_preparation_2.pdf"
      }
    ]
  }
];

/* =========================================================
   Official exams — one bank per chapter (official/<id>/index.html).
   ========================================================= */
window.LSP_OFFICIAL = [
  {
    chapter: "Chapter 2", title: "Linear Momentum", status: "live",
    href: "official/linear-momentum/index.html",
    exercises: 16, span: "2001–2024 + CRDP sample", questions: 98,
    skills: ["Newton II", "Conservation", "Elastic or not", "Explosion", "Interaction", "Centre of mass", "Projectile", "With energy"],
    note: "2022–2024 with the official marking schemes"
  },
  {
    chapter: "Chapter 4", title: "Mechanical Oscillations", status: "live",
    href: "official/mechanical-oscillations/index.html",
    exercises: 22, span: "2005–2022", questions: 149,
    skills: ["Diff. eq.", "T₀, ω₀", "Time eq.", "Graphs", "Energy", "Find k, m", "+ Collision", "Damping"],
    note: "every question with its official mark"
  },
  { chapter: "Chapter 1", title: "Energy", status: "soon" }
];
