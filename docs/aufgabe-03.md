# Aufgabe 03 – Firestore-Aufgabenverwaltung

Stand: 31.10.2026. Branch: `feat/aufgabe-03-firestore-tasks`.
Ausgangscommit: `896794c7e4480b97a1cd7eae8c5fc2facc13aebc`.
Der Branch wurde direkt vom bestätigten HEAD erstellt, ohne Fetch/Pull und ohne
Verwendung des veralteten `origin/main`. Der Arbeitsbaum war zuvor sauber.

## Ergebnis und Abnahmestand

Die Aufgabenverwaltung ist implementiert und lokal mit TypeScript, Produktionsbuild,
Unit- und Browser-Komponententests geprüft. Die bestehende Authentication besteht
SDK- und Browser-Regressionstests. **Firestore-CRUD und die Security Rules sind noch
nicht gegen den echten Firestore-Emulator verifiziert:** Der Download der benötigten
Emulator-JAR scheitert in dieser Umgebung. Die entsprechenden Tests sind vorhanden,
wurden gestartet und sind wegen des fehlenden Emulators fehlgeschlagen. Damit ist
die vollständige technische Abnahme ausdrücklich noch offen.

Keine produktiven Security Rules deployt, keine produktiven Firebase-Daten angelegt,
keine Zugangsdaten hinzugefügt. Kein Merge, keine Prioritätsfunktion und kein
Erweiterbarkeitstest.

## Funktionale Anforderungen

| FR | Umsetzung |
| --- | --- |
| Aufgaben erstellen | Titel und Fälligkeitsdatum erforderlich; Beschreibung und Fach optional; Standardstatus Offen |
| Aufgaben anzeigen | Benutzerbezogene Liste, Beschreibung, Fach, Datum und Status; Leer- und Ladezustand |
| Aufgaben bearbeiten | Vorausgefülltes gemeinsames TaskForm; optionale Angaben können entfernt werden |
| Aufgaben löschen | Modaler Bestätigungsdialog, Abbrechen/Escape, Fokus auf Abbrechen, Fehler mit erneutem Versuch |
| Status dauerhaft ändern | Offen / In Bearbeitung / Erledigt; separate Firestore-Updates |
| Validierung | Getrimmter Titel, echte Kalenderdaten einschließlich Schaltjahren; Titel ≤200, Beschreibung ≤5000, Fach ≤100 Zeichen |
| Fehler und Zustände | Deutsche Fehlertexte, deaktivierte Aktionen während Requests, Eingaben bleiben bei Fehlern erhalten; Erfolg erst nach Speicherbestätigung |

Vergangene Fälligkeitsdaten sind zulässig. Datum ist ein lokales Kalenderdatum im
Format `YYYY-MM-DD`, kein UTC-Zeitpunkt; damit entstehen keine Zeitzonenverschiebungen.

## Architektur und Wiederverwendbarkeit

- `src/tasks/model.ts`: TaskInput/Task/Status, Normalisierung, reine Validierung,
  sichere Fehlermeldungen; unabhängig von React und Firebase.
- `repository.ts`: injizierbare Factory mit Firestore-Instanz und UID; alle Zugriffe
  unter `users/{userId}/tasks/{taskId}`; keine Firestore-Aufrufe in UI-Komponenten.
- `firebaseTasks.ts`: Firebase-Initialisierung und ausschließlich lokale DEV-Emulator-
  Konfiguration. Ungültige Emulator-Adressen führen nicht auf Produktion zurück.
- `useTasks.ts`: Ladezustand, Fehler, Cursor-Paginierung und Schutz gegen veraltete
  Antworten nach Unmount/Benutzerwechsel; keine dauerhaft offenen Listener.
- `TaskWorkspace.tsx`: Orchestrierung über TaskRepository als Abhängigkeit.
- `TasksPanel.tsx`: kleine Verbindung zur authentifizierten UID; bei Benutzerwechsel
  werden Formular, Liste und ausstehende UI-Zustände neu erzeugt.
- `TaskForm.tsx`: dasselbe Formular für Erstellen und Bearbeiten, mit Promise-basiertem
  onSave; keine Kenntnis des Speicherorts.
- `TaskList.tsx` / `DeleteTaskDialog.tsx`: darstellende Komponenten mit Callbacks.
- `App.tsx`: bestehendes geschütztes Dashboard und Konto bleiben erhalten;
  Aufgabenbereich wird mit lazy/Suspense nachgeladen.

