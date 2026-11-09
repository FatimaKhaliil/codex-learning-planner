# Aufgabe 07 – Sichere lokale Evaluationsumgebung

## Status und Abgrenzung

Dieses Dokument beschreibt die Vorbereitung der späteren analytischen Evaluation. **Es wurden keine Cognitive-Walkthrough-, Nielsen- oder Accessibility-Bewertungen durchgeführt.** Setup-Prüfungen sind keine Usability-Ergebnisse. Der [Evaluationsplan](aufgabe-07-evaluationsplan.md) und die leere [Ergebnisvorlage](aufgabe-07-ergebnisse-vorlage.csv) bleiben unverändert.

- Repository: `FatimaKhaliil/codex-learning-planner`.
- Bestätigter Ausgangscommit: `e8f506cb450b83182f41fdcbb4ed8dacd737ae94` (Merge von PR #7).
- Branch: `eval/aufgabe-07-setup`, direkt von diesem Commit erstellt; Arbeitsbaum zuvor sauber.
- Ausschließlich lokales Projekt **`demo-learning-planner`**; keine produktiven Firebase-Zugriffe, echten Konten, Regeländerungen, Deployments oder Merges.
- `.env.local` wurde weder gelesen noch verändert. In dieser Cloud-Umgebung war die Datei nicht vorhanden. Die Überlagerung einer vorhandenen Datei wird deshalb zusätzlich mit einer synthetischen Datei in einem temporären Testverzeichnis geprüft; es wird keine produktive Konfiguration für Tests erzeugt.

Der Plan `E07-1` nennt `df24af7e3dd8e19bcf9e4bba40bb6f6e64fc8a61` als Anwendungsausgangsstand. Der geprüfte Git-Vergleich bis zum aktuellen Merge zeigt ausschließlich die zwei Planungsdateien als Unterschied. Diese Vorbereitung ergänzt einen technischen Schutz für den Evaluationsmodus. Für spätere Läufe müssen tatsächlicher `execution_commit`, ursprünglicher `code_commit` und diese begründete Änderung dokumentiert werden; Versionen nicht stillschweigend gleichsetzen. Der Bachelorarbeitstitel bleibt unverändert.

## Isolation und Schutzmechanismen

| Zweck | Verbindlicher Wert |
| --- | --- |
| Firebase-Projekt | `demo-learning-planner` |
| Vite-Modus | `evaluation`, ausschließlich Entwicklungsserver |
| React/Vite | `http://127.0.0.1:5187`, fester Port |
| Auth Emulator | `http://127.0.0.1:9099` |
| Firestore Emulator | `http://127.0.0.1:8081` |
| Emulator Hub (nur lokale Erkennungsprüfung) | `http://127.0.0.1:4400` |
| Emulator UI | deaktiviert |
| Lokales Konfigurationsverzeichnis | `.evaluation/`, vollständig Git-ignoriert |

`npm run evaluation:init` erzeugt ausschließlich `.evaluation/.env.evaluation.local`. Bereits vorhandene Dateien werden nicht überschrieben. Alle Werte sind öffentliche, funktionslose Demo-Konfiguration; kein produktiver API-Key wird benötigt. Die vorgesehenen Werte sind:

```dotenv
VITE_FIREBASE_API_KEY=evaluation-only-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-learning-planner.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-learning-planner
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=demo-learning-planner-web
VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
VITE_FIREBASE_FIRESTORE_EMULATOR_URL=http://127.0.0.1:8081
```

Die Domain ist ein SDK-Konfigurationswert; die Auth-Verbindung erfolgt zum expliziten lokalen Emulator. Eine Content Security Policy des Evaluationsservers begrenzt Netzwerkverbindungen zusätzlich auf die lokalen Dienste und Vite-HMR.

Vite verwendet für diesen Modus ein eigenes `envDir` unter `.evaluation/`. Damit werden `.env`, `.env.local` und andere Modusdateien im Repository-Hauptverzeichnis nicht geladen. Nur die acht geprüften Werte werden an den Browser übergeben. Abweichende geerbte Werte aus der Shell führen zum Abbruch; zusätzliche `VITE_*`-Variablen werden nicht automatisch veröffentlicht. Fehlende oder unvollständige Konfiguration, abweichende Projektkennung, entfernte Hosts oder falsche Ports führen zum Abbruch. Ein Evaluations-Build und Evaluations-Preview sind gesperrt, weil die bestehenden Emulatoranschlüsse ausschließlich im Entwicklungsmodus aktiv sind.

**Begründete Ausnahme vom Verzicht auf Anwendungscodeänderungen:** In `src/lib/firebase.ts` wird vor der Firebase-Initialisierung im Modus `evaluation` erneut die vollständige Konfiguration geprüft. Auch eine bereits vorhandene Firebase-App muss zur Demo-Konfiguration passen. Die Initialisierung in `src/auth/firebaseAuth.ts` und der HMR-Cache in `src/tasks/firebaseTasks.ts` werden zusätzlich gegen die Übernahme abweichender Emulatorinstanzen beziehungsweise einer nicht verifizierten Datenbank abgesichert. Diese Schutzmaßnahmen sind erforderlich, weil die bisherigen optionalen Emulatorwerte bei fehlender Konfiguration reguläre Firebase-Dienste zulassen und ein Cache die neue Initialisierungsprüfung umgehen könnte. Die normalen Entwicklungs-/Produktionsmodi und die fachlichen Auth-, Aufgaben-, Kalender- und Profilfunktionen werden nicht umgestaltet. Security Rules bleiben unverändert.

Die Schutzmaßnahmen verhindern versehentliche Produktionsverbindungen in diesem Setup. Sie ersetzen keine Absicherung eines kompromittierten Rechners oder eines fremden Dienstes, der lokale Emulator-APIs nachahmt. Nur auf einem vertrauenswürdigen lokalen Rechner ausführen; Emulatoren nicht im Netzwerk freigeben.

## Windows PowerShell: Einrichtung

Benötigt werden drei Terminals im Repository, Node.js gemäß `package.json` (hier geprüft: **24.19.0**) und Java **21** (hier: **21.0.12.1**). Die verwendete Firebase CLI ist **15.34.2**. Der erste CLI-/Emulatorstart benötigt gegebenenfalls Downloads; ein Downloadfehler muss vor der Evaluation behoben werden. Ein Firebase-Login oder eine produktive Projektauswahl ist für das Demo-Setup nicht erforderlich.

In jedem Terminal zunächst den eigenen Repositorypfad setzen, beispielsweise:

```powershell
Set-Location C:\Projekte\codex-learning-planner
git branch --show-current
git rev-parse HEAD
git status --short --branch
```

### Terminal 1: Erstmalige Einrichtung und Emulatoren

```powershell
node --version
java -version
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Abhängigkeiten konnten nicht installiert werden." }
npm.cmd run evaluation:init
if ($LASTEXITCODE -ne 0) { throw "Evaluationskonfiguration nicht angelegt; bestehende Dateien nicht überschreiben." }
git check-ignore .evaluation/.env.evaluation.local
npx.cmd --yes firebase-tools@15.34.2 emulators:start --only "auth,firestore" --project demo-learning-planner --config firebase.json
```

Erst fortfahren, wenn **beide** Emulatoren betriebsbereit sind. Terminal 1 geöffnet lassen. Bei späteren Starts die vorhandene Konfiguration behalten und `evaluation:init` überspringen; das Skript verweigert absichtlich das Überschreiben. Keine alternative echte Projektkennung einsetzen. Kein `firebase deploy`, kein `firebase use` und kein Import produktiver Daten. Die eingecheckten Regeln werden nur lokal geladen. Ports müssen frei sein; bei belegtem Port den verursachenden Prozess prüfen und das Setup nicht auf andere Zieladressen umstellen. Die CLI reserviert zusätzlich einen lokalen Logging-Port, hier 4500; dieser ist kein Schreibziel des Seed-Skripts.

### Terminal 2: Baseline vorbereiten und prüfen

```powershell
npm.cmd run evaluation:seed
if ($LASTEXITCODE -ne 0) { throw "D0 wurde nicht hergestellt. Nicht mit der Evaluation beginnen." }
npm.cmd run evaluation:verify
if ($LASTEXITCODE -ne 0) { throw "D0-Verifikation fehlgeschlagen." }
Get-Content .evaluation/baseline.json
notepad .evaluation/account.json
```

Das Konto ist ausschließlich synthetisch: `eval07-d0@example.test`. Das zufällige Kennwort steht nur in der lokalen ignorierten Kontodatei. Es wird weder ausgegeben noch in Git, Screenshots oder Ergebnisdateien übernommen. Die Datei nur lokal zum späteren Anmelden öffnen; nicht als Nachweis exportieren.

Für ein ausdrücklich festgelegtes Basisdatum ist beispielsweise zulässig:

```powershell
npm.cmd run evaluation:seed -- --date 2026-11-05
```

Dieses Datum ist ein reproduzierbares Beispiel, keine Behauptung eines bereits erfolgreich erzeugten Datenbestands. Für einen neuen Evaluationslauf das tatsächliche Berliner Kalenderdatum festlegen und das Manifest aufbewahren. Eine bestehende Baseline behält ihr Datum, bis es ausdrücklich geändert wird. Ein wiederholtes `seed` bestätigt einen unveränderten Bestand, überschreibt aber keinen abweichenden Bestand. Für dessen Wiederherstellung `reset` verwenden; eine ausdrücklich gewünschte Datumsänderung erfolgt mit `evaluation:reset -- --date YYYY-MM-DD`.

### Terminal 3: React im isolierten Modus starten

```powershell
npm.cmd run dev -- --mode evaluation
```

Im Browser ausschließlich `http://127.0.0.1:5187/#/login` öffnen. Eine frische Browser-Sitzung verwenden. Ein bereits auf einem anderen Port laufender normaler Entwicklungsserver gehört nicht zur Evaluation. Der Server bricht bei falscher Konfiguration ab; Konfigurationsfehler nicht durch Entfernen des Modus oder durch Eintragen produktiver Werte umgehen.

### Baseline zurücksetzen

Vor dem Reset den Browser schließen beziehungsweise abmelden, damit parallele Aktionen oder veraltete Sitzungen die Wiederherstellung nicht stören. In Terminal 2:

```powershell
npm.cmd run evaluation:reset
if ($LASTEXITCODE -ne 0) { throw "Reset unvollständig. D0 ist nicht freigegeben." }
npm.cmd run evaluation:verify
if ($LASTEXITCODE -ne 0) { throw "Wiederhergestelltes D0 ist nicht bestätigt." }
```

Der Reset betrifft ausschließlich das definierte Testkonto und dessen Aufgaben. Er entfernt auch zusätzliche Aufgaben dieses Kontos aus späteren Läufen und stellt die fünf Baseline-Aufgaben sowie den nicht gesetzten Anzeigenamen wieder her. Andere Konten und deren Aufgaben werden nicht pauschal gelöscht. Kein globaler Emulator-Reset ist vorgesehen. Der Vorgang ist **nicht atomar**: Bei einer Unterbrechung kann ein Teilbestand bleiben. Dann mit demselben Basisdatum erneut zurücksetzen und verifizieren; bei noch fehlendem Manifest `evaluation:reset -- --date YYYY-MM-DD` verwenden. D0 gilt bis dahin als nicht hergestellt.

Das Kontokennwort ist lokal gespeichert. Bei Emulator-Neustarts ohne Datenexport muss die Baseline neu erstellt werden. Import-/Exportdateien enthalten Testkonten und gehören ebenfalls ausschließlich in den ignorierten lokalen Bereich; dieses Setup benötigt keinen Export. Verlorene Kontodateien nicht mit geratenen Zugangsdaten ersetzen.

## D0: festgelegte Daten

`D` ist ein einmal festgehaltenes Kalenderdatum in `Europe/Berlin`; Tagesaddition erfolgt als Kalenderrechnung. IDs sind fest und entsprechen den Schlüsseln des Plans:

| Task-ID | Titel | Fach | Fälligkeitsregel | Status | Beschreibung |
| --- | --- | --- | --- | --- | --- |
| A01 | E07 Mathematik – Integrale | Mathematik | D+2 | `open` | Übungsblatt bearbeiten. |
| A02 | E07 Deutsch – Essay | Deutsch | D+4 | `in-progress` | leer |
| A03 | E07 Biologie – Zellen | Biologie | D−1 | `done` | leer |
| A04 | E07 Suchnadel – Physik | Physik | erster Tag des Folgemonats | `open` | leer |
| A05 | E07 Geschichte – Quellen | leer | D+2 | `open` | leer |

Bei `D = 2026-11-05` ergeben sich A01/A05 `2026-11-07`, A02 `2026-11-09`, A03 `2026-11-04`, A04 `2026-12-01`. Das sind berechnete Sollwerte; die tatsächlich gespeicherten Daten werden erst durch erfolgreiche Verifikation nachgewiesen.

Sollbestand: fünf Aufgaben, drei offen, eine in Bearbeitung, eine erledigt; vier nicht abgeschlossen, 20 % erledigt. Feste synthetische UID: `eval07-d0`; Pfade `users/eval07-d0/tasks/A01` bis `A05`. UID, Basisdatum, konkrete ISO-Daten und IDs werden im lokalen Manifest festgehalten. Der Anzeigename ist nicht gesetzt. **CW-01 benötigt später ein anderes, noch nicht angelegtes Konto**; die Einrichtung von D0 ist kein durchgeführtes Registrierungs-Szenario.

Das Skript erlaubt nur die festen lokalen Ziele und die Demo-Projektkennung. Vor jeder Schreib-/Löschanfrage werden beide Emulatoren anhand lokaler Verwaltungsendpunkte, der Hub-Registrierung sowie der festen UID/E-Mail geprüft; bei nicht erreichbaren Diensten wird abgebrochen. Der Hub-Port ist deshalb in `firebase.json` ebenfalls explizit auf Loopback/4400 festgelegt. Die Projektkennung ist in allen projektbezogenen Verwaltungsanfragen im Pfad fest eingebaut; die Hub-Registry selbst enthält keine Projektidentitätsbestätigung. Keine Umgebungsvariable oder CLI-Option kann einen entfernten Schreib-Endpunkt auswählen. HTTP-Requests verwenden eine direkte Loopback-Verbindung und folgen keinen Weiterleitungen oder Proxy-Einstellungen. Fehlerausgaben enthalten keine Kennwörter oder Token.

Bei bestehenden Konten muss auch das lokal gespeicherte Kennwort zum ausschließlich im Auth-Emulator verwendeten Hashformat passen. Unbekannte Formate oder Abweichungen führen zum Abbruch; es wird kein Anmeldeversuch als verdeckter Setup-Schreibzugriff durchgeführt. Diese quellcodegestützte Emulatorprüfung ersetzt keinen echten späteren SDK-Login und ist an die angegebene CLI-Version gebunden.

Die Einrichtung verwendet ausschließlich projekt- und kontobezogene **Emulator-Admin-REST-Endpunkte** mit dem dort vorgesehenen lokalen `owner`-Marker. Das ist kein produktiver Zugangsschlüssel. Dieser Verwaltungszugriff umgeht die Firestore-Regeln nur im lokalen Setup. Deshalb beweist eine erfolgreiche Seed-Verifikation weder die Regelkorrektheit noch erfolgreiche Anwendungs-CRUD-Operationen über den Client-SDK. Eine echte Anmeldung und ein echter React-/Firestore-Datenpfad müssen nach erfolgreichem Emulatorstart separat technisch bestätigt werden, bevor die eigentliche Evaluation beginnt.

## Setup-Prüfungen und Nachweise

Alle folgenden Ergebnisse betreffen technische Vorbereitung. Die Originalnachweise vom 05.11.2026 wurden erhalten; neue Prüfungen nach Wiederaufnahme am 09.11.2026 stehen in separaten Dateien. Der Ergebnis-CSV wurde keine Datenzeile hinzugefügt.

| Prüfung | Tatsächlich ausgeführt / Ergebnis | Aussagegrenze |
| --- | --- | --- |
| Git / Dateivollständigkeit | Bestehender Branch und HEAD bestätigt; alle angefangenen Dateien vorhanden, `git diff --check` erfolgreich; keine alten Test-/Serverprozesse auf 5187/9099/8081/4400 aktiv | Kein neuer Branch, keine vorhandene Änderung überschrieben |
| TypeScript / Build | `npm run build` erfolgreich, einschließlich `npm run typecheck`; 70 Module gebaut | Kein Backendnachweis; normale Build-Umgebungsdateien waren in dieser Cloud nicht vorhanden |
| Gesamte Testsuite | `npm test`: **62 bestanden, 0 fehlgeschlagen, 0 übersprungen**, vor und nach der Unterbrechung | Enthält bestehende Modelltests, echte Vite-Konfigurationsauflösung und isolierte Transport-Doubles; keine 62 Emulator-Integrationstests |
| Konfiguration / negative Fälle | Echte Vite-Auflösung mit temporärer synthetischer `.env.local`; Lese-Guard bestätigt, dass diese Datei nicht gelesen wird. Fehlende/falsche Werte, Shellkonflikte, zusätzliche Konfigurationsdateien, Symlinks, Build/Preview und Produktionsmodus werden abgewiesen | Keine echte Firebase-Konfiguration für diesen Test verwendet |
| Instanzwiederverwendung | Tests und Code-Review für abweichende App-Optionen, Auth-Host/Port/Optionen, fehlende oder falsche Firestore-HMR-Bindungen und fehlende App | Guard-/Cachetests sind isolierte Tests; keine behauptete Firestore-Persistenz |
| D0 / Reset | **14 Testgruppen** für exakte fünf Felddatensätze/IDs, Berliner Kalenderrechnung, Seed/Reset/Verify, Scope-/Kennwortprüfung, Abbruch und mehrseitigen Reset mit 73 Aufgaben | **Transport-Doubles**, bereits in den 62 Tests enthalten; kein echter Firestore-Seed |
| React / Browser | Echter Chromium 151.0.7922.173, Playwright 1.62.0: React geladen, Demo-Projekt und SDK-Emulatorziele bestätigt; externe Probe durch CSP blockiert, 0 externe Requests bis zur Routing-Schicht; ignorierter JSON-Sentinel direkt, mit `?import`, `?raw` und `/@fs/` jeweils HTTP 403 | Browserprüfung ohne Anmeldung oder Taskoperationen; Firestore-SDK-Ziel allein belegt keinen erreichbaren Server |
| Echter Auth Emulator | CLI 15.34.2 auf 127.0.0.1:9099; reale Read-only-Proben auf Auth und Hub erfolgreich. Nach Wiederaufnahme zusätzlich vorhandener `tests/auth-emulator.mjs`: **12/12 SDK-Prüfungen** bestanden, einschließlich synthetischer Registrierung, Login/Logout, Reset und Löschung des temporären Kontos | Eigenständige technische Auth-Regression, kein Walkthrough und kein Firestore-/React-CRUD-Nachweis; kein echter E-Mail-Versand |
| Echter negativer Seed-Vorlauf | Echter Auth Emulator, Firestore fehlt: CLI-Seed beendet mit Exit 1 / `evaluation/emulator-unavailable`; D0-Konto vorher/nachher 0, weder Kontodatei noch Baseline-Manifest erzeugt. Vor und nach Unterbrechung geprüft | Belegt sicheres Abbrechen, keine erfolgreiche D0-Erstellung |
| Echter Firestore Emulator | Ein gemeinsamer Startversuch am 05.11.2026 scheiterte beim Download von JAR 1.22.0; nach Wiederaufnahme kein JAR-Cache und Port 8081 geschlossen | Positiver Seed/Reset und Firestore-Persistenz **blockiert** |
| Firestore-SDK-/Regeltest | `npm run test:tasks:integration` am 09.11.2026 tatsächlich gestartet, Exit 1 beim Vorabcheck: `ECONNREFUSED 127.0.0.1:8081`; keine Task-/Regelprüfgruppe erreicht | **Blockiert**, keine bestandene Firestore-Integration oder Regelprüfung behauptet |
| Schutz bestehender Dateien | `.env.local` in beiden Phasen nicht vorhanden und nicht erzeugt/verändert; Security Rules, Lockfile, Plan und CSV unverändert; `.evaluation` vollständig ignoriert | Vorhandene produktive `.env.local` wird durch synthetische Koexistenztests abgedeckt; lokale Windows-Verifikation noch offen |

Nachweise unter [`docs/verification/aufgabe-07-setup/`](verification/aufgabe-07-setup/):

- `emulator-readiness.json` und `browser-setup.json`: erhaltene Originalbefunde vom 05.11.2026.
- `browser-setup-resumed.json`, `negative-preflight-resumed.json`, `auth-sdk-resumed.json`: tatsächlich wiederholte beziehungsweise ergänzte Prüfungen vom 09.11.2026.
- `test-summary.json`: Klassifikation der Prüfungen und offenen Grenzen; keine Zugangsdaten.
- `phase-timing.json`: erhaltene Uhrzeitpunkte und getrennte Messintervalle vor und nach der Unterbrechung.

### Festgestellte Probleme und Korrekturen

1. Vites Modus allein verhindert keine Übernahme einer normalen `.env.local` oder von Shellwerten. Korrigiert durch isoliertes Verzeichnis, feste Allowlist und Ablehnung abweichender Werte vor SDK-Initialisierung.
2. Bereits vorhandene Firebase-Instanzen und HMR-Daten können eine erneute Initialisierung umgehen. Korrigiert durch App-/Auth-/Cacheprüfungen; unvollständige Bindungen werden abgewiesen.
3. Lokale Kennwortdateien könnten sonst über den Entwicklungsserver lesbar sein. Das gesamte Verzeichnis wird ignoriert und von Vites Dateiauslieferung ausgeschlossen; HTTP-403-Proben erfolgreich.
4. Ein fehlender Firestore-Dienst darf kein verwaistes D0-Auth-Konto erzeugen. Der Vorlauf prüft beide Emulatoren vor Kontoanlage; echte Negativprüfung bestätigt den Abbruch ohne D0-Konto oder lokale Zugangsdaten.
5. Firestore-JAR-Download: tatsächlich beobachteter Fehler `Failed to make request to https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.22.0.jar`. Der Host ist nicht in der geltenden Cloud-Freigabe enthalten. Ein konkreter HTTP-Status wie 403 ist **nicht** belegt. Kein erneuter Downloadversuch und keine Umgehung der Netzwerkregeln nach Wiederaufnahme.
6. Sandbox-Beschränkungen verhinderten zunächst lokale Socket-/Browserstarts; die autorisierten lokalen Prüfungen liefen anschließend mit der erforderlichen Netzwerkberechtigung. Dies war kein Fehler der Anwendung. Die CLI-MOTD-Abfrage war beim Auth-Start nicht erreichbar; der lokale Auth-Dienst startete trotzdem erfolgreich.

### Windows: noch ausstehende technische Verifikation

Erst wenn beide Emulatoren, Hub und Evaluationsserver laufen, in Terminal 2 ausführen. Jeder Exitcode muss 0 sein; bei Fehler abbrechen:

```powershell
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Tests fehlgeschlagen." }
npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript fehlgeschlagen." }
npm.cmd run test:auth:integration
if ($LASTEXITCODE -ne 0) { throw "Auth-Integration fehlgeschlagen." }
npm.cmd run test:tasks:integration
if ($LASTEXITCODE -ne 0) { throw "Firestore-Integration fehlgeschlagen." }
npm.cmd run evaluation:seed
if ($LASTEXITCODE -ne 0) { throw "D0 nicht hergestellt." }
npm.cmd run evaluation:verify
if ($LASTEXITCODE -ne 0) { throw "D0 nicht bestätigt." }
npm.cmd run evaluation:reset
if ($LASTEXITCODE -ne 0) { throw "Reset nicht vollständig." }
npm.cmd run evaluation:verify
if ($LASTEXITCODE -ne 0) { throw "Reset nicht bestätigt." }
Get-Content .evaluation/baseline.json
```

Der vorhandene Firestore-Integrationstest prüft echte Repository-CRUD-Operationen, Regeln und Benutzertrennung mit weiteren synthetischen Konten; diese sind keine D0-Konten. Er ist ein technischer Test und erzeugt keine Usability-Ergebnisse. Danach D0 im Evaluationsbrowser technisch gegen das Manifest prüfen: synthetisches Konto anmelden, gespeicherte fünf Aufgaben erneut vom Server laden und mit dem Manifest vergleichen. Eine erfolgreiche Auth-Anmeldung allein reicht nicht. Bei Abweichung nicht mit der Evaluation beginnen. Aufgaben-/Heuristikbewertungen, Severity und WCAG-Ergebnisse bleiben weiter ausstehend.

Optionaler reproduzierbarer Browser-Konfigurationstest bei laufendem Terminal 3 (Python vorausgesetzt):

```powershell
py -m pip install playwright==1.62.0
py -m playwright install chromium
py tests/browser-evaluation-setup.py --output .evaluation/browser-setup-windows.json
if ($LASTEXITCODE -ne 0) { throw "Browser-Setup nicht bestätigt." }
```

Die Installation ist eine lokale Voraussetzung, kein in der Cloud durchgeführter Windows-Test. Der Browsertest verwendet das verfügbare Chromium oder Playwrights installiertes Chromium. Die Ausgabeoption bewahrt frühere Ergebnisse. Unter Windows wurden diese Befehle durch Codex **nicht** ausgeführt. Offen bleiben insbesondere echter Firestore-Start, positiver D0-Seed/Reset, Client-CRUD/Regelprüfung und der React-Datenpfad.

## Geänderte Dateien

| Dateien | Zweck |
| --- | --- |
| `.gitignore`, `firebase.json`, `package.json` | Lokalen Bereich ignorieren, Hub fest auf Loopback binden, Setupbefehle bereitstellen |
| `vite.config.ts`, `config/evaluation-policy.ts` | Isolierter Modus, feste Werte, CSP und wiederverwendbare Sicherheitsprüfungen |
| `src/lib/firebase.ts`, `src/auth/firebaseAuth.ts`, `src/tasks/firebaseTasks.ts` | Begründete Ausnahme: SDK-Initialisierung und Instanzwiederverwendung absichern |
| `scripts/evaluation-init.mjs`, `scripts/evaluation-data.mjs`, `scripts/evaluation-data-core.mjs` | Nicht überschreibende Konfigurationserstellung sowie sichere D0-Einrichtung, Wiederherstellung und Verifikation |
| `tests/evaluation-config.test.ts`, `tests/evaluation-data.test.ts`, `tests/browser-evaluation-setup.py` | Konfigurations-, Guard-, Transport- und Browserprüfungen |
| Dieses Dokument und `docs/verification/aufgabe-07-setup/*.json` | Befehle, tatsächlich erhobene Setupnachweise, Zeitmessung und Grenzen |

Keine Änderungen an TaskRepository, UI, produktiven Regeln oder vorhandenen Auth-Funktionen außerhalb der notwendigen Initialisierungssicherung. Keine produktiven Daten oder Zugangsdaten in Git.

## Bearbeitungszeit

Die Ausführung wurde laut Hinweis der Entwicklerin durch das **Nutzungslimit unterbrochen** und am 09.11.2026 auf demselben Branch fortgesetzt. Keine Messung der dazwischenliegenden Kalenderzeit als Arbeitszeit. Frühere Implementierungs- und Planungszeiten werden nicht geändert.

- Phase vor Unterbrechung: Messbeginn **05.11.2026, 13:40:06 UTC / 14:40:06 Europe/Berlin**. Letzter erhaltener Uhrzeit-Messpunkt **14:06:47 UTC / 15:06:47 Europe/Berlin**. Damit sind **26 Minuten 41 Sekunden** als verstrichenes Intervall belegt. Das tatsächliche Ende direkt vor der Unterbrechung wurde nicht erfasst; der danach liegende Rest ist **unbekannt**, nicht geschätzt.
- Wiederaufnahme: erste Zeitmessung **09.11.2026, 08:02:27 UTC / 09:02:27 Europe/Berlin**. Arbeitsumgebung verfügbar und erster Git-Check abgeschlossen um **08:04:55 UTC / 09:04:55 Europe/Berlin**. Dieser Vorlauf von **2 Minuten 28 Sekunden** umfasst Skill-/Statusprüfung und Cloud-Start.
- Phase nach Wiederaufnahme: Endmesspunkt **09.11.2026, 08:15:45 UTC / 09:15:45 Europe/Berlin** nach Abschluss der inhaltlichen Prüfung. Seit 08:02:27 UTC sind **13 Minuten 18 Sekunden** belegt, darin der oben genannte Vorlauf von 2 Minuten 28 Sekunden; ab Umgebungsfreigabe 08:04:55 UTC sind es **10 Minuten 50 Sekunden**. Die abschließende Eintragung dieser Messung sowie Commit, Push und PR-Erstellung folgen danach und sind in diesem Intervall nicht enthalten.

Die ausgewiesenen Intervalle sind verstrichene Interaktionszeiten einschließlich Toollaufzeiten, keine gemessene CPU- oder reine Schreibzeit. Eine exakte Gesamtarbeitsdauer beider Phasen ist wegen des nicht erfassten Endes der ersten Phase nicht rekonstruierbar.

## Nachbesserung: Windows-Timeout diagnostizieren (09.11.2026)

### Anlass und Beleglage

Ausgangscommit dieser zusätzlichen Codex-Interaktion: `b070f93a11a1b0213526b6293921abd0fe23e15f`, bestehender Branch `eval/aufgabe-07-setup`, Arbeitsbaum zu Beginn sauber. Die Entwicklerin meldete für ihren Windows-Rechner laufende Auth-/Firestore-Emulatoren, vier HTTP-200-Endpunkte sowie Emulator-Check 145 ms, Account-Check 109 ms mit `accountExists: false` und Firestore-List 431 ms mit null Dokumenten. Dennoch scheiterte `evaluation:seed -- --date 2026-11-09` wiederholt mit `evaluation/emulator-timeout`, ohne Kontodatei oder Manifest. **Diese Windows-Werte wurden von der Entwicklerin berichtet, nicht in der Cloud gemessen.**

Der konkrete Windows-Request, der ausläuft, war im bisherigen Fehlertext nicht erkennbar. Ein Windows-spezifischer Auslöser ist deshalb noch **nicht nachgewiesen**. Diese Änderung ergänzt die nötigen sicheren Messdaten und korrigiert einen separat reproduzierten Fehler in der Bedeutung der Requestfrist; sie behauptet keinen bereits erfolgreichen Windows-Seed.

### Tatsächliche Ausführungsreihenfolge

`evaluation-data.mjs` prüft zuerst Argumente, feste Demo-Policy, Git-Ignore und lokale Dateien. Bei fehlender Kontodatei wartet es anschließend vollständig auf `client.inspect()` aus `evaluation-data-core.mjs`:

| Reihenfolge in `inspect()` | Diagnosekennung | Fester lokaler Request |
| --- | --- | --- |
| 1 | `auth-ready` | GET `http://127.0.0.1:9099/` |
| 2 | `auth-config` | GET `http://127.0.0.1:9099/emulator/v1/projects/demo-learning-planner/config` |
| 3 | `firestore-coverage` | GET `http://127.0.0.1:8081/emulator/v1/projects/demo-learning-planner:ruleCoverage` |
| 4 | `emulator-registry` | GET `http://127.0.0.1:4400/emulators` |
| 5 | `account-lookup` | POST `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-learning-planner/accounts:lookup` |

Erst nach erfolgreichem Abschluss und Ausschluss einer Kontokollision wird ein zufälliges Kennwort erzeugt und `.evaluation/account.json` geschrieben. Danach startet `restore()`: erneute Emulator-/Kontoprüfung, bei Bedarf Kontoanlage mit zusätzlichem Vorlauf vor dem Schreibzugriff, Account-Lookup und erst anschließend Firestore-List. Namensreset und die fünf Task-Schreibvorgänge behalten jeweils ihren eigenen vollständigen Vorlauf. Das Manifest entsteht erst nach erfolgreicher abschließender Verifikation.

**Folgerung:** Ohne Kontodatei liegt der gemeldete Timeout vor Ende von `inspect()` und damit in einem der fünf obigen Requests, sofern kein externer Prozess die Datei entfernt hat. Eine schnelle separat getestete Firestore-Liste beweist nicht, dass dieser Vorlauf im fehlgeschlagenen Prozess erfolgreich war. Eine erfolgreiche HTTP-Statuszeile belegt auch noch keinen vollständig empfangenen Antwortkörper. Die 3000-ms-Grenze gilt pro HTTP-Request, nicht für den gesamten Seed mit seinen wiederholten Sicherheitsprüfungen.

### Nachgewiesene Transportkorrektur und sichere Diagnose

Der bisherige `ClientRequest.setTimeout(3000)` begrenzte **Socket-Inaktivität**. Er ist keine Gesamtfrist einschließlich Socketzuweisung/Verbindungsaufbau und wird durch empfangene Daten erneut verschoben. Ein unabhängiger Test des ursprünglichen Commits gegen einen isolierten lokalen HTTP-Server lieferte JSON-Fragmente nach 0, 1700 und 3400 ms: Der alte Transport akzeptierte die vollständige Antwort nach **3427 ms**. Eine Gesamtfrist von 3000 ms war damit nicht gegeben. Ein separater echter vorzeitiger Socketabbruch wurde dagegen nach 52 ms korrekt als Verbindungsfehler erkannt; ein solcher Fehler wird nicht als nachgewiesene Windows-Ursache ausgegeben.

Korrektur: Ein expliziter Timer startet vor der Socketzuweisung und begrenzt den gesamten HTTP-Request weiterhin auf **3000 ms**. **Keine Erhöhung und keine automatische Wiederholung.** Fragmentdaten verlängern die Frist nicht. Bei Abschluss oder Fehler wird der Timer entfernt; das Ergebnis wird vor dem Zerstören des Requests einmalig festgelegt. Synchrone Folgefehler dürfen einen Timeout nicht umklassifizieren. Abgebrochene beziehungsweise unvollständig geschlossene Antworten werden ebenfalls behandelt.

Der entsprechende neue Test gegen denselben Typ eines isolierten lokalen HTTP-Servers brach nach **3005 ms** ab; die Diagnose meldete `auth-ready`, `reading-response`, HTTP 200 und sechs empfangene Bytes. Das sind **reale lokale HTTP-Transportprüfungen mit einem Testserver**, keine Firebase-Integration und keine Windows-Messung. Die exakten Beobachtungen und Grenzen stehen in `windows-timeout-transport-repro.json` und `windows-timeout-deadline-regression.json` im Nachweisverzeichnis.

Schon ohne Zusatzoption enthält ein Transportfehler jetzt eine sichere `diagnostic` mit Requestnummer, Schrittkennung, HTTP-Methode, statischer Endpunktvorlage, Phase, Laufzeit, 3000-ms-Frist, numerischem Status und Byteanzahl. Native Netzwerkfehler werden ausschließlich anhand einer festen Codeliste ausgegeben. Mit `--diagnose` kommen JSON-Zeilen für lokale Setup-Phasen sowie Request-Start/-Abschluss/-Fehler auf stderr hinzu. Die Ausgabe enthält **keine** Kennwörter, Tokens, Header, Request-/Response-Inhalte, E-Mail-Adressen, Windows-Benutzerpfade, tatsächlichen Task-IDs, Paginationstokens oder native Fehlermeldungen. Taskpfade werden als `{evaluation-account}` und `{task}` dargestellt; rohe URLs/Queries werden nicht übernommen.

| Diagnosephase | Was die nächste Windows-Prüfung eingrenzt |
| --- | --- |
| `waiting-socket` | Noch keine Socketzuweisung beobachtet |
| `connecting` | Lokaler TCP-Verbindungsaufbau noch nicht abgeschlossen |
| `waiting-headers` | Verbunden, aber noch keine Antwortheader erhalten |
| `reading-response` | Header erhalten, vollständiger Antwortkörper fehlt noch |

Windows-Dateipfade, Git-/Dateirechte oder `chmod` würden an anderer Stelle als lokaler Setupfehler auffallen und erklären den bisherigen Transportfehlercode nicht unmittelbar. IPv4-Loopback, feste Ports, native HTTP-Anfragen ohne Proxy-Fallback und das bestehende UTF-8-`Content-Length`-Framing bleiben erhalten. Es gibt keinen belegten Anlass, Proxy, Firewall, Virenschutz oder eine konkrete Node-Windows-Version als Ursache zu benennen oder deren Einstellungen zu verändern. Erst die korrelierte neue Diagnose kann zeigen, in welcher Phase welcher Request tatsächlich ausläuft.

### Regressionstests und tatsächlich ausgeführte Prüfungen

- `npm test`: **80/80 bestanden**, einschließlich der bisherigen 62 Tests. Hinzu kommen drei echte CLI-Prozesstests ohne Netzwerk/Schreiboperationen sowie 15 Transportprüfungen einschließlich Untertests mit isolierten HTTP-Doubles und virtuellen Timern.
- Transportabdeckung: Gesamtfrist vor Socketzuweisung, beim Connect, vor Headern und im Antwortkörper; fragmentierte Antworten; Timerbereinigung; einmaliger Abschluss; synchrone Fehler beim Zerstören; Abbruch; unverändertes UTF-8-Framing; feste Zieladressen und Geheimnisfreiheit auch bei sensiblen Rohpfaden/Queries oder nativen Fehlertexten.
- CLI-Abdeckung: `--diagnose` vor/nach `--date`, Ablehnung doppelter/unbekannter Argumente, keine Reflexion der Argumentwerte und unveränderte stille Ausgabe ohne Diagnoseflag. Die verwendeten ungültigen Testdaten stoppen vor Netzwerk- und Kontozugriffen.
- `npm run build` einschließlich TypeScript: erfolgreich. Kein produktiver Anwendungscode, keine Firebase-Regeln und keine Konfiguration mit Zugangsdaten geändert.
- Echte Cloud-Negativprüfung: Auth-Root und Auth-Konfiguration HTTP 200; Request 3 bricht exakt bei `firestore-coverage`, `connecting`, `ECONNREFUSED` ab. Kontodatei und Manifest bleiben aus. Nachweis: `windows-timeout-negative-cli.json`.
- Echte positive Firestore-Integration bleibt in dieser Cloud **blockiert**: Port 8081 nicht verfügbar, Downloadhost weiterhin nicht freigegeben; kein erneuter Downloadversuch. Die gemeldete Windows-Emulatorbereitschaft und eine erfolgreiche Windows-Wiederholung werden nicht durch Test-Doubles ersetzt.

Geändert sind ausschließlich `scripts/evaluation-data-core.mjs`, `scripts/evaluation-data.mjs`, neue `tests/evaluation-transport.test.ts` und `tests/evaluation-cli.test.ts`, dieses Dokument sowie zusätzliche technische Nachweise. Die Scope-, Projekt-, Konto-, Passwortbindungs-, Hub- und Vorabprüfungen vor **jeder** Mutation bleiben bestehen. `.env.local` wird weder gelesen noch verändert. Keine Usability-Evaluation, kein Merge und kein Deployment.

### Kurzer Windows-Neuversuch

Auf dem aktualisierten Branch, bei weiter laufenden Emulatoren im Repository ausführen:

```powershell
npm.cmd run evaluation:seed -- --date 2026-11-09 --diagnose
```

Bei erneutem Fehler enthält die letzte JSON-Fehlerzeile den entscheidenden Schritt, Endpunkt und die Phase; nicht auf höhere Timeouts oder produktive Werte ausweichen. Das Diagnoseflag ändert die Sicherheitsprüfungen und den normalen Seed-Ablauf nicht. Bei erfolgreichem Seed anschließend:

```powershell
npm.cmd run evaluation:verify -- --diagnose
```

Das ist eine technische Setup-Verifikation, noch kein Evaluationsdurchlauf. **Separat gemessene Nachbesserungsinteraktion:** 09.11.2026, 10:01:40 UTC / 11:01:40 Europe/Berlin bis 10:14:41 UTC / 11:14:41 Europe/Berlin: **13 Minuten 1 Sekunden** einschließlich Analyse, Toollaufzeiten, Implementierung, Tests und Dokumentationsprüfung. Die abschließende Zeiteintragung und Git-/PR-Veröffentlichung erfolgen anschließend. Die bisherigen Messintervalle bleiben unverändert.
