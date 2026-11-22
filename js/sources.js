/* NEXT TRAIN — data sources. Every adapter returns live predictions only, or throws.
   Row: { screen, line, lineLabel, color, text, express, dest, t (arrival ms), dep (departure ms), cars, minText } */
(function () {
  const U = window.CU;
  const MTA = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F';
  const TRANSITOUS = 'https://api.transitous.org/api/v5';
  const HORIZON = 60 * 60e3;            /* show trains up to an hour out */
  const STALE = 10 * 60e3;              /* a feed older than this is not "live" */

  /* ── New York: MTA GTFS-realtime (protobuf) ─────────────────────────────── */
  const NYC_LABEL = { GS: 'S', FS: 'S', H: 'S', SI: 'SIR', '6X': '6', '7X': '7', FX: 'F' };
  async function mta(st) {
    const want = new Map(st.platforms.map(p => [p.stop, p]));
    const bufs = await Promise.allSettled(st.source.feeds.map(f => U.fetchBuf(MTA + f)));
    const ok = bufs.filter(b => b.status === 'fulfilled');
    if (!ok.length) throw new Error('MTA feeds unreachable');
    const now = Date.now(), rows = [];
    let newest = 0;
    for (const b of ok) {
      const feed = window.GTFSRT.decode(b.value);
      newest = Math.max(newest, feed.timestamp * 1000);
      if (now - feed.timestamp * 1000 > STALE) continue;
      for (const trip of feed.trips) {
        const last = trip.stops[trip.stops.length - 1];
        trip.stops.forEach(s => {
          if (!want.has(s.stopId) || s === last) return;      /* skip trains terminating here */
          const t = (s.arr || s.dep) * 1000;
          if (t < now - 30e3 || t > now + HORIZON) return;
          const route = window.NYC_ROUTES[trip.routeId] || { c: '#808183', t: '#ffffff' };
          rows.push({
            screen: s.stopId, line: trip.routeId, lineLabel: NYC_LABEL[trip.routeId] || trip.routeId,
            express: /X$/.test(trip.routeId), color: route.c, text: route.t,
            dest: window.NYC_STOPS[last.stopId.replace(/[NS]$/, '')] || '', t, dep: (s.dep || s.arr) * 1000
          });
        });
      }
    }
    if (now - newest > STALE) throw new Error('MTA feed stale');
    return { rows, meta: { source: 'MTA GTFS-realtime', url: 'https://www.mta.info/developers', partial: ok.length < bufs.length } };
  }

  /* ── Transitous (MOTIS 2): keep only rows carrying a live prediction ───── */
  async function transitousLive(st) {
    const p = new URLSearchParams({ stopId: st.source.stopId, n: String(st.source.n || 60), mode: 'SUBWAY' });
    const d = await U.fetchJSON(`${TRANSITOUS}/stoptimes?${p}`);
    const now = Date.now(), alerts = new Set();
    const rows = (d.stopTimes || []).filter(x => x.realTime && !x.cancelled && (!st.source.modes || st.source.modes.includes(x.mode))).map(x => {
      (x.place.alerts || []).forEach(a => a.headerText && alerts.add(a.descriptionText ? `${a.headerText}: ${a.descriptionText}` : a.headerText));
      const t = Date.parse(x.place.arrival || x.place.departure), dep = Date.parse(x.place.departure || x.place.arrival);
      return {
        screen: (/_PF_([A-Z]\d\d)_/.exec(x.place.stopId) || [])[1] || x.place.stopId, raw: x,
        line: x.routeShortName || '', lineId: x.routeId || '', color: '#' + (x.routeColor || '777777'), text: '#' + (x.routeTextColor || 'ffffff'),
        dest: x.headsign || (x.tripTo && x.tripTo.name) || '', t, dep, track: x.place.track || ''
      };
    }).map(r => {
      /* Outside Washington a "screen" is one platform: group by the platform's stop ID. */
      if (st.theme !== 'dc') r.screen = r.raw.place.stopId;
      return r;
    }).filter(r => r.dep > now - 15e3 && r.t < now + HORIZON);
    return { rows, alerts: [...alerts], meta: { source: 'Transitous', url: 'https://transitous.org/sources/' } };
  }

  /* ── Washington: optional WMATA key gives car counts and BRD/ARR straight from the source ── */
  const DC_CODE = { RED: 'RD', ORANGE: 'OR', BLUE: 'BL', SILVER: 'SV', YELLOW: 'YL', GREEN: 'GR' };
  const DC_COLOR = { RD: '#bf0d3e', OR: '#ed8b00', BL: '#009cde', SV: '#919d9d', YL: '#ffd100', GR: '#00b140' };
  async function wmataDirect(st, key) {
    const d = await U.fetchJSON(`https://api.wmata.com/StationPrediction.svc/json/GetPrediction/${st.source.wmata}`, { headers: { api_key: key } });
    const now = Date.now();
    const rows = (d.Trains || []).filter(x => DC_COLOR[x.Line] && x.Min !== '' && x.Min !== '---').map(x => {
      const mins = /^\d+$/.test(x.Min) ? +x.Min : 0;
      return { screen: x.LocationCode, line: x.Line, color: DC_COLOR[x.Line], dest: x.Destination || x.DestinationName, cars: x.Car && x.Car !== '-' ? x.Car : '',
        minText: /^(ARR|BRD)$/.test(x.Min) ? x.Min : null, t: now + mins * 60e3, dep: now + mins * 60e3 };
    });
    return { rows, alerts: [], meta: { source: 'WMATA', url: 'https://developer.wmata.com/' } };
  }
  async function dc(st) {
    const key = (window.NT_SETTINGS || {}).wmataKey;
    if (key) {
      try {
        const w = await wmataDirect(st, key);
        /* Alerts still come from Transitous, which carries WMATA's GTFS-RT alerts. */
        try { w.alerts = (await transitousLive(st)).alerts; } catch (e) { /* alerts are optional */ }
        if (w.rows.length) return w;
      } catch (e) { console.warn('[next-train] WMATA direct failed, using Transitous', e.message); }
    }
    const r = await transitousLive(st);
    r.rows.forEach(x => {
      const code = DC_CODE[(x.lineId.split('_').pop() || '').toUpperCase()] || x.line;
      x.line = code; x.color = DC_COLOR[code] || x.color; x.cars = '';
    });
    return r;
  }


  /* ── London: TfL Unified API arrivals (keyless; an optional key raises the rate limit) ── */
  const TFL_COLOR = { bakerloo: '#b36305', central: '#e32017', circle: '#ffd300', district: '#00782a', 'hammersmith-city': '#f3a9bb',
    jubilee: '#a0a5a9', metropolitan: '#9b0056', northern: '#000000', piccadilly: '#003688', victoria: '#0098d4', 'waterloo-city': '#95cdba' };
  async function tfl(st) {
    const key = (window.NT_SETTINGS || {}).tflKey;
    const d = await U.fetchJSON(`https://api.tfl.gov.uk/StopPoint/${st.source.naptan}/Arrivals?mode=tube${key ? '&app_key=' + encodeURIComponent(key) : ''}`);
    const now = Date.now();
    const rows = (d || []).filter(x => x.modeName === 'tube' && x.platformName).map(x => {
      const t = Date.parse(x.expectedArrival);
      const dest = (x.destinationName || x.towards || '').replace(/ (Underground|Rail|DLR) Station$/, '').replace(/ \(.*?\)$/, '');
      return { screen: x.platformName, line: x.lineName, lineId: x.lineId, color: TFL_COLOR[x.lineId] || '#888', dest: dest || x.towards || 'Check front of train', t, dep: t };
    }).filter(r => r.t > now - 30e3 && r.t < now + HORIZON);
    return { rows, meta: { source: 'TfL Unified API', url: 'https://api.tfl.gov.uk/' } };
  }

  /* ── Stockholm: SL Transport API (keyless). Only journeys with a live prediction state. ── */
  const SL_COLOR = { 'blå': '#0089ca', 'gröna': '#179c3d', 'röda': '#e1251b' };
  async function sl(st) {
    const d = await U.fetchJSON(`https://transport.integration.sl.se/v1/sites/${st.source.site}/departures?transport=METRO&forecast=60`);
    const now = Date.now();
    const rows = (d.departures || []).filter(x => x.journey && x.journey.prediction_state && x.state !== 'CANCELLED').map(x => {
      const grp = ((x.line && x.line.group_of_lines) || '').toLowerCase();
      const col = Object.keys(SL_COLOR).find(k => grp.includes(k));
      const t = U.localStampToDate(x.expected || x.scheduled, st.tz).getTime() + (+(x.expected || '').slice(17, 19) || 0) * 1000;
      return { screen: (x.stop_point && x.stop_point.designation) || '', line: x.line.designation, color: SL_COLOR[col] || '#666', dest: x.destination, minText: x.display, t, dep: t };
    }).filter(r => r.t > now - 60e3 && r.t < now + HORIZON);
    return { rows, meta: { source: 'SL Transport API', url: 'https://www.trafiklab.se/api/our-apis/sl/transport/' } };
  }

  /* ── Hong Kong: MTR Next Train API (keyless), one request per line ─────── */
  const MTR_LINE = {
    TWL: ['Tsuen Wan Line', '荃灣綫', '#e2231a'], ISL: ['Island Line', '港島綫', '#0071ce'], SIL: ['South Island Line', '南港島綫', '#b5bd00'],
    EAL: ['East Rail Line', '東鐵綫', '#5eb6e4'], TCL: ['Tung Chung Line', '東涌綫', '#f7943e'], AEL: ['Airport Express', '機場快綫', '#00888a'],
    KTL: ['Kwun Tong Line', '觀塘綫', '#00ab4e'], TKL: ['Tseung Kwan O Line', '將軍澳綫', '#7d499d'], TML: ['Tuen Ma Line', '屯馬綫', '#923011'], DRL: ['Disneyland Resort Line', '迪士尼綫', '#f550a6']
  };
  async function mtr(st) {
    const res = await Promise.allSettled(st.source.lines.map(l => U.fetchJSON(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${l}&sta=${st.source.sta}&lang=en`).then(d => [l, d])));
    const ok = res.filter(r => r.status === 'fulfilled' && r.value[1].status === 1);
    if (!ok.length) throw new Error('MTR unreachable');
    const now = Date.now(), rows = [];
    let delayed = false;
    ok.forEach(({ value: [line, d] }) => {
      if (d.isdelay === 'Y') delayed = true;
      const block = (d.data || {})[`${line}-${st.source.sta}`] || {};
      ['UP', 'DOWN'].forEach(dir => (block[dir] || []).filter(x => x.valid === 'Y').forEach(x => {
        const t = U.localStampToDate(x.time, st.tz).getTime() + (+x.time.slice(17, 19) || 0) * 1000;
        const name = window.MTR_STATIONS[x.dest] || { en: x.dest, tc: x.dest };
        rows.push({ screen: `${line}-${dir}-${x.plat}`, line, lineName: MTR_LINE[line], color: MTR_LINE[line][2], plat: x.plat,
          dest: name.en, destTc: name.tc, ttnt: +x.ttnt, t, dep: t });
      }));
    });
    return { rows: rows.filter(r => r.t > now - 90e3 && r.t < now + HORIZON), delayed, meta: { source: 'MTR Next Train', url: 'https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data', partial: ok.length < res.length } };
  }

  async function fetchStation(st) {
    let res;
    if (st.source.type === 'mta') res = await mta(st);
    else if (st.theme === 'dc') res = await dc(st);
    else if (st.source.type === 'transitous') res = await transitousLive(st);
    else if (st.source.type === 'tfl') res = await tfl(st);
    else if (st.source.type === 'sl') res = await sl(st);
    else if (st.source.type === 'mtr') res = await mtr(st);
    else throw new Error('unknown source ' + st.source.type);
    if (!res.rows.length) { const e = new Error('no live trains'); e.empty = true; throw e; }
    res.rows.sort((a, b) => a.t - b.t);
    /* Some feeds list the same train twice (e.g. two sources merged upstream): drop near-identical repeats. */
    res.rows = res.rows.filter((r, i, all) => !all.slice(0, i).some(q => q.screen === r.screen && q.line === r.line && q.dest === r.dest && Math.abs(q.t - r.t) < 45e3));
    return res;
  }

  window.Sources = { fetchStation };
})();