Für Create wird vor dem Request eine Dokument-ID erzeugt und für erneute Versuche
behalten. Eine Transaktion schreibt nur ein noch nicht vorhandenes Dokument. Ein
identischer Wiederholungsversuch ist wirkungslos; abweichende vorhandene Daten werden
nicht überschrieben. Updates erhalten `createdAt`; `updatedAt` ist ein Serverzeitstempel.
Statusänderungen schreiben ausschließlich Status und Änderungszeit.

## Nichtfunktionale Anforderungen

| NFR | Maßnahme / Grenze |
| --- | --- |
| Security / Benutzertrennung | UID aus AuthProvider; Rules prüfen request.auth.uid für Lesen/Listen/Schreiben/Löschen. Pflichtfelder, Typen, Größen, Status, erlaubte Schlüssel und unveränderliches createdAt serverseitig geprüft. Fremde Pfade und nicht angemeldete Nutzer werden abgewiesen. Emulator-Nachweis noch offen. |
| Performance | 50 Dokumente pro Abfrage, Cursor nach Fälligkeitsdatum und Dokument-ID, keine Offsets und keine Sammlung aller Benutzer. Aufgabenbereich erst nach Anmeldung laden. |
| Skalierbarkeit | „Weitere Aufgaben laden“ begrenzt einzelne Reads. Benötigt nur die üblichen Single-Field-Indizes; kein Collection-Group-Query. Geladene Seiten bleiben bis zum Neuladen im Speicher. |
| Zuverlässigkeit | Serverabfragen statt stiller Cache-Fallbacks; Erfolg erst nach Firestore-Bestätigung, wiederholbarer Create, Doppelaktionen gesperrt, ausstehende Requests erklärt. Kein eigener Timeout, der einen möglicherweise noch laufenden Write fälschlich als gescheitert meldet. |
| Usability / Accessibility | Beschriftete Felder, Fehlerzuordnung, Fokus auf erstes ungültiges Feld, Statusmeldungen, nativer modaler Dialog, Tastatur-Abbruch, responsive Karten bei 320/390 px ohne horizontalen Überlauf. |
| Bestehende Funktionen | Login, Registrierung, Logout, Passwort-Reset, Session und geschütztes Dashboard unverändert funktionsfähig laut Regressionstests. |

Listen werden beim Start und nach bestätigten Änderungen geladen; kein Live-Sync
zwischen Tabs. Ein Neuladen setzt die Paginierung auf die erste Seite zurück.
Gleichzeitige Bearbeitungen desselben Dokuments verwenden Firestores übliche letzte
Schreiboperation; Statusupdates überschreiben andere Felder nicht. Offline-Writes
können bis zur Wiederverbindung ausstehen; UI verlangt dann, die Seite offen zu lassen.
Kein persistenter Offline-Cache und keine Offline-Erfolgsmeldungen.

## Designreferenz

