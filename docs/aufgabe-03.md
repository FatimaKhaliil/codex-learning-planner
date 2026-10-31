# Aufgabe 03 – Firestore-Aufgabenverwaltung

Stand: 31.10.2026. Branch: `feat/aufgabe-03-firestore-tasks`.
Ausgangscommit: `896794c7e4480b97a1cd7eae8c5fc2facc13aebc`.
Der Branch wurde direkt vom bestätigten HEAD erstellt, ohne Fetch/Pull und ohne
Verwendung des veralteten `origin/main`. Der Arbeitsbaum war zuvor sauber.

## Ergebnis und Abnahmestand

Die Aufgabenverwaltung ist implementiert und lokal mit TypeScript, Produktionsbuild,
Unit- und Browser-Komponententests geprüft. Die bestehende Authentication besteht
SDK- und Browser-Regressionstests. In der Cloud war die Firestore-Emulatorprüfung
wegen des fehlgeschlagenen JAR-Downloads blockiert. **Nachtrag vom 31.10.2026:**
Die Projektverantwortliche bestätigt erfolgreiche manuelle Firebase-Tests sowie alle
sieben Firestore-Emulator-Integrations- und Sicherheitstestgruppen auf ihrem lokalen
Windows-Rechner. Dies ist ein berichteter lokaler Testerfolg; die Cloud-Blockade ist
historisch dokumentiert. Windows-Testlogs und genaue Werkzeugversionen wurden in
dieser Sitzung nicht unabhängig geprüft. Die npm-Sicherheitsbewertung folgt unten;
Emulator-Erfolge sind kein Nachweis gegen die Ausnutzbarkeit anderer Bibliothekslücken.

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
| Security / Benutzertrennung | UID aus AuthProvider; Rules prüfen request.auth.uid für Lesen/Listen/Schreiben/Löschen. Pflichtfelder, Typen, Größen, Status, erlaubte Schlüssel und unveränderliches createdAt serverseitig geprüft. Fremde Pfade und nicht angemeldete Nutzer werden abgewiesen. Sieben Emulator-Testgruppen laut Bestätigung der Projektverantwortlichen unter Windows erfolgreich; in dieser Cloud nicht reproduziert. |
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
| Firestore CRUD + Benutzertrennung | Cloud-Lauf wegen fehlender JAR blockiert (ECONNREFUSED auf 127.0.0.1:8081). Nachtrag: laut Projektverantwortlicher alle sieben Integrations-/Sicherheitstestgruppen lokal unter Windows erfolgreich; keine unabhängige Logprüfung in dieser Sitzung. |
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
Felder und Manipulation von Zeitstempeln. In der Cloud waren dies wegen des fehlenden Emulators nur vorhandene Testfälle.
Der spätere erfolgreiche Windows-Lauf aller sieben Gruppen wurde von der
Projektverantwortlichen bestätigt; Rohprotokolle wurden hier nicht eingesehen.

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
Korrekturen laut Advisories in gRPC 1.13.6 und 1.14.5; auch 1.14.0–1.14.4 sind betroffen. Firebase verlangt ~1.9.0. Kein `audit fix --force`,
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

Der zuvor offene lokale Emulatorlauf ist laut Bestätigung der Projektverantwortlichen
unter Windows erfolgreich durchgeführt worden. Für eine unabhängig reproduzierbare
Abnahme sollten die Testprotokolle mit Commit, Befehlen und Werkzeugversionen
archiviert werden; eine Wiederholung in dieser Cloud bleibt blockiert. Rules prüfen das Datumsformat und Wertebereiche, aber keine vollständige
Kalenderarithmetik; diese übernimmt die Clientvalidierung. Ein manipulierter Client
könnte z. B. 31. Februar im eigenen Datenbereich speichern. Produktionsregeln wurden
nicht geprüft oder geändert: Eine sichere produktive Nutzung setzt separat geprüfte
und freigegebene Rules voraus. Keine produktive Bereitstellung in dieser Aufgabe.

