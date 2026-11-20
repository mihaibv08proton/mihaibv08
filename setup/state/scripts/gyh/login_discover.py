#!/usr/bin/env python3
"""GYH midnight scrape 2026-11-11: login + Date zilnice rediscovery. Password never printed."""
import html as html_lib
import http.cookiejar as cookiejar
import json
import re
import ssl
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

WORKDIR = Path("/workspace/gyh-scrape-2026-11-20")
PASS_FILE = Path("/home/box/secrets/growyourwealth-ops.pass")
EMAIL = "[username GYH — vezi /home/box/secrets/growyourwealth-ops.meta]"  # REDACTAT pentru repo public; pune valoarea din .meta înainte de rulare
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)
BASE = "https://www.growyourwealth.ro"

# LIVE 10.11.2026 midday commit 99c56b7 lock
LOCK_PATH = Path("/workspace/gyh-watermark-2026-11-19-midday-live.json")
WM_POST_ID = "2197789725"
WM_DATE = "01.01.2026"
WM_TITLE = "01.01.2026 PCE raceste inflatia..."
ALREADY_PUBLISHED = set(json.load(open("/workspace/gyh-watermark-2026-11-19-midday-live.json"))["alreadyPublishedPostIds"])
LISTING_HEAD_POST_ID = "2197789192"
EDITION = "2026-11-20"
KIND = "midnight-scrape"
Q3_ID_HINT = "2160165689"
Q4_ID_HINT = "2160165880"  # Date zilnice Q4 2026 (NOT 2151535545 = Videoclipurile)
VIDEO_FOLDER_ID = "2151535545"  # do not treat as daily
DZ_PARENT_ID = "2157405510"
RESULT_PATH = WORKDIR / "result-full.json"
BRIEF_PATH = Path("/workspace/gyh-brief-2026-11-20.json")

WORKDIR.mkdir(parents=True, exist_ok=True)
ctx = ssl.create_default_context()
cj = cookiejar.MozillaCookieJar(str(WORKDIR / "cookies.txt"))
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ctx),
)
opener.addheaders = [("User-Agent", UA)]


def save(name: str, data: bytes | str, headers=None, url=None, code=None):
    p = WORKDIR / name
    if isinstance(data, bytes):
        p.write_bytes(data)
    else:
        p.write_text(data, encoding="utf-8")
    if headers is not None:
        lines = [f"HTTP {code}", f"final {url}", "err None"]
        for k, v in headers.items():
            lines.append(f"{k}: {v}")
        (WORKDIR / f"{name}.headers").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return p


def fetch(url: str, data=None, method=None, extra_headers=None):
    headers = {"User-Agent": UA}
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = opener.open(req, timeout=90)
        body = resp.read()
        return resp.getcode(), resp.geturl(), dict(resp.headers), body, None
    except urllib.error.HTTPError as e:
        body = e.read() if e.fp else b""
        return e.code, getattr(e, "url", url), dict(e.headers or {}), body, str(e)
    except Exception as e:
        return None, url, {}, b"", str(e)


def fail(stage: str, **extra):
    payload = {
        "ok": False,
        "edition": EDITION,
        "kind": KIND,
        "stage": stage,
        "error": extra.get("error") or stage,
        "scrapedAt": datetime.now(ZoneInfo("Europe/Bucharest")).isoformat(),
        "watermarkAdvanced": False,
        "workdir": str(WORKDIR),
    }
    payload.update({k: v for k, v in extra.items() if k != "error"})
    RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": False, "stage": stage, "error": payload["error"]}, ensure_ascii=False))
    raise SystemExit(1)


def parse_folders(html: str):
    folders = []
    pattern = re.compile(
        r'href="(?:https://www\.growyourwealth\.ro)?(/products/grow-your-wealth/categories/(\d+))"[^>]*>(.*?)</a>',
        re.S | re.I,
    )
    for m in pattern.finditer(html):
        href, cid, inner = m.group(1), m.group(2), m.group(3)
        title = re.sub(r"<[^>]+>", " ", inner)
        title = html_lib.unescape(title)
        title = re.sub(r"\s+", " ", title).strip()
        folders.append({"id": cid, "href": href, "title": title})
    seen = set()
    uniq = []
    for f in folders:
        if f["id"] not in seen:
            seen.add(f["id"])
            uniq.append(f)
        elif f["title"] and not next(x["title"] for x in uniq if x["id"] == f["id"]):
            for x in uniq:
                if x["id"] == f["id"] and not x["title"]:
                    x["title"] = f["title"]
    return uniq


