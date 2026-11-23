/* NEXT TRAIN — stations.
   Each entry is one board. To add a station, copy an entry and change its id, name and source.
   theme:   which renderer and stylesheet to use (css/themes/<theme>.css)
   source:  where the live data comes from (see js/sources.js)
   Only live data is ever shown: if a source has no live trains, the board shows a service notice. */
/* Address of the Next Train Cloudflare Worker (see worker/README.md). Needed for Chicago.
   Settings → Worker address overrides this in one browser. */
window.NT_WORKER = '';

window.NT_STATIONS = [
  /* ── New York: MTA GTFS-realtime, read directly (no key) ───────────────────
     stops: parent station IDs from MTA static GTFS; labels: what each direction's platform is called. */
  {
    id: 'TSQ', city: 'New York', name: 'Times Sq–42 St', theme: 'nyc', tz: 'America/New_York',
    source: { type: 'mta', feeds: ['gtfs', 'gtfs-nqrw'] },
    platforms: [
      { stop: '127N', label: 'Uptown & The Bronx' }, { stop: '127S', label: 'Downtown & Brooklyn' },
      { stop: 'R16N', label: 'Uptown & Queens' }, { stop: 'R16S', label: 'Downtown & Brooklyn' },
      { stop: '725N', label: 'Queens' }, { stop: '725S', label: '34 St–Hudson Yards' },
      /* The Shuttle starts here, so only its Grand Central-bound departures are shown. */
      { stop: '902S', label: 'Grand Central' }
    ]
  },
  {
    id: 'USQ', city: 'New York', name: '14 St–Union Sq', theme: 'nyc', tz: 'America/New_York',
    source: { type: 'mta', feeds: ['gtfs', 'gtfs-nqrw', 'gtfs-l'] },
    platforms: [
      { stop: '635N', label: 'Uptown & The Bronx' }, { stop: '635S', label: 'Downtown & Brooklyn' },
      { stop: 'R20N', label: 'Uptown & Queens' }, { stop: 'R20S', label: 'Downtown & Brooklyn' },
      { stop: 'L03N', label: '8 Av' }, { stop: 'L03S', label: 'Brooklyn' }
    ]
  },
  {
    id: 'GCT', city: 'New York', name: 'Grand Central–42 St', theme: 'nyc', tz: 'America/New_York',
    source: { type: 'mta', feeds: ['gtfs'] },
    platforms: [
      { stop: '631N', label: 'Uptown & The Bronx' }, { stop: '631S', label: 'Downtown & Brooklyn' },
      { stop: '723N', label: 'Queens' }, { stop: '723S', label: 'Manhattan' }
    ]
  },
  {
    id: 'ATL', city: 'New York', name: 'Atlantic Av–Barclays Ctr', theme: 'nyc', tz: 'America/New_York',
    source: { type: 'mta', feeds: ['gtfs', 'gtfs-bdfm', 'gtfs-nqrw'] },
    platforms: [
      { stop: '235N', label: 'Manhattan & The Bronx' }, { stop: '235S', label: 'Brooklyn' },
      { stop: 'D24N', label: 'Manhattan' }, { stop: 'D24S', label: 'Brighton Beach & Coney Island' },
      { stop: 'R31N', label: 'Manhattan' }, { stop: 'R31S', label: 'Bay Ridge & Coney Island' }
    ]
  },

  {
    id: 'PEN', city: 'New York', name: '34 St–Penn Station', theme: 'nyc', tz: 'America/New_York',
    source: { type: 'mta', feeds: ['gtfs', 'gtfs-ace'] },
    platforms: [
      { stop: '128N', label: 'Uptown & The Bronx' }, { stop: '128S', label: 'Downtown & Brooklyn' },
      { stop: 'A28N', label: 'Uptown & Queens' }, { stop: 'A28S', label: 'Downtown & Brooklyn' }
    ]
  },
  {
    id: 'SUT', city: 'New York', name: 'Sutphin Blvd–Archer Av–JFK Airport', theme: 'nyc', tz: 'America/New_York',
    source: { type: 'mta', feeds: ['gtfs-ace', 'gtfs-jz'] },
    platforms: [
      { stop: 'G06N', label: 'Jamaica Center' }, { stop: 'G06S', label: 'Manhattan & Brooklyn' }
    ]
  },

  /* ── Washington: WMATA predictions via Transitous (live rows only).
     Optional: a free WMATA key (Settings) adds car counts and BRD from WMATA's own feed. ── */
  { id: 'KST', city: 'Washington', name: 'King St–Old Town', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_C13', wmata: 'C13' } },
  { id: 'BDR', city: 'Washington', name: 'Braddock Rd', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_C12', wmata: 'C12' } },
  { id: 'PYD', city: 'Washington', name: 'Potomac Yard', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_C11', wmata: 'C11' } },
  { id: 'MCT', city: 'Washington', name: 'Metro Center', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_A01_C01', wmata: 'A01,C01' } },
  { id: 'GAL', city: 'Washington', name: 'Gallery Place', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_B01_F01', wmata: 'B01,F01' } },
  { id: 'LEP', city: 'Washington', name: "L'Enfant Plaza", theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_D03_F03', wmata: 'D03,F03' } },
  /* Rosslyn has stacked platforms (one per direction), so each track gets its own screen. */
  { id: 'RSL', city: 'Washington', name: 'Rosslyn', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_C05', wmata: 'C05', splitTracks: true } },
  { id: 'UNS', city: 'Washington', name: 'Union Station', theme: 'dc', tz: 'America/New_York',
    source: { type: 'transitous', stopId: 'us-dc-WMATA-rail_STN_B03', wmata: 'B03' } },

  /* ── London: TfL Unified API (keyless). naptan: the station's StopPoint ID. ── */
  { id: 'OXC', city: 'London', name: 'Oxford Circus', theme: 'lon', tz: 'Europe/London', source: { type: 'tfl', naptan: '940GZZLUOXC' } },
  { id: 'KXX', city: 'London', name: "King's Cross St. Pancras", theme: 'lon', tz: 'Europe/London', source: { type: 'tfl', naptan: '940GZZLUKSX' } },
  { id: 'BST', city: 'London', name: 'Baker Street', theme: 'lon', tz: 'Europe/London', source: { type: 'tfl', naptan: '940GZZLUBST' } },
  { id: 'BNK', city: 'London', name: 'Bank', theme: 'lon', tz: 'Europe/London', source: { type: 'tfl', naptan: '940GZZLUBNK' } },
  { id: 'CYF', city: 'London', name: 'Canary Wharf', theme: 'lon', tz: 'Europe/London', source: { type: 'tfl', naptan: '940GZZLUCYF' } },
  { id: 'WSM', city: 'London', name: 'Westminster', theme: 'lon', tz: 'Europe/London', source: { type: 'tfl', naptan: '940GZZLUWSM' } },

  /* ── Paris: RATP real-time via Transitous (IDFM), live rows only ───────── */
  { id: 'CDG', city: 'Paris', name: 'Charles de Gaulle – Étoile', theme: 'par', tz: 'Europe/Paris', source: { type: 'transitous', stopId: 'fr-reseau-urbain-et-interurbain-dile-de-france-mobilites_IDFM:71347' } },
  { id: 'BAS', city: 'Paris', name: 'Bastille', theme: 'par', tz: 'Europe/Paris', source: { type: 'transitous', stopId: 'fr-reseau-urbain-et-interurbain-dile-de-france-mobilites_IDFM:463564' } },
  { id: 'CON', city: 'Paris', name: 'Concorde', theme: 'par', tz: 'Europe/Paris', source: { type: 'transitous', stopId: 'fr-reseau-urbain-et-interurbain-dile-de-france-mobilites_IDFM:71298' } },
  { id: 'ABB', city: 'Paris', name: 'Abbesses', theme: 'par', tz: 'Europe/Paris', source: { type: 'transitous', stopId: 'fr-reseau-urbain-et-interurbain-dile-de-france-mobilites_IDFM:71432' } },

  /* ── Berlin: BVG real-time via Transitous, U-Bahn only, live rows only ──── */
  { id: 'ALX', city: 'Berlin', name: 'Alexanderplatz', theme: 'ber', tz: 'Europe/Berlin', source: { type: 'transitous', stopId: 'de-DELFI_de:11000:900100003' } },
  { id: 'HPL', city: 'Berlin', name: 'Hermannplatz', theme: 'ber', tz: 'Europe/Berlin', source: { type: 'transitous', stopId: 'de-VBB_de:11000:900078101' } },
  { id: 'ZOO', city: 'Berlin', name: 'Zoologischer Garten', theme: 'ber', tz: 'Europe/Berlin', source: { type: 'transitous', stopId: 'de-DELFI_de:11000:900023201' } },
  { id: 'WBP', city: 'Berlin', name: 'Wittenbergplatz', theme: 'ber', tz: 'Europe/Berlin', source: { type: 'transitous', stopId: 'de-VBB_de:11000:900056101' } },

  /* ── Stockholm: SL Transport API (keyless). site: SL site ID. ───────────── */
  { id: 'TCE', city: 'Stockholm', name: 'T-Centralen', theme: 'sto', tz: 'Europe/Stockholm', source: { type: 'sl', site: 9001 } },
  { id: 'SLU', city: 'Stockholm', name: 'Slussen', theme: 'sto', tz: 'Europe/Stockholm', source: { type: 'sl', site: 9192 } },
  { id: 'GST', city: 'Stockholm', name: 'Gamla stan', theme: 'sto', tz: 'Europe/Stockholm', source: { type: 'sl', site: 9193 } },
  { id: 'ODP', city: 'Stockholm', name: 'Odenplan', theme: 'sto', tz: 'Europe/Stockholm', source: { type: 'sl', site: 9117 } },

  /* ── Hong Kong: MTR Next Train API (keyless). sta: MTR station code; lines: lines serving it. ── */
  { id: 'ADM', city: 'Hong Kong', name: 'Admiralty', nameTc: '金鐘', theme: 'hkg', tz: 'Asia/Hong_Kong', source: { type: 'mtr', sta: 'ADM', lines: ['TWL', 'ISL', 'SIL', 'EAL'] } },
  { id: 'CEN', city: 'Hong Kong', name: 'Central', nameTc: '中環', theme: 'hkg', tz: 'Asia/Hong_Kong', source: { type: 'mtr', sta: 'CEN', lines: ['TWL', 'ISL'] } },
  { id: 'HOK', city: 'Hong Kong', name: 'Hong Kong', nameTc: '香港', theme: 'hkg', tz: 'Asia/Hong_Kong', source: { type: 'mtr', sta: 'HOK', lines: ['TCL', 'AEL'] } },
  { id: 'KOT', city: 'Hong Kong', name: 'Kowloon Tong', nameTc: '九龍塘', theme: 'hkg', tz: 'Asia/Hong_Kong', source: { type: 'mtr', sta: 'KOT', lines: ['KTL', 'EAL'] } },

  /* ── Chicago: CTA Train Tracker via the Next Train Worker. mapid: CTA station ID. ── */
  { id: 'CLK', city: 'Chicago', name: 'Clark/Lake', theme: 'chi', tz: 'America/Chicago', source: { type: 'cta', mapid: '40380' } },
  { id: 'WWB', city: 'Chicago', name: 'Washington/Wabash', theme: 'chi', tz: 'America/Chicago', source: { type: 'cta', mapid: '41700' } },
  { id: 'CHR', city: 'Chicago', name: 'Chicago', theme: 'chi', tz: 'America/Chicago', source: { type: 'cta', mapid: '41450' } },
  { id: 'BEL', city: 'Chicago', name: 'Belmont', theme: 'chi', tz: 'America/Chicago', source: { type: 'cta', mapid: '41320' } },
  { id: 'ORD', city: 'Chicago', name: "O'Hare", theme: 'chi', tz: 'America/Chicago', source: { type: 'cta', mapid: '40890' } }
];
