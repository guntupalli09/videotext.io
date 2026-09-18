#!/usr/bin/env python3
"""Fetch the Ryze-hosted articles and convert them to repo blog markdown."""
import json, re, sys, os, time, urllib.request, concurrent.futures
from bs4 import BeautifulSoup
from markdownify import markdownify

SRC = "https://videotext.byryze.com"
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; videotext-import)"})
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 ** i)

def slugify(s):
    s = re.sub(r"[''']", "", s.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def meta(soup, **kw):
    t = soup.find("meta", attrs=kw)
    return (t.get("content") or "").strip() if t else ""

def first_para(body):
    for p in body.find_all("p") if body else []:
        txt = p.get_text(" ", strip=True)
        if len(txt) > 80:
            return re.sub(r"\s+", " ", txt)[:300].rsplit(" ", 1)[0]
    return ""

def parse(url):
    html = get(url)
    soup = BeautifulSoup(html, "lxml")
    old_path = url[len(SRC):] or "/"

    title = (soup.h1.get_text(" ", strip=True) if soup.h1 else "") or (soup.title.string or "").strip()
    desc = meta(soup, name="description") or meta(soup, property="og:description")

    ld = {}
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            d = json.loads(s.string or "{}")
        except Exception:
            continue
        for item in (d if isinstance(d, list) else [d]):
            if isinstance(item, dict) and item.get("@type") in ("Article", "BlogPosting", "NewsArticle"):
                ld = item

    body = soup.find("article") or soup.find("main")
    for bad in body.select("script, style, nav, form, header, footer, aside") if body else []:
        bad.decompose()
    if body and body.h1:
        body.h1.decompose()

    md = markdownify(str(body), heading_style="ATX", bullets="-") if body else ""
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    # Ryze links back to videotext.io with escaped trailing slashes in places
    md = md.replace("videotext.io/\\", "videotext.io/")

    if not desc:
        desc = first_para(body)

    return {
        "old_path": old_path,
        "slug": slugify(title) or old_path.strip("/"),
        "title": title,
        "description": desc,
        "date": (ld.get("datePublished") or "")[:10],
        "image": (ld.get("image") if isinstance(ld.get("image"), str) else (ld.get("image") or [None])[0]) or "",
        "markdown": md,
        "words": len(md.split()),
    }

urls = [u.strip() for u in open(sys.argv[2]) if u.strip() and u.strip() != SRC + "/"]
rows, errors = [], []
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
    for url, fut in [(u, ex.submit(parse, u)) for u in urls]:
        try:
            rows.append(fut.result())
        except Exception as e:
            errors.append((url, repr(e)))

def esc(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'

seen = {}
for r in rows:
    slug = r["slug"]
    seen[slug] = seen.get(slug, 0) + 1
    if seen[slug] > 1:
        slug = f"{slug}-{seen[slug]}"
        r["slug"] = slug
    fm = ["---", f"slug: {slug}", f"title: {esc(r['title'])}", f"description: {esc(r['description'])}"]
    if r["date"]:
        fm.append(f"date: {r['date']}")
    if r["image"]:
        fm.append(f"image: {r['image']}")
    fm += [f"source_path: {r['old_path']}", "source: ryze", "---", ""]
    open(os.path.join(OUT, slug + ".md"), "w", encoding="utf-8").write("\n".join(fm) + f"# {r['title']}\n\n" + r["markdown"] + "\n")

# Rewrite internal cross-links: byryze URLs (old slugs) -> /guides/<new slug>
link_map = {r["old_path"]: "/guides/" + r["slug"] for r in rows}
rewritten = 0
for r in rows:
    path = os.path.join(OUT, r["slug"] + ".md")
    txt = open(path, encoding="utf-8").read()
    def sub(m):
        global rewritten
        old = m.group(1).rstrip("/")
        if old in link_map:
            rewritten += 1
            return "https://videotext.io" + link_map[old]
        return m.group(0)
    txt = re.sub(r"https://videotext\.byryze\.com(/[^)\s\"']*)", sub, txt)
    open(path, "w", encoding="utf-8").write(txt)
print("internal links rewritten:", rewritten)

json.dump(
    [{"from": r["old_path"], "to": "/guides/" + r["slug"], "title": r["title"], "words": r["words"]} for r in sorted(rows, key=lambda x: x["slug"])],
    open(os.path.join(OUT, "_redirect-map.json"), "w"), indent=2,
)
print(f"imported {len(rows)} / {len(urls)}  errors={len(errors)}")
for u, e in errors[:10]:
    print("  ERR", u, e)
short = [r for r in rows if r["words"] < 300]
print("thin (<300 words):", len(short), [r["slug"] for r in short[:5]])
