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
  { id: "library", title: "Library", status: "live", type: "library" },
  { id: "mechanical-oscillations", title: "Mechanical Oscillations", status: "soon" },
  { id: "electromagnetic-induction", title: "Electromagnetic Induction", status: "soon" }
];

/* =========================================================
   Library — exam-preparation resources, grouped by chapter.
   Add an item here to publish a new resource in the Library tab.
   ========================================================= */
window.LSP_LIBRARY = [
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
