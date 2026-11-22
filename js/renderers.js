/* NEXT TRAIN — renderers. One per system; each builds the board once and updates it in place.
   Board styles are evocations of each system's current platform screens: no operator logos or proprietary typefaces. */
(function () {
  const U = window.CU;
  const esc = U.esc;
  const minsTo = (t, now) => Math.max(0, Math.round((t - now) / 60e3));

  function head(st, extra = '') {
    return `<header class="nt-head"><div class="nt-name">${esc(st.name)}</div>${extra}<div class="nt-clock" aria-label="Local time"></div></header>`;
  }

  /* ── New York: platform countdown clocks, one per platform ─────────────── */
  function nycBullet(r, small) {
    return `<span class="nyc-bullet${r.express ? ' express' : ''}${small ? ' sm' : ''}" style="--c:${r.color};--t:${r.text}"><b>${esc(r.lineLabel)}</b></span>`;
  }
  const nyc = {
    build(el, st) {
      el.innerHTML = head(st) + `<div class="nyc-screens n${st.platforms.length}">` + st.platforms.map(p => `
        <section class="nyc-screen" data-screen="${esc(p.stop)}">
          <div class="nyc-dir"><span class="nyc-served"></span><span class="nyc-label">${esc(p.label)}</span></div>
          <ol class="nyc-rows"></ol>
        </section>`).join('') + `</div>`;
    },
    update(el, st, rows, now) {
      const served = {};
      rows.forEach(r => { (served[r.screen] = served[r.screen] || new Map()).set(r.lineLabel + (r.express ? 'x' : ''), r); });
      el.querySelectorAll('.nyc-screen').forEach(sc => {
        const id = sc.dataset.screen;
        const mine = rows.filter(r => r.screen === id && r.t > now - 20e3).slice(0, 3);
        const lines = [...(served[id] || new Map()).values()].sort((a, b) => a.lineLabel.localeCompare(b.lineLabel, 'en', { numeric: true }));
        sc.querySelector('.nyc-served').innerHTML = lines.map(r => nycBullet(r, true)).join('');
        sc.querySelector('.nyc-rows').innerHTML = mine.length ? mine.map(r => {
          const m = minsTo(r.t, now), soon = r.t - now < 60e3;
          return `<li class="nyc-row${soon ? ' approaching' : ''}">${nycBullet(r)}<span class="nyc-dest">${esc(r.dest)}</span><span class="nyc-min">${m}<small> min</small></span></li>`;
        }).join('') : `<li class="nyc-none">No arrival information right now</li>`;
      });
    },
    disruption(el, st) {
      el.innerHTML = head(st) + `<div class="nyc-screens n1"><section class="nyc-screen nyc-notice">
        <div class="nyc-dir"><span class="nyc-label">Service Notice</span></div>
        <div class="nyc-notice-body"><p>Train arrival times are unavailable.</p>
        <p class="sub">The countdown feed is running with delays. We apologize for the inconvenience. Real times will appear here as soon as they are back.</p></div>
      </section></div>`;
    }
  };

  /* ── Washington: platform PIDS, LN CAR DEST MIN, alerts scrolling along the bottom ── */
  const DC_NAME = { RD: 'Red', OR: 'Orange', BL: 'Blue', SV: 'Silver', YL: 'Yellow', GR: 'Green' };
  const DC_ORDER = ['RD', 'OR', 'BL', 'SV', 'YL', 'GR'];
  function dcMin(r, now) {
    if (r.minText) return r.minText;
    if (now >= r.t && now < r.dep) return 'BRD';
    if (r.t - now <= 30e3) return 'ARR';
    return String(minsTo(r.t, now));
  }
  const dc = {
    build(el, st) {
      el.innerHTML = head(st) + `<div class="dc-wrap"></div>`;
    },
    update(el, st, rows, now, extra) {
      const groups = new Map();
      rows.filter(r => r.dep > now - 10e3).forEach(r => { if (!groups.has(r.screen)) groups.set(r.screen, []); groups.get(r.screen).push(r); });
      const keys = [...groups.keys()].sort();
      const alertText = (extra.alerts || []).join('   ·   ');
      const wrap = el.querySelector('.dc-wrap');
      wrap.className = 'dc-wrap n' + Math.min(keys.length, 2) + (rows.some(r => r.cars) ? '' : ' no-car');
      const sig = keys.join('|') + '#' + alertText;
      if (wrap.dataset.sig !== sig) {
        wrap.dataset.sig = sig;
        wrap.innerHTML = keys.map(k => `
          <section class="dc-pids" data-screen="${esc(k)}">
            <div class="dc-cap"></div>
            <div class="dc-grid"><div class="dc-hdr"><span>LN</span><span>CAR</span><span>DEST</span><span>MIN</span></div><div class="dc-rows"></div></div>
            <div class="dc-alert">${alertText ? `<span class="dc-marquee">${esc(alertText)}</span>` : `<span class="dc-still">${esc(st.name)}</span>`}</div>
          </section>`).join('');
        wrap.querySelectorAll('.dc-marquee').forEach(m => { m.style.animationDuration = Math.max(25, alertText.length / 7) + 's'; });
      }
      wrap.querySelectorAll('.dc-pids').forEach(sc => {
        const mine = groups.get(sc.dataset.screen) || [];
        const lines = [...new Set(mine.map(r => r.line))].sort((a, b) => DC_ORDER.indexOf(a) - DC_ORDER.indexOf(b));
        sc.querySelector('.dc-cap').innerHTML = lines.map(l => `<span class="dc-dot" style="--c:${({ RD: '#bf0d3e', OR: '#ed8b00', BL: '#009cde', SV: '#919d9d', YL: '#ffd100', GR: '#00b140' })[l]}"></span>${esc(DC_NAME[l] || l)}`).join('') + ' Line' + (lines.length > 1 ? 's' : '');
        sc.querySelector('.dc-rows').innerHTML = mine.slice(0, keys.length === 1 ? 6 : 4).map(r => {
          const m = dcMin(r, now);
          return `<div class="dc-row${/ARR|BRD/.test(m) ? ' now' : ''}"><span class="dc-ln" style="--c:${r.color};--t:${r.line === 'YL' ? '#111' : '#fff'}">${esc(r.line)}</span><span class="dc-car">${esc(r.cars || '')}</span><span class="dc-dest">${esc(r.dest)}</span><span class="dc-min">${esc(m)}</span></div>`;
        }).join('');
      });
    },
    disruption(el, st) {
      el.innerHTML = head(st) + `<div class="dc-wrap n1"><section class="dc-pids dc-notice">
        <div class="dc-cap">Service Advisory</div>
        <div class="dc-grid"><div class="dc-hdr"><span>LN</span><span>CAR</span><span>DEST</span><span>MIN</span></div>
        <div class="dc-msg">TRAIN PREDICTIONS<br>TEMPORARILY UNAVAILABLE</div></div>
        <div class="dc-alert"><span class="dc-marquee" style="animation-duration:30s">Please stand by. Arrival times will return once Metro's data feed is back on track. Thank you for your patience.</span></div>
      </section></div>`;
    }
  };


  /* ── Shared: group rows into platform screens ──────────────────────────── */
  function screensOf(rows, now, max = 6, cmp) {
    const m = new Map();
    rows.filter(r => r.t > now - 20e3).forEach(r => { if (!m.has(r.screen)) m.set(r.screen, []); m.get(r.screen).push(r); });
    const arr = [...m.entries()].map(([key, rs]) => ({ key, rows: rs }));
    arr.sort(cmp || ((a, b) => String(a.key).localeCompare(String(b.key), 'en', { numeric: true })));
    return arr.slice(0, max);
  }
  function grid(el, cls, html, n) {
    let g = el.querySelector('.nt-grid');
    if (!g) { g = document.createElement('div'); el.appendChild(g); }
    g.className = `nt-grid ${cls} n${n}`;
    g.innerHTML = html;
  }
  
  /* ── London: Tube platform dot-matrix indicators, amber on black ──────── */
  const lon = {
    build(el, st) { el.innerHTML = head(st); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now);
      grid(el, 'lon-grid', scr.map(sc => {
        const lines = [...new Map(sc.rows.map(r => [r.lineId, r])).values()];
        const [a, b, c] = sc.rows;
        const tline = (r, i) => r ? `<div class="lon-l"><span class="lon-n">${i}</span><span class="lon-d">${esc(r.dest)}</span><span class="lon-t">${Math.max(1, minsTo(r.t, now))} min</span></div>` : `<div class="lon-l"></div>`;
        const approaching = a && a.t - now < 30e3;
        return `<section class="lon-screen">
          <div class="lon-plate">${lines.map(r => `<span class="lon-line" style="--c:${r.color}">${esc(r.line)}</span>`).join('')}<span class="lon-pf">${esc(sc.key.replace(' - ', ' – '))}</span></div>
          <div class="lon-dmi">${tline(a, 1)}${approaching ? `<div class="lon-l lon-c lon-blink">*** STAND BACK - TRAIN APPROACHING ***</div>` : tline(b, 2)}
            <div class="lon-l lon-c">${c && !approaching ? `<span class="lon-third">3 ${esc(c.dest)} ${Math.max(1, minsTo(c.t, now))} min</span>` : '<span class="js-hms"></span>'}</div></div>
        </section>`;
      }).join(''), scr.length);
      window.Renderers.tickClock(null, st, new Date());
    },
    disruption(el, st) {
      el.innerHTML = head(st);
      grid(el, 'lon-grid', `<section class="lon-screen"><div class="lon-plate"><span class="lon-pf">Customer information</span></div><div class="lon-dmi">
        <div class="lon-l lon-c">TRAIN INFORMATION UNAVAILABLE</div><div class="lon-l lon-c lon-blink">PLEASE LISTEN FOR ANNOUNCEMENTS</div><div class="lon-l lon-c"><span class="js-hms"></span></div></div></section>`, 1);
    }
  };

  /* ── Paris: platform panels with the next two trains for each direction ── */
  const parTime = (r, now) => now >= r.t ? `<span class="par-word">À quai</span>` : r.t - now <= 30e3 ? `<span class="par-word">À l'approche</span>` : `${minsTo(r.t, now)}<small>min</small>`;
  const par = {
    build(el, st) { el.innerHTML = head(st); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now, 6, (a, b) => (a.rows[0].line.localeCompare(b.rows[0].line, 'fr', { numeric: true })) || a.rows[0].dest.localeCompare(b.rows[0].dest));
      grid(el, 'par-grid', scr.map(sc => {
        const [a, b] = sc.rows;
        return `<section class="par-screen">
          <div class="par-top"><span class="par-ln" style="--c:${a.color};--t:${a.text}">${esc(a.line)}</span><span class="par-dir"><small>Direction</small>${esc(a.dest)}</span></div>
          <div class="par-rows">${[a, b].filter(Boolean).map((r, i) => `<div class="par-r"><span class="par-dest">${i && r.dest !== a.dest ? esc(r.dest) : ''}</span><span class="par-min">${parTime(r, now)}</span></div>`).join('')}</div>
        </section>`;
      }).join(''), scr.length);
    },
    disruption(el, st) {
      el.innerHTML = head(st);
      grid(el, 'par-grid', `<section class="par-screen"><div class="par-top"><span class="par-dir"><small>Information voyageurs</small>Temps d'attente indisponibles</span></div>
        <div class="par-rows"><div class="par-r"><span class="par-dest">Prochain train</span><span class="par-min">XX</span></div><div class="par-r"><span class="par-dest">Train suivant</span><span class="par-min">XX</span></div></div></section>`, 1);
    }
  };

  /* ── Berlin: BVG platform monitors, dark design ───────────────────────── */
  const berName = s => s.replace(/\s*\(Berlin\)/g, '').replace(/\bBerlin\s+/, '').replace(/ Bhf$/, '');
  const ber = {
    build(el, st) { el.innerHTML = head(st); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now, 6, (a, b) => a.rows[0].line.localeCompare(b.rows[0].line, 'de', { numeric: true }) || String(a.key).localeCompare(String(b.key)));
      grid(el, 'ber-grid', scr.map(sc => {
        const gleis = (sc.rows[0].track || '').replace(/\s*\(.*\)/, '');
        return `<section class="ber-screen">
          <div class="ber-top">${gleis ? `Gleis ${esc(gleis)}` : esc(sc.rows[0].line)}</div>
          <div class="ber-rows">${sc.rows.slice(0, 3).map(r => `<div class="ber-r"><span class="ber-ln" style="--c:${r.color};--t:${r.text}">${esc(r.line)}</span><span class="ber-dest">${esc(berName(r.dest))}</span><span class="ber-min">${r.t - now < 60e3 ? '&lt; 1' : minsTo(r.t, now)} min</span></div>`).join('')}</div>
        </section>`;
      }).join(''), scr.length);
    },
    disruption(el, st) {
      el.innerHTML = head(st);
      grid(el, 'ber-grid', `<section class="ber-screen"><div class="ber-top">Hinweis</div><div class="ber-msg">Zurzeit keine Echtzeitdaten.<br><small>Die Abfahrtszeiten erscheinen hier wieder, sobald die Verbindung steht. Wir bitten um Entschuldigung.</small></div></section>`, 1);
    }
  };

  /* ── Stockholm: SL platform screens; the minutes text is SL's own ("Nu", "3 min") ── */
  const sto = {
    build(el, st) { el.innerHTML = head(st); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now, 6);
      grid(el, 'sto-grid', scr.map(sc => `<section class="sto-screen">
          <div class="sto-top">Spår ${esc(sc.key)}</div>
          <div class="sto-rows">${sc.rows.slice(0, 3).map(r => `<div class="sto-r"><span class="sto-ln" style="--c:${r.color}">${esc(r.line)}</span><span class="sto-dest">${esc(r.dest)}</span><span class="sto-min">${esc(r.minText)}</span></div>`).join('')}</div>
        </section>`).join(''), scr.length);
    },
    disruption(el, st) {
      el.innerHTML = head(st);
      grid(el, 'sto-grid', `<section class="sto-screen"><div class="sto-top">Information</div><div class="sto-msg">Avgångsinformation saknas just nu.<br><small>Tiderna kommer tillbaka så snart trafikdatan är igång igen. Vi ber om ursäkt.</small></div></section>`, 1);
    }
  };

  /* ── Hong Kong: MTR platform screens, Chinese and English alternating ─── */
  const bi = (tc, en) => `<span class="hk-tc">${esc(tc)}</span><span class="hk-en">${esc(en)}</span>`;
  const hkTime = r => r.ttnt <= 0 ? bi('正在離開', 'Departing') : r.ttnt === 1 ? bi('即將抵達', 'Arriving') : bi(`${r.ttnt} 分鐘`, `${r.ttnt} mins`);
  const hkg = {
    build(el, st) { el.innerHTML = head(st, st.nameTc ? `<div class="hk-name-tc">${esc(st.nameTc)}</div>` : ''); },
    update(el, st, rows, now, extra) {
      const scr = screensOf(rows, now, 6, (a, b) => a.key.localeCompare(b.key));
      grid(el, 'hk-grid', scr.map(sc => {
        const r0 = sc.rows[0], [en, tc] = r0.lineName;
        return `<section class="hk-screen" style="--c:${r0.color}">
          <div class="hk-top"><span class="hk-line">${bi(tc, en)}</span><span class="hk-plat">${bi(`${r0.plat} 號月台`, `Platform ${r0.plat}`)}</span></div>
          <div class="hk-rows">${sc.rows.slice(0, 4).map(r => `<div class="hk-r${r.ttnt <= 1 ? ' soon' : ''}"><span class="hk-dest">${bi(r.destTc, r.dest)}</span><span class="hk-min">${hkTime(r)}</span></div>`).join('')}</div>
        </section>`;
      }).join('') + (extra.delayed ? `<div class="hk-delay">${bi('列車服務延誤', 'Train service delayed')}</div>` : ''), scr.length);
    },
    disruption(el, st) {
      hkg.build(el, st);
      grid(el, 'hk-grid', `<section class="hk-screen" style="--c:#555"><div class="hk-top"><span class="hk-line">${bi('乘客資訊', 'Passenger information')}</span></div>
        <div class="hk-msg">${bi('列車到站資訊暫時未能提供', 'Train arrival information is temporarily unavailable')}</div></section>`, 1);
    }
  };

  const THEMES = { nyc, dc, lon, par, ber, sto, hkg };

  window.Renderers = {
    THEMES,
    build(el, st) { THEMES[st.theme].build(el, st); },
    update(el, st, rows, extra) { THEMES[st.theme].update(el, st, rows, Date.now(), extra || {}); },
    disruption(el, st) { THEMES[st.theme].disruption(el, st); },
    tickClock(el, st, now) {
      if (st.theme === 'lon') document.querySelectorAll('.js-hms').forEach(x => { x.textContent = U.hms(now, st.tz); });
      if (!el) return;
      const f = st.theme === 'nyc' || st.theme === 'dc'
        ? new Intl.DateTimeFormat('en-US', { timeZone: st.tz, hour: 'numeric', minute: '2-digit' }).format(now)
        : U.hm(now, st.tz);
      if (el.textContent !== f) el.textContent = f;
    }
  };
})();