Die Ansicht synchronisiert nicht live zwischen Clients; gleichzeitige Änderungen
können nach Neuladen sichtbar werden. Keine Such-/Filter-/Kalender-/Prioritätsfunktion.
Ein vollständiger visueller Gleichstand mit sämtlichen Figma-Ansichten und die neuen
SVG-Assets sind nicht bestätigt. Push und Draft-PR werden nur bei funktionierender
Verbindung versucht; endgültige Commit-/PR-Referenzen stehen im Abschlussbericht.

## Veröffentlichung zur Prüfung

Implementierungscommit: `2567f4cf0cdb475bd2cd93cff03223d577640f54`.
Branch wurde erfolgreich zu GitHub gepusht. `gh pr create` scheiterte mit
`Post https://api.github.com/graphql: Forbidden`; der CLI-Aufruf wurde nicht wiederholt.
Der verfügbare GitHub-Connector konnte den [Draft-PR #3](https://github.com/FatimaKhaliil/codex-learning-planner/pull/3)
erfolgreich erstellen. Basis: main bei `896794c7`; kein Merge. Der PR benennt die
offenen Emulator-, Audit- und Designpunkte ausdrücklich.


## Vertiefte Sicherheitsbewertung der npm-Abhängigkeiten

Bewertungsdatum: 31.10.2026. Analysierter Code: `abcfd7e96b11d4064b6f17e8113a6da3898d4fd8`
mit unverändertem ursprünglichem Lockfile. Ausgangspunkt ist eine statisch gebaute
React-/Vite-Web-App mit Firebase Web SDK, ohne eigenes Node-Produktionsbackend,
ohne SSR und ohne eigenen gRPC-Server. Die Bewertung gilt für diesen Umfang und
den gemessenen Build; eine produktiv bereitgestellte Installation wurde nicht separat
untersucht. Es wurden weder Exploits ausgeführt noch fremde Dienste angegriffen.

### 1. Installierte Version und Ursache

`npm ls` und `npm explain @grpc/grpc-js` ergeben:

```text
firebase@13.0.0
├─ @firebase/firestore@4.18.0
│  └─ @grpc/grpc-js@1.9.16
└─ @firebase/firestore-compat@0.4.15
   └─ @firebase/firestore@4.18.0 (dedupliziert)
```

Firestore deklariert `@grpc/grpc-js: ~1.9.0`. Diese Range bedeutet
`>=1.9.0 <1.10.0`; sie erlaubt keine beliebige neuere 1.x-Version. Das Lockfile
fixiert 1.9.16. Eine aktuelle Registry-Abfrage zeigt 1.9.16 als höchste angebotene
Version innerhalb dieser Range. Die Abhängigkeit gehört zum produktiven Paketbaum
(`dev:false` laut npm explain), weil das plattformübergreifende Firebase-Paket auch
Node-Implementierungen mitliefert. `--omit=dev` entfernt solche ungenutzten
Plattformzweige nicht aus der Audit-Bewertung.

Der aktuelle Lauf von `npm audit --omit=dev --json` meldet weiterhin vier High-
**Paketbefunde**: grpc-js, firestore, firestore-compat und firebase. Das sind
propagierte Meldungen zu zwei Advisories, keine vier unabhängigen High-Lücken.
Das einzelne Advisory GHSA-f596-whhp-79r4 ist als **Low, CVSS 3.7** eingestuft;
GHSA-m9gg-hp2v-232j als **High, CVSS 7.4**. npm ordnet dem betroffenen Paket und
seinen abhängigen Paketen die höchste relevante Schwere zu.

### 2. Tatsächlicher Inhalt des Browser-Produktionsbuilds

Die Paket-Exports von `@firebase/firestore@4.18.0` unterscheiden:

| Ziel | Einstieg |
| --- | --- |
| Browser / ESM | `dist/index.esm.js` |
| Node / ESM | `dist/index.node.mjs` |
| Node / CommonJS | `dist/index.node.cjs.js` |

Der Node-Einstieg importiert `@grpc/grpc-js`; Vite verwendet im hier geprüften
Clientbuild den Browser-Einstieg. Der Firestore-Browsertransport importiert
`@firebase/webchannel-wrapper`, nicht den Node-gRPC-Transport. Die TLS-Verbindung
im Browser wird vom Browser verwaltet; die Anwendung betreibt darüber keinen
Node-gRPC-Server und keine serverseitige Zertifikatsauthentifizierung mit grpc-js.

Die Prüfung wurde erneut mit TypeScript und einem echten Vite-Produktionsbuild
vorgenommen. Ein rein temporäres `generateBundle`-Plugin erfasste für **alle erzeugten
JavaScript-Chunks einschließlich des nachgeladenen Aufgaben-Chunks** deren
`chunk.modules`-Einträge. Ergebnis: **52 Module, zwei Firestore-Module, null Module
unter `@grpc/`**. Enthaltene Firestore-Module:

```text
@firebase/firestore/dist/common-D9UYuXJO.esm.js
@firebase/firestore/dist/index.esm.js
```

Dies entspricht dem bereits archivierten
[Browser-Modulgraph](verification/aufgabe-03/bundle-security.json).
Die Aussage beruht auf der Modulzuordnung des Bundlers, nicht allein auf einer
Textsuche in minifiziertem JavaScript. Das Lockfile enthält grpc-js, der gemessene
Browserbuild enthält es nicht. Andere Builds, SSR, Node-Skripte oder später geänderte
Imports sind damit nicht automatisch abgedeckt.

### 3. Angriffsvoraussetzungen und Erreichbarkeit

| Advisory | Laut Primärquelle notwendiger Angriffspfad | Befund für diese Anwendung |
| --- | --- | --- |
| [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j), CWE-295 | Ein grpc-js-Server erzeugt Server-Credentials mit `requireClientCertificate=false` und verwendet `getAuthContext()` zur Authentifizierung. Die Rückgabe unterscheidet dann autorisierte und nicht autorisierte Zertifikate nicht ausreichend. Das Advisory nennt insbesondere bestimmte RBAC-Konfigurationen von grpc-js-xds. | Kein ausgelieferter grpc-js-Code, kein solcher Server, keine solche Credential-/RBAC-Konfiguration und kein entsprechender Authentifizierungspfad im App-Code. Firebase Authentication verwendet diesen serverseitigen App-Pfad nicht. Für den untersuchten Browserbuild ist das beschriebene Szenario nicht erreichbar. |
| [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4), CWE-550 | Ein mit grpc-js betriebener Server hat einen abstürzenden Method-Handler. Dessen Fehlermeldung gelangt in die an den Client gesendete Statusmeldung und kann darin enthaltene sensible Informationen offenlegen. | Die App stellt keinen grpc-js-Server und keine solchen Method-Handler bereit. Im Browser fehlt die Bibliothek vollständig. Für diesen Browserbuild ist der beschriebene Informationsabfluss nicht erreichbar. |

Die Registry-Versionszuordnung erfasst 1.9.16 als betroffen; daraus folgt ohne Prüfung
der genutzten APIs und Laufzeitrolle noch kein erreichbarer Angriff. Für diese
Web-App fehlt bereits die notwendige ausgelieferte Komponente. **Es gibt somit
keine nachgewiesene Browser-Ausnutzbarkeit dieser beiden Befunde; die geprüften
Angriffspfade sind in der beschriebenen Architektur nicht vorhanden.** Das ist eine
begründete komponenten- und architekturbezogene Aussage, kein Beweis allgemeiner
Unverwundbarkeit und keine Untersuchung der internen Google-Firebase-Infrastruktur.

Der erfolgreiche Windows-Emulatortest belegt laut Projektverantwortlicher CRUD und
Benutzertrennung der App. Er ist kein Exploit-Test dieser beiden Advisories. Auch die
Unterscheidung zwischen Browser und Node ist relevant: Der Node-basierte
Firestore-Integrationstest kann den Node-Transport laden. Ein gRPC-Client ist aber
noch kein Server mit den oben beschriebenen Authentifizierungs-/Handlerpfaden.
Ein Produktionsbetrieb dieser Node-Abhängigkeiten ist mit dieser Bewertung nicht
freigegeben.

### 4. Korrekturmöglichkeiten ohne ungeprüfte Eingriffe

Die Primärquellen nennen für beide Advisories korrigierte Versionen **1.13.6** und
**1.14.5**. Betroffen sind `<1.13.6` sowie `>=1.14.0 <1.14.5`; daher wäre die pauschale
Aussage „jede Version ab 1.13.6 ist sicher“ falsch.

Am Bewertungsdatum wurden folgende Registry-Metadaten erneut abgefragt:

```text
firebase@latest                 = 13.1.0
firebase@13.1.0 → firestore      = 4.19.0
firestore@4.19.0 → grpc-js       = ~1.9.0
höchste Version in ~1.9.0        = 1.9.16
```

| Option | Beurteilung |
| --- | --- |
| Reguläres Update innerhalb `~1.9.0` | Liefert nach aktuellem Registry-Stand keinen korrigierten Patch. |
| Firebase 13.1.0 als kompatibles SDK-Update | Verlangt weiterhin die betroffene gRPC-Range. Wurde in der Implementierung probeweise installiert und auditiert, ohne Behebung; danach zurückgenommen. Kein behaupteter erfolgreicher Sicherheitspatch. |
| npm-Audit-Vorschlag Firebase 9.14.0 | Inkompatibles Downgrade; ausgeschlossen. |
| grpc-js ≥1.13.6 bzw. korrigierter 1.14-Zweig per Override | Außerhalb der von Firestore deklarierten Range. Dass grpc-js die Major-Version 1 behält, belegt keine von Firebase getestete Kombination. Ohne Upstream-Freigabe und vollständige Regression kein belegter sicherer Drop-in-Fix; gemäß Vorgabe nicht durchgeführt. |
| Nur ein zusätzliches direktes grpc-js installieren | Kann die transitive 1.9-Abhängigkeit parallel bestehen lassen und ist keine verlässliche Behebung. |
| Nur den Browserimport ändern / zu Firestore Lite wechseln | Der plattformübergreifende Paketbaum kann dieselbe transitive Abhängigkeit weiter enthalten; kein belegter Audit-Fix. Ein SDK-/Transportwechsel wäre gesondert auf Funktion und Sicherheit zu testen. |

**Es ist derzeit keine kompatible, getestete Korrektur belegt, die beide Audit-
Befunde unter den vorgegebenen Einschränkungen entfernt.** Dies bedeutet nicht,
dass eine Korrektur grundsätzlich unmöglich ist. Der vorgesehene Weg ist ein
Upstream-Firebase-/Firestore-Release mit korrigierter Dependency-Range oder einem
freigegebenen Backport und anschließender Prüfung. In dieser Bewertung wurden
`package.json`, Lockfile und installierte App-Abhängigkeiten nicht geändert; kein
`audit fix --force`, kein Override und kein produktives Deployment ausgeführt.

### 5. Verbleibendes Risiko und nachvollziehbare Entscheidung

| Bewertungsebene | Ergebnis |
| --- | --- |
| Installierter produktiver npm-Paketbaum | Bekannte betroffene Version vorhanden; vier High-Paketmeldungen bleiben offen. Keine technische Behebung. |
| Gemessene Browser-Auslieferung | Betroffene Bibliothek nicht enthalten; die beiden beschriebenen serverseitigen Angriffspfade sind für diese Auslieferung nicht erreichbar. |
| Tatsächlich nachgewiesene Browser-Ausnutzung | Keine. Die Versionswarnung allein ist kein solcher Nachweis. Es wurde auch kein Penetrationstest durchgeführt. |
| Entwicklungs-/Testumgebung | Node-Abhängigkeit kann geladen werden. Beschriebene Servervoraussetzungen sind in den geprüften App-/Testdateien nicht implementiert; fremde Werkzeuge und zukünftige Servernutzung bedürfen eigener Bewertung. |
| Restunsicherheit | Künftige Imports, Buildkonfiguration, SSR, Backend oder zusätzliches gRPC-Hosting können die Erreichbarkeit ändern. Weitere Schwachstellen sind durch diese gezielte Analyse nicht ausgeschlossen. |

Für die Bachelorarbeit lässt sich das Ergebnis so formulieren:

> Die statische Abhängigkeitsanalyse identifizierte zwei bekannte Advisories in der
> transitiv installierten Bibliothek @grpc/grpc-js 1.9.16. npm propagiert diese als
> vier High-Paketbefunde. Die ergänzende Analyse des tatsächlich erzeugten
> Browser-Produktionsbundles wies keine Module dieser Bibliothek nach. Beide
> Advisories setzen serverseitige grpc-js-Funktionen voraus, die der untersuchte
> React-/Firebase-Web-Client weder ausliefert noch bereitstellt. Die Audit-Meldungen
> bleiben daher technisch offen, stellen für diesen Build jedoch keinen Nachweis
> einer erreichbaren Browser-Schwachstelle dar. Mangels einer aktuell belegten
> kompatiblen Upstream-Korrektur wird das Abhängigkeitsrisiko transparent
> dokumentiert und weiter beobachtet; ein ungeprüfter Versions-Override erfolgt
> nicht. Die Schlussfolgerung gilt ausschließlich für die untersuchte Architektur
> und ersetzt keine allgemeine Sicherheitsfreigabe.

Empfohlen wird eine dokumentierte, auf diesen Browserbuild begrenzte Weiterführung
der Entwicklung statt einer Einstufung als „audit-clean“. Eine formelle
Risikoakzeptanz verbleibt bei der Projektverantwortlichen und wird durch diese
Analyse nicht stellvertretend erteilt. Als Kontrollen sind ausschließlich statische
Buildartefakte auszuliefern (nicht node_modules/Entwicklungsserver), Lockfile und
Audit-Ergebnisse zu erhalten und bei Dependency-/Build-/Architekturänderungen
Bundle-Erreichbarkeit erneut zu prüfen. Vor Einführung eines Node-Backends, SSR,
Cloud Functions oder gRPC-Servers ist eine neue Bewertung erforderlich.

Sobald ein passender Upstream-Fix verfügbar ist: kontrolliertes SDK-Update,
`npm audit --omit=dev`, TypeScript/Build/Unit-/Auth-Regression, Firestore-CRUD und
Benutzertrennung am Emulator sowie erneute Prüfung aller Browser-Chunks. Audit-
Befunde dürfen erst nach belegter Korrektur als behoben bezeichnet werden.

### Quellen und Reproduzierbarkeit

Primärquellen, abgerufen am 31.10.2026:

- [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j):
  Voraussetzungen für Zertifikats-/getAuthContext-Fehlinterpretation, Schwere und Fixversionen.
- [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4):
  serverseitige Handler-Fehlermeldungen, Schwere und Fixversionen.
- Lokale `package-lock.json` und Paket-Manifeste, insbesondere
  `node_modules/@firebase/firestore/package.json` (Dependency-Range/Browser-/Node-Exports).
- Aktuelle npm-Registry-Abfragen und aktueller Audit-Lauf; der ursprüngliche
  [Audit-Rohbefund](verification/aufgabe-03/npm-audit.json) bleibt als historischer
  Befund unverändert erhalten und wurde nicht als neu erzeugte Datei ausgegeben.

Ausgeführte Prüfungen (Caches/HTML-Snapshots und temporäres Build-Plugin nur in work/):

```sh
npm ls firebase @firebase/firestore @grpc/grpc-js
npm explain @grpc/grpc-js
npm audit --omit=dev --json
npm view firebase@latest version dependencies.@firebase/firestore --json
npm view @firebase/firestore@latest version dependencies.@grpc/grpc-js --json
npm view '@grpc/grpc-js@~1.9.0' version --json
npm run typecheck
node work/inspect-build.mjs
git diff --check
```

Das temporäre Build-Plugin verwendet Vites `generateBundle`, liest aus jedem
Chunk `Object.keys(chunk.modules)` und zählt sämtliche Pfade unter `/@grpc/`.
Für eine unabhängige Wiederholung kann derselbe Hook in einer temporären Kopie
außerhalb des produktiven Konfigurationspfads ergänzt werden. Der vorhandene
archivierte Modulgraph benennt die erfassten Firestore-Dateien und die leere
gRPC-Liste. In dieser Sitzung wurde nur diese Dokumentation als versionierte
Projektdatei geändert; Anwendungscode, Rules und Lockfile bleiben unverändert.
