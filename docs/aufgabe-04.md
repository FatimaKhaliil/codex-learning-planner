# Aufgabe 04 – Figma-getreue Aufgabenansicht und Navigation

Ausgangscommit: `b5f57436a208a293cd7ed9b3e5dd5e3e9b891b53` (Merge von Aufgabe 03).
Branch: `feat/aufgabe-04-figma-tasks-navigation`. Arbeitsbaum zu Beginn sauber;
HEAD vor der ersten Änderung exakt geprüft. Ausschließlich auf diesem Branch gearbeitet.
Kein Merge, kein Firebase-Deployment und keine produktiven Rules geändert.

## Ergebnis und Anforderungen

Die geschützte Anwendung besitzt eine gemeinsame Seitenschale und getrennte Routen:
`#/dashboard`, `#/tasks`, `#/calendar` und `#/profile`. Kalender und Profil zeigen
unmissverständlich, dass sie noch nicht implementiert sind; dort wird keine fertige
Kalender-/Profilfunktion vorgetäuscht. Logout bleibt über Sidebar bzw. Profilziel mobil
verfügbar. Authentifizierte Nutzer können zwischen Seiten wechseln, ohne dass der
bisherige Auth-Redirect jede Navigation auf das Dashboard zurücksetzt.

| FR | Umsetzung |
| --- | --- |
| Gemeinsame Navigation | Wiederverwendbares AppLayout mit 240-px-Sidebar, Mobile-Header, unterer Mobile-Navigation, aktiven Links, Profilzugang und Logout |
| Eigene Aufgabenansicht | Aufgabenroute und Verlinkung aus Sidebar, Mobile-Navigation und Übersicht |
| Figma-Gestaltung | Original-SVGs, Inter einschließlich Gewicht 500, Farben, Karten, kompakte Statusauswahl und Aktionsmenü |
| Suche | Groß-/Kleinschreibung ignorierende Teilstringsuche in Titel, Beschreibung und Fach, kombinierbar mit Status |
| Statusfilter | Alle, Offen, In Bearbeitung, Erledigt; Leerzustand bei keiner Übereinstimmung |
| Fortschritt | Offen (= nicht abgeschlossen), erledigt und Gesamtzahl über den vollständigen geladenen Firestore-Bestand; Suche verändert globale Zähler nicht |
| CRUD | Bestehende Write-Funktionen weiterverwendet; Create/Edit über gemeinsames TaskForm, Bestätigung vor Delete, Statuswechsel in Karten und Formular |
| Formular-/Löschkontext | Eigener Seitentitel, Zurück-Aktion, Standardstatus Offen beim Erstellen; in-page Löschbestätigung nach Figma statt Overlay |
| Echte Daten | Produktiv ausschließlich authentifizierte Firebase-/Firestore-Daten. Keine Beispielpersonen, Aufgaben oder erfundenen Zähler in App-Komponenten |

Beschreibungen bleiben gespeichert, werden durchsucht und sind im Bearbeitungsformular
lesbar/editierbar. Die kompakte Liste zeigt entsprechend Figma Titel/Fach/Datum/Status.
Nicht vorhandene Anzeigenamen werden nicht durch Figma-Personen ersetzt; stattdessen
erscheinen die wirkliche E-Mail bzw. eine neutrale Begrüßung. Das Kopfdatum wird aktuell
formatiert und nicht auf das Beispieldatum des Designs festgesetzt.

## Architektur, Wiederverwendung und NFR

- Unverändert: Firebase Authentication, AuthProvider, Validierung/Fehlerlogik,
  Firebase-Initialisierung, Aufgabenmodell und `TaskRepository` mit dem Pfad
  `users/{userId}/tasks/{taskId}`. Keine Datenmigration und kein geändertes Schema.
- `AppLayout` ist eine darstellende, wiederverwendbare Seitenschale mit Props;
  der bestehende Auth-Guard schützt die Einbindung im App-Entrypoint.
