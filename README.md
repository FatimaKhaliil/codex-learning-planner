# Lernplaner

React-Web-App mit TypeScript und Vite, entwickelt mit OpenAI Codex im Rahmen einer
evaluativen Bachelorarbeit. Aufgabe 02 ergänzt echte E-Mail-/Passwort-Anmeldung
über das vorhandene modulare Firebase SDK.

## Installation und Start

Node.js ab 22.12 und npm; geprüft mit Node 24.19.0 und npm 11.9.0.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Die angezeigte lokale URL öffnen. Ohne eingerichtetes Firebase bleiben Formulare
sichtbar, Auth-Aktionen sind gesperrt. Es gibt keinen simulierten Login.

## Firebase Authentication einrichten

1. In der Firebase Console eine Web-App registrieren und deren Web-Konfiguration
   aus **Projekteinstellungen → Allgemein → Deine Apps** in `.env.local` übernehmen.
2. Pflichtwerte: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Storage-Bucket und
   Messaging-Sender-ID sind für diese Aufgabe optional und werden nicht benutzt.
3. Unter **Authentication → Sign-in method** E-Mail/Passwort aktivieren.
4. Unter **Authentication → Settings → Authorized domains** lokale und spätere
   Hosting-Domains prüfen und bei Bedarf hinzufügen. Die Passwort-Reset-Vorlage
   und deren Absender/Link in der Console prüfen.
5. Nach Änderungen an Umgebungsvariablen den Entwicklungsserver neu starten.

`VITE_*`-Werte stehen im Browser zur Verfügung. Nur Firebase-Web-Konfiguration
verwenden; niemals Passwörter, Service-Account-Dateien oder private Schlüssel.
`.env.local` bleibt ignoriert. Die Beispielwerte in `.env.example` werden als
Platzhalter erkannt und ermöglichen keine Anmeldung.

## Funktionen und Navigation

- `#/register`: Registrierung mit E-Mail, Passwort und Passwortbestätigung.
- `#/login`: Anmeldung, verständliche Fehler und ein-/ausblendbares Passwort.
- `#/reset-password`: Passwort-Reset über `sendPasswordResetEmail`; die eigentliche
  Änderung erfolgt über den Firebase-gehosteten Link aus der E-Mail.
- `#/dashboard`: nur bei bekanntem angemeldetem Firebase-Benutzer sichtbar;
  Anmeldung und Registrierung wechseln automatisch dorthin. Abmeldung führt
  zurück zum Login. Der initiale Authstatus wird zuerst abgewartet.

`onAuthStateChanged` verwaltet den Benutzerzustand einschließlich Wiederherstellung
und Änderungen in anderen Tabs. Der Dashboard-Schutz betrifft die Oberfläche;
zukünftige Backend-Daten benötigen zusätzlich passende serverseitige Zugriffsregeln.
Noch keine Firestore-Aufgabenverwaltung oder Datenbankoperationen vorhanden.

Die Gestaltung orientiert sich an der [Figma-Designreferenz](https://www.figma.com/design/I1M2Vz1vC3uDl0KWkyRyzF/Untitled?node-id=0-1).
Es wurde kein Figma-Make-Code übernommen. Inter wird lokal über `@fontsource/inter`
geladen; lokale Figma-Grafikexporte liegen in `public/assets`.

## Typprüfung, Build und lokale Vorschau

```bash
npm run typecheck
npm run build
npm run preview
npm test
```

`build` führt zuerst die Typprüfung aus und schreibt anschließend nach `dist/`.
`preview` ist eine lokale Build-Vorschau, kein Produktionsserver. `npm test` prüft
Validierung und Fehlermeldungen ohne Netzwerk oder echte Zugangsdaten.

## Optionale lokale Auth-Integrationstests

Die Integrationstests verwenden ausschließlich ein lokales Demo-Projekt und
zufällig erzeugte Testzugangsdaten. Keine echten Firebase-Werte nötig.

Terminal 1:

```bash
npx --yes firebase-tools@15.34.0 emulators:start --only auth --project demo-learning-planner
```

Terminal 2:

```bash
npm run test:auth:integration
```

`firebase.json` startet nur den Auth-Emulator auf `127.0.0.1:9099`, ohne Emulator-UI.
Der Test registriert einen temporären Nutzer, prüft Login/Logout, Auth-Observer,
Fehler und einen vollständigen Reset und löscht den Nutzer bei erfolgreichem Lauf.
Der Emulator verschickt keine echten E-Mails.

Für die Oberfläche gegen denselben Emulator den Entwicklungsserver mit vier
lokalen Konfigurationsplatzhaltern und der Emulator-Adresse starten (POSIX-Shell):

```bash
VITE_FIREBASE_API_KEY=emulator-only-api-key \
VITE_FIREBASE_AUTH_DOMAIN=demo-learning-planner.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=demo-learning-planner \
VITE_FIREBASE_APP_ID=emulator-only-app-id \
VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 \
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Dann optional `python3 tests/browser-auth.py` ausführen. Dieser zusätzliche
Prüflauf benötigt Python Playwright und Chromium unter `/usr/bin/chromium`, prüft
Eingaben, Navigation, echte UI-Auth-Abläufe gegen den Emulator und responsive
Ansichten. Seine Belege landen im ignorierten `work/aufgabe-02/browser/`.
Er erzeugt zufällige lokale Testkonten; diese bei Bedarf im Emulator entfernen
oder den nicht persistent gestarteten Emulator beenden. Keine Passwörter im Testcode.

`VITE_FIREBASE_AUTH_EMULATOR_URL` wird nur im Vite-Entwicklungsmodus und nur mit
`localhost`/`127.0.0.1` akzeptiert. Für echte Firebase-Verwendung weglassen und
alle lokalen Testplatzhalter ersetzen. Niemals mit Emulator-Platzhaltern deployen.

## Dokumentation und bekannte Einschränkungen

- [Aufgabe 01](docs/aufgabe-01.md) und [abschließende Sichtprüfung](docs/visuelle-pruefung-aufgabe-01.md).
- [Aufgabe 02: Ergebnisbericht, Dauer, Tests und offene Punkte](docs/aufgabe-02.md).
- [Prüfbelege Aufgabe 02](docs/visual/aufgabe-02/).

`npm audit` meldet aktuell vier als high markierte Pakete über zwei gRPC-Advisories
im transitiven Firestore-Pfad von Firebase 13. Die installierte Lücke ist nicht
behoben; Firestore/gRPC waren im gemessenen Browser-Modulgraph nicht enthalten.
Ein inkompatibles Firebase-Downgrade oder `npm audit fix --force` wurde nicht ausgeführt.
Details und Grenzen stehen im Ergebnisbericht.
