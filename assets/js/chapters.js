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
  { id: "mechanical-oscillations", title: "Mechanical Oscillations", status: "soon" },
  { id: "electromagnetic-induction", title: "Electromagnetic Induction", status: "soon" }
];
