// Build every page:
//   tools/<chapter>/src.html     -> chapters/<chapter>/index.html
//   tools/library/<id>/src.html  -> library/<id>/index.html
// - inlines {{figure}} SVGs from tools/<chapter>/figs
// - pre-renders all \( \) and \[ \] math with KaTeX (pages need only katex.min.css)
// - copies tools/<chapter>/*.js next to the page
// Usage: node tools/build.js            (all chapters)
//        node tools/build.js linear-momentum
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
let katex;
try { katex = require("katex"); } catch (e) { katex = require(path.join(__dirname, "node_modules", "katex")); }

const root = path.resolve(__dirname, "..");
const only = process.argv[2];
const jobs = [];
for (const d of fs.readdirSync(__dirname)) {
  if (fs.existsSync(path.join(__dirname, d, "src.html"))) jobs.push([d, path.join(__dirname, d), path.join(root, "chapters", d)]);
}
const lib = path.join(__dirname, "library");
if (fs.existsSync(lib)) for (const d of fs.readdirSync(lib)) {
  if (fs.existsSync(path.join(lib, d, "src.html"))) jobs.push([d, path.join(lib, d), path.join(root, "library", d)]);
}

const off = path.join(__dirname, "official");
if (fs.existsSync(off)) for (const d of fs.readdirSync(off)) {
  if (fs.existsSync(path.join(off, d, "src.html"))) jobs.push(["official-" + d, path.join(off, d), path.join(root, "official", d)]);
}

// ---- solutions lock: every <div class="ans|sol" hidden> is encrypted (AES-256-GCM).
// The key of a page = PBKDF2(passphrase, "lsp:" + pageId); the teacher releases a page
// from the dashboard, which publishes that page's key to signed-in students.
const passFile = path.join(__dirname, ".solutions-passphrase");
const PASS = process.env.LSP_SOLUTIONS_PASSPHRASE || (fs.existsSync(passFile) ? fs.readFileSync(passFile, "utf8").trim() : "");
const ITER = 150000;
const pageKey = (id) => crypto.pbkdf2Sync(PASS, "lsp:" + id, ITER, 32, "sha256");
function encrypt(key, text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(text, "utf8"), c.final(), c.getAuthTag()]);
  return { iv: iv.toString("base64"), ct: ct.toString("base64") };
}
function lockSolutions(html, id) {
  // groups: an element with data-lock="gid" data-lock-title="..." -> its answers get their own key
  const groups = []; const gre = /data-lock="([^"]+)"(?: data-lock-title="([^"]*)")?/g; let g;
  while ((g = gre.exec(html))) groups.push({ at: g.index, id: g[1], title: (g[2] || g[1]).replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"') });
  const groupAt = (pos) => { let r = null; for (const x of groups) if (x.at < pos) r = x; return r; };
  const open = /<div class="(ans|sol)" hidden>/g;
  const out = {}; let n = 0, res = "", last = 0, m;
  while ((m = open.exec(html))) {
    let depth = 1, i = m.index + m[0].length;
    const tag = /<div\b|<\/div>/g; tag.lastIndex = i;
    let t;
    while (depth && (t = tag.exec(html))) depth += t[0] === "</div>" ? -1 : 1;
    const inner = html.slice(m.index + m[0].length, t.index);
    const k = "k" + (++n), gr = groupAt(m.index), gid = gr ? gr.id : id;
    (out[gid] = out[gid] || { title: gr ? gr.title : null, map: {} }).map[k] = inner;
    res += html.slice(last, m.index) + `<div class="${m[1]}" hidden data-sol="${k}"${gr ? ` data-group="${gid}"` : ""}></div>`;
    last = t.index + 6; open.lastIndex = last;
  }
  if (!n) return [html, 0, []];
  if (!PASS) throw new Error("solutions passphrase missing (tools/.solutions-passphrase): refusing to publish solutions in clear");
  res += html.slice(last);
  let box, units = [];
  if (groups.length) {
    box = { page: id, groups: {} };
    for (const [gid, v] of Object.entries(out)) { box.groups[gid] = encrypt(pageKey(gid), JSON.stringify(v.map)); units.push({ id: gid, title: v.title || gid, blocks: Object.keys(v.map).length }); }
  } else {
    box = { page: id, ...encrypt(pageKey(id), JSON.stringify(out[id].map)) };
  }
  res = res.replace("</body>", `<script type="application/json" id="lsp-locked">${JSON.stringify(box)}</script>\n</body>`);
  return [res, n, units];
}
const manifest = [];

let total = 0;
for (const [ch, src, outDir] of jobs.filter((j) => !only || j[0] === only)) {
  let html = fs.readFileSync(path.join(src, "src.html"), "utf8");
  html = html.replace(/\{\{([a-z0-9_]+)\}\}/g, (_, n) => fs.readFileSync(path.join(src, "figs", n + ".svg"), "utf8"));
  let errors = 0;
  const render = (tex, display) => {
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: "ignore", output: "html" }); }
    catch (e) { errors++; console.error(`[${ch}] KaTeX:`, e.message); return tex; }
  };
  html = html.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => render(t.trim(), true));
  html = html.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => render(t.trim(), false));
  let locked, units;
  [html, locked, units] = lockSolutions(html, ch);
  const pageTitle = (html.match(/<title>([^<]*)<\/title>/) || [, ch])[1].replace(/ · LS Physics$/, "");
  const href = path.relative(root, path.join(outDir, "index.html"));
  if (units.length) for (const u of units) manifest.push({ id: u.id, title: u.title, parent: pageTitle, href: href + "#e" + u.id.replace(/^[a-z]+-/, ""), blocks: u.blocks, check: encrypt(pageKey(u.id), "lsp-ok") });
  else if (locked) manifest.push({ id: ch, title: (html.match(/<title>([^<]*)<\/title>/) || [, ch])[1].replace(/ · LS Physics$/, "") + (outDir.includes(path.sep + "chapters" + path.sep) ? " — chapter practice sets" : ""),
    href: path.relative(root, path.join(outDir, "index.html")), blocks: locked, check: encrypt(pageKey(ch), "lsp-ok") });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  for (const f of fs.readdirSync(src)) if (f.endsWith(".js")) fs.copyFileSync(path.join(src, f), path.join(outDir, f));
  console.log(`${ch}: ok, KaTeX errors = ${errors}, locked solutions = ${locked}, ${(html.length / 1024).toFixed(0)} KB`);
  total += errors;
}
// manifest for the dashboard (only when every page was built)
if (!only) {
  const mf = path.join(root, "assets", "js", "solution-pages.js");
  fs.writeFileSync(mf, "/* generated by tools/build.js — pages whose solutions are locked */\nexport const ITER = " + ITER +
    ";\nexport const PAGES = " + JSON.stringify(manifest, null, 1) + ";\n");
}
process.exit(total ? 1 : 0);
