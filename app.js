(function () {
  'use strict';
  var L = window.HabitLogic, KEY = 'habit-tracker-v1';
  var $ = function (id) { return document.getElementById(id); };
  var DAYN = ['أحد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة', 'سبت'], ORDER = [6, 0, 1, 2, 3, 4, 5];
  var ICONS = ['📖', '💧', '🏃', '🧘', '🕌', '💪', '😴', '🥗', '✍️', '💻', '🎯', '🌱'];
  var state = load(), editing = null, icon = ICONS[0], chosenDays = [0, 1, 2, 3, 4, 5, 6];
  var today = function () { return L.dayKey(new Date()); };

  function load() {
    try { var v = L.validate(JSON.parse(localStorage.getItem(KEY))); if (v) return v; } catch (e) {}
    return { habits: [] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function active() { return state.habits.filter(function (h) { return !h.archived; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function tab(name) {
    ['today', 'stats', 'manage'].forEach(function (k) { $('pane-' + k).hidden = k !== name; $('tab-' + k).classList.toggle('on', k === name); });
    if (name === 'stats') renderStats();
  }
  ['today', 'stats', 'manage'].forEach(function (k) { $('tab-' + k).onclick = function () { tab(k); }; });
  $('go-add').onclick = function () { tab('manage'); $('f-name').focus(); };

  function renderTop() {
    var t = today(), hs = active().filter(function (h) { return L.isScheduled(h, t); });
    var done = hs.filter(function (h) { return h.done[t]; }).length;
    $('s-today').textContent = done + '/' + hs.length;
    var best = 0, sch = 0, dn = 0;
    active().forEach(function (h) { best = Math.max(best, L.currentStreak(h, t)); var r = L.rate(h, t, 7); sch += r.scheduled; dn += r.done; });
    $('s-best').textContent = best;
    $('s-week').textContent = sch ? Math.round(dn / sch * 100) + '%' : '–';
  }

  function renderToday() {
    var t = today(), box = $('today-list'); box.innerHTML = '';
    var hs = active(), due = hs.filter(function (h) { return L.isScheduled(h, t); }), rest = hs.filter(function (h) { return !L.isScheduled(h, t); });
    $('today-empty').hidden = hs.length > 0;
    due.concat(rest).forEach(function (h) {
      var sched = L.isScheduled(h, t);
      var row = el('div', 'habit' + (h.done[t] ? ' done' : ''));
      var chk = el('button', 'chk', h.done[t] ? '✓' : h.icon); chk.setAttribute('aria-pressed', h.done[t] ? 'true' : 'false'); chk.setAttribute('aria-label', 'علّم ' + h.name + ' النهارده');
      chk.onclick = function () { L.toggle(h, t, t); save(); renderAll(); };
      var mid = el('div'); var name = el('h3', '', h.name); mid.appendChild(name);
      mid.appendChild(el('small', '', sched ? 'مطلوبة النهارده' : 'مش من أيامها النهارده (ممكن تعلّمها برضه)'));
      var dots = el('div', 'dots');
      for (var i = 6; i >= 0; i--) (function (i) {
        var k = L.addDays(t, -i), b = el('button', 'dot' + (h.done[k] ? ' on' : '') + (i === 0 ? ' today' : '') + (!L.isScheduled(h, k) ? ' off' : ''), DAYN[L.weekday(k)].charAt(0));
        b.setAttribute('aria-label', DAYN[L.weekday(k)] + ' ' + k + (h.done[k] ? ' تمّت' : ''));
        b.title = k; b.disabled = k < h.created;
        b.onclick = function () { L.toggle(h, k, t); save(); renderAll(); };
        dots.appendChild(b);
      })(i);
      mid.appendChild(dots);
      var st = el('div', 'streak'); st.appendChild(el('b', '', '🔥 ' + L.currentStreak(h, t))); st.appendChild(el('span', '', 'يوم متتالي · أفضل ' + L.bestStreak(h, t)));
      row.appendChild(chk); row.appendChild(mid); row.appendChild(st); box.appendChild(row);
    });
    $('today-hint').textContent = hs.length ? 'الدواير الصغيرة هي آخر ٧ أيام. تقدر تعدّل أي يوم فات لو نسيت تعلّمه.' : '';
  }

  function renderStats() {
    var t = today(), hs = active(), hm = L.heatmap(hs, t, 16), heat = $('heat'); heat.innerHTML = '';
    hm.forEach(function (col) {
      var c = el('div', 'col');
      col.forEach(function (d) { var x = el('i', 'cell'); x.dataset.l = d.level; if (d.level >= 0) x.title = d.key + ': ' + d.done + '/' + d.total; c.appendChild(x); });
      heat.appendChild(c);
    });
    $('heat-note').textContent = hs.length ? 'كل مربع يوم. اللون أغمق = نسبة أعلى من عاداتك المطلوبة اتعملت.' : 'أضف عادة عشان الخريطة تبدأ تتلوّن.';
    var ph = $('per-habit'); ph.innerHTML = '<h2 style="margin-top:0;font-size:1.1rem">كل عادة</h2>';
    if (!hs.length) ph.appendChild(el('p', 'muted', 'مفيش عادات لسه.'));
    hs.forEach(function (h) {
      var r7 = L.rate(h, t, 7), r30 = L.rate(h, t, 30), s = el('div', 'hstat'), top = el('div', 'top');
      top.appendChild(el('b', '', h.icon + ' ' + h.name));
      top.appendChild(el('span', 'muted', 'حالياً ' + L.currentStreak(h, t) + ' · أفضل ' + L.bestStreak(h, t) + ' · إجمالي ' + Object.keys(h.done).length));
      s.appendChild(top);
      [['٧ أيام', r7], ['٣٠ يوم', r30]].forEach(function (p) {
        var line = el('div', 'row'); line.appendChild(el('span', 'hint', p[0] + ': ' + (p[1].pct === null ? '–' : p[1].pct + '% (' + p[1].done + ' من ' + p[1].scheduled + ')')));
        s.appendChild(line); var bar = el('div', 'bar'), i = el('i'); i.style.width = (p[1].pct || 0) + '%'; bar.appendChild(i); s.appendChild(bar);
      });
      ph.appendChild(s);
    });
  }

  function renderManage() {
    var box = $('manage-list'); box.innerHTML = '';
    if (!state.habits.length) box.appendChild(el('p', 'muted', 'مفيش عادات.'));
    state.habits.forEach(function (h) {
      var r = el('div', 'hstat row'); r.style.justifyContent = 'space-between';
      var d = el('span', '', h.icon + ' ' + h.name + (h.archived ? ' (مخفية)' : '')); r.appendChild(d);
      var acts = el('span', 'row'), e = el('button', '', 'تعديل'), a = el('button', '', h.archived ? 'رجّعها' : 'إخفاء'), x = el('button', 'danger', 'حذف');
      e.setAttribute('aria-label', 'تعديل ' + h.name); a.setAttribute('aria-label', (h.archived ? 'رجّع ' : 'إخفاء ') + h.name); x.setAttribute('aria-label', 'حذف ' + h.name);
      e.onclick = function () { startEdit(h); };
      a.onclick = function () { h.archived = !h.archived; save(); renderAll(); };
      x.onclick = function () { if (confirm('تحذف "' + h.name + '" وكل سجلّها نهائي؟')) { state.habits = state.habits.filter(function (y) { return y !== h; }); save(); if (editing === h.id) resetForm(); renderAll(); } };
      acts.appendChild(e); acts.appendChild(a); acts.appendChild(x); r.appendChild(acts); box.appendChild(r);
    });
  }

  function drawForm() {
    var ib = $('icons'); ib.innerHTML = '';
    ICONS.forEach(function (ic) { var b = el('button', ic === icon ? 'on' : '', ic); b.type = 'button'; b.setAttribute('aria-label', 'أيقونة ' + ic); b.onclick = function () { icon = ic; drawForm(); }; ib.appendChild(b); });
    var db = $('days'); db.innerHTML = '';
    ORDER.forEach(function (d) {
      var lb = el('label'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = chosenDays.indexOf(d) >= 0;
      cb.onchange = function () { chosenDays = cb.checked ? chosenDays.concat([d]) : chosenDays.filter(function (x) { return x !== d; }); };
      lb.appendChild(cb); lb.appendChild(el('span', '', DAYN[d])); db.appendChild(lb);
    });
  }
  function resetForm() { editing = null; $('f-name').value = ''; icon = ICONS[0]; chosenDays = [0, 1, 2, 3, 4, 5, 6]; $('form-title').textContent = 'عادة جديدة'; $('cancel').hidden = true; drawForm(); }
  function startEdit(h) { editing = h.id; $('f-name').value = h.name; icon = h.icon; chosenDays = h.days.slice(); $('form-title').textContent = 'تعديل العادة'; $('cancel').hidden = false; drawForm(); $('f-name').focus(); }
  $('cancel').onclick = function () { resetForm(); $('form-msg').textContent = ''; };
  $('save').onclick = function () {
    var name = $('f-name').value.trim();
    if (!name) { $('form-msg').textContent = 'اكتب اسم العادة الأول.'; return; }
    if (!chosenDays.length) { $('form-msg').textContent = 'اختار يوم واحد على الأقل.'; return; }
    var dup = state.habits.some(function (h) { return h.id !== editing && h.name === name; });
    if (dup) { $('form-msg').textContent = 'العادة دي موجودة قبل كده.'; return; }
    if (editing) {
      var h = state.habits.filter(function (x) { return x.id === editing; })[0];
      if (h) { h.name = name.slice(0, 60); h.icon = icon; h.days = chosenDays.slice().sort(); }
      $('form-msg').textContent = 'اتحفظ التعديل ✓';
    } else {
      state.habits.push(L.newHabit(name, icon, chosenDays, today(), 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)));
      $('form-msg').textContent = 'اتضافت ✓';
    }
    save(); resetForm(); renderAll();
  };
  $('f-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('save').click(); });

  $('export').onclick = function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }));
    a.download = 'habits-' + today() + '.json'; a.click(); $('bk-msg').textContent = 'اتصدّر.';
  };
  var pending = null;
  $('file').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () { try { pending = L.validate(JSON.parse(String(r.result))); } catch (x) { pending = null; } $('bk-msg').textContent = pending ? 'الملف سليم: ' + pending.habits.length + ' عادة. دوس استيراد.' : 'الملف مش صالح.'; };
    r.readAsText(f, 'utf-8');
  };
  $('import').onclick = function () {
    if (!pending) { $('bk-msg').textContent = 'اختار ملف صالح الأول.'; return; }
    if (!confirm('ده هيستبدل كل عاداتك الحالية بالملف. متأكد؟')) return;
    state = pending; pending = null; save(); resetForm(); renderAll(); $('bk-msg').textContent = 'اتستورد.';
  };

  function renderAll() { renderTop(); renderToday(); renderManage(); if (!$('pane-stats').hidden) renderStats(); }
  drawForm(); renderAll();
  // keep "today" correct if the tab stays open past midnight
  var last = today(); setInterval(function () { if (today() !== last) { last = today(); renderAll(); } }, 60000);
})();
