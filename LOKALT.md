# Lokal utvikling på Windows

Arbeidskopi med gjenopprettet Git-historikk: `oslo-hide-seek/` ved siden av
eksportens `source/`. Originaleksporten og bundle-filen er beholdt.
Git-remote: https://github.com/hemund99/Hide-Seek-OSLO.git.

## Start fra PowerShell

Åpne PowerShell i denne prosjektmappen:

```powershell
.\scripts\local.ps1 install:ci
.\scripts\local.ps1 db:migrate:local
.\scripts\local.ps1 dev
```

Åpne http://127.0.0.1:5173/ (bruk samme adresse hver gang for innloggingscookie).
Stopp med Ctrl+C. Hvis PowerShell blokkerer lokale skript, kan de kjøres med
`powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 dev` uten å endre
maskinens permanente policy.

`local.ps1` finner vanlige installerte verktøy først, og legger til Codex sine
bundlete verktøy i prosessens PATH dersom tilgjengelig. Det installerer ingenting
globalt. Uten Codex-runtime trenger du Node >=22.13.0, pnpm 11.25.0, Git og
Python 3. Oppsettet ble kjørt med Node 24.19.0 og pnpm 11.25.0 på Windows.
`pnpm install --frozen-lockfile` fungerer også direkte når pnpm finnes i PATH.
Den tidligere Bash-baserte installasjonen er beholdt for managed-linux;
`install:ci` bruker nå Node/pnpm direkte i portable-profilen.

## D1 og R2

`wrangler.local.json` bruker samme lokale database-ID og bøttenavn som
`vite.config.ts`. Migrasjoner kjøres med **--local** og lagres i
`.wrangler/state`; Vite bruker samme standardplassering. Wrangler registrerer
migrasjonene og hopper over dem ved neste kjøring. Behold eksisterende SQL-filer
uendret. Ingen Cloudflare-konto, API-nøkkel eller produksjonsdata trengs.

R2 emuleres automatisk av Cloudflare/Vite. Bildebevis og databasefiler ligger i
den ignorerte `.wrangler/`-mappen. Ikke sjekk denne mappen eller `node_modules/`
inn i Git. `.openai/hosting.json` identifiserer fortsatt det eksisterende Sites-
prosjektet og er bevart. Disse lokale kommandoene publiserer ikke nettstedet.

## Lokal identitet

Forsøk å opprette et spill, og følg «Sign in with ChatGPT» i dialogen.
På loopback-adressen simuleres innloggingen som `local_seedy` /
`seedy@sites.test`. Cookie kreves; API-forespørsler uten innlogging får 401.
Dette er én delt testidentitet i alle innloggede lokale faner. Du kan bytte lag
i lobbyen for å kontrollere søker- og skjulervisningen. Dette bekrefter ikke
ekte ChatGPT OAuth eller flere samtidige, forskjellige brukere.

Mocken finnes bare i utviklingsserveren og avviser ikke-lokale klienter.
`pnpm start` kjører en bygget Worker uten denne innloggingssimuleringen.
Ikke eksponer utviklingsserveren på LAN for telefoninnlogging; det krever et
eget oppsett for HTTPS og autentisering.

## Kontroller

```powershell
.\scripts\local.ps1 typecheck
.\scripts\local.ps1 test:game
.\scripts\local.ps1 build
```

Transittesten: `python tests/transit-smoke.py` med Python 3 i PATH, eller Codex sin
bundlete Python. Windows-reparasjoner i testene: fil-URL ved dynamisk import i
Node og eksplisitt UTF-8 for transitdata i Python.

Kontrollert lokalt 17. oktober 2026:

- Låst installasjon, TypeScript, spilltest og 11 stasjonsregresjoner består.
- Full Vinext/Vite-bygging består på Windows.
- Begge D1-migrasjoner kjørt; gjentatt kjøring har ingen ventende migrasjoner.
- Nettleser: anonym visning, lokal innlogging, spilloppretting og lagbytte.
- R2: PNG lastet opp som skjuler og lastet ned med identiske bytes via API.
- Kartverket-kart laster uten API-nøkkel. Sinsen-søk viser linje 4 og 5;
  klikk på kartmarkøren viser «Sinsen · Regular lines: 4, 5».
- GPS-knappen ble prøvd som søker. Den innebygde nettleseren svarte
  «GPS unavailable. Try outside and keep this page open.» Ingen fysisk
  GPS-posisjon ble bekreftet.

Ekte ChatGPT-innlogging på Sites og fysisk GPS på telefon må fortsatt
verifiseres separat. Ingen produksjonsspill er opprettet eller endret her.

## GitHub

`origin` peker på brukerens repo. Kildehistorikken er gjenopprettet fra bundle
på grenen `main`. Koden synkroniseres til GitHub med `git push -u origin main`.
Ingen automatisk Sites-publisering er konfigurert her.
