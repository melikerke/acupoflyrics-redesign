# Local fonts

Fraunces (normal and italic, weight range 300–500, optical sizing) and Inter
(normal, weight range 400–600) are served locally. The `@font-face` declarations
in `index.html` preserve Google Fonts' overall Unicode coverage, so a browser downloads
only the subsets it needs. Font filenames contain a SHA-256 content hash.

Source: the official Google Fonts CSS API and fonts.gstatic.com, retrieved
7 September 2026. The language subsets preserve Latin, extended Latin and
Vietnamese; Inter also retains its Greek and Cyrillic subsets.

Both families are distributed under the SIL Open Font License. Full license
and copyright notices are included in `fraunces-OFL.txt` and `inter-OFL.txt`,
from the corresponding `ofl/` directories of https://github.com/google/fonts.

No external font stylesheet is needed during page loading. Avoid preloading
every subset: those requests would compete with the main page image.

## Turkish Inter subset

On 7 September 2026, `inter-normal-turkish-37f7eb72.woff2` was derived from
the unchanged `inter-normal-latin-ext-a28eb6d3.woff2` using fontTools 4.64.0
with WOFF2/Brotli support. It contains only U+011E, U+011F, U+0130, U+015E,
and U+015F (ĞğİŞş), including their composite dependencies and original
variable weight data. All name/license records and layout features were
retained during subsetting; `inter-OFL.txt` still applies.

Only these five code points were removed from the original Latin-ext CSS
range and assigned to the new file. The original Latin-ext file is retained
byte for byte for other languages. Dotless ı, Çç, Öö and Üü keep using the
existing Latin face. The total effective Unicode coverage is unchanged.

The new file is **3,096 bytes**, replacing an **85,272-byte** request when
extended Latin is needed only for these Turkish characters: **82,176 bytes
(96.4%) less font payload**. Pages containing other extended Latin characters
still request the original file as needed; their coverage is preserved.

Reproduction (fontTools 4.64.0 with `woff` extras):

```sh
pyftsubset public/fonts/inter-normal-latin-ext-a28eb6d3.woff2 \
  --unicodes=U+011E,U+011F,U+0130,U+015E,U+015F \
  --flavor=woff2 --glyph-names --name-IDs='*' --name-legacy \
  --name-languages='*' --layout-features='*' \
  --output-file=/tmp/inter-normal-turkish.woff2
python3 scripts/testFontCoverage.py
```

The coverage test checks original-versus-current CSS/cmap coverage for all
Inter subsets, Turkish and international accented text, unchanged original
font hashes, and the five glyph outlines at weights 400, 500 and 600.
