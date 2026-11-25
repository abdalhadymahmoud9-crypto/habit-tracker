const test = require('node:test'), assert = require('node:assert');
const L = require('./logic.js');
const ALL = [0,1,2,3,4,5,6];
function mk(created, doneKeys, days) { const h = L.newHabit('x', '✅', days || ALL, created, 'h1'); doneKeys.forEach(k => h.done[k] = 1); return h; }

test('addDays and weekday cross month/year and DST safely', () => {
  assert.strictEqual(L.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(L.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(L.addDays('2026-10-30', 1), '2026-10-31');
  assert.strictEqual(L.weekday('2026-11-25'), 3); // Wednesday
});
test('current streak: today pending does not break it', () => {
  const h = mk('2026-11-01', ['2026-11-23', '2026-11-24']);
  assert.strictEqual(L.currentStreak(h, '2026-11-25'), 2);
  h.done['2026-11-25'] = 1;
  assert.strictEqual(L.currentStreak(h, '2026-11-25'), 3);
});
test('current streak breaks on a missed past scheduled day', () => {
  const h = mk('2026-11-01', ['2026-11-22', '2026-11-24', '2026-11-25']);
  assert.strictEqual(L.currentStreak(h, '2026-11-25'), 2);
});
test('non-scheduled days are skipped, not counted', () => {
  // Sat(6) Sun(0) Mon(1) only. 2026-11-21 Sat, 22 Sun, 23 Mon, 24 Tue(off), 25 Wed(off)
  const h = mk('2026-11-01', ['2026-11-21', '2026-11-22', '2026-11-23'], [6, 0, 1]);
  assert.strictEqual(L.currentStreak(h, '2026-11-25'), 3);
});
test('streak never reaches before creation', () => {
  const h = mk('2026-11-24', ['2026-11-24', '2026-11-25']);
  assert.strictEqual(L.currentStreak(h, '2026-11-25'), 2);
});
test('best streak', () => {
  const h = mk('2026-11-01', ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-06', '2026-11-07']);
  assert.strictEqual(L.bestStreak(h, '2026-11-25'), 3);
});
test('rate counts scheduled days only and is null when nothing scheduled', () => {
  const h = mk('2026-11-01', ['2026-11-24', '2026-11-25']);
  assert.deepStrictEqual(L.rate(h, '2026-11-25', 7), { done: 2, scheduled: 7, pct: 29 });
  const fresh = mk('2026-11-25', []);
  assert.deepStrictEqual(L.rate(fresh, '2026-11-25', 30), { done: 0, scheduled: 1, pct: 0 });
  const off = mk('2026-11-25', [], [0]);
  assert.strictEqual(L.rate(off, '2026-11-25', 30).pct, null);
});
test('toggle refuses future and pre-creation days, and flips', () => {
  const h = mk('2026-11-10', []);
  assert.ok(!L.toggle(h, '2026-11-26', '2026-11-25'));
  assert.ok(!L.toggle(h, '2026-11-09', '2026-11-25'));
  assert.ok(!L.toggle(h, 'garbage', '2026-11-25'));
  assert.ok(L.toggle(h, '2026-11-25', '2026-11-25')); assert.ok(h.done['2026-11-25']);
  assert.ok(L.toggle(h, '2026-11-25', '2026-11-25')); assert.ok(!h.done['2026-11-25']);
});
test('heatmap shape, saturday start, future cells are -1, levels follow completion', () => {
  const a = mk('2026-10-01', ['2026-11-25']), b = mk('2026-10-01', []); b.id = 'h2';
  const hm = L.heatmap([a, b], '2026-11-25', 4);
  assert.strictEqual(hm.length, 4); assert.ok(hm.every(c => c.length === 7));
  const last = hm[3]; // week starts Sat 2026-11-21; Wed is index 4
  assert.strictEqual(last[0].key, '2026-11-21'); assert.strictEqual(last[4].key, '2026-11-25');
  assert.strictEqual(last[4].level, 2); // 1 of 2 => ceil(0.5*4)=2
  assert.strictEqual(last[5].level, -1);
});
test('heatmap ignores archived habits', () => {
  const a = mk('2026-10-01', ['2026-11-25']); a.archived = true;
  const hm = L.heatmap([a], '2026-11-25', 2);
  assert.strictEqual(hm[1][4].total, 0);
});
test('validate rejects junk and keeps good habits', () => {
  assert.strictEqual(L.validate(null), null);
  assert.strictEqual(L.validate({ habits: 3 }), null);
  const v = L.validate({ habits: [{ name: ' قراءة ', created: '2026-11-01', days: [1, 9], done: { '2026-11-02': 1, 'bad': 1 } }, { name: '', created: '2026-11-01', days: [] }, { name: 'x', created: '2026-13-40', days: [] }] });
  assert.strictEqual(v.habits.length, 1);
  assert.deepStrictEqual(v.habits[0].days, [1]); assert.deepStrictEqual(Object.keys(v.habits[0].done), ['2026-11-02']);
  assert.strictEqual(v.habits[0].name, 'قراءة');
});