def clean_title(title: str) -> str:
    title = html_lib.unescape(title)
    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r"(?i)\b(svg|path|viewbox|xmlns)\b.*$", "", title).strip()
    title = re.sub(r"(?i)^.*?video lesson icon/default\s*Created with Sketch\.\s*", "", title).strip()
    title = re.sub(r"(?i)^.*?Created with Sketch\.\s*", "", title).strip()
    dm_any = re.search(r"(\d{2}\.\d{2}\.\d{4}\s+.*)$", title)
    if dm_any:
        title = dm_any.group(1).strip()
    title = re.sub(r"\s+", " ", title).strip()
    if len(title) > 180:
        if "..." in title[:160]:
            title = title[: title.find("...") + 3]
        else:
            title = title[:177].rstrip() + "..."
    return title


def parse_posts(html: str, category_id: str):
    posts = []
    for m in re.finditer(
        rf'href="(?:https://www\.growyourwealth\.ro)?(/products/grow-your-wealth/categories/{category_id}/posts/(\d+))"[^>]*>(.*?)</a>',
        html,
        re.S | re.I,
    ):
        href, pid, inner = m.group(1), m.group(2), m.group(3)
        title = clean_title(re.sub(r"<[^>]+>", " ", inner))
        if not title or len(title) < 5:
            continue
        dm = re.match(r"^(\d{2}\.\d{2}\.\d{4})\b", title)
        date_exact = dm.group(1) if dm else ""
        posts.append({
            "postId": pid,
            "dateExact": date_exact,
            "titleExact": title,
            "url": BASE + href,
            "folderId": category_id,
        })
    seen_p = set()
    uniq_p = []
    for p in posts:
        if p["postId"] not in seen_p:
            seen_p.add(p["postId"])
            uniq_p.append(p)
    return uniq_p


def parse_dmy(s):
    m = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", s or "")
    if not m:
        return None
    return (int(m.group(3)), int(m.group(2)), int(m.group(1)))


def quarter_sort_key(title: str):
    m = re.search(r"Date zilnice\s+Q([1-4])\s+(20\d{2})", title or "", re.I)
    if not m:
        return None
    return int(m.group(2)) * 10 + int(m.group(1))


def fetch_category(cid: str, title_hint: str, page_name: str):
    cat_url = f"{BASE}/products/grow-your-wealth/categories/{cid}"
    code, url, hdrs, body, err = fetch(cat_url)
    save(page_name, body, hdrs, url, code)
    print(f"GET category {cid} ({title_hint}) → {code} final={url} bytes={len(body)} err={err}")
    if "/login" in (url or ""):
        fail("session-dropped", error="category fetch redirected to login", category=cid, final=url)
    html = body.decode("utf-8", errors="replace")
    low = html.lower()
    if code != 200 or "cf-browser-verification" in low or ("just a moment" in low and "cloudflare" in low):
        fail("blocked-or-bad-category", error=f"category {cid} code={code} err={err}", category=cid, code=code)
    posts = parse_posts(html, cid)
    pages = 1
    next_urls = []
    for m in re.finditer(r'href="([^"]*categories/' + cid + r'[^"]*page=(\d+)[^"]*)"', html, re.I):
        next_urls.append(html_lib.unescape(m.group(1)))
    mnext = re.search(r'rel="next"[^>]*href="([^"]+)"', html, re.I) or re.search(r'href="([^"]+)"[^>]*rel="next"', html, re.I)
    if mnext:
        next_urls.append(html_lib.unescape(mnext.group(1)))
    seen_pages = set()
    for nu in next_urls:
        if nu in seen_pages:
            continue
        seen_pages.add(nu)
        if nu.startswith("/"):
            nu = BASE + nu
        if "page=" not in nu:
            continue
        pages += 1
        if pages > 8:
            break
        c2, u2, h2, b2, e2 = fetch(nu)
        save(f"{page_name}.page{pages}", b2, h2, u2, c2)
        print(f"  page {nu} → {c2} bytes={len(b2)} err={e2}")
        if c2 == 200 and b2:
            extra = parse_posts(b2.decode("utf-8", errors="replace"), cid)
            have = {p["postId"] for p in posts}
            for p in extra:
                if p["postId"] not in have:
                    posts.append(p)
                    have.add(p["postId"])
    safe = re.sub(r"[^a-z0-9]+", "-", title_hint.lower()).strip("-") or cid
    (WORKDIR / f"posts-{cid}.json").write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
    (WORKDIR / f"posts-{safe}.json").write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  posts_in_{cid}={len(posts)}")
    for p in posts[:8]:
        print(f"    {p['postId']} | {p['dateExact']} | {p['titleExact'][:90]}")
    return {
        "id": cid,
        "title": title_hint,
        "href": f"/products/grow-your-wealth/categories/{cid}",
        "fetchCode": code,
        "fetchUrl": url,
        "byteCount": len(body),
        "err": err,
        "posts": posts,
        "postCount": len(posts),
        "pagesFetched": pages,
    }


