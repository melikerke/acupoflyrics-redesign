import test from 'node:test';
import assert from 'node:assert/strict';
import { isoDate, publicationDate, readablePublicationDate, translationSchema } from '../src/lib/songPublication.js';
import { relatedSongs } from '../src/lib/relatedSongs.js';

test('legacy and ISO publication dates normalize consistently', () => {
  assert.equal(isoDate('Wed, 04 Sep 2024 12:08:16 +0000'), '2024-09-04T12:08:16.000Z');
  assert.equal(readablePublicationDate('Wed, 04 Sep 2024 12:08:16 +0000'), '4 Eylül 2024');
  assert.equal(readablePublicationDate('2026-10-16T12:00:00.000Z'), '16 Ekim 2026');
  assert.equal(isoDate('invalid'), undefined);
  assert.equal(publicationDate({ updatedAt: 'invalid', date: '2024-09-04' }), '2024-09-04T00:00:00.000Z');
  const schema = translationSchema({ date: 'Wed, 04 Sep 2024 12:08:16 +0000', artist: 'LP', song: 'Lost on You' }, 'https://example.com/song/');
  assert.equal(schema.datePublished, '2024-09-04T12:08:16.000Z');
  assert.equal(schema.author.name, 'Melike Erke');
});

test('recommendations require a match and are independent of newest-first order', () => {
  const source = { slug: 'source', artist: 'LP', moods: ['Sad'], spotify: { artistGenres: ['indie pop'] } };
  const list = [source, { slug: 'new', artist: 'Other', moods: ['Party'] }, { slug: 'sad', artist: 'Other', moods: ['Sad'] }, { slug: 'lp', artist: 'LP' }, { slug: 'genre', artist: 'Other', spotify: { artistGenres: ['indie pop'] } }];
  assert.deepEqual(relatedSongs(source, list).map(p => p.slug), ['genre']);
  assert.deepEqual(relatedSongs(source, [...list].reverse()), relatedSongs(source, list));
  assert.deepEqual(relatedSongs(source, [list[1]]), []);
});