- `TasksPanel` verbindet Auth/Repository mit der Oberfläche; `TaskWorkspace`
  orchestriert Seiten, Suche, Filter und bestehende Mutationen.
- `TaskForm` bleibt für Create/Edit gemeinsam. `StatusSelect` wird in Karten und
  Formular wiederverwendet. `ProgressCard` wird in Aufgaben und Übersicht verwendet.
- `queries.ts` enthält reine Such-/Zählerfunktionen sowie den testbaren Cursorlader;
  keine Firebase-Writes in darstellenden Komponenten.
- Nach Login-/Benutzerwechsel bleibt Firebase der einzige Ursprung der Identität.
  Der Bereich wird anhand der UID neu erzeugt; Antworten veralteter Ladevorgänge
  werden verworfen. Sichtbare Aktionen sind während Mutationen gesperrt.
- Menü: Fokus auf erste Aktion, Escape und Außenklick schließen. Löschung verlangt
  ausdrückliche Bestätigung; Fokus startet sicher auf Abbrechen. Escape bricht ab.
  Feldfehler, erste Fehlerfokussierung und deutschsprachige Meldungen bleiben erhalten.
- Responsive: 1440/390 px nach Figma; eigene Anpassung bei 320 px mit umbrechendem
  Fortschrittsbalken und kleineren Außenabständen. Keine fest erzwungene Kartenhöhe
  bei langen dynamischen Inhalten.

### Vollständige Suche und Zähler statt erster 50 Dokumente

Das vorhandene Repository liefert 50 Dokumente je Cursorseite. Der neue Lader liest
alle Seiten, dedupliziert IDs und veröffentlicht erst nach vollständigem Erfolg einen
Bestand. Scheitert eine spätere Seite, erscheinen Fehler und Wiederholungsmöglichkeit,
keine scheinbar vollständigen Teilzähler. Wiederholte/fehlende Cursor werden abgefangen.
Ein abgelöster Ladevorgang fordert keine weiteren Seiten an.

Suche und Statusfilter arbeiten auf diesem vollständigen Bestand. Die Oberfläche
zeigt jeweils bis zu 50 Treffer und kann weitere anzeigen, ohne den Suchraum auf die
erste sichtbare Seite zu begrenzen. Nach bestätigten Mutationen wird neu geladen.
Die globalen Fortschrittswerte hängen weder von Suchtext noch Statusfilter ab.

**Bewusste Grenze:** Diese Lösung liest O(N) Dokumente und hält den Benutzerbestand
im Speicher. Sie ist für einen Lernplaner nachvollziehbar, aber keine Lösung für
unbegrenzt große Sammlungen. Für große Datenmengen wären serverseitige Aggregationen
und eine spezifizierte Suchstrategie separat zu implementieren. Cursorabfragen sind
keine transaktional konsistente Momentaufnahme über alle Seiten; parallele Änderungen
anderer Clients können zwischen den Abfragen auftreten. Kein Live-Sync hinzugefügt.
Die Fälligkeit-/Dokument-ID-Sortierung des bestehenden Repository bleibt erhalten.

## Geänderte Dateien

