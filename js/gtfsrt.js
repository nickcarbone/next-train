/* Minimal GTFS-realtime decoder: reads only TripUpdates (trip id, route id, stop time updates).
   Protocol Buffers wire format, no dependencies. Field numbers from gtfs-realtime.proto. */
(function () {
  function Reader(buf) { this.b = buf; this.p = 0; }
  Reader.prototype.varint = function () {
    let x = 0, mul = 1, byte;
    do {
      byte = this.b[this.p++];
      x += (byte & 0x7f) * mul;
      mul *= 128;
    } while (byte & 0x80);
    return x; /* int64 timestamps stay well inside 2^53 */
  };
  Reader.prototype.skip = function (wt) {
    if (wt === 0) this.varint();
    else if (wt === 1) this.p += 8;
    else if (wt === 2) { const n = this.varint(); this.p += n; }
    else if (wt === 5) this.p += 4;
    else throw new Error('unsupported wire type ' + wt);
  };
  Reader.prototype.fields = function (end, fn) {
    while (this.p < end) {
      const tag = this.varint(), fno = Math.floor(tag / 8), wt = tag & 7;
      if (wt === 2) {
        const len = this.varint(), stop = this.p + len;
        fn(fno, wt, stop);
        this.p = stop;
      } else if (wt === 0) fn(fno, wt, this.varint());
      else this.skip(wt);
    }
  };
  const dec = new TextDecoder();
  Reader.prototype.str = function (stop) { return dec.decode(this.b.subarray(this.p, stop)); };

  function stopTimeEvent(r, end) {
    let time = 0;
    r.fields(end, (f, wt, v) => { if (f === 2 && wt === 0) time = v; });
    return time;
  }

  /** Returns { timestamp, trips: [{ tripId, routeId, stops: [{ stopId, arr, dep }] }] } (times in epoch seconds). */
  function decode(arrayBuffer) {
    const r = new Reader(new Uint8Array(arrayBuffer));
    const out = { timestamp: 0, trips: [] };
    r.fields(r.b.length, (f, wt, end) => {
      if (f === 1 && wt === 2) r.fields(end, (hf, hwt, hv) => { if (hf === 3 && hwt === 0) out.timestamp = hv; });
      if (f !== 2 || wt !== 2) return;
      r.fields(end, (ef, ewt, eend) => {
        if (ef !== 3 || ewt !== 2) return;
        const t = { tripId: '', routeId: '', stops: [] };
        r.fields(eend, (tf, twt, tend) => {
          if (tf === 1 && twt === 2) r.fields(tend, (df, dwt, dend) => {
            if (dwt !== 2) return;
            if (df === 1) t.tripId = r.str(dend);
            else if (df === 5) t.routeId = r.str(dend);
          });
          else if (tf === 2 && twt === 2) {
            const s = { stopId: '', arr: 0, dep: 0 };
            r.fields(tend, (sf, swt, send) => {
              if (swt !== 2) return;
              if (sf === 4) s.stopId = r.str(send);
              else if (sf === 2) s.arr = stopTimeEvent(r, send);
              else if (sf === 3) s.dep = stopTimeEvent(r, send);
            });
            t.stops.push(s);
          }
        });
        if (t.stops.length) out.trips.push(t);
      });
    });
    return out;
  }

  (typeof window !== 'undefined' ? window : globalThis).GTFSRT = { decode };
})();
