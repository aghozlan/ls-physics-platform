"""Turn a printable test sheet (exam layout + answer key) into an interactive library page.

Usage: python3 make_test_page.py <body.html> <out_dir> <title> <subtitle> <pdf_name> <fig ids...>
- every Part of every exercise is followed by a "Show solution" button that reveals the
  detailed solution of that part (rows of the answer key, with marks).
"""
import re, sys, os, shutil

body_path, out_dir, title, subtitle, pdf_name, *figs = sys.argv[1:]
body = open(body_path).read()

student = body[:body.index("<!-- ======================================================= ANSWER KEY")]
key = body[body.index("<!-- ======================================================= ANSWER KEY"):]

# ---- answer key rows per exercise
key_ex = re.split(r"<h3>Exercise \d[^<]*</h3>", key)[1:]
rows_by_ex = []
for chunk in key_ex:
    chunk = chunk.split("<h3>")[0]
    rows = re.findall(r'<tr><td>([^<]+)</td><td>(.*?)</td><td class="mk">([\d.]+)</td></tr>', chunk, re.S)
    rows_by_ex.append(rows)

# ---- exercises
ex_blocks = re.split(r'<!-- =+ EXERCISE \d -->', student)[1:]
out_ex = []
for i, ex in enumerate(ex_blocks):
    ex = ex.split('<p class="endmark">')[0].split("</section>")[0]
    m = re.search(r'<h2><span>(.*?)</span><span class="pts">\((\d+) points\)</span></h2>', ex)
    head = f'<div class="exercise"><h3><span>{m.group(1)}</span><span class="pts">{m.group(2)} pts</span></h3>'
    ex = ex.replace(m.group(0), "")
    ex = ex.replace('<div class="ex">', "", 1)
    parts = ex.split('<div class="part">')
    html = head + parts[0]
    for k, p in enumerate(parts[1:], start=1):
        ptitle, rest = p.split("</div>", 1)
        rows = [r for r in rows_by_ex[i] if r[0].split(".")[0] == str(k)]
        marks = sum(float(r[2]) for r in rows)
        sol = "".join(f'<tr><td>{n}</td><td>{c}</td><td class="mk">{mk}</td></tr>' for n, c, mk in rows)
        block = (f'<div class="solbar"><button class="btn ghost" data-toggle-sol aria-expanded="false">Show solution</button>'
                 f'<span class="solmeta">Part {k} · {marks:g} pts</span></div>'
                 f'<div class="sol" hidden><table class="ms">{sol}</table></div>')
        idx = rest.rfind("</ol>")
        rest = rest[:idx + 5] + block + rest[idx + 5:]
        html += f'<h4 class="parth">{ptitle}</h4>' + rest
    html = html.rstrip()
    if html.endswith("</div>"):
        html = html[:-6]
    out_ex.append(html + "</div>")

content = "\n".join(out_ex)
content = content.replace('<ol class="q">', '<ol class="qs">')
content = re.sub(r'<figure class="w\d+">', "<figure>", content)
rubric = re.search(r'<p class="rubric">(.*?)</p>', student, re.S).group(1)
meta = re.findall(r'<span class="small">(Duration[^<]*|Total[^<]*)</span>', student)

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · LS Physics</title>
<meta name="description" content="Grade 12 Life Sciences (Lebanese curriculum) — {title}: {subtitle}. Exam-style exercises with a detailed solution hidden after each part.">
<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap">
<link rel="stylesheet" href="../../assets/katex/katex.min.css">
<link rel="stylesheet" href="../../assets/css/platform.css">
<script>document.documentElement.classList.add("lsp-locked")</script><style>html.lsp-locked body{{visibility:hidden}}</style>
<script type="module" src="../../assets/js/auth-gate.js"></script>
</head>
<body data-chapter="{os.path.basename(out_dir)}">
<header class="topbar"><div class="wrap">
  <a class="logo" href="../../index.html#library"><span class="mark">LS</span><span><b>{title}</b><small>Library · Grade 12 LS Physics</small></span></a>
  <span class="grow"></span>
  <a class="iconbtn" href="{pdf_name}" target="_blank" rel="noopener" title="Printable PDF">⎙<span class="hide-sm"> PDF</span></a>
  <button class="iconbtn" data-theme-toggle aria-label="Switch light or dark">◐</button>
  <a class="iconbtn" href="../../index.html#library" title="Library">⌂<span class="hide-sm"> Library</span></a>
</div></header>
<main class="wrap">
<section class="hero">
  <div class="kicker">Library · {os.environ.get("LSP_KICKER", "Chapter 1 — Energy")}</div>
  <h1>{title}</h1>
  <p>{subtitle}. {" · ".join(meta)}. Solve each part on paper first, then open its solution.</p>
  <p class="rubricline">{rubric}</p>
</section>
{content}
</main>
<footer>Tutoring Centre · Life Sciences Physics · Grade 12 LS · Lebanese curriculum</footer>
<script src="../../assets/js/platform.js"></script>
</body>
</html>
'''
os.makedirs(os.path.join(out_dir, "figs"), exist_ok=True)
for f in figs:
    shutil.copy(f"/home/claude/sheet/figs/{f}.svg", os.path.join(out_dir, "figs", f + ".svg"))
open(os.path.join(out_dir, "src.html"), "w").write(page)
print("ok", out_dir, [len(r) for r in rows_by_ex])
