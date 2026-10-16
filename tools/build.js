// Build every chapter: tools/<chapter>/src.html -> chapters/<chapter>/index.html
// - inlines {{figure}} SVGs from tools/<chapter>/figs
// - pre-renders all \( \) and \[ \] math with KaTeX (pages need only katex.min.css)
// - copies tools/<chapter>/*.js next to the page
// Usage: node tools/build.js            (all chapters)
//        node tools/build.js linear-momentum
const fs = require("fs");
const path = require("path");
let katex;
try { katex = require("katex"); } catch (e) { katex = require(path.join(__dirname, "node_modules", "katex")); }

const root = path.resolve(__dirname, "..");
const only = process.argv[2];
const chapters = fs.readdirSync(__dirname).filter((d) => fs.existsSync(path.join(__dirname, d, "src.html")) && (!only || d === only));

let total = 0;
for (const ch of chapters) {
  const src = path.join(__dirname, ch);
  let html = fs.readFileSync(path.join(src, "src.html"), "utf8");
  html = html.replace(/\{\{([a-z0-9_]+)\}\}/g, (_, n) => fs.readFileSync(path.join(src, "figs", n + ".svg"), "utf8"));
  let errors = 0;
  const render = (tex, display) => {
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: "ignore", output: "html" }); }
    catch (e) { errors++; console.error(`[${ch}] KaTeX:`, e.message); return tex; }
  };
  html = html.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => render(t.trim(), true));
  html = html.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => render(t.trim(), false));
  const outDir = path.join(root, "chapters", ch);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  for (const f of fs.readdirSync(src)) if (f.endsWith(".js")) fs.copyFileSync(path.join(src, f), path.join(outDir, f));
  console.log(`${ch}: ok, KaTeX errors = ${errors}, ${(html.length / 1024).toFixed(0)} KB`);
  total += errors;
}
process.exit(total ? 1 : 0);
