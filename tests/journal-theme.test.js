import test from 'node:test';
import assert from 'node:assert/strict';
import { journalThemeFromColor } from '../src/lib/journalTheme.js';

const luminance = channels => channels.map(value => {
  const s = value / 255;
  return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
}).reduce((total, value, i) => total + value * [.2126, .7152, .0722][i], 0);

test('journal stays white while accents follow each cover', () => {
  const covers = [[150,117,87], [20,90,210], [255,255,255], [0,0,0], [230,20,90], [0,255,0]];
  for (const cover of covers) {
    const theme = journalThemeFromColor(cover);
    assert.equal(theme.dark, false);
    assert.equal(theme.vars['--acl-bg'], '#ffffff');
    assert.equal(theme.vars['--acl-bg-soft'], '#ffffff');
    const ink = theme.vars['--acl-accent'].match(/\d+/g).map(Number);
    assert.ok(1.05 / (luminance(ink) + .05) >= 4.5, `contrast: ${cover}`);
  }
  assert.notEqual(journalThemeFromColor(covers[0]).vars['--acl-glow'], journalThemeFromColor(covers[1]).vars['--acl-glow']);
});

test('missing or invalid cover colours have a stable fallback', () => {
  assert.deepEqual(journalThemeFromColor(null), journalThemeFromColor([150,117,87]));
  assert.deepEqual(journalThemeFromColor([NaN,1,2]), journalThemeFromColor(null));
});
