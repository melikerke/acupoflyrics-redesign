import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('song headings omit duplicate artist credit without changing the lyric reader', async () => {
  const detail = await readFile('src/pages/LyricDetail.jsx', 'utf8');
  const css = await readFile('src/detailChrome.css', 'utf8');
  assert.match(detail, /<h1 className="font-serif">\{post.song\}<\/h1>/);
  assert.match(detail, /<ArtistLinks artists=\{artistLinks\}/);
  assert.match(detail, /<SongInfoDisclosure title=\{ui.songInfo\}>/);
  assert.doesNotMatch(css, /\.detail-(reader|section-(copy|col|original|translation)|language)/);
});

test('initial HTML uses the same song-only heading and preserves artist credit', async () => {
  const html = await readFile('dist/lp-lost-on-you-turkce-ceviri/index.html', 'utf8');
  assert.match(html, /<h1>Lost on You<\/h1>/);
  assert.match(html, /LP/);
});