| Dateien | Zweck |
| --- | --- |
| `src/App.tsx` | geschützte Navigation um Aufgaben/Kalender/Profil erweitern, alte eingebettete Dashboard-Struktur ersetzen |
| `src/layout/AppLayout.tsx`, `Icon.tsx` | gemeinsame Seitenschale, Navigationsziele, originale Figma-Icons |
| `src/main.tsx`, `src/planner.css` | Inter 500 und separate Styles für die geschützte Anwendung |
| `src/tasks/TaskWorkspace.tsx`, `TasksPanel.tsx` | eigenständige Aufgabenansicht, Übersichtsanbindung, Filter/Suche, Seitenkontext und Auth-Verbindung |
| `src/tasks/queries.ts`, `useTasks.ts` | vollständiges Cursorladen, reine Suche/Statistik, Lade-/Fehlerzustände |
| `src/tasks/ProgressCard.tsx`, `StatusSelect.tsx`, `TaskList.tsx` | wiederverwendbare Fortschritts-/Statusdarstellung, kompakte Karten und Aktionsmenü |
| `src/tasks/TaskForm.tsx`, `DeleteTaskDialog.tsx` | gemeinsames Formular und Löschbestätigung im Figma-Seitenkontext |
| `public/assets/figma/*.svg` | 23 unveränderte Original-SVG-Exporte; Dateinamen entsprechen Figma-Node-IDs |
| `tests/tasks-query.test.ts` | vollständige Seitenladung, Suche/Status/Statistik, Fehler und Abbruch |
| `tests/browser-auth.py` | bestehende Auth-Regression an die neue Oberfläche anpassen |
| `tests/browser-navigation.py`, `tests/browser-tasks.py` | neue Aufgaben-/Navigationsregression; alter Browser-Einstieg delegiert auf den erweiterten Test |
| `tests/fixtures/navigation.html`, `navigation.tsx` | isolierte Testseite mit injiziertem Repository; nicht vom Produkt importiert |
| `docs/aufgabe-04.md`, `docs/visual/aufgabe-04/` | Dokumentation, Referenz-/Browserbilder, Messwerte und Testbelege |

`firestore.rules`, `firebase.json`, `package.json`, Lockfile, Repository-Writes und
Auth-Implementierung wurden mit dem Ausgangscommit verglichen und nicht geändert.
Bekannte npm-Audit-Befunde aus Aufgabe 03 sind damit nicht behoben; es wurde kein
Override, Downgrade oder `npm audit fix --force` ausgeführt.

## Figma-Referenzen, Assets und visueller Vergleich

