# OSLO / Hide + Seek

A mobile-friendly, unofficial companion for an Oslo T-bane game. Bring the purchased physical deck and investigation book.

## Play

Create a game with 2–50 named teams. The first team starts as hider; all others cooperate as seekers. Share Site access with friends, then share the game invitation. Players sign in with ChatGPT and choose their team. Draw a common boundary before starting.

Small-game defaults: 30-minute hiding period, 500-metre hiding zones, five-minute question answers, ten-minute photo answers. The hider declares endgame; the host confirms a catch and enters physical-card time bonuses. The best round per team determines the scoreboard. Choose the next hider in setup before starting another round.

Question catalog: 58 small-game entries (20 matching, 20 measuring, 10 radar, 2 thermometer, 6 photo), plus 4 optional medium-game tentacles. Concise labels are used rather than reproducing the investigation book. Consult the purchased book for precise question and photo specifications. Thermometer distance is entered explicitly because metric/imperial editions differ. The clock begins when the GPS end position is submitted. Repeat questions perform the draw-and-keep sequence separately each time. Late answers pause scoring and award no cards.

## Map and location

Leaflet renders Kartverket topo or grey tiles, without an API key. Actual geometry and coordinates for all five Ruter metro lines come from Entur's Journey Planner, saved in `public/transit.json`; source and retrieval time are shown in the map. These are timetable route patterns, not live train positions or a guarantee of today's service. Check Ruter before a game. Refresh the snapshot with `python scripts/data/refresh-transit.py` and publish the update only when requested.

Seekers explicitly opt in to location sharing. The hiding team's location is rejected server-side. No background GPS guarantee: keep the page open. Location timestamps and accuracy circles show uncertainty; old updates use lower opacity. Game state polls every four seconds; position updates are sent no more often than every eight seconds. Radar and thermometer answers automatically shade excluded areas for seekers, retaining GPS uncertainty margins. The layer can be toggled, and manual annotations remain available. Other questions require manual map interpretation. Fresh GPS is required for every non-photo question and for the thermometer end position; question pins are no longer used. Place-category questions still require an agreed mapping provider; Google Maps links are included.

## Persistence and privacy

D1 stores rooms, memberships, game state and latest positions. R2 stores photo evidence, re-encoded client-side without original EXIF metadata. Membership is keyed to platform-authenticated user identity. Host, seeker and hider operations are authorized server-side. Private hand notes and seeker map annotations are filtered by role. Optimistic version checks prevent competing writes from silently overwriting state. Sharing a room code grants the ability to join a team; the game assumes cooperative participants. Site access is managed separately by the owner.

## Validation

`node tests/game-smoke.mjs` tests API logic against SQLite with a controlled clock, without deployed data. It covers role access, membership, hider privacy, GPS rejection, annotations, rounds, question serialization, lateness, repeats, conflicts, pause/resume, thermometer distances and scoring.

Type-check with the selected package manager's `exec tsc --noEmit`. Build using the Sites build helper. Local browser checks cover result cards, GPS failure handling, map shading and zoom-scaled stations. Physical phone GPS still requires device testing. The optional feature-detected WebMCP read tool could not be runtime-validated in a supported browser context.

## Boundaries

Not affiliated with Jet Lag, Nebula or Ruter. Physical deck drawing, casting costs, complex curse effects and exact photo framing are handled by the players. Timer settings and tentacle enablement can represent house rules. No Street View, automatic hider detection, background tracking service, or automatic transit disruption refresh.

## Role and map update

Hiders now have a private structured card hand: add physical draws, discard, play curses/power-ups, and hold bonus cards. Seekers retain the question workspace. Played curse effects become public; timed and completion-based curses can block questions. Held time bonuses are included automatically at catch. Generic power-up effects and casting costs remain manually resolved. The card hand is filtered server-side, including when the host is seeking.

The map offers Kartverket topo and grey views. Metro station markers show regular lines on hover and click above the non-interactive route geometry. No Google Maps API or user API key is needed. No Overpass dependency is used.

## GPS and answer feedback

Radar uses explicit HIT/MISS results. Thermometer uses red HOTTER and blue COLDER results. All results remain visible in Latest answers and Field log. Hiders choose a structured outcome separately from optional notes; inconclusive answers and vetoes never eliminate map areas. Old exact Yes/No/Hotter/Colder answers remain supported.

Question GPS is captured once when sending, independently of continuous location sharing. A fix must be no older than 60 seconds and accurate to 100 metres or better. Thermometer travel must exceed the chosen distance plus both fixes’ accuracy margins. The app never requests the hider’s GPS.

Run `node tests/gps-smoke.mjs` for GPS callback, error and freshness checks alongside the existing game and transit tests.


## Phone play, transit and notifications

Game creation and between-round settings have four shared switches: T-bane, tram, bus and train. Existing games default to T-bane. Routes, stops and the legend use matching mode colours; the five existing T-bane line colours are retained. Bus stops appear at zoom 14+ to keep the overview readable. Search includes enabled networks only. Extra networks cover the Oslo play area (59.75–60.05 N, 10.45–11.05 E), not every Norwegian route. Entur snapshots are scheduled geometry, not live closures or a guarantee that a service runs at the current time.

Refresh extra networks with `python scripts/data/refresh-networks.py`; this also clips and deduplicates the assets for phones. The metro refresh and regression tests remain separate.

Phones have a compact timer/control drawer, bottom Map / Questions / Field log / Teams navigation, 44px touch controls and 16px form fields. On each device, join a game and use Teams → Game notifications → Enable notifications. On iPhone/iPad, first add the site to the Home Screen from Safari and launch that icon. Use Test alert, then lock the phone and have another player send a question. Android users can enable in Chrome. Notification delivery depends on browser permission, connectivity and OS settings. In-app question/answer banners work while the game is open without push permission.

Push uses a service worker, encrypted Web Push and per-device D1 subscriptions. Questions alert the hiding team; answers/vetoes alert seekers. The sending account is excluded. A phone subscription follows the most recently opened game, and can be disabled from that phone. Private answers, GPS and card contents are not included on lock screens. Failed push delivery does not roll back game actions; expired subscriptions are removed. No page caching is implemented, so private game responses are not stored in the service worker.

Production `PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_KEY` are Sites runtime secrets; never commit them or rotate existing keys casually. Generate a VAPID pair once with web-push. For local push testing supply separate development keys through the local runtime environment. Migration 0002 adds the push subscription table and index. Run `pnpm db:migrate:local` locally; Sites applies the migration during deployment.

Validation: `pnpm typecheck`, `pnpm test:game`, `pnpm exec node tests/push-smoke.mjs`, `pnpm exec node tests/gps-smoke.mjs`, `python tests/transit-smoke.py`, then `pnpm build`. Push smoke tests mock delivery providers but exercise real payload encryption, recipient selection, membership checks and expiration cleanup. Physical iPhone/Android lock-screen delivery requires device testing.