# --- LOGIN ---
password = PASS_FILE.read_text(encoding="utf-8").strip()
if not password:
    fail("password-file-empty", error="password file empty")

code, url, hdrs, body, err = fetch(f"{BASE}/login")
ray = hdrs.get("CF-RAY") or hdrs.get("cf-ray") or ""
save("login-get.html", body, hdrs, url, code)
print(f"GET /login → {code} cf-ray={ray} err={err} final={url}")
if code != 200 or not body:
    fail("login-get", error=f"GET /login failed code={code} err={err}", code=code, ray=ray)
low = body.decode("utf-8", errors="replace").lower()
if "cf-browser-verification" in low or ("just a moment" in low and "cloudflare" in low):
    fail("blocked", error="Cloudflare challenge on GET /login", code=code, ray=ray)

html = body.decode("utf-8", errors="replace")
m = re.search(r'name="authenticity_token"[^>]*value="([^"]+)"', html)
if not m:
    m = re.search(r'value="([^"]+)"[^>]*name="authenticity_token"', html)
token = m.group(1) if m else ""
(WORKDIR / "token.txt").write_text(token, encoding="utf-8")
print(f"token_len={len(token)}")
if not token:
    fail("login-token", error="authenticity_token missing", code=code, ray=ray)

form = {
    "utf8": "✓",
    "authenticity_token": token,
    "user[email]": EMAIL,
    "user[password]": password,
    "user[remember_me]": "0",
    "commit": "Autentificare",
}
email_fields = re.findall(r'name="([^"]*email[^"]*)"', html, re.I)
pass_fields = re.findall(r'name="([^"]*password[^"]*)"', html, re.I)
print(f"email_fields={email_fields} pass_field_count={len(pass_fields)}")
if email_fields and email_fields[0] != "user[email]":
    form = {
        "utf8": "✓",
        "authenticity_token": token,
        email_fields[0]: EMAIL,
        (pass_fields[0] if pass_fields else "user[password]"): password,
    }
    for name in re.findall(r'name="([^"]+)"', html):
        if "remember" in name.lower():
            form[name] = "0"
        if name == "commit":
            form[name] = "Autentificare"

post_data = urllib.parse.urlencode(form).encode("utf-8")
form.clear()
password = None
del password

code2, url2, hdrs2, body2, err2 = fetch(
    f"{BASE}/login",
    data=post_data,
    method="POST",
    extra_headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": f"{BASE}/login",
        "Origin": BASE,
    },
)
post_data = b""
ray2 = hdrs2.get("CF-RAY") or hdrs2.get("cf-ray") or ""
save("login-post.html", body2, hdrs2, url2, code2)
print(f"POST /login → {code2} final={url2} cf-ray={ray2} err={err2}")

if code2 is None or not body2:
    fail("login-post", error=f"POST /login failed code={code2} err={err2}", code=code2, ray=ray2)
low2 = body2.decode("utf-8", errors="replace").lower()
if "cf-browser-verification" in low2 or ("just a moment" in low2 and "cloudflare" in low2):
    fail("blocked", error="Cloudflare challenge on POST /login", code=code2, ray=ray2)
stuck_login = bool(b"user[email]" in body2 and b"password" in body2.lower() and "/login" in (url2 or ""))
if stuck_login or (code2 == 200 and "/login" in (url2 or "") and b"user[email]" in body2):
    fail("login-failed", error="still on login form after POST", code=code2, final=url2, ray=ray2)

