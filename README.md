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
