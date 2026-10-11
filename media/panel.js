(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const STATUS = {
    wait: 'Ждёт тебя', now: 'В работе', next: 'Дальше', todo: 'Не начато',
    later: 'Потом', done: 'Готово', cancelled: 'Отменено',
  };
  const FILTERS = [
    ['all', 'Все', () => true],
    ['wait', 'Ждёт тебя', (t) => t.status === 'wait'],
    ['work', 'В работе', (t) => t.status === 'now' || t.status === 'next'],
    ['done', 'Готово', (t) => closed(t)],
  ];
  const DONE_TOP = '__done';
  const app = document.getElementById('app');
  const open = new Set();
  let data = null, error = null, hidden = {}, seen = null, ui = {};

  function closed(t) { return t.status === 'done' || t.status === 'cancelled'; }
  function stamp(t) { return t.status + '|' + (t.changed || ''); }
  function save(key, value) { vscode.postMessage({ type: 'save', key, value }); }
  function setUi(patch) { ui = Object.assign({}, ui, patch); save('ui', ui); render(); }
  function toggle(id) {
    const c = Object.assign({}, ui.collapsed);
    if (c[id]) delete c[id]; else c[id] = true;
    setUi({ collapsed: c });
  }
  function allTasks() { return ((data && data.sections) || []).flatMap((s) => s.tasks || []); }
  function isHidden(t) { return closed(t) && hidden[t.id] === stamp(t); }
  function isNew(t) { return !!seen && seen[t.id] !== stamp(t); }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmtDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(s || '');
    return m ? m[3] + '.' + m[2] + (m[4] ? ' ' + m[4] : '') : (s || '');
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || m.type !== 'data') return;
    data = m.data || data;
    error = m.error;
    hidden = m.hidden || {};
    ui = m.ui || {};
    seen = m.seen;
    if (!seen && data) {
      seen = {};
      allTasks().forEach((t) => { seen[t.id] = stamp(t); });
      save('seen', seen);
    }
    render();
  });

  function render() {
    app.textContent = '';
    if (!data) { app.append(el('div', 'empty', error || 'Загрузка…')); return; }
    const tasks = allTasks();
    const filter = FILTERS.find((f) => f[0] === ui.filter) || FILTERS[0];
    const hideDone = !!ui.hideDone;
    const done = tasks.filter(closed).length;
    const fresh = tasks.filter(isNew);
    const hiddenCount = tasks.filter(isHidden).length;

    const head = el('header', 'head');
    const pct = tasks.length ? Math.round((done * 100) / tasks.length) : 0;
    const top = el('div', 'top');
    top.append(el('span', 'score', 'Готово ' + done + ' из ' + tasks.length), el('span', 'pct', pct + '%'));
    const bar = el('div', 'bar');
    const fill = el('div', 'fill');
    fill.style.width = pct + '%';
    bar.append(fill);
    head.append(top, bar);

    const chips = el('div', 'chips');
    for (const [key, label, test] of FILTERS) {
      const chip = el('button', 'chip f-' + key + (filter[0] === key ? ' on' : ''));
      chip.append(el('span', null, label), el('b', null, String(tasks.filter(test).length)));
      chip.onclick = () => setUi({ filter: key });
      chips.append(chip);
    }
    head.append(chips);

    const opts = el('div', 'opts');
    const sw = el('label', 'switch');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = hideDone;
    box.onchange = () => setUi({ hideDone: box.checked });
    sw.append(box, el('span', 'knob'), el('span', null, 'Скрывать готовые'));
    opts.append(sw);
    if (hiddenCount && !hideDone) {
      const back = el('button', 'link', 'Вернуть скрытые (' + hiddenCount + ')');
      back.onclick = () => { hidden = {}; save('hidden', hidden); render(); };
      opts.append(back);
    }
    head.append(opts);

    if (fresh.length) {
      const nb = el('div', 'newbar');
      const ok = el('button', 'link', 'Просмотрено');
      ok.onclick = () => { tasks.forEach((t) => { seen[t.id] = stamp(t); }); save('seen', seen); render(); };
      nb.append(el('span', null, '● Изменилось с прошлого раза: ' + fresh.length), ok);
      head.append(nb);
    }
    app.append(head);
    if (error) app.append(el('div', 'error', error));

    // Закрытые и не скрытые задачи поднимаются из своих разделов в общий блок наверху, свежие первыми.
    const pinTop = filter[0] === 'all' && !hideDone;
    const pinned = pinTop ? tasks.filter((t) => closed(t) && !isHidden(t)) : [];
    let shown = pinned.length;
    if (pinned.length) {
      pinned.sort((a, b) => (b.changed || '').localeCompare(a.changed || ''));
      const collapsed = !!(ui.collapsed && ui.collapsed[DONE_TOP]);
      const sec = el('section', 'sec sec-done' + (collapsed ? ' collapsed' : ''));
      const h = el('div', 'sec-head');
      const all = el('button', 'link', 'Скрыть все');
      all.onclick = (e) => {
        e.stopPropagation();
        pinned.forEach((t) => { hidden[t.id] = stamp(t); });
        save('hidden', hidden);
        render();
      };
      h.append(el('span', 'chev', '▾'), el('span', 'sec-title', 'Закрытые — просмотри и скрой · ' + pinned.length), all);
      h.title = collapsed ? 'Развернуть' : 'Свернуть';
      h.onclick = () => toggle(DONE_TOP);
      sec.append(h);
      if (!collapsed) pinned.forEach((t) => sec.append(row(t)));
      app.append(sec);
    }

    for (const s of data.sections || []) {
      const own = s.tasks || [];
      const list = own.filter((t) => filter[2](t) && !(pinTop && closed(t)) &&
        (filter[0] === 'done' || !(isHidden(t) || (hideDone && closed(t)))));
      if (!list.length) continue;
      shown += list.length;
      const sd = own.filter(closed).length;
      const collapsed = filter[0] === 'all' && !!(ui.collapsed && ui.collapsed[s.id]);
      const sec = el('section', 'sec' + (collapsed ? ' collapsed' : ''));
      const h = el('div', 'sec-head');
      const prog = el('span', 'sec-prog');
      const mini = el('span', 'mini');
      const mf = el('span', 'mini-fill');
      mf.style.width = (own.length ? (sd * 100) / own.length : 0) + '%';
      mini.append(mf);
      prog.append(mini, el('span', null, sd + '/' + own.length));
      h.append(el('span', 'chev', '▾'), el('span', 'sec-id', s.id), el('span', 'sec-title', s.title), prog);
      h.title = collapsed ? 'Развернуть' : 'Свернуть';
      h.onclick = () => toggle(s.id);
      sec.append(h);
      if (!collapsed) list.forEach((t) => sec.append(row(t)));
      app.append(sec);
    }
    if (!shown) app.append(el('div', 'empty', 'Здесь пусто'));
    if (data.updated) app.append(el('footer', 'foot', 'Файл обновлён ' + fmtDate(data.updated) + (data.by ? ' · ' + data.by : '')));
  }

  function row(t) {
    const isOpen = open.has(t.id);
    const r = el('div', 'task st-' + t.status + (isNew(t) ? ' fresh' : '') + (isHidden(t) ? ' was-hidden' : '') +
      (t.details && !isOpen ? ' has-more' : ''));
    const l1 = el('div', 'l1');
    l1.append(el('span', 'tid', t.id), el('span', 'title', t.title));
    if (closed(t)) {
      const b = el('button', 'hide', isHidden(t) ? 'Вернуть' : 'Скрыть');
      b.title = isHidden(t) ? 'Снова показывать в списке' : 'Убрать из списка (только у тебя)';
      b.onclick = (e) => {
        e.stopPropagation();
        if (isHidden(t)) delete hidden[t.id]; else hidden[t.id] = stamp(t);
        save('hidden', hidden);
        render();
      };
      l1.append(b);
    }
    const l2 = el('div', 'l2');
    l2.append(el('span', 'pill', STATUS[t.status] || t.status));
    if (t.note) l2.append(el('span', 'note', t.note));
    r.append(l1, l2);
    if (isOpen) {
      if (t.details) r.append(el('div', 'details', t.details));
      const meta = [t.changed && 'изменено ' + fmtDate(t.changed), t.by].filter(Boolean).join(' · ');
      if (meta) r.append(el('div', 'meta', meta));
    }
    r.onclick = () => {
      if (isOpen) open.delete(t.id); else open.add(t.id);
      if (isNew(t)) { seen[t.id] = stamp(t); save('seen', seen); }
      render();
    };
    return r;
  }

  vscode.postMessage({ type: 'ready' });
})();
