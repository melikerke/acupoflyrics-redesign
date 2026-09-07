"""Verify the Turkish optimization preserves Inter's complete effective coverage.

Requires fonttools[woff]. No network access or site data changes.
"""

import hashlib
import re
from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "public/fonts"
TURKISH = {0x011E, 0x011F, 0x0130, 0x015E, 0x015F}
ORIGINAL_EXT_RANGE = """U+0100-02BA, U+02BD-02C5, U+02C7-02CC,
U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF,
U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0,
U+2113, U+2C60-2C7F, U+A720-A7FF"""


def codepoints(value):
    result = set()
    for start, end in re.findall(r"U\+([0-9A-F]+)(?:-([0-9A-F]+))?", value):
        result.update(range(int(start, 16), int(end or start, 16) + 1))
    return result


def face_for(cp, faces):
    # CSS font-face rules have reverse source order priority for overlaps.
    return next(face for face in reversed(faces) if cp in face["effective"])


faces = []
html = (ROOT / "index.html").read_text()
for rule in re.findall(r"@font-face\s*\{([^}]+)\}", html):
    if not re.search(r"font-family:\s*['\"]Inter['\"]", rule):
        continue
    filename = re.search(r"src:\s*url\(/fonts/([^\)]+)\)", rule).group(1)
    path = FONT_DIR / filename
    # Content-addressed names detect any accidental edits to original fonts.
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:8]
    assert filename.endswith(f"-{digest}.woff2"), filename
    font = TTFont(path)
    ranges = codepoints(re.search(r"unicode-range:([^;]+);", rule).group(1))
    cmap = font.getBestCmap()
    faces.append({"name": filename, "font": font, "range": ranges,
                  "cmap": cmap, "effective": ranges & cmap.keys()})

extension = next(face for face in faces if "-latin-ext-" in face["name"])
turkish = next(face for face in faces if "-turkish-" in face["name"])
latin = next(face for face in faces if "-latin-" in face["name"] and "-ext-" not in face["name"])
assert extension["name"] == "inter-normal-latin-ext-a28eb6d3.woff2"
assert latin["name"] == "inter-normal-latin-c9407645.woff2"
assert turkish["range"] == set(turkish["cmap"]) == TURKISH
assert extension["range"] == codepoints(ORIGINAL_EXT_RANGE) - TURKISH
assert not extension["range"] & TURKISH

before = set()
after = set()
for face in faces:
    after.update(face["effective"])
    if face is turkish:
        continue
    before.update((codepoints(ORIGINAL_EXT_RANGE) & face["cmap"].keys())
                  if face is extension else face["effective"])
assert before == after, {"lost": before - after, "added": after - before}

turkish_text = "ĞğİıŞşÇçÖöÜü"
international_text = "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉČčĎďĐđĚěŁłŃńŇňŐőŒœŘřŚśŠšŤťŰűŸŹźŻżŽž"
assert set(map(ord, turkish_text + international_text)) <= after
assert all(face_for(cp, faces) is turkish for cp in TURKISH)
assert all(face_for(ord(char), faces) is latin for char in "ıÇçÖöÜü")

def outline(face, cp, weight):
    glyphs = face["font"].getGlyphSet(location={"wght": weight})
    pen = DecomposingRecordingPen(glyphs)
    glyphs[face["cmap"][cp]].draw(pen)
    return pen.value


for weight in (400, 500, 600):
    for cp in TURKISH:
        assert outline(extension, cp, weight) == outline(turkish, cp, weight), (cp, weight)

original_bytes = (FONT_DIR / extension["name"]).stat().st_size
subset_bytes = (FONT_DIR / turkish["name"]).stat().st_size
assert original_bytes - subset_bytes >= 50_000
print(f"PASS: {len(before)} original/current Inter code points match; Turkish and "
      f"international sample coverage; 15 variable glyph outline comparisons; font hashes.")
print(f"Turkish-only extended Latin request: {original_bytes:,} → {subset_bytes:,} bytes; "
      f"{original_bytes - subset_bytes:,} bytes saved.")