[Figma Design](https://www.figma.com/design/I1M2Vz1vC3uDl0KWkyRyzF/Untitled?node-id=0-1).
Geprüft wurden der Seiten-Screenshot sowie Designkontext und Screenshots für
`4:672` (Aufgaben Desktop) und `32:35788` (Erstellen Desktop).
Die erste Seiten-Kontextanfrage lieferte keine Auswahl; über Metadaten wurden die
konkreten Ansichten ermittelt. Kein Figma-Make-Code übernommen.

Bestehende Inter-Schrift, dunkle Sidebar, Mint-Buttons, Farbvariablen, Eingaben,
14-px-Kartenradien und Abstände wiederverwendet. Das bestehende Konto bleibt in der
Übersicht; Tasks werden darunter ergänzt. Die neue UI ist damit eine funktionale
Anpassung an die vorhandene Anwendung, keine vollständige Kopie aller Figma-Screens.
Suche, Kalender, Statusfilter und Zähler aus dem Design sind nicht Teil dieser Aufgabe.
Die Downloads zusätzlicher Plus-/Check-SVGs antworteten mit HTTP 403; keine temporären
Asset-URLs oder Ersatzgrafiken eingebaut. Schaltflächen sind als Text bedienbar.
Diese Asset-Abweichung bleibt offen. Screenshots der Komponenten wurden bei
1440, 390 und 320 px erzeugt und die 320-px-Karte visuell geprüft.

## Befehle und Tests

Ausgeführt im Repository `/workspace/codex-learning-planner`:

```sh
git switch -c feat/aufgabe-03-firestore-tasks
npm ci --ignore-scripts --no-audit --no-fund --cache "$PWD/work/npm-cache"
npm run typecheck
npm run build
npm test
npm run test:auth:integration
python3 tests/browser-auth.py
python3 tests/browser-tasks.py
npm run test:tasks:integration
npm audit --json --cache "$PWD/work/npm-cache"
npm outdated --json --cache "$PWD/work/npm-cache"
git diff --check
git ls-remote origin HEAD
```

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| TypeScript / Produktionsbuild | Erfolgreich; nach Aufteilung keine Chunk-Größenwarnung |
| Unit-Tests | 13/13: 8 bestehende Auth-Tests und 5 neue Testgruppen für Aufgabenmodell/Validierung/Fehler |
| Auth SDK + echter lokaler Auth-Emulator | 12/12, einschließlich Login/Logout, Registrierung, Reset und Session-Observer |
| Bestehende Auth-Browserregression | 15/15 Prüfgruppen erfolgreich; keine pageErrors |
| Aufgaben-Browser-Komponenten | 6/6 Gruppen: Validierung/Fokus, Create/Ladezustand, Status, Edit/Fehler/Retry, mobile Karten, Löschdialog/Abbruch/Fehler/Retry; keine pageErrors |
| Firestore CRUD + Benutzertrennung | **Blockiert, nicht bestanden**: Emulator-JAR nicht herunterladbar; Test endet mit ECONNREFUSED auf 127.0.0.1:8081 |
| npm Audit | Exit 1: vier bekannte High-Paketmeldungen, nicht behoben |
| Git-Diff-Whitespace | Erfolgreich |
| GitHub-Verbindung | ls-remote mit Netzwerkfreigabe erfolgreich; Remote-HEAD entspricht dem Ausgangscommit |

Die Browser-Komponententests verwenden bewusst ein In-Memory-Repository aus
`tests/fixtures/`, ausschließlich als Vite-Testseite. Sie sind **kein Ersatz für den
Firestore-Emulator**. Die Fixtures werden vom Produktions-Entrypoint nicht importiert.
Die Browserprüfungen benötigen Python Playwright und Chromium unter `/usr/bin/chromium`.
Temporäre Screenshots/CLI/Cache liegen im ignorierten `work/`.

### Emulator-Prüfung wiederholen

Firebase CLI wurde isoliert in `work/emulator-tools` installiert; sie gehört nicht zu
den App-Abhängigkeiten. Java 21 ist vorhanden. Start mit ausschließlich Demo-Projekt:

```sh
mkdir -p work/config work/emulators
XDG_CONFIG_HOME="$PWD/work/config" \
FIREBASE_EMULATORS_PATH="$PWD/work/emulators" CI=true \
work/emulator-tools/node_modules/.bin/firebase emulators:start \
  --only auth,firestore --project demo-learning-planner
# In zweitem Terminal:
npm run test:auth:integration
npm run test:tasks:integration
```

Die lokalen Tests verwenden feste Loopback-Adressen und `demo-learning-planner`;
keine produktiven Credentials. `firebase.json` verweist auf lokale Rules und Ports
9099/8081. Der Firestore-Test prüft das echte Repository inklusive Create/Read/Update/
Status/Delete, Zeitstempel, idempotenten Create, 51 Dokumente über die Seitengrenze,
Fremdbenutzerzugriffe (get/list/create/update/delete), anonyme Zugriffe, ungültige
Felder und Manipulation von Zeitstempeln. Da der Emulator fehlt, sind dies vorhandene
Testfälle und keine belegten Testerfolge.

Für die UI-Regression lief Vite auf Port 5175 (abschließender Auth-Lauf nach
Neustart auf 5176) mit ausschließlich Demo-Konfiguration
und beiden lokalen Emulator-URLs. Produktionsbuilds ignorieren die Emulator-URLs.

## Fehler, Korrekturen und Sicherheitswarnungen

1. Default-Sandbox konnte den Proxy nicht erreichen. Paketinstallation/Audit und
   GitHub-Verbindung funktionierten mit Netzwerkfreigabe. Kein Fetch/Pull ausgeführt.
2. Vorhandenes node_modules war unvollständig (`tsc` fehlte). Mit npm ci aus bestehendem
   Lockfile korrigiert. Keine neue App-Abhängigkeit hinzugefügt.
3. Der direkt in Node ausgeführte TS-Repositorytest benötigt explizite `.ts`-Imports.
   TypeScript meldete TS5097; `allowImportingTsExtensions` bei bestehendem noEmit ergänzt.
4. Erster Build meldete zu großes Bundle. Aufgabenbereich per lazy/Suspense getrennt.
5. Emulatorstart scheiterte zuerst an fehlenden Standard-Cache-Verzeichnissen;
   Cache/Konfiguration ins ignorierte work-Verzeichnis gelegt. Danach scheitert der
   JAR-Download von `storage.googleapis.com/firebase-preview-drop/emulator/`.
   Kein Umgehen der Netzwerkrichtlinie und kein Produktions-Fallback.
6. Testselektor für Statusmeldungen traf während Reload zwei Elemente; gezielt auf
   Erfolgsmeldung eingeschränkt. Bestehender Browsertest benötigte seinen fehlenden
   Ausgabe-Elternordner; lokal erzeugt, bestehende Testdatei unverändert.
7. Nach dem Wiederherstellen der Pakete schlug ein Auth-Browser-Wiederholungslauf
   vor dem ersten Check fehl. Vite mit `--force` neu gestartet und den bestehenden
   Test lokal auf den freien Port 5176 gerichtet; danach wieder 15/15 erfolgreich.
8. Firebase 13.1.0 wurde probeweise untersucht: weiterhin gRPC 1.9.16 und dieselben
   Audit-Meldungen. Update zurückgenommen und ursprüngliches Lockfile wiederhergestellt.

[Audit-Rohbefund](verification/aufgabe-03/npm-audit.json):
`firebase@13.0.0 → @firebase/firestore@4.18.0 → @grpc/grpc-js@1.9.16`, zusätzlich
Compat. Vier High-Paketmeldungen propagieren die bekannten Advisories
[GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) und
[GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).
Korrektur laut Audit ab gRPC 1.13.6; Firebase verlangt ~1.9.0. Kein `audit fix --force`,
Override oder inkompatibles SDK-Downgrade ausgeführt.

Der [gemessene Browser-Modulgraph](verification/aufgabe-03/bundle-security.json)
enthält Firestore-Browsermodule und **keine @grpc-Module**. Die Meldungen sind damit
für die installierten Node-Abhängigkeiten weiterhin offen; das ist keine Behebung
oder allgemeine Sicherheitsfreigabe. Die isolierte Emulator-CLI meldet zusätzlich
Deprecated-Warnungen für node-domexception, uuid, json-ptr und glob; sie wird nicht
in der Anwendung ausgeliefert.

## Zeitaufwand und Einschränkungen

Zeitaufwand dieser Sitzung: ungefähr 15 Minuten, einschließlich Implementierung,
Tests, Fehlerkorrekturen, Netzwerk-/Emulator-Diagnose und Dokumentation; gerundete
Sitzungsschätzung, keine separate Zeiterfassungsmessung.

Vor Abnahme sind Firestore-Emulatorstart, Rules-Kompilierung und alle Emulatorfälle
nachzuholen. Rules prüfen das Datumsformat und Wertebereiche, aber keine vollständige
Kalenderarithmetik; diese übernimmt die Clientvalidierung. Ein manipulierter Client
könnte z. B. 31. Februar im eigenen Datenbereich speichern. Produktionsregeln wurden
nicht geprüft oder geändert: Eine sichere produktive Nutzung setzt separat geprüfte
und freigegebene Rules voraus. Keine produktive Bereitstellung in dieser Aufgabe.

Die Ansicht synchronisiert nicht live zwischen Clients; gleichzeitige Änderungen
können nach Neuladen sichtbar werden. Keine Such-/Filter-/Kalender-/Prioritätsfunktion.
Ein vollständiger visueller Gleichstand mit sämtlichen Figma-Ansichten und die neuen
SVG-Assets sind nicht bestätigt. Push und Draft-PR werden nur bei funktionierender
Verbindung versucht; endgültige Commit-/PR-Referenzen stehen im Abschlussbericht.