cj.save(ignore_discard=True, ignore_expires=True)
print("cookies saved; login OK")

# --- LIBRARY / PRODUCT / DATE ZILNICE ---
code, url, hdrs, body, err = fetch(f"{BASE}/library")
save("page-library.html", body, hdrs, url, code)
print(f"GET /library → {code} final={url} err={err}")
if "/login" in (url or "") or code != 200:
    fail("library-redirect-login", error=f"library not reachable code={code} final={url}", final=url, code=code)

code, url, hdrs, body, err = fetch(f"{BASE}/products/grow-your-wealth")
save("page-gyh.html", body, hdrs, url, code)
print(f"GET /products/grow-your-wealth → {code} final={url} err={err}")
if "/login" in (url or ""):
    fail("session-dropped", error="product page redirected to login", final=url)
gyh_html = body.decode("utf-8", errors="replace")
folders = parse_folders(gyh_html)
(WORKDIR / "discovery-folders.json").write_text(json.dumps(folders, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"folders_from_product={len(folders)}")

code_dz, url_dz, hdrs_dz, body_dz, err_dz = fetch(f"{BASE}/products/grow-your-wealth/categories/{DZ_PARENT_ID}")
save("page-date-zilnice.html", body_dz, hdrs_dz, url_dz, code_dz)
print(f"GET Date zilnice parent {DZ_PARENT_ID} → {code_dz} final={url_dz} bytes={len(body_dz)} err={err_dz}")
if "/login" in (url_dz or ""):
    fail("session-dropped", error="date zilnice parent redirected to login", final=url_dz)
dz_html = body_dz.decode("utf-8", errors="replace")
folders_dz = parse_folders(dz_html)
(WORKDIR / "discovery-folders-dz.json").write_text(json.dumps(folders_dz, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"folders_from_dz_parent={len(folders_dz)}")

by_id = {}
for f in folders + folders_dz:
    prev = by_id.get(f["id"])
    if not prev or (f["title"] and not prev.get("title")):
        by_id[f["id"]] = f

for f in by_id.values():
    if f.get("title"):
        print(f"  FOLDER id={f['id']} title={f['title']!r}")

# Date zilnice quarters Q3 2026+ by LIVE title; never treat VIDEO_FOLDER_ID as daily
dz_quarters = []
for f in by_id.values():
    if f["id"] == VIDEO_FOLDER_ID:
        continue
    key = quarter_sort_key(f.get("title") or "")
    if key is not None and key >= 2026 * 10 + 3:
        dz_quarters.append(f)
dz_quarters.sort(key=lambda f: quarter_sort_key(f["title"]))

if not any(f["id"] == Q3_ID_HINT for f in dz_quarters):
    meta = by_id.get(Q3_ID_HINT) or {
        "id": Q3_ID_HINT,
        "href": f"/products/grow-your-wealth/categories/{Q3_ID_HINT}",
        "title": "Date zilnice Q3 2026",
    }
    if not meta.get("title"):
        meta["title"] = "Date zilnice Q3 2026"
    dz_quarters.insert(0, meta)

if not any(f["id"] == Q4_ID_HINT for f in dz_quarters):
    meta = by_id.get(Q4_ID_HINT) or {
        "id": Q4_ID_HINT,
        "href": f"/products/grow-your-wealth/categories/{Q4_ID_HINT}",
        "title": "Date zilnice Q4 2026",
    }
    live_title = (by_id.get(Q4_ID_HINT) or {}).get("title") or ""
    if "Date zilnice" in live_title or not live_title:
        if not meta.get("title"):
            meta["title"] = live_title or "Date zilnice Q4 2026"
        dz_quarters.append(meta)
    else:
        print(f"WARNING: Q4 hint {Q4_ID_HINT} live title={live_title!r} — not adding as DZ")

print("DZ quarters to fetch:")
for f in dz_quarters:
    print(f"  {f['id']} {f.get('title')}")

# Note video folder live title for discovery (do not fetch posts as daily)
video_meta = by_id.get(VIDEO_FOLDER_ID)
if video_meta:
    print(f"VIDEO folder (not daily): id={VIDEO_FOLDER_ID} title={video_meta.get('title')!r}")

results = []
for f in dz_quarters:
    slug = re.sub(r"[^a-z0-9]+", "-", (f.get("title") or f["id"]).lower()).strip("-")
    results.append(fetch_category(f["id"], f.get("title") or f["id"], f"page-{slug}.html"))

# Identify Q3 / Q4 by live title / hint ids
q3_result = None
for r in results:
    if r["id"] == Q3_ID_HINT or "Q3 2026" in (r["title"] or ""):
        q3_result = r
        break
if q3_result is None and results:
    q3_result = results[0]

q4_result = None
for r in results:
    if r is q3_result:
        continue
    if r["id"] == Q4_ID_HINT or "Q4 2026" in (r["title"] or ""):
        q4_result = r
        break
if q4_result is None:
    for r in results:
        if r is not q3_result:
            q4_result = r
            break

if q3_result:
    (WORKDIR / "posts-q3.json").write_text(json.dumps(q3_result["posts"], ensure_ascii=False, indent=2), encoding="utf-8")
    (WORKDIR / "posts-parsed.json").write_text(json.dumps(q3_result["posts"], ensure_ascii=False, indent=2), encoding="utf-8")
if q4_result:
    (WORKDIR / "posts-q4.json").write_text(json.dumps(q4_result["posts"], ensure_ascii=False, indent=2), encoding="utf-8")

# --- FILTER (LIVE lock rules) ---
# Do NOT filter with dateExact > 01.01.2026 (that re-includes 02.10 and 03.10).
# A post is NEW only if:
# 1) postId NOT in alreadyPublishedPostIds, AND
# 2) either appears ABOVE listingHeadPostId in Q4 newest-first listing,
#    OR is a newly discovered daily post whose id is not one of the three published ids.
q4_posts = q4_result["posts"] if q4_result else []
q3_posts = q3_result["posts"] if q3_result else []

head_idx = None
for i, p in enumerate(q4_posts):
    if p["postId"] == LISTING_HEAD_POST_ID:
        head_idx = i
        break

new_from_q4 = []
if head_idx is None:
    fail("listing-head-missing", error="Authorized Q4 listing head not found")
else:
    # newest-first: items before head index are newer than LIVE head
    for p in q4_posts[:head_idx]:
        if p["postId"] not in ALREADY_PUBLISHED:
            new_from_q4.append(p)

# Other daily folders (not Q4): include only posts not published and not Q3 watermark-era history.
# Midday after LIVE: Q3 should not contribute "new" posts (already published era).
# Only include from non-Q4 daily if clearly new id not in published set AND has dated daily title
# that would be after Oct 3 listing head — but per lock, do NOT use date>01.01.2026.
# Safe rule: only Q4-above-head counts; other DZ quarters contribute nothing unless
# the post id is entirely unknown and folder is a newly rediscovered quarter beyond Q4.
new_from_other = []

seen_new = set()
new_posts = []
# Q4 newest-first → reverse to chronological for output; then other
for p in list(reversed(new_from_q4)) + list(reversed(new_from_other)):
    if p["postId"] in seen_new or p["postId"] in ALREADY_PUBLISHED:
        continue
    seen_new.add(p["postId"])
    new_posts.append(p)
new_posts.sort(key=lambda p: (parse_dmy(p.get("dateExact")) or (9999, 12, 31), p["postId"]))

new_posts_out = [
    {
        "postId": p["postId"],
        "dateExact": p["dateExact"],
        "titleExact": p["titleExact"],
        "url": p["url"],
        "folderId": p.get("folderId"),
    }
    for p in new_posts
]
(WORKDIR / "new-posts.json").write_text(json.dumps(new_posts_out, ensure_ascii=False, indent=2), encoding="utf-8")
print(
    f"new_from_q4={len(new_from_q4)} new_from_other={len(new_from_other)} "
    f"new_total={len(new_posts_out)} head_idx={head_idx}"
)

# Fetch full pages for new posts
extracts = []
for p in new_posts_out:
    c, u, h, b, e = fetch(p["url"])
    fname = f"post-{p['postId']}.html"
    save(fname, b, h, u, c)
    print(f"GET post {p['postId']} → {c} bytes={len(b)} err={e} final={u}")
    if "/login" in (u or ""):
        fail("session-dropped", error=f"post {p['postId']} redirected to login", final=u)
    page = b.decode("utf-8", errors="replace") if b else ""
    title_m = re.search(r'<h1 class="post-body-title">(.*?)</h1>', page, re.S | re.I)
    title_exact = clean_title(re.sub(r"<[^>]+>", " ", title_m.group(1))) if title_m else p["titleExact"]
    body_m = re.search(r'<div class="post-body">(.*)$', page, re.S | re.I)
    body_html = body_m.group(1) if body_m else ""
    body_html = re.split(r'<footer|id="footer"|class="site-footer"', body_html, maxsplit=1, flags=re.I)[0]
    text = re.sub(r"<script[\s\S]*?</script>", " ", body_html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>|</div>|</li>|</h[1-6]>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_lib.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    wistia = re.findall(r"wistia_async_([a-z0-9]+)", page, re.I)
    wistia += re.findall(r"wistia\.com/embed/(?:iframe|medias)/([a-z0-9]+)", page, re.I)
    youtube = re.findall(r"(?:youtube\.com/embed/|youtu\.be/)([A-Za-z0-9_-]{6,})", page)
    audio = bool(re.search(r"<audio[\s>]|\.mp3|\.m4a|soundcloud", page, re.I))
    has_video = bool(wistia or youtube or audio)
    rec = {
        "postId": p["postId"],
        "dateExact": p["dateExact"],
        "titleExact": title_exact,
        "url": p["url"],
        "folderId": p.get("folderId"),
        "fetchCode": c,
        "hasVideo": has_video,
        "wistiaIds": sorted(set(wistia)),
        "youtubeIds": sorted(set(youtube)),
        "hasAudio": audio,
        "bodyPath": str(WORKDIR / f"extract-{p['postId']}.txt"),
        "htmlPath": str(WORKDIR / fname),
        "text": text,
    }
    extracts.append(rec)
    (WORKDIR / f"extract-{p['postId']}.json").write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding="utf-8")
    (WORKDIR / f"extract-{p['postId']}.txt").write_text(text, encoding="utf-8")

(WORKDIR / "extracts.json").write_text(json.dumps(extracts, ensure_ascii=False, indent=2), encoding="utf-8")

scraped_at = datetime.now(ZoneInfo("Europe/Bucharest")).isoformat()
newest_q3 = q3_posts[0] if q3_posts else None
newest_q4 = q4_posts[0] if q4_posts else None


def post_brief(p):
    if not p:
        return None
    return {
        "postId": p["postId"],
        "dateExact": p["dateExact"],
        "titleExact": p["titleExact"],
        "url": p["url"],
        "folderId": p.get("folderId"),
    }


folders_used = [
    {"id": r["id"], "title": r["title"], "postCount": r["postCount"]}
    for r in results
]

q3_title = q3_result["title"] if q3_result else None
q4_title = q4_result["title"] if q4_result else None
nq3 = newest_q3["titleExact"] if newest_q3 else "(none)"
nq4 = newest_q4["titleExact"] if newest_q4 else "(none)"

# listing head still at top of Q4?
listing_head_still = bool(newest_q4 and newest_q4["postId"] == LISTING_HEAD_POST_ID)

note = (
    f"No Grow Your Wealth articles newer than the LIVE lock {LOCK_PATH} (head {LISTING_HEAD_POST_ID}). "
    f"Excluded alreadyPublishedPostIds={sorted(ALREADY_PUBLISHED)}. "
    f"Q4 listing head remains {LISTING_HEAD_POST_ID}. "
    f"Newest in {q4_title or 'n/a'} (id {q4_result['id'] if q4_result else 'n/a'}, "
    f"{q4_result['postCount'] if q4_result else 0} posts) is {nq4}. "
    f"Newest in {q3_title or 'n/a'} (id {q3_result['id'] if q3_result else 'n/a'}, "
    f"{q3_result['postCount'] if q3_result else 0} posts) is {nq3}."
)
if video_meta:
    note += f" Folder {VIDEO_FOLDER_ID} live title is {video_meta.get('title')!r} (videos, not daily)."

folder_path = "Library → Grow Your Wealth → Date zilnice → " + " + ".join(
    f"{r['title']}({r['id']})" for r in results
)

discovery = {
    "edition": EDITION,
    "kind": KIND,
    "scrapedAt": scraped_at,
    "foldersUsed": folders_used,
    "folderId": q4_result["id"] if q4_result else (q3_result["id"] if q3_result else None),
    "folderTitle": q4_title or q3_title,
    "folderPath": folder_path,
    "quarters": [
        {"id": r["id"], "title": r["title"], "postCount": r["postCount"], "fetchCode": r["fetchCode"]}
        for r in results
    ],
    "videoFolderNoted": {
        "id": VIDEO_FOLDER_ID,
        "liveTitle": (video_meta or {}).get("title"),
        "role": "not-daily",
    },
    "q4Exists": bool(q4_result and q4_result["fetchCode"] == 200),
    "listingPostCount": sum(r["postCount"] for r in results),
    "q3PostCount": q3_result["postCount"] if q3_result else 0,
    "q4PostCount": q4_result["postCount"] if q4_result else 0,
    "watermarkPostId": WM_POST_ID,
    "watermarkDateExact": WM_DATE,
    "watermarkTitleExact": WM_TITLE,
    "alreadyPublishedPostIds": sorted(ALREADY_PUBLISHED),
    "listingHeadPostId": LISTING_HEAD_POST_ID,
    "listingHeadIndex": head_idx,
    "listingHeadFound": head_idx is not None,
    "watermarkAdvanced": False,
    "newestQ4": post_brief(newest_q4),
    "newestQ3": post_brief(newest_q3),
    "listingHeadStillTop": listing_head_still,
    "newPosts": new_posts_out,
    "newCount": len(new_posts_out),
    "newFromQ4": len(new_from_q4),
    "newFromOther": len(new_from_other),
    "method": "urllib-cookiejar+rediscover-titles+q4-above-listing-head+exclude-published-ids",
    "login": {"postCode": code2, "postFinal": url2, "postRay": ray2},
    "dzParent": {"id": DZ_PARENT_ID, "fetchCode": code_dz, "childCount": len(folders_dz)},
    "lockPath": str(LOCK_PATH),
    "needsAsr": any(e.get("hasVideo") for e in extracts),
}
(WORKDIR / "discovery.json").write_text(json.dumps(discovery, ensure_ascii=False, indent=2), encoding="utf-8")

q4_exists = bool(q4_result and q4_result["fetchCode"] == 200)
result = {
    "edition": EDITION,
    "kind": KIND,
    "scrapedAt": scraped_at,
    "ok": True,
    "gyh": [],
    "newCount": len(new_posts_out),
    "newPosts": new_posts_out,
    "newFromQ4": len(new_from_q4),
    "newFromOther": len(new_from_other),
    "watermarkPostId": WM_POST_ID,
    "watermarkDateExact": WM_DATE,
    "watermarkTitleExact": WM_TITLE,
    "alreadyPublishedPostIds": sorted(ALREADY_PUBLISHED),
    "listingHeadPostId": LISTING_HEAD_POST_ID,
    "listingHeadIndex": head_idx,
    "listingHeadFound": head_idx is not None,
    "listingHeadStillTop": listing_head_still,
    "watermarkFound": head_idx is not None or any(p["postId"] == WM_POST_ID for p in q4_posts),
    "watermarkAdvanced": False,
    "folderId": q4_result["id"] if q4_result else None,
    "folderTitle": q4_title,
    "folderPath": folder_path,
    "foldersUsed": folders_used,
    "q3Exists": bool(q3_result and q3_result["fetchCode"] == 200),
    "q4Exists": q4_exists,
    "q3Folder": {
        "id": q3_result["id"],
        "title": q3_result["title"],
        "listingPostCount": q3_result["postCount"],
        "newestPost": post_brief(newest_q3),
    } if q3_result else None,
    "q4Folder": {
        "id": q4_result["id"],
        "title": q4_result["title"],
        "listingPostCount": q4_result["postCount"],
        "newestPost": post_brief(newest_q4),
        "listingHeadPostId": LISTING_HEAD_POST_ID,
        "listingHeadIndex": head_idx,
    } if q4_result else None,
    "q3PostCount": q3_result["postCount"] if q3_result else 0,
    "q4PostCount": q4_result["postCount"] if q4_result else 0,
    "q4FolderId": q4_result["id"] if q4_result else None,
    "listingPostCount": sum(r["postCount"] for r in results),
    "newestPost": post_brief(newest_q4),
    "newestQ4": post_brief(newest_q4),
    "newestQ3": post_brief(newest_q3),
    "videoFolderNoted": {
        "id": VIDEO_FOLDER_ID,
        "liveTitle": (video_meta or {}).get("title"),
        "role": "not-daily",
    },
    "method": discovery["method"],
    "login": {"postCode": code2, "postFinal": url2, "postRay": ray2, "status": "succeeded"},
    "dzParent": {"id": DZ_PARENT_ID, "fetchCode": code_dz, "childCount": len(folders_dz)},
    "workdir": str(WORKDIR),
    "discoveryPath": str(WORKDIR / "discovery.json"),
    "briefPath": str(BRIEF_PATH),
    "lockPath": str(LOCK_PATH),
    "extractCount": len(extracts),
    "videoPostIds": [e["postId"] for e in extracts if e.get("hasVideo")],
    "extractsSummary": [
        {
            "postId": e["postId"],
            "hasVideo": e.get("hasVideo"),
            "hasAudio": e.get("hasAudio"),
            "wistiaIds": e.get("wistiaIds"),
            "bodyPath": e.get("bodyPath"),
            "htmlPath": e.get("htmlPath"),
        }
        for e in extracts
    ],
}
RESULT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
(WORKDIR / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

if len(new_posts_out) == 0:
    brief = {
        "edition": EDITION,
        "kind": KIND,
        "scrapedAt": scraped_at,
        "gyh": [],
        "newCount": 0,
        "watermarkPostId": WM_POST_ID,
        "watermarkDateExact": WM_DATE,
        "watermarkTitleExact": WM_TITLE,
        "alreadyPublishedPostIds": sorted(ALREADY_PUBLISHED),
        "listingHeadPostId": LISTING_HEAD_POST_ID,
        "watermarkFound": result["watermarkFound"],
        "watermarkAdvanced": False,
        "listingHeadStillTop": listing_head_still,
        "q4Exists": q4_exists,
        "foldersUsed": folders_used,
        "folderId": q4_result["id"] if q4_result else None,
        "folderTitle": q4_title,
        "folderPath": folder_path,
        "q4FolderId": q4_result["id"] if q4_result else None,
        "q4FolderTitle": q4_title,
        "note": note,
    }
else:
    # Stub only — parent handles ASR/full briefs
    brief = {
        "edition": EDITION,
        "kind": KIND,
        "scrapedAt": scraped_at,
        "gyh": [],
        "newCount": len(new_posts_out),
        "newPosts": new_posts_out,
        "stub": True,
        "note": "New posts found; full author briefs pending parent ASR/review.",
        "watermarkPostId": WM_POST_ID,
        "watermarkDateExact": WM_DATE,
        "watermarkTitleExact": WM_TITLE,
        "alreadyPublishedPostIds": sorted(ALREADY_PUBLISHED),
        "listingHeadPostId": LISTING_HEAD_POST_ID,
        "watermarkAdvanced": False,
        "foldersUsed": folders_used,
        "folderId": q4_result["id"] if q4_result else None,
        "folderTitle": q4_title,
        "q4FolderId": q4_result["id"] if q4_result else None,
        "extractsSummary": result["extractsSummary"],
        "videoPostIds": result["videoPostIds"],
    }
(BRIEF_PATH if len(new_posts_out)==0 else WORKDIR/"brief-stub-NEW.json").write_text(json.dumps(brief, ensure_ascii=False, indent=2), encoding="utf-8")

print(json.dumps({
    "ok": True,
    "login": "succeeded",
    "newCount": len(new_posts_out),
    "headIdx": head_idx,
    "listingHeadStillTop": listing_head_still,
    "q3": {"id": q3_result["id"], "title": q3_result["title"], "n": q3_result["postCount"], "newest": nq3} if q3_result else None,
    "q4": {"id": q4_result["id"], "title": q4_result["title"], "n": q4_result["postCount"], "newest": nq4} if q4_result else None,
    "videoFolder": (video_meta or {}).get("title"),
    "videoPostIds": result["videoPostIds"],
    "titles": [p["titleExact"] for p in new_posts_out],
    "resultPath": str(RESULT_PATH),
    "briefPath": str(BRIEF_PATH),
}, ensure_ascii=False))
