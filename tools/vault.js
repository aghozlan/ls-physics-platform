// Keeps the editable sources (which contain the answers) out of the public repo.
//   node tools/vault.js seal   -> encrypts every tools/**/src.html and print_src.html into tools/sources.vault
//   node tools/vault.js open   -> restores them from tools/sources.vault
// The passphrase is the same as the solutions passphrase (tools/.solutions-passphrase or LSP_SOLUTIONS_PASSPHRASE).
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const dir = __dirname, out = path.join(dir, "sources.vault");
const passFile = path.join(dir, ".solutions-passphrase");
const PASS = process.env.LSP_SOLUTIONS_PASSPHRASE || (fs.existsSync(passFile) ? fs.readFileSync(passFile, "utf8").trim() : "");
if (!PASS) { console.error("passphrase missing: put it in tools/.solutions-passphrase"); process.exit(1); }
const key = crypto.pbkdf2Sync(PASS, "lsp:vault", 150000, 32, "sha256");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === "node_modules" ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
if (process.argv[2] === "seal") {
  const files = {};
  for (const f of walk(dir)) if (/(^|\/)(print_)?src\.html$/.test(f)) files[path.relative(dir, f)] = fs.readFileSync(f, "utf8");
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(files), "utf8"), c.final(), c.getAuthTag()]);
  fs.writeFileSync(out, JSON.stringify({ iv: iv.toString("base64"), ct: ct.toString("base64") }));
  console.log("sealed", Object.keys(files));
} else if (process.argv[2] === "open") {
  const { iv, ct } = JSON.parse(fs.readFileSync(out, "utf8"));
  const buf = Buffer.from(ct, "base64"), d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(buf.subarray(buf.length - 16));
  const files = JSON.parse(Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString("utf8"));
  for (const [f, s] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); }
  console.log("opened", Object.keys(files));
} else console.log("usage: node tools/vault.js seal|open");
