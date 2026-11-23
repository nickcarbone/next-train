/* NEXT TRAIN — renderers for Boston, Prague and Helsinki. Registered into the shared theme table. */
(function () {
  const R = window.Renderers, U = window.CU, esc = U.esc;
  const minsTo = (t, now) => Math.max(0, Math.round((t - now) / 60e3));
  const head = (st, extra = '') => `<header class="nt-head"><div class="nt-name">${esc(st.name)}</div>${extra}<div class="nt-clock" aria-label="Local time"></div></header>`;
  function screensOf(rows, now, max, cmp) {
    const m = new Map();
    rows.filter(r => r.t > now - 20e3 || (r.dep && r.dep > now)).forEach(r => { if (!m.has(r.screen)) m.set(r.screen, []); m.get(r.screen).push(r); });
    return [...m.entries()].map(([key, rs]) => ({ key, rows: rs })).sort(cmp).slice(0, max);
  }
  function grid(el, cls, html, n) {
    let g = el.querySelector('.nt-grid');
    if (!g) { g = document.createElement('div'); el.appendChild(g); }
    g.className = `nt-grid ${cls} n${n}`;
    g.innerHTML = html;
  }

  /* ── Boston: amber LED countdown signs over each platform, two trains per sign ── */
  const bosTime = (r, now) => (/^Boarding/i.test(r.status) || (now >= r.t && now < r.dep)) ? 'BRD' : r.t - now <= 30e3 ? 'ARR' : `${Math.max(1, minsTo(r.t, now))} min`;
  R.THEMES.bos = {
    build(el, st) { el.innerHTML = head(st); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now, 6, (a, b) => a.rows[0].lineName.localeCompare(b.rows[0].lineName) || a.rows[0].label.localeCompare(b.rows[0].label));
      grid(el, 'bos-grid', scr.map(sc => {
        const r0 = sc.rows[0];
        const lines = [...new Map(sc.rows.map(r => [r.line.replace(/-.*/, ''), r])).values()];
        return `<section class="bos-screen">
          <div class="bos-plate">${lines.map(r => `<span class="bos-line" style="--c:${r.color};--t:${r.text}">${esc(r.line.replace(/-.*/, ''))}</span>`).join('')}<span>${esc(r0.label)}${r0.toward ? ' · ' + esc(r0.toward) : ''}</span></div>
          <div class="bos-led">${sc.rows.slice(0, 2).map(r => `<div class="bos-l${/ARR|BRD/.test(bosTime(r, now)) ? ' now' : ''}"><span class="bos-d">${esc(r.line.startsWith('Green-') ? r.line.slice(6) + ' ' : '')}${esc(r.dest)}</span><span class="bos-t">${bosTime(r, now)}</span></div>`).join('')}</div>
        </section>`;
      }).join(''), scr.length);
    },
    disruption(el, st) {
      el.innerHTML = head(st);
      grid(el, 'bos-grid', `<section class="bos-screen"><div class="bos-plate"><span>Attention passengers</span></div>
        <div class="bos-led"><div class="bos-l"><span class="bos-d">Arrival times are</span></div><div class="bos-l now"><span class="bos-d">temporarily unavailable</span></div></div></section>`, 1);
    }
  };

  /* ── Prague: metro countdown screens, line letter in its colour (A green, B yellow, C red) ── */
  R.THEMES.prg = {
    build(el, st) { el.innerHTML = head(st); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now, 6, (a, b) => a.rows[0].line.localeCompare(b.rows[0].line) || a.rows[0].dest.localeCompare(b.rows[0].dest));
      grid(el, 'prg-grid', scr.map(sc => {
        const [a, b] = sc.rows;
        const t = r => r.t - now < 60e3 ? '&lt; 1' : minsTo(r.t, now);
        return `<section class="prg-screen">
          <div class="prg-top"><span class="prg-ln" style="--c:${a.color}">${esc(a.line)}</span><span class="prg-dir"><small>směr / direction</small>${esc(a.dest)}</span></div>
          <div class="prg-rows">${[a, b].filter(Boolean).map((r, i) => `<div class="prg-r"><span class="prg-lbl">${i ? 'další' : 'příští'}${r.dest !== a.dest ? ' · ' + esc(r.dest) : ''}</span><span class="prg-min">${t(r)}<small> min</small></span></div>`).join('')}</div>
        </section>`;
      }).join(''), scr.length);
    },
    disruption(el, st) {
      el.innerHTML = head(st);
      grid(el, 'prg-grid', `<section class="prg-screen"><div class="prg-top"><span class="prg-dir"><small>Informace pro cestující</small>Odjezdy nejsou k dispozici</span></div>
        <div class="prg-msg">Real-time departures are unavailable for now.<br><small>Trains are running; times will return here when the data does. Omlouváme se.</small></div></section>`, 1);
    }
  };

  /* ── Helsinki: metro platform screens in HSL metro orange ─────────────── */
  R.THEMES.hel = {
    build(el, st) { el.innerHTML = head(st, st.nameSv ? `<div class="hel-sv">${esc(st.nameSv)}</div>` : ''); },
    update(el, st, rows, now) {
      const scr = screensOf(rows, now, 4, (a, b) => String(a.key).localeCompare(String(b.key)));
      const west = sc => /Kivenlahti|Tapiola|Matinkylä|Ruoholahti|Espoonlahti/.test(sc.rows[0].dest);
      scr.sort((a, b) => west(b) - west(a));
      grid(el, 'hel-grid', scr.map(sc => `<section class="hel-screen">
          <div class="hel-top">${west(sc) ? 'Länteen · Västerut' : 'Itään · Österut'}</div>
          <div class="hel-rows">${sc.rows.slice(0, 3).map(r => `<div class="hel-r"><span class="hel-ln">${esc(r.line)}</span><span class="hel-dest">${esc(r.dest)}</span><span class="hel-min">${r.t - now < 60e3 ? '&lt; 1' : minsTo(r.t, now)} min</span></div>`).join('')}</div>
        </section>`).join(''), scr.length);
    },
    disruption(el, st) {
      R.THEMES.hel.build(el, st);
      grid(el, 'hel-grid', `<section class="hel-screen"><div class="hel-top">Tiedote / Meddelande</div>
        <div class="hel-msg">Reaaliaikaiset lähtöajat eivät ole saatavilla.<br><small>Real-time departures are unavailable. Metros are running; times will return here when the data does.</small></div></section>`, 1);
    }
  };
})();