[Figma Design](https://www.figma.com/design/I1M2Vz1vC3uDl0KWkyRyzF/Untitled?node-id=0-1):
Aufgaben Desktop `4:672`, Mobile `4:741`; Übersicht Desktop `32:35294`, Mobile
`32:35390`. Zusätzlich wurden die bereits analysierten Formular-/Löschframes
`32:35788`, `32:35853`, `32:35900`, `32:36024`, `32:36124` herangezogen.
Designkontext und Screenshots aus der Soll-Ist-Analyse wurden weiterverwendet;
keine Figma-Make-Implementierung übernommen.

Die früher gescheiterten SVG-URL-Downloads wurden durch einen **rein lesenden**
Figma-Plugin-API-Export (`SVG_STRING`) aus den konkreten Icon-Nodes ersetzt. Die
Dateien sind unverändert und behalten ihre nativen 12-/16-/20-px-Maße. Ein Export-
Inventar steht in [assets.json](visual/aufgabe-04/assets.json). Keine temporären
Figma-URLs in der Anwendung. Für die implementierten Icons fehlen keine Original-
Assets. Ein erneuter `get_screenshot`-Abruf lief in einen Timeout; anschließend lieferte
`node.screenshot({scale:1})` die Originalreferenzen 1440×800 und 390×874 ohne Designänderung.

**Abnahmegrenze:** Die Aufgaben-/Navigations-Screenshots verwenden eine ausdrücklich
isolierte Browser-Komponentenfixture mit drei synthetischen, nicht aus Figma kopierten
Testdatensätzen und einem injizierten In-Memory-Repository. Diese Daten stehen nicht
im Anwendungscode. Der Produktionsdatenpfad bleibt Firestore; eine vollständige
Screenshot-/CRUD-Abnahme mit realen Firestore-Aufgaben war in dieser Cloud nicht
möglich. Die unten stehenden Vergleiche belegen Gestaltung und UI-Verhalten, keine
erfolgreiche Firestore-Integration. Die Auth-Browserprüfung verwendet dagegen das echte
Firebase SDK und den echten lokalen Auth-Emulator.

Referenzen und direkte Gegenüberstellungen:

- [Desktop Figma](visual/aufgabe-04/figma-tasks-1440.png),
  [Desktop Browser](visual/aufgabe-04/tasks-1440.png),
  [Desktop nebeneinander](visual/aufgabe-04/comparison-1440.png)
- [Mobile Figma](visual/aufgabe-04/figma-tasks-390.png),
  [Mobile Browser](visual/aufgabe-04/tasks-390.png),
  [Mobile nebeneinander](visual/aufgabe-04/comparison-390.png)
- [320-px-Prüfung](visual/aufgabe-04/tasks-320.png),
  [Übersicht Desktop](visual/aufgabe-04/overview-1440.png),
  [Übersicht Mobile](visual/aufgabe-04/overview-390.png)
- [Erstellen](visual/aufgabe-04/create-1440.png),
  [Bearbeiten](visual/aufgabe-04/edit-1440.png),
  [Löschbestätigung](visual/aufgabe-04/delete-1440.png)

Messwerte aus `getBoundingClientRect`, Einheiten CSS-Pixel, ungezoomtes Chromium:

| Element | Figma-Soll | Browser nach Korrektur | Unterschied |
| --- | --- | --- | --- |
| Desktop Sidebar | Breite 240 | 240 | 0 |
| Desktop Header | Höhe 96 | 96 | 0 |
| Desktop Fortschritt | x376/y134, 992×80 | x376/y134, 992×80 | 0 |
| Desktop erste Karte | x376/y301, 992×84 | x376/y301, 992×84 | 0 |
| Desktop Statusfilter | x1041/y242, 327×41 | x1041/y242, 327×41 | 0 |
| Mobile Header | Höhe 80 | 80 | 0 |
| Mobile Fortschritt | x20/y104, 350×80 | x20/y104, 350×80 | 0 |
| Mobile erste Karte | x20/y374, 350×126 | x20/y374, 350×126 | 0 |
| Mobile Statusfilter | x20/y318, 350×38 | x20/y318, 350×38 | 0 |
| 320 px | kein eigener Figma-Frame | Header 320×80, Inhalt x16/Breite288, kein horizontaler Überlauf | adaptive Prüfung, kein Pixelvergleich behauptet |

Rohwerte und überprüfte Icon-Geometrie:
[browser-results.json](visual/aufgabe-04/browser-results.json).

Iterationen: Zunächst waren Fortschritts-/Aufgabenkarten durch CSS-Außenborder zwei
Pixel zu hoch und um einen Pixel nach innen versetzt. Padding korrigiert. Native
Statusfelder hatten wegen der längsten Option alle dieselbe Breite; je Status auf
80/128/92 px begrenzt. Suchfelder waren wegen vererbter Label-Schrift fett; auf 400
korrigiert. Desktop-Filterbreite auf 327 px und mobile Überschriftenzeile auf 22 px
angepasst. Ein Inline-Baseline-Abstand von 0,5 px im Aktionscontainer wurde durch
Flex-Layout entfernt. Anschließend erneut aufgenommen und unmittelbar verglichen.

**Verbleibende Abweichungen:** Andere Titel, Fälligkeiten, aktuelles Datum und echte
Benutzeridentität sind beabsichtigt. Deshalb kein globaler Pixel-Diff-Prozentwert und
keine Behauptung vollständiger Pixelgenauigkeit. Lange Texte dürfen Karten vergrößern.
Native Select-Popups und Date-Picker sind browser-/betriebssystemabhängig; das Datum-
Icon wird in Chromium mit dem Original-SVG dargestellt. Sichtbare Fokusrahmen bleiben
erhalten und unterscheiden fokussierte Formulare vom leeren Figma-Zustand. Die
Fachmarkierung verwendet eine konsistente Status-Farbvariante statt eines neuen,
persistierten Fach-Farbschemas. Die untere Navigation steht wie im Frame nach dem
Inhalt und nicht als verdeckendes, fixiertes Overlay. Profil/Kalender bleiben
gekennzeichnete Platzhalter.

## Tatsächlich ausgeführte Tests

| Prüfung | Ergebnis |
| --- | --- |
| `npm run typecheck` | erfolgreich |
| `npm run build` | erfolgreich; keine Chunk-Größenwarnung, Aufgabenbereich separat geladen |
| `npm test` | 17/17 Testgruppen erfolgreich: 13 bestehende plus vier neue Sammlungs-/Suchtests |
| `npm run test:auth:integration` | 12/12 erfolgreich gegen echten Auth-Emulator |
| `python3 tests/browser-auth.py` | 16/16 Prüfgruppen erfolgreich; vier geschützte Routen, Registrierung/Login/Logout/Reset, Fehlermeldungen, Session/Tab-Synchronisierung, neun Auth-Ansichten bei 1440/390/320; keine pageErrors |
| `python3 tests/browser-navigation.py` | 6/6 Gruppen erfolgreich gegen isoliertes Repository: Navigation, Suche/Filter, CRUD/Fehler/Retry/Fokus, 54 Datensätze über Seitengrenze, responsive Icons/Layouts; keine pageErrors |
| `python3 tests/browser-tasks.py` | aktualisierter Kompatibilitätseinstieg auf dieselbe erweiterte Regression erfolgreich ausgeführt; nicht als zusätzlich unabhängige Testsuite gezählt |
| `npm run test:tasks:integration` | **nicht erfolgreich ausführbar**: ECONNREFUSED 127.0.0.1:8081, fehlender Firestore-Emulator |
| `git diff --check` | erfolgreich |

Die neuen Unit-Tests lesen 123 Datensätze über drei Cursorseiten. Suchtreffer in Titel,
Fach und Beschreibung liegen ausdrücklich nach der ersten Seite. Alle Statusgruppen
und globale Zahlen, Fehler auf einer späteren Seite sowie wiederholte Cursor und
Abbruch werden geprüft. Der Browsertest findet ebenfalls einen Treffer hinter der
50er-Grenze und bestätigt Gesamtzahl 54 statt 50.

[Auth-Browserprotokoll](visual/aufgabe-04/auth-browser-results.json).
Testseiten sind ausschließlich im tests-Verzeichnis und werden vom Produktions-
Entrypoint nicht importiert. Synthetische UI-Tests werden nicht als echte Firebase-
Daten oder Emulator-Sicherheitsnachweise ausgegeben. Keine produktiven Daten geändert.

### Lokale Wiederholung

Vite läuft für die Browserprüfungen auf Loopback-Port 5180, der Auth-Emulator auf 9099.
Der Entwicklungsserver verwendet ausschließlich das Demo-Projekt
`demo-learning-planner` und lokale Emulator-URLs. Für vollständige Emulatorläufe:

```sh
# Firebase CLI wurde nur temporär in work/emulator-tools installiert.
XDG_CONFIG_HOME="$PWD/work/config" \
FIREBASE_EMULATORS_PATH="$PWD/work/emulators" CI=true \
work/emulator-tools/node_modules/.bin/firebase emulators:start \
  --only auth,firestore --project demo-learning-planner

# Separates Terminal; ausschließlich lokale Testkonfiguration:
VITE_FIREBASE_API_KEY=emulator-only \
VITE_FIREBASE_AUTH_DOMAIN=demo-learning-planner.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=demo-learning-planner \
VITE_FIREBASE_APP_ID=emulator-app \
VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 \
VITE_FIREBASE_FIRESTORE_EMULATOR_URL=http://127.0.0.1:8081 \
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort

npm run typecheck
npm run build
npm test
npm run test:auth:integration
npm run test:tasks:integration
python3 tests/browser-auth.py
python3 tests/browser-navigation.py
```

Python Playwright und Chromium unter `/usr/bin/chromium` werden von den Browsertests
benötigt. Echte produktive Firebase-Schlüssel sind für diese Befehle nicht erforderlich.

## Fehler und Korrekturen

1. Firestore-Emulatorstart scheiterte zuerst am bereits belegten Auth-Port 9099.
   Vorhandenen Auth-Emulator weiterverwendet, Firestore isoliert gestartet. Dessen
   JAR-Download von `storage.googleapis.com/firebase-preview-drop/emulator/` scheitert
   weiterhin. Kein Produktions-Fallback und kein Umgehen der Netzwerkrichtlinie.
2. Der alte Auth-Emulator endete während des ersten SDK-Laufs. Nur Auth neu gestartet;
   anschließend 12/12 SDK- und 16/16 Browsergruppen erfolgreich. Testnutzer gezielt gelöscht.
3. Neuer Unit-Test verglich periodische Prozentwerte exakt. Toleranz für IEEE-754-
   Rundung eingeführt; fachliche Zähler bleiben exakt geprüft.
4. Browserselektor erwartete `textbox`, das Suchfeld hat korrekt `searchbox` als Rolle.
   Test korrigiert. Unsichtbare Fixture-Steuerbuttons werden explizit nur testseitig angesprochen.
5. Review fand Leerzustand aus einer alten Suche auf der Übersicht, nicht deaktivierte
   Menüaktionen während Mutationen und eine fehlende Überschrift-ID bei Löschung.
   Korrigiert; Übersicht zusätzlich browserseitig nach erfolgloser Suche geprüft.
6. Bestehender Aufgaben-Browsertest erwartete die alte Modal-/Formularoberfläche.
   Einstieg auf die erweiterte CRUD-/Navigationsregression umgestellt, kein bewusst
   defekter alter Test zurückgelassen.
7. Visuelle Größenabweichungen wurden anhand der tatsächlichen Figma-/Browserbilder
   korrigiert; siehe Messwerte und Iterationen oben.

## Offene Punkte und Abnahmegrenze

- Vollständiger Firestore-Emulator-/Sicherheitstest und Browserdurchlauf mit echten
  Firestore-Aufgaben für **diesen Commit** müssen in einer erreichbaren Umgebung
  nachgeholt werden. Die früheren Windows-Ergebnisse von Aufgabe 03 ersetzen das nicht.
- Kalender und Profil werden erst in späteren Aufgaben vollständig umgesetzt.
- O(N)-Laden, Momentaufnahmen über mehrere Cursorabfragen und native Popup-/Datums-
  Darstellung bleiben die oben genannten Grenzen.
- Bekannte npm-Befunde bleiben nach Bewertung aus Aufgabe 03 offen; kein neuer
  Sicherheitsfix oder produktiver Rules-Stand wird behauptet.
- Kein universeller Pixelgleichstand und keine abgeschlossene produktive Abnahme.

## Gemessene Bearbeitungsdauer

Beginn: 31.10.2026, 14:10:00 Uhr Europe/Berlin (13:10:00 UTC).
Ende der Implementierungs-, Test- und Dokumentationsphase: 31.10.2026,
14:32:36 Uhr Europe/Berlin (13:32:36 UTC).
Gemessene verstrichene Dauer: **22 Minuten 36 Sekunden** (1356 Sekunden).
Die Zeit wurde aus zwei UTC-Uhrabfragen berechnet, nicht geschätzt. Die getrennte
Soll-Ist-Analyse und Branch-Vorbereitung aus vorherigen Aufträgen sowie der danach
folgende Git-Push/PR-Vorgang sind nicht enthalten. Parallel ausgeführte Prüfungen
werden als verstrichene Sitzungszeit und nicht mehrfach als Personenzeit gezählt.
