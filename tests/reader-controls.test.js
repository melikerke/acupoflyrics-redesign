import test from 'node:test';
import assert from 'node:assert/strict';
import { cardEntries, defaultCardSelection, sectionNavigation } from '../src/lib/readerControls.js';

const sections = labels => labels.map(label => ({ label, original: [], translation: [] }));
test('short songs hide navigation; repeated choruses point to the first original section', () => {
  assert.deepEqual(sectionNavigation(sections(['Intro', 'Verse 1', 'Chorus', 'Outro'])), []);
  const input = sections(['Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Pre-Chorus 2', 'Chorus 2', 'Chorus 3', 'Outro']);
  const original = structuredClone(input);
  const nav = sectionNavigation(input);
  assert.deepEqual(nav.map(item => item.label), ['Verse 1', 'Ön Nakarat', 'Nakarat', 'Verse 2', 'Outro']);
  assert.deepEqual(nav[2], { index: 2, indices: [2, 5, 6], label: 'Nakarat' });
  assert.deepEqual(input, original);
  assert.equal(sectionNavigation(input, 'en')[2].label, 'Chorus');
  assert.equal(sectionNavigation(input, 'es')[2].label, 'Estribillo');
});
test('bilingual cards retain independent line counts and select one line from each language', () => {
  const section = { original: ['source 1', '', 'source 2', 'source 3'], translation: ['translation 1'] };
  const languages = { original: 'en', translation: 'tr' };
  const entries = cardEntries(section, 'both', languages);
  assert.equal(entries.length, 4);
  assert.deepEqual(defaultCardSelection(entries, 'both'), [0, 3]);
  assert.deepEqual(cardEntries(section, 'tr', languages), [{ text: 'translation 1', language: 'tr' }]);
  assert.deepEqual(defaultCardSelection(entries, 'en'), [0, 1, 2]);
});
test('non-English originals and missing translations do not create phantom lines', () => {
  const entries = cardEntries({ original: ['원문'], translation: [] }, 'both', { original: 'ko', translation: 'tr' });
  assert.deepEqual(entries, [{ text: '원문', language: 'ko' }]);
  assert.deepEqual(defaultCardSelection(entries, 'both'), [0]);
});
