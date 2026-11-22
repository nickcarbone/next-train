/* NEXT TRAIN — app shell: station picker, polling, badge, HUD, auto-roam, arrival chime. */
(function () {
  const U = window.CU, R = window.Renderers;
  const ST = window.NT_STATIONS;
  const SKEY = 'nexttrain.settings';
  const DEFAULTS = { station: 'TSQ', roam: 0, sound: false, wmataKey: '', tflKey: '' };
  const S = window.NT_SETTINGS = Object.assign({}, DEFAULTS, U.load(SKEY, {}));
  const persist = () => U.save(SKEY, S);
  const POLL = { mta: 30e3, transitous: 60e3, tfl: 30e3, sl: 30e3, mtr: 30e3 };

  const board = document.getElementById('board');
  const badge = document.getElementById('badge');
  const sel = document.getElementById('stationSelect');
  let st = null, rows = [], extra = {}, meta = null, pollTimer = null, gen = 0, fails = 0;

  /* ── Station picker, grouped by city ─────────────────────────────────── */
  const byCity = {};
  ST.forEach(s => (byCity[s.city] = byCity[s.city] || []).push(s));
  sel.innerHTML = Object.entries(byCity).map(([c, ss]) => `<optgroup label="${U.esc(c)}">${ss.map(s => `<option value="${s.id}">${U.esc(s.name)}</option>`).join('')}</optgroup>`).join('');
  sel.addEventListener('change', () => select(sel.value));

  function select(id, opts = {}) {
    const next = ST.find(s => s.id === id) || ST[0];
    const my = ++gen;
    clearTimeout(pollTimer);
    board.classList.add('swap');
    setTimeout(() => {
      if (my !== gen) return;
      st = next; rows = []; extra = {}; meta = null; fails = 0; announced.clear();
      S.station = st.id; persist();
      sel.value = st.id;
      if (location.hash.slice(1).toUpperCase() !== st.id) history.replaceState(null, '', '#' + st.id);
      document.body.dataset.theme = st.theme;
      document.title = `${st.name} · Next Train`;
      R.build(board, st);
      R.tickClock(board.querySelector('.nt-clock'), st, new Date());
      setBadge('loading', 'CONNECTING…');
      board.classList.remove('swap');
      poll(my);
    }, opts.instant ? 0 : 400);
  }

  /* ── Polling ─────────────────────────────────────────────────────────── */
  async function poll(my) {
    if (my !== gen) return;
    const s = st;
    let delay = POLL[s.source.type] || 60e3;
    try {
      const res = await window.Sources.fetchStation(s);
      if (my !== gen) return;
      if (board.classList.contains('nt-notice-mode')) R.build(board, s);
      rows = res.rows; extra = { alerts: res.alerts || [], delayed: !!res.delayed }; meta = res.meta; fails = 0;
      board.classList.remove('nt-notice-mode');
      render();
      setBadge('live', `LIVE · ${meta.source}${meta.partial ? ' (some lines missing)' : ''}`, meta.url);
    } catch (e) {
      if (my !== gen) return;
      fails++;
      console.warn('[next-train]', s.id, e.message);
      /* Ride out one failed poll on the last good data; after that, say so plainly. */
      if (!rows.length || fails > 1 || e.empty) {
        rows = []; meta = null;
        R.disruption(board, s);
        board.classList.add('nt-notice-mode');
        R.tickClock(board.querySelector('.nt-clock'), s, new Date());
        setBadge('nofeed', e.empty ? 'NO LIVE TRAINS' : 'NO FEED');
      }
      delay = Math.min(30e3 * fails, 180e3);
    }
    pollTimer = setTimeout(() => poll(my), delay);
  }

  function render() {
    if (!st || !meta) return;
    const now = Date.now();
    const visible = rows.filter(r => (r.dep || r.t) > now - 20e3);
    R.update(board, st, visible, extra);
    chime(visible, now);
  }

  /* ── Arrival chime: an original two-note figure when a train is about to arrive ── */
  const announced = new Set();
  let actx = null, lastChime = 0;
  function chime(list, now) {
    const due = list.filter(r => r.t - now < 45e3 && r.t - now > -15e3);
    const fresh = due.filter(r => !announced.has(r.screen + r.line + r.t));
    due.forEach(r => announced.add(r.screen + r.line + r.t));
    if (!S.sound || !fresh.length || now - lastChime < 40e3 || !actx) return;
    lastChime = now;
    const notes = st.theme === 'dc' ? [523.25, 392] : [659.25, 523.25];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.42;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.18, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 1.2);
    });
  }
  const soundBtn = document.getElementById('soundBtn');
  function syncSound() { soundBtn.textContent = S.sound ? '🔔 Chime on' : '🔕 Chime off'; soundBtn.setAttribute('aria-pressed', String(S.sound)); }
  soundBtn.addEventListener('click', () => {
    S.sound = !S.sound; persist(); syncSound();
    if (S.sound && !actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } }
    if (S.sound) { lastChime = 0; announced.clear(); }
  });
  window.addEventListener('pointerdown', function once() { if (S.sound && !actx) { try { actx = new AudioContext(); } catch (e) { } } }, { once: true });
  syncSound();

  /* ── Badge ───────────────────────────────────────────────────────────── */
  function setBadge(kind, text, href) {
    badge.className = kind;
    badge.querySelector('.txt').textContent = text;
    if (href) badge.href = href;
  }

  /* ── Ticks: clock each second, re-render every 5 s ──────────────────── */
  let lastSec = -1, lastRender = 0;
  (function frame() {
    const now = new Date();
    if (st && now.getSeconds() !== lastSec) {
      lastSec = now.getSeconds();
      R.tickClock(board.querySelector('.nt-clock'), st, now);
      if (Date.now() - lastRender > 5e3) { lastRender = Date.now(); render(); }
    }
    requestAnimationFrame(frame);
  })();

  /* Hong Kong screens alternate Chinese and English */
  setInterval(() => { if (st && st.theme === 'hkg') board.classList.toggle('hk-alt'); }, 5000);

  /* ── HUD auto-hide ───────────────────────────────────────────────────── */
  const modal = document.getElementById('settings');
  let idle;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => { if (!modal.classList.contains('open') && !document.querySelector('#hud :focus')) document.body.classList.add('idle'); }, 4000);
  }
  ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, wake, { passive: true }));
  wake();

  document.getElementById('fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { });
  });

  /* ── Auto-roam: favours cities where trains are running (not 1–5 am local) ── */
  const roamSel = document.getElementById('roamSelect');
  let roamTimer = null;
  function roamNext() {
    const pool = ST.filter(s => s !== st);
    const w = pool.map(s => { const h = U.localHour(s.tz); return (h >= 1 && h < 5 && s.source.type !== 'mta') ? 0.05 : 1; });
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return select(pool[i].id); }
  }
  function setRoam() { clearInterval(roamTimer); if (S.roam > 0) roamTimer = setInterval(roamNext, S.roam * 60e3); }
  roamSel.value = String(S.roam);
  roamSel.addEventListener('change', () => { S.roam = +roamSel.value; persist(); setRoam(); });
  setRoam();

  /* ── Settings ────────────────────────────────────────────────────────── */
  const fields = ['wmataKey', 'tflKey'];
  document.getElementById('settingsBtn').addEventListener('click', () => { fields.forEach(f => { const i = document.getElementById(f); if (i) i.value = S[f] || ''; }); modal.classList.add('open'); });
  document.getElementById('closeSettings').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('saveSettings').addEventListener('click', () => {
    fields.forEach(f => { const i = document.getElementById(f); if (i) S[f] = i.value.trim(); });
    persist(); modal.classList.remove('open'); select(st.id, { instant: true });
  });

  /* ── Keyboard: ← → cycle stations, F fullscreen ─────────────────────── */
  window.addEventListener('keydown', e => {
    if (modal.classList.contains('open') || /INPUT|SELECT/.test(document.activeElement.tagName)) return;
    const i = ST.indexOf(st);
    if (e.key === 'ArrowRight') select(ST[(i + 1) % ST.length].id);
    if (e.key === 'ArrowLeft') select(ST[(i - 1 + ST.length) % ST.length].id);
    if (e.key === 'f' || e.key === 'F') document.getElementById('fsBtn').click();
  });
  window.addEventListener('hashchange', () => { const id = location.hash.slice(1).toUpperCase(); if (st && id && id !== st.id) select(id); });

  select((location.hash.slice(1) || S.station).toUpperCase(), { instant: true });
})();
