"""
Parse the Acupoflyrics WordPress WXR export into clean JSON for the redesign.
Read-only on the source XML. Outputs to data/content/.
"""
import re, json, html, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "raw", "acupoflyrics-export.xml")
OUT = os.path.join(HERE, "content")
os.makedirs(OUT, exist_ok=True)

data = open(SRC, "r", encoding="utf-8").read()

def cdata(tag, blob):
    m = re.search(rf"<{tag}><!\[CDATA\[(.*?)\]\]></{tag}>", blob, re.S)
    return m.group(1) if m else ""

def plain(tag, blob):
    m = re.search(rf"<{tag}>(.*?)</{tag}>", blob, re.S)
    return m.group(1).strip() if m else ""

def meta(key, blob):
    pattern = (
        r"<wp:postmeta>.*?"
        rf"<wp:meta_key><!\[CDATA\[{re.escape(key)}\]\]></wp:meta_key>\s*"
        r"<wp:meta_value>(.*?)</wp:meta_value>.*?"
        r"</wp:postmeta>"
    )
    m = re.search(pattern, blob, re.S)
    if not m:
        return ""
    value = m.group(1)
    cm = re.match(r"<!\[CDATA\[(.*?)\]\]>", value, re.S)
    return html.unescape((cm.group(1) if cm else value).strip())

# ---- 1. Categories (these are mostly ARTISTS on this site) ----
categories = {}
for cat in re.findall(r"<wp:category>.*?</wp:category>", data, re.S):
    nicename = cdata("wp:category_nicename", cat)
    name = cdata("wp:cat_name", cat)
    tid = plain("wp:term_id", cat)
    thumb = None
    tm = re.search(r"csco_category_thumbnail\]\]></wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]>", cat)
    if tm:
        thumb = tm.group(1)
    categories[nicename] = {"id": tid, "name": html.unescape(name), "slug": nicename, "thumb_id": thumb}

# ---- 2. Attachments: id -> url ----
attach = {}
for it in re.findall(r"<item>.*?</item>", data, re.S):
    if "<![CDATA[attachment]]></wp:post_type>" not in it:
        continue
    pid = plain("wp:post_id", it)
    url = cdata("wp:attachment_url", it)
    if pid and url:
        attach[pid] = url

# ---- 3. Posts (the lyrics) ----
def extract_lyrics(content):
    """Pull out paragraph blocks, pairing original (bold) vs translation (plain)."""
    paras = re.findall(r"<p[^>]*>(.*?)</p>", content, re.S)
    blocks = []
    for p in paras:
        is_original = "<strong>" in p
        # normalise line breaks then strip tags
        txt = re.sub(r"<br\s*/?>", "\n", p)
        txt = re.sub(r"<[^>]+>", "", txt)
        txt = html.unescape(txt).strip()
        if not txt:
            continue
        lines = [l.strip() for l in txt.split("\n") if l.strip()]
        blocks.append({"original": is_original, "lines": lines})
    return blocks

posts = []
for it in re.findall(r"<item>.*?</item>", data, re.S):
    if "<![CDATA[post]]></wp:post_type>" not in it:
        continue
    if "<![CDATA[publish]]></wp:status>" not in it:
        continue
    title = html.unescape(cdata("title", it) or plain("title", it))
    link = plain("link", it)
    slug = ""
    sm = re.search(r"acupoflyrics\.com/([^/]+)/", link)
    if sm:
        slug = sm.group(1)
    if not slug:
        slug = cdata("wp:post_name", it)
    date = plain("pubDate", it)
    post_id = plain("wp:post_id", it)
    content = cdata("content:encoded", it)
    # categories on this post
    cats = re.findall(r'<category domain="category" nicename="([^"]+)">', it)
    cat_names = re.findall(r'<category domain="category" nicename="[^"]+"><!\[CDATA\[(.*?)\]\]></category>', it)
    # featured image
    img = None
    tm = re.search(r"_thumbnail_id\]\]></wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]>", it)
    if tm:
        img = attach.get(tm.group(1))
    # reading time
    rt = None
    rm = re.search(r"_powerkit_reading_time\]\]></wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]>", it)
    if rm:
        rt = int(rm.group(1))

    blocks = extract_lyrics(content)
    if not blocks:
        continue

    cnames = [html.unescape(c) for c in cat_names]
    # clean song title: drop the "Türkçe Çeviri" / "Turkce Ceviri" suffix
    clean = re.sub(r"\s*(T[üu]rk[çc]e\s+[ÇC]eviri)\s*$", "", title, flags=re.I).strip()
    # artist = the category whose name begins the title (longest match wins)
    artist = None
    for c in sorted(cnames, key=len, reverse=True):
        if clean.lower().startswith(c.lower()):
            artist = c
            break
    if not artist:
        artist = cnames[0] if cnames else "Unknown"
    # song = title with the artist prefix removed
    song = clean[len(artist):].strip(" -–—") if clean.lower().startswith(artist.lower()) else clean

    posts.append({
        "id": post_id,
        "title": title,
        "song": song or clean,
        "slug": slug,
        "date": date,
        "artist": artist,
        "categories": [html.unescape(c) for c in cat_names],
        "category_slugs": cats,
        "image": img,
        "reading_time": rt,
        "blocks": blocks,
        "excerpt": " ".join(blocks[0]["lines"][:2]) if blocks else "",
        "oldUrl": link,
        "seo": {
            "title": title,
            "description": meta("rank_math_description", it),
            "canonical": meta("rank_math_canonical_url", it) or f"https://acupoflyrics.com/{slug}/",
        },
        "youtubeUrl": meta("youtube_linki", it) or None,
    })

# sort newest first by post id (proxy) — keep as-is
posts.sort(key=lambda p: int(p["id"]), reverse=True)

# ---- Build artist index from categories actually used by posts ----
used_cat_slugs = Counter()
for p in posts:
    for c in p["category_slugs"]:
        used_cat_slugs[c] += 1

artists = []
for slug, count in used_cat_slugs.most_common():
    meta = categories.get(slug, {"name": slug, "slug": slug})
    img = attach.get(meta.get("thumb_id")) if meta.get("thumb_id") else None
    artists.append({
        "slug": slug,
        "name": meta.get("name", slug),
        "count": count,
        "image": img,
    })

# ---- Write outputs ----
json.dump(posts, open(os.path.join(OUT, "posts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(artists, open(os.path.join(OUT, "artists.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# summary
print("posts (published, with lyrics):", len(posts))
print("artists (categories used):", len(artists))
print("attachments mapped:", len(attach))
print("posts with featured image:", sum(1 for p in posts if p["image"]))
print("\nTop 15 artists by post count:")
for a in artists[:15]:
    print(f"  {a['name']:<28} {a['count']:>3}  img={'Y' if a['image'] else '-'}")
print("\nSample posts:")
for p in posts[:6]:
    print(f"  {p['title'][:45]:<46} | {p['artist'][:18]:<18} | img={'Y' if p['image'] else '-'} | blocks={len(p['blocks'])}")
