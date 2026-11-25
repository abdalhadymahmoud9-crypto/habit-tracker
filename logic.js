(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HabitLogic = factory();
})(this, function () {
  'use strict';
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dayKey(d); }
  function weekday(k) { return parseKey(k).getDay(); } // 0 = Sunday
  function validKey(k) { return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && dayKey(parseKey(k)) === k; }
  function isScheduled(h, k) { return h.days.indexOf(weekday(k)) >= 0; }
  function newHabit(name, icon, days, today, id) {
    var ds = (days && days.length ? days : [0, 1, 2, 3, 4, 5, 6]).filter(function (d, i, a) { return d >= 0 && d <= 6 && a.indexOf(d) === i; }).sort();
    return { id: id, name: String(name).trim().slice(0, 60), icon: icon || '✅', days: ds, created: today, done: {}, archived: false };
  }
  // Toggle a day. Future days and days before the habit existed are refused.
  function toggle(h, k, today) {
    if (!validKey(k) || k > today || k < h.created) return false;
    if (h.done[k]) delete h.done[k]; else h.done[k] = 1;
    return true;
  }
  // Current streak counts scheduled days only. Today not done yet does not break it (still pending).
  function currentStreak(h, today) {
    var n = 0, k = today;
    while (k >= h.created) {
      if (isScheduled(h, k)) {
        if (h.done[k]) n++;
        else if (k !== today) break;
      }
      k = addDays(k, -1);
    }
    return n;
  }
  function bestStreak(h, today) {
    var best = 0, run = 0, k = h.created;
    while (k <= today) {
      if (isScheduled(h, k)) {
        if (h.done[k]) { run++; if (run > best) best = run; }
        else if (k !== today) run = 0;
      }
      k = addDays(k, 1);
    }
    return best;
  }
  // Completion rate over the last n days (including today), scheduled days only, never before creation.
  function rate(h, today, n) {
    var sched = 0, done = 0, k = addDays(today, -(n - 1));
    if (k < h.created) k = h.created;
    for (; k <= today; k = addDays(k, 1)) {
      if (!isScheduled(h, k)) continue;
      sched++; if (h.done[k]) done++;
    }
    return { done: done, scheduled: sched, pct: sched ? Math.round(done / sched * 100) : null };
  }
  // Heatmap over all active habits: weeks x 7, weeks start Saturday. Each cell: level 0-4, or -1 for outside the range / future.
  function heatmap(habits, today, weeks) {
    var wd = (weekday(today) + 1) % 7; // Saturday = 0
    var start = addDays(today, -(wd + 7 * (weeks - 1)));
    var out = [];
    for (var w = 0; w < weeks; w++) {
      var col = [];
      for (var d = 0; d < 7; d++) {
        var k = addDays(start, w * 7 + d);
        if (k > today) { col.push({ key: k, level: -1, done: 0, total: 0 }); continue; }
        var total = 0, done = 0;
        habits.forEach(function (h) { if (!h.archived && k >= h.created && isScheduled(h, k)) { total++; if (h.done[k]) done++; } });
        var level = total === 0 ? 0 : done === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(done / total * 4)));
        col.push({ key: k, level: level, done: done, total: total });
      }
      out.push(col);
    }
    return out;
  }
  function validate(data) {
    if (!data || !Array.isArray(data.habits)) return null;
    var seen = {}, out = [];
    data.habits.forEach(function (h) {
      if (!h || typeof h.name !== 'string' || !h.name.trim() || !validKey(h.created) || !Array.isArray(h.days)) return;
      var id = typeof h.id === 'string' && h.id ? h.id : 'i' + out.length + Math.random().toString(36).slice(2, 6);
      if (seen[id]) return; seen[id] = 1;
      var done = {};
      Object.keys(h.done || {}).forEach(function (k) { if (validKey(k)) done[k] = 1; });
      out.push({ id: id, name: h.name.trim().slice(0, 60), icon: String(h.icon || '✅').slice(0, 4), days: h.days.filter(function (d) { return d >= 0 && d <= 6; }), created: h.created, done: done, archived: !!h.archived });
    });
    return { habits: out };
  }
  return { dayKey: dayKey, parseKey: parseKey, addDays: addDays, weekday: weekday, validKey: validKey, isScheduled: isScheduled, newHabit: newHabit,
           toggle: toggle, currentStreak: currentStreak, bestStreak: bestStreak, rate: rate, heatmap: heatmap, validate: validate };
});
