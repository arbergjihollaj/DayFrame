# DayFrame

Mobile-first Daily-Dashboard fuer Arber mit Next.js, SQLite, Docker und vorbereiteten Integrationen fuer iCal, Wetter, RSS und OpenAI.

## Lokale Entwicklung

```bash
cp .env.example .env
npm install
npm run dev
```

Die App laeuft lokal unter `http://localhost:3000`. Im Docker-/Homelab-Betrieb ist sie auf dem Host unter `http://localhost:3060` erreichbar.

## .env

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=dein_key
OPENAI_MODEL=gpt-5-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
APP_BASE_URL=http://localhost:3060
TZ=Europe/Berlin
```

Du kannst den KI-Zugang auch direkt in der App unter `Settings` eintragen. DayFrame schreibt Provider, Modell und API-Key serverseitig in `.env`. Ohne konfigurierten KI-Key erstellt DayFrame einen lokalen Basisplan und zeigt im Dashboard einen Hinweis. Secrets werden nur serverseitig verwendet.

## Docker starten

```bash
cp .env.example .env
docker compose up --build -d
```

Danach ist die App im Heimnetz unter `http://<homelab-ip>:3060` erreichbar. Die SQLite-Datei liegt im Docker-Volume `dayframe-data` unter `/app/data/dayframe.sqlite`.

## Erste Einrichtung

Beim ersten Start erscheint der Setup-Assistent. Er fragt:

- iCal-Link
- Wetter-Ort
- Theme
- Routine-Level
- News-Kategorien

Der Assistent kann uebersprungen werden. Dann zeigt das Dashboard Hinweise fuer fehlende Datenquellen statt Demo-Daten.

## Einstellungen

Im Tab `Settings` kannst du iCal-Link, Wetter-Ort, Theme, Routine-Level, RSS-Quellen, Generierungszeit, Wunsch-Schlafenszeit und Wunsch-Aufstehzeit pflegen.

## Automatisches Briefing testen

Der Docker-Compose-Stack startet einen separaten `cron`-Service. Dieser ruft minuetlich:

```text
http://app:3000/api/briefing/cron
```

Die Route prueft die in SQLite gespeicherte Generierungszeit und erzeugt nur dann ein Briefing, wenn es fuer den aktuellen Tag noch keines gibt. Zum schnellen Testen:

1. In `Settings` die Generierungszeit auf die naechste Minute stellen.
2. Kurz warten.
3. Dashboard neu laden.

Manuell geht es jederzeit ueber das Refresh-Icon im Dashboard. Es fragt vorher nach und ersetzt das Briefing des Tages.

## Tagesplan-Engine

Die Tagesplanung sitzt in `src/lib/planning.ts` und bleibt deterministisch. KI darf weiterhin Begruessung, News-Auswahl oder Text abrunden, aber der Kernplan entsteht aus Regeln:

- feste Uni-/Kalenderbloecke plus automatische Pendelzeit
- Deadline-Expansion fuer Testate und Hausarbeiten
- Wochenziele je Fach mit konservativem Donnerstag
- P1-P4-Scoring mit P1-Kappung gegen Ueberplanung
- Normalplan plus Emergency-Fallback
- Schlafziel, Lern-Cut-off, Sportentscheidung und Deferred Tasks

Seed-Daten fuer Kurse, Deadlines und Workout-Plans liegen im selben Service. Morning Check-in speichert Schlaf/Energie/Stress unter `/api/check-in/morning`; Evening Check-in schreibt Task-Status unter `/api/check-in/evening`, damit offene Aufgaben als Carry-over wieder in die Planung fliessen.

## Nuetzliche Checks

```bash
npm run lint
npm test
npm run build
curl http://localhost:3000/api/settings
curl -X POST http://localhost:3000/api/briefing/generate
```
