# Next Train

Live metro arrival screens from around the world, for a second monitor. Pick a station and the board takes on that system's platform-screen style, showing the real next trains.

**Rule: live only.** Every train on screen comes from a real-time prediction. Scheduled trips without live data are never shown. If a system's feed goes quiet, the board shows a service notice in that system's style, and the corner badge says `NO FEED`.

## Deploy

1. Upload the whole folder to a new GitHub repository, keeping the structure as it is.
2. In the repository, go to **Settings → Pages** and set the source to the `main` branch, root folder.
3. Open `https://<user>.github.io/<repo>/`. Deep-link a station with a hash, e.g. `#KST` or `#TSQ`.

No build step and no server. No keys are needed.

## Systems and data sources

| City | Board style | Stations | Source | Key |
|---|---|---|---|---|
| New York | LCD countdown clocks on subway tile, one per platform | Times Sq–42 St, 14 St–Union Sq, Grand Central–42 St, Atlantic Av–Barclays Ctr | MTA GTFS-realtime, read directly (protobuf decoded in the page) | None |
| Washington | Platform PIDS: LN CAR DEST MIN, alerts scrolling along the bottom | King St–Old Town, Metro Center, Gallery Place, L'Enfant Plaza, Rosslyn, Union Station | WMATA real-time via Transitous; optionally WMATA directly | Optional (adds car counts) |
| London | Tube dot-matrix platform indicators | Oxford Circus, King's Cross St. Pancras, Baker Street, Canary Wharf, Westminster | TfL Unified API | Optional (higher rate limit) |
| Paris | Platform panels: next two trains per direction | Charles de Gaulle – Étoile, Bastille, Concorde, Abbesses | Île-de-France Mobilités real-time via Transitous | None |
| Berlin | BVG platform monitors, dark design | Alexanderplatz, Hermannplatz, Zoologischer Garten, Wittenbergplatz | VBB/BVG real-time via Transitous (U-Bahn only) | None |
| Stockholm | SL platform screens, with SL's own countdown text ("Nu", "3 min") | T-Centralen, Slussen, Gamla stan, Odenplan | SL Transport API (Trafiklab) | None |
| Hong Kong | MTR platform screens, Chinese and English alternating | Admiralty, Central, Hong Kong, Kowloon Tong | MTR Next Train (DATA.GOV.HK) | None |

How "live only" is enforced per source:

- **Transitous** (Washington, Paris, Berlin): only rows flagged `realTime` are kept.
- **SL**: only journeys carrying a live `prediction_state` are kept. Trains that haven't started their run yet are dropped.
- **MTA, TfL, MTR**: these are prediction feeds by design. A New York feed older than 10 minutes is treated as down.

Arrival words such as "À l'approche" (Paris), "ARR"/"BRD" (Washington), "Arriving"/"Departing" (Hong Kong) and the London approaching-train warning come from the live prediction: they appear when the predicted arrival is under 30 seconds away, or has passed but the train hasn't yet departed.

## Adding a station or a city

Stations live in `data/systems.js`. To add a station in an existing city, copy an entry and change the ID, name and source:

- **New York:** add `{ stop, label }` platforms using parent stop IDs from MTA static GTFS plus `N`/`S`, and list the feeds that serve them.
- **Washington, Paris, Berlin (or any Transitous city):** find the stop ID with `https://api.transitous.org/api/v1/geocode?text=<name>`. First check that the city's rows come back with `"realTime": true`.
- **London:** use the StopPoint ID (starts `940GZZLU`).
- **Stockholm:** use the SL site ID from `https://transport.integration.sl.se/v1/sites`.
- **Hong Kong:** use the MTR station code and its lines (see `data/hk-stations.js`).

A new city also needs a renderer in `js/renderers.js` and a stylesheet in `css/themes/`.

## Controls

The control bar hides after 4 seconds without mouse movement. ← / → change station and `F` toggles fullscreen. Auto-roam moves to another station every 5, 10 or 20 minutes, and mostly skips cities where the metro is shut overnight. **Chime** plays a soft original two-note figure when a train is about to arrive; it's off by default.

## Attribution

- New York: MTA. Data provided by the Metropolitan Transportation Authority.
- Washington: WMATA, via [Transitous](https://transitous.org/sources/) (map data © OpenStreetMap contributors) or WMATA directly.
- London: Powered by TfL Open Data. Contains OS data © Crown copyright and database rights.
- Paris: Île-de-France Mobilités, via Transitous.
- Berlin: VBB / BVG, via Transitous.
- Stockholm: SL / Region Stockholm, via [Trafiklab](https://www.trafiklab.se/).
- Hong Kong: MTR Corporation, via [DATA.GOV.HK](https://data.gov.hk/).
- Transitous is volunteer-run and free for open-source, non-commercial projects. Keep this repository public and licensed as below.
- Fonts: Google Fonts (Inter, Doto, Noto Sans TC, Roboto Condensed).

Board styles are evocations of each system's platform screens. They don't use operator logos, roundels or proprietary typefaces.

## Licence

MIT. See `LICENSE`.
