import assert from 'node:assert/strict';
import test from 'node:test';
import { getTeachingTraversal, getKeySpellings } from '../lib/music-model.mjs';
import { compareKeys, notePitchClass } from '../lib/lesson-model.mjs';

test('each neighboring circle position changes exactly one physical scale pitch', () => {
  for (const orientation of ['fourths', 'fifths']) {
    const keys = getTeachingTraversal(orientation);
    for (let i = 0; i < keys.length; i++) {
      const a = keys[i], b = keys[(i + 1) % keys.length];
      assert.equal(a.scalePitchClasses.filter(pc => !b.scalePitchClasses.includes(pc)).length, 1);
      const changes = compareKeys(a, b).changes;
      assert.ok(changes.length > 0);
      assert.ok(changes.every(({from,to}) => from[0] === to[0]));
    }
  }
});
test('C to F explains B becoming B flat, and reversing restores B natural', () => {
  const [c,f] = getTeachingTraversal();
  assert.deepEqual(compareKeys(c,f).changes, [{from:'B',to:'B♭'}]);
  assert.deepEqual(compareKeys(f,c).changes, [{from:'B♭',to:'B'}]);
});
test('enharmonic comparisons preserve all pitches while changing seven written names', () => {
  for (const id of ['db','gb-fs','b']) {
    const [a,b] = getKeySpellings(id);
    const comparison = compareKeys(a,b);
    assert.equal(comparison.samePitches, true);
    assert.equal(comparison.changes.length, 7);
  }
  assert.equal(notePitchClass('C♭'), 11);
  assert.equal(notePitchClass('B♯'), 0);
  assert.equal(notePitchClass('E♯'), 5);
  assert.equal(notePitchClass('F♭'), 4);
});
