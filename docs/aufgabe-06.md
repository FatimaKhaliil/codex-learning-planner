# Aufgabe 06 – Figma-getreue Übersicht und Profil

> Historischer Stand: Die ursprüngliche Umsetzung und ihre **21 Minuten 46 Sekunden** sind nachfolgend unverändert dokumentiert. Der manuelle Test der Entwicklerin hat anschließend eine Usability-Lücke beim fehlenden Anzeigenamen aufgedeckt. Die zusätzliche Codex-Interaktion und der aktuelle bearbeitbare Namensablauf stehen im [separaten Nachbesserungsabschnitt](#nachbesserung-anzeigename). Die ursprünglichen Read-only-Aussagen beschreiben den Stand von Commit `5b874088d3bb04060200a7f505cda0ce2ba2a4fa`.

## Ausgangsbasis, Auftrag und Messung

Bachelorarbeitstitel unverändert: **„KI-gestützte Entwicklung einer Web-App mit OpenAI Codex: Eine evaluative Fallstudie zu Effizienz, Codequalität und Nachvollziehbarkeit“**.

- Repository: `FatimaKhaliil/codex-learning-planner`
- Feature-Branch: `feat/aufgabe-06-figma-dashboard-profile`
- Bestätigter und vor Beginn geprüfter Ausgangscommit: `ec5a3297e4f56daa41b4606a744741cdbb6cbdfc`
- Arbeitsbaum bei Beginn sauber; ausschließlich auf diesem Branch gearbeitet.
- Separate Zeitmessung: **03.11.2026, 17:15:10–17:36:56 UTC / 18:15:10–18:36:56 Europe/Berlin**, tatsächlich **21 Minuten 46 Sekunden (1.306 Sekunden)** für Implementierung, Tests, Figma-Abgleich und Dokumentationsreview. Die vorherige Branch-Vorbereitung ist ausgeschlossen.

## Designgrundlage und fachliche Entscheidungen

Verbindlich sind [Figma Design](https://www.figma.com/design/I1M2Vz1vC3uDl0KWkyRyzF/Untitled), Übersicht Desktop `32:35294`, Übersicht Mobile `32:35390`, Profil Desktop `32:36206` und Profil Mobile `32:36269`. Alle vier vollständigen Designkontexte einschließlich Bildern wurden **vor Codeänderungen** gelesen. Anschließend wurden Geometrie, enthaltene Frames und direkt zugehörige Zustandsverweise geprüft. Die gelieferten Frames enthalten keine Instanz-/Komponentenverweise oder Prototyp-Reaktionen; auf derselben Seite wurden keine weiteren Dashboard-/Profilzustände gefunden. Die ähnlich benannten Registrierungsfehler „Konto vorhanden“ gehören zur bestehenden Authentifizierung. Strukturbeleg: `visual/aufgabe-06/figma-geometry.json`.

Das Profil im Figma-Entwurf ist eine statische Ansicht mit Name, E-Mail, Fortschritt und Abmelden. Es hat **keinen Speichernbutton und keine E-Mail-/Passwortänderungsaktion**. Entsprechend zeigt die Umsetzung die echten Auth-Kontodaten ausdrücklich schreibgeschützt. Es gibt keine nur scheinbar gespeicherten Änderungen. Der Figma-Text „Demo-Profil“ bzw. „keine … mit einem Backend verbunden“ wurde durch „Dein Konto · Lernplaner“ und einen zutreffenden Hinweis auf schreibgeschützte Kontodaten ersetzt. Neue Auth-Mutationen, Re-Authentifizierungsabläufe und eine Firestore-Profilsammlung sind dafür nicht erforderlich.

„Deine nächsten Lernschritte“ zeigt höchstens drei **nicht erledigte** Aufgaben. Überfällige Aufgaben bleiben enthalten. Anders als die statische Figma-Demoliste wird eine erledigte Aufgabe nicht als anstehend dargestellt. Diese fachliche Entscheidung sowie die erforderliche chronologische Sortierung haben Vorrang vor dem Nachstellen der unsortierten Figma-Beispielinhalte.

## Funktionale Soll-Ist-Matrix

| FR | Umsetzung / Erfüllungsstand | Nachweis |
| --- | --- | --- |
| FR-01 Übersicht vervollständigen | Umgesetzt: Begrüßung, Fortschritt, Kennzahlen und nächste Lernschritte als eigene Ansicht. | Figma-Paare; Dashboard-Browsergruppe 1. |
| FR-02 echte eigene Aufgaben | Produktivpfad bleibt derselbe UID-gebundene `TaskRepository`-Bestand. Keine Demo-Aufgaben im Produktivcode. Firestore-Laufzeitnachweis hier offen. | Unveränderte Repository-/Auth-Dateien; isolierte Datenprüfungen und Auth-Tests separat. |
| FR-03 vollständige Kennzahlen | Gesamt, nicht abgeschlossen, erledigt und Fortschritt aus allen geladenen Aufgaben; Offen/In Bearbeitung separat im zugänglichen Statistiktext. | Unit-Tests sowie Browserprüfung mit 54 und 1.000 Aufgaben. |
| FR-04 deterministische nächste Aufgaben | Gültiges `dueDate` aufsteigend, bei gleichem Datum ID nach localeunabhängiger Code-Unit-Reihenfolge. Erledigte ausgeschlossen; maximal drei. Fehlende/ungültige Daten defensiv hinten, dort ebenfalls nach ID. | Reine Modelltests einschließlich eingefrorener Eingaben; Browserbestand nach Cursorseite eins. |
| FR-05 Navigation | Übersicht, Aufgaben, Kalender und Profil über vorhandene Navigation erreichbar. Profilzugänge haben `aria-current="page"`. | Neue Browserprüfung und vorhandene Navigation-/Kalenderregression. |
| FR-06 bestehende Aktionen | Erstellen aus Leer-/Alles-erledigt-Zustand, Bearbeiten, Statuswechsel und Löschen nutzen bestehende Handler und Formulare. „Alle Aufgaben ansehen“ führt zur Aufgabenseite. | Dashboard-CRUD-Gruppe und bestehende Aufgabenregression. |
| FR-07 Datenzustände | Leerer Bestand, alles erledigt, Laden, Fehler und Retry; während Laden/Fehler keine alten Kennzahlen oder Vorschaukarten. | Dashboard-/Profil-Browsergruppe 3. |
| FR-08 Profil-Platzhalter ersetzen | Umgesetzt: eigenständige Profilkarte gemäß den beiden Figma-Frames. | Desktop-/Mobile-Vergleich und 320-px-Prüfung; Auth-Browser. |
| FR-09 Auth-Informationen | Name und E-Mail aus aktuellem Firebase-Auth-User; fehlende Angaben explizit kenntlich. | Echtes zweites Auth-Emulatorkonto mit Anzeigename, Reload und Rückwechsel. |
| FR-10 keine festen Personen | Produktivkomponente erhält Identität als Props aus `TasksPanel`. Persönliche Testdaten nur ausdrücklich isoliert bzw. temporär im Auth Emulator. | Quellenprüfung und getrennte Testbelege. |
| FR-11 sichere Profilaktionen | Vorgesehene Abmeldung über bestehendes `logout`; Pending, Fehler und erneuter Versuch verständlich. | Simulierter Fehler-/Ladezustand plus echte Abmeldung im Auth Emulator. |
| FR-12 Speichern bearbeitbarer Felder | Im belegten Designumfang nicht zutreffend: beide Felder bewusst `readOnly`, Hinweis sichtbar, kein Speichernbutton. Keine Profiländerungsfunktion behauptet. | Schreibversuch per Tastatur verändert den Feldwert nicht. |
| FR-13 sicherheitsrelevante Änderungen | Keine E-Mail-/Passwortänderung neu angeboten, daher kein Reauth-Bypass. Bestehender Passwort-Reset bleibt erhalten und wird regressionsgeprüft. | Auth-Browser-/SDK-Tests. Reauth/Profiländerung nicht implementiert oder getestet. |
| FR-14 Abmelden/Zugriffsschutz | Nach Logout werden geschützte Inhalte entfernt; alle vier internen Routen führen wieder zur Anmeldung. | Auth Emulator: Logout in zwei Tabs, beide Konten, alle vier Routen. |
| FR-15 Datenspeicherung | Keine Profilsammlung, Migration oder zusätzliche Speicherung sensibler Daten. | Git-Diff und Import-/Datenflussprüfung. |
| FR-16 konsistentes Layout | Vorhandene Sidebar, mobiler Profilzugang und untere Navigation wiederverwendet; keine zusätzliche Profilnavigation erfunden. | Screenshots und Navigationstests bei 1440/390/320 px. |

Die Regel für fehlende Fälligkeiten ist eine **defensive Modellregel**: Der bestehende Produktivpfad verlangt ein gültiges Pflichtdatum; Firestore `orderBy('dueDate')` liefert Dokumente ohne dieses Feld nicht. Es wird keine neue produktive Unterstützung datumsloser Legacy-Dokumente behauptet. Modelltests verwenden dafür ausdrücklich synthetische Grenzfälle.

## NFR-Bewertung und verbleibende Grenzen

| NFR | Maßnahme und geeignete Prüfung | Bewertung / Grenze |
| --- | --- | --- |
| Security | UID aus Authentication, bestehende Guards/UID-Keys/Repositorypfade unverändert. Auth-Emulatortests für echte Identität, Kontowechsel und Logout. Keine Geheimnisse protokolliert oder zusätzliche Kontodaten gespeichert. | Authentifizierungsverhalten nachgewiesen. Firestore-CRUD-/Benutzertrennungstests für diesen Commit blockiert; isolierte Fixtures beweisen keine Security Rules. Produktive Regeln unverändert. |
| Performance | Derselbe zentrale Datenhook, keine neuen Queries in den Ansichten. Gemessene Repository-Aufrufzahlen im isolierten Test. Dashboard und Profil dynamisch geladen. | Navigation verursacht dort null zusätzliche Reads. Vollständiges Laden bleibt O(N); neue Lazy-Chunks sind kein gemessener Nachweis kürzerer Ladezeiten. |
| Skalierbarkeit / Kapazität | Kennzahlen, Sortierung und Cursorvollständigkeit mit 54 und 1.000 Aufgaben funktional geprüft. Nur drei Vorschaukarten gerendert. | Funktional vollständig für diese Bestände. Keine Last-/Latenzmessung, keine Prüfung mit einer Million Nutzern oder einer Million gleichzeitigen Nutzern. Dieses theoretische Szenario gehört zur späteren separaten Evaluation. |
| Zuverlässigkeit | Fehler, Retry, Ladezustand, nach CRUD erneuerter Bestand, Auth-Sitzungsreload und Kontowechsel getestet. | Keine alten Daten nach geprüftem Kontowechsel. Kein Echtzeitlistener oder transaktionaler Snapshot über Cursorseiten; externe Taskänderungen erscheinen erst beim erneuten Laden. |
| Usability / Accessibility | Beschriftete schreibgeschützte Felder, sichtbarer Hinweis, Rollen und Meldungen, Fokusprüfungen, Tastatur-Schreibversuch, responsive Bilder, lange/fehlende Identitäten. | Kein Overflow bei 320 px in geprüften Fällen. Keine Nutzungsstudie, kein Screenreader-Audit und keine vollständige WCAG-Konformitätsprüfung. |
| Wartbarkeit / Wiederverwendung | Reines Dashboardmodell, getrennte Ansichten und CSS, bestehende Formulare/Repository/Navigation. Kleine gemeinsam verwendete Löschdialog-Deklaration ersetzt duplizierte Verkabelung. | Modell unabhängig von React testbar; sechs neue Unit-Gruppen. Keine neue Abhängigkeit. Kein Code-Erweiterbarkeitsexperiment; spätere wissenschaftliche Evaluation bleibt offen. |

### Datenzugriff und gemessene Aufrufzahlen

`TaskWorkspace` hält weiterhin genau einen `useTasks(repository)`-Aufruf oberhalb der neuen, ansichtsbezogenen Komponenten. Das Repository wird in `TasksPanel` nach UID memoisiert; `TasksPanel` und `TaskWorkspace` werden nach UID getrennt. Monat/Tasks/Dashboard/Profil innerhalb derselben Sitzung verwenden denselben geladenen Bestand. Ein direkter Profilaufruf benötigt den vorhandenen Aufgabenbestand für die im Figma vorgesehene Fortschrittskarte; es gibt keine separate Profilquery.

Das unveränderte Repository liest nach `dueDate` und Dokument-ID geordnet höchstens 50 Dokumente pro Serverquery. Mit `hasMore = snapshot.size === 50` sind im erfolgreichen vollständigen Durchlauf theoretisch `floor(N / 50) + 1` Listenabfragen nötig. Bei genau 1.000 Aufgaben sind es 21 einschließlich einer leeren Abschlussabfrage. Diese Formel beschreibt Query-Aufrufe, keine Firestore-Abrechnung.

Gemessen wurde das Repository-Interface im isolierten React-StrictMode-Fixture:

| Bestand / Aktion | Gemessene zusätzliche Listenaufrufe | Schreibaufrufe | Einordnung |
| --- | --- | --- | --- |
| Initial 3 Aufgaben | 2 | 0 | Ein vollständiger Durchlauf plus ein abgebrochener StrictMode-Erstaufruf. |
| Neuer Bestand 54 Aufgaben | 3 | 0 | Zwei vollständige Cursorseiten plus ein abgebrochener StrictMode-Erstaufruf. |
| Neuer Bestand 1.000 Aufgaben | 22 | 0 | 21 vollständige Abfragen plus ein abgebrochener StrictMode-Erstaufruf. |
| Ansichts-/Profilwechsel je Bestand | 0 | 0 | Im selben Fixture-Dokument; kumulierte Zähler 2 → 5 → 27. |
| Separater CRUD-Abschnitt | 8 | 4 | Neues Fixture-Dokument mit Zählern ab null. Status, Bearbeiten, Erstellen, Löschen; bisheriger Reload nach Mutationen bleibt ausdrücklich bestehen. |

Diese Messungen sind **keine echten Firestore-Netzwerk- oder Kostenmessungen**. Ein bereits gestarteter SDK-Serverrequest lässt sich durch die vorhandene Generationserkennung nicht zurückholen. Retry, neue UID, neuer Seitenaufruf und CRUD-Reload können weiter Queries auslösen. Fehler-/Retrytests werden getrennt von der obigen Read-only-Messsequenz ausgeführt.

Das Laden und die Kennzahlberechnung bleiben O(N). `upcomingTasks` kopiert und sortiert alle M nicht erledigten Aufgaben: **O(M log M)** Zeit und O(M) zusätzlicher Speicher, obwohl nur drei ausgegeben werden. `useMemo` vermeidet erneute Berechnung bei stabiler Tasks-Referenz. Keine ungemessenen Durchsatz-/Latenzaussagen. Die Auth-Anzeige nutzt den aktuellen User/Observer; externe Profiländerungen in einer anderen Sitzung werden ohne zusätzlichen `reload(user)` nicht als sofort synchronisiert zugesichert.

## Architektur, Wiederverwendung und Git-Änderungen

| Pfad | Änderung / Zweck |
| --- | --- |
| `src/dashboard/model.ts` | Neu: vollständige Status-/Fortschrittskennzahlen und deterministische Auswahl anstehender Aufgaben. |
| `src/dashboard/DashboardView.tsx`, `dashboard.css` | Neue Präsentationsgrenze für die vorhandene Übersicht; komponiert `ProgressCard`, Statistik und vorhandene Aufgabenliste über Render-Prop. Ansichtsbezogenes CSS. |
| `src/profile/ProfileView.tsx`, `profile.css` | Neu: echte Identität, schreibgeschützte Felder, Fortschrittszustände und Abmeldung. Keine Auth-/Firestore-Zugriffe in der Komponente. |
| `src/tasks/TaskWorkspace.tsx` | Beide Ansichten eingebunden, bestehende Status-/CRUD-Handler und zentraler Datenbestand wiederverwendet. Lazy-Imports mit zugänglichem Suspense-Ladezustand. Gemeinsame Löschdialog-Deklaration für die Ansichten. |
| `src/layout/AppLayout.tsx` | Ansichtsbezogene Layoutklassen und aktive Profilzugänge; bestehende Sidebar und Mobile-Navigation bleiben gemeinsam. |
| `src/layout/Icon.tsx`, `public/assets/figma/32-38466.svg` | Unverändertes originales 20-px-Abmelde-Icon für den Profilbutton zugeordnet. Bestehendes 16-px-Sidebar-Icon bleibt erhalten. |
| `tests/dashboard-core.test.ts` | Sechs neue Modell-Testgruppen, inklusive 54/1.000 Aufgaben und Grenzfällen. |
| `tests/fixtures/dashboard-profile.html`, `dashboard-profile.tsx` | Explizit isolierte synthetische Bestände, Identitäten, gezählte Repository-Aufrufe sowie simulierte Fehler/Abmeldung. Kein Import aus dem Produktiveinstieg. |
| `tests/browser-dashboard-profile.py` | Neue sechs Browserprüfgruppen und sechs Screenshots mit Geometriemessungen. |
| `tests/browser-navigation.py` | Veraltete Profil-Platzhaltererwartung durch echte Profil-/Navigationsprüfung ersetzt. |
| `tests/browser-auth.py` | Echte Profilfelder, schreibgeschütztes Verhalten und Kontowechsel ergänzt; Ausgabeordner über `AUTH_BROWSER_OUT`; temporäre Emulatoruser werden im `finally` gezielt gelöscht. |
| `docs/aufgabe-06.md`, `docs/visual/aufgabe-06/`, `docs/verification/aufgabe-06/` | Designreferenzen, Vergleichspaare, Messwerte und nach Testumgebungen getrennte Nachweise einschließlich Excel-importierbarer Messdaten. |

Weiterverwendet: `AppLayout`, `Icon`, `ProgressCard`, `TaskList`, `StatusSelect`, `TaskForm`, `DeleteTaskDialog`, `useTasks`, `loadAllTasks`, `TaskRepository`, `tasksForUser`, bestehendes Authentication-/Routing-/Logout-Verhalten. Git-Vergleich zum Ausgangscommit bestätigt unveränderte Auth-Produktivdateien, Firebase-Konfiguration, Repository/Queries/Hook, Kalenderimplementierung, Security Rules und Abhängigkeiten. Keine Profilsammlung und keine Datenmigration.

Der erste Build mit statischen neuen Imports erzeugte einen 502,06-kB-TasksPanel-Chunk und die Vite-Warnung über 500 kB. Nach Aufteilung in dynamische Dashboard-/Profilmodule misst der abschließende Build **497.731 Bytes** für TasksPanel-JavaScript, **2.858 Bytes** für Dashboard-JavaScript und **2.389 Bytes** für Profil-JavaScript (jeweils minifiziert, ohne CSS; kein Latenzbenchmark). Die Warnschwelle wurde nicht verändert. Exakte Dateigrößen und Dateinamen stehen in `verification/aufgabe-06/test-summary.json`.

## Tatsächlich ausgeführte Tests und Umgebungen

Node.js 24.19, vorhandenes Lockfile, TypeScript/Vite, Chromium über Python Playwright. Vite `127.0.0.1:5185`, Auth Emulator `127.0.0.1:9099`, Demo-Firebase-Konfiguration ausschließlich mit lokalen Emulatoradressen. Keine produktiven Firebase-Daten verändert.

| Prüfung / Befehl | Ergebnis und Aussagegrenze |
| --- | --- |
| `npm run typecheck` | Erfolgreich. |
| `npm run build` | Erfolgreich, nach Lazy-Aufteilung keine Chunkgrößenwarnung. |
| `npm test` | **30/30** bestanden: 24 bestehende und sechs neue Dashboard-Gruppen. |
| Dashboardmodell | Leerer/erledigter Bestand, alle Statuswerte, 54 und 1.000 Aufgaben, vollständiger Fortschritt, Datums-/ID-Sortierung, überfällige Aufgaben, fehlende/ungültige Daten und Limits, eingefrorene Eingaben ohne Mutation. |
| `python3 tests/browser-dashboard-profile.py` | **6/6** Gruppen bestanden; 54/1.000 Datensätze, Read-Zähler, Navigation, vorhandene CRUD-Handler, Zustände/Retry, lange/fehlende Identität, isolierter Kontowechsel, readonly/Tastatur, simulierte Logoutzustände und Screenshots. Keine unbehandelten Seitenfehler. |
| `TASKS_BROWSER_BASE_URL=http://127.0.0.1:5185/ TASKS_BROWSER_OUT=work/aufgabe-06/tasks-browser python3 tests/browser-tasks.py` | **6/6** vorhandene Aufgaben-/Navigationsregressionsgruppen bestanden, einschließlich CRUD, Validierung, Fehler/Retry, Fokus, Suche/Filter und vollständiger Sammlung >50. Isoliertes Repository. |
| `python3 tests/browser-calendar.py` | **5/5** bestehende Kalenderregressionsgruppen bestanden. Für diesen Lauf wurde nur `OUT` im Speicher nach `work/aufgabe-06/calendar-browser` umgeleitet, um Aufgabe-05-Nachweise zu erhalten. Kalender-Testdatei und Produktivkalender unverändert. |
| `npm run test:auth:integration` | **12/12** erfolgreich mit echtem Firebase-SDK gegen lokalen Auth Emulator. |
| `AUTH_BROWSER_BASE_URL=http://127.0.0.1:5185/ AUTH_BROWSER_OUT=work/aufgabe-06/auth-browser python3 tests/browser-auth.py` | **19/19** erfolgreich mit echtem lokalen Auth Emulator: Anmeldung/Registrierung/Reset, Sitzungsreload, echter Anzeigename/E-Mail, Kontowechsel/Rückwechsel ohne Altidentität, Logout und Routenschutz. Keine Seitenfehler. Temporäre Konten gezielt gelöscht. |
| Firestore-Start und `npm run test:tasks:integration` | **Blockiert, nicht bestanden.** Genau ein Emulatorstartversuch: Download von `cloud-firestore-emulator-v1.22.0.jar` über `storage.googleapis.com` fehlgeschlagen. Ohne laufenden Emulator anschließend `ECONNREFUSED 127.0.0.1:8081`. Keine Wiederholungsserie, kein produktiver Fallback. |
| Git-Diff und `git diff --check` | Keine Whitespacefehler; geschützte Bestandsdateien unverändert. Vor Veröffentlichung erneut geprüft. |

Belege: `verification/aufgabe-06/` enthält Auth-SDK-/Browser-, Aufgaben-/Kalender-Browserergebnisse und die beiden Firestore-Fehlerprotokolle. Die neue Suite speichert Messungen in `visual/aufgabe-06/browser-dashboard-profile-results.json`. `verification/aufgabe-06/measurements.csv` trennt Messwerte, statische Prüfung und theoretische Komplexitätsaussagen für die spätere Excel-Auswertung.

**Keine produktive Firebase-End-to-End-Abnahme:** Die Aufgaben-/Kalender-/Dashboardfixtures sind In-Memory-Implementierungen des bestehenden Repository-Interfaces; die darin simulierte Identität und Abmeldung sind kein Auth-Nachweis. Die getrennten Auth-Emulatortests verwenden den echten Firebase-SDK-/Observerpfad, beweisen aber keine erfolgreiche Firestore-Abfrage oder Security Rule. Die bestehenden Firestore-Integrations- und Benutzertrennungstests sind anschließend auf dem Windows-Rechner mit laufendem Emulator erneut auszuführen; hierfür werden keine Resultate vorweggenommen.

## Direkter Figma-Screenshotvergleich

Originalexporte: Übersicht **1440 × 935** und **390 × 1143**, Profil **1440 × 800** und **390 × 844**. Alle vier PNGs wurden direkt aus Figma bezogen. Die temporäre Icon-Download-URL lieferte HTTP 403; das benötigte originale Logout-SVG wurde deshalb direkt und unverändert über den read-only Figma-Export bezogen. Alle benötigten Assets waren damit verfügbar; keine fremden Bilder, geänderten SVG-Pfade oder Ersatzsymbole. Kein Figma-Make-Code und keine Änderung am Design-Dokument.

Vergleichspaare links Figma / rechts Browser:

- [Übersicht Desktop](visual/aufgabe-06/comparison-dashboard-1440.png) und [Mobile](visual/aufgabe-06/comparison-dashboard-390.png).
- [Profil Desktop](visual/aufgabe-06/comparison-profile-1440.png) und [Mobile](visual/aufgabe-06/comparison-profile-390.png).
- Zusätzliche [Übersicht bei 320 px](visual/aufgabe-06/dashboard-320.png) und [Profil bei 320 px](visual/aufgabe-06/profile-320.png); kein eigener verbindlicher 320-px-Figma-Frame vorhanden.

Die visuellen Browserbilder verwenden **ausschließlich ein isoliertes Fixture**: synthetische Identität „Mira Sommer“, `mira@example.test`, drei synthetische Oktober-Aufgaben mit je einem der drei Statuswerte. Die Vorschau enthält deshalb zwei anstehende Karten; die Fortschritts-/Gesamtkennzahlen berücksichtigen trotzdem alle drei Aufgaben. Figma-Person und Beispielaufgaben wurden nicht in den Produktivcode übernommen. Nur der Testbrowser verwendet den 09.10.2026 und Europe/Berlin als feste Uhr/Zeitzone; die Anwendung hat keine festgeschriebene Uhr.

Finale Geometrie in CSS-Pixeln, Figma-Sollwerte direkt aus Nodes und Browserwerte aus `getBoundingClientRect`:

| Element | Desktop: Figma / Browser | Mobile: Figma / Browser |
| --- | --- | --- |
| Dashboard-Begrüßung | x376/y134, 992 × 61 / identisch | x20/y104, 350 × 100 / identisch |
| Dashboard-Fortschritt | y223, 992 × 80 / identisch | y232, 350 × 80 / identisch |
| Kennzahlengruppe | y331, Höhe 103 / identisch | y340, Höhe 96 / identisch; Kartenhöhen 96/83/83 |
| Dashboard-Inhaltskarte | x376/y462, Breite 992 / identisch | x20/y464, Breite 350 / identisch |
| Erste Vorschaukarte | x400/y529, 944 × 84 / identisch | x44/y531, 302 × 146 / identisch |
| Zweite Vorschaukarte | y625, Höhe 84 / identisch | y689, Höhe 126 / identisch |
| Profilkarte | x376/y134, 600 × 539 / identisch | x20/y104, 350 × 570 / identisch |
| Profil Name/E-Mail | x400/y304 bzw. y395, 552 × 48 / identisch | x44/y274 bzw. y365, 302 × 48 / identisch |
| Profilfortschritt | y463, 552 × 80 / identisch | y433, 302 × 93 / identisch |
| Profilabmeldung | y601, 552 × 48 / identisch | y602, 302 × 48 / identisch |

Verbleibende, begründete Unterschiede:

1. Die erledigte Figma-Vorschaukarte entfällt fachlich. Die Dashboard-Inhaltskarte ist deshalb **339 statt 435 px** hoch auf Desktop (−96 px) und **443 statt 581 px** auf Mobile (−138 px). Der Link darunter rückt entsprechend nach oben. Es werden keine Daten oder leeren Füllkarten zur optischen Angleichung erfunden.
2. Identität, Aufgabentitel und Profilhinweis unterscheiden sich absichtlich. Die Browseransicht zeigt den tatsächlichen angemeldeten Namen bzw. ausdrücklich synthetische Testdaten. Fortschritt und Zähler sind datenabhängig.
3. Trotz übereinstimmender Hauptgeometrie bleiben einzelne Text-/Iconkanten, Rundungen und Rahmen durch unterschiedliche Figma-/Chromium-Rasterung sichtbar verschieden. Diese Restpixel sind nicht vollständig einzeln quantifiziert. Es wird **keine vollständige Pixelidentität** oder Ganzseiten-Genauigkeitsquote behauptet.
4. Bei 320 px gelten bewusst schmalere Innenabstände, kleinere Kennzahlenbeschriftung und ein eigener Fortschrittsumbruch. Lange Texte dürfen die Seite vertikal verlängern. Beide Seiten und zusätzliche lange/fehlende Identitäten wurden ohne horizontalen Überlauf geprüft.
5. Leer-/Fehler-/Lade-/Alles-erledigt-Zustände und echter Kontowechsel haben in den gelieferten Dashboard-/Profilframes keine eigenen Referenzbilder; sie folgen den vorhandenen UI-Konventionen.

Alle sichtbaren statischen Icons wurden auf erfolgreiche lokale Ladung und effektive native Abmessungen geprüft; die ursprünglichen 20-/16-/12-px-Größen bleiben erhalten. Die Profilabmeldung verwendet das originale 20-px-Icon, nicht das kleinere Sidebar-Asset. Die Original-Screenshots werden ausschließlich als Nachweise gespeichert und nicht im Produkt gerendert.

## Fehler, Korrekturen und Grenzen der Automatisierung

- Direktvergleich korrigierte Kennzahlenhöhen von 104 → 103 px Desktop und 98 → 96 px Mobile sowie Profilfortschritt von etwa 94 → 93 px. Ursache waren abweichende normale Zeilenhöhen; explizite, ansichtsbezogene Zeilenhöhen stellen die gemessene Figma-Geometrie her.
- Bei 320 px brach „abgeschlossen“ zunächst ungünstig mitten im Wort um. Kleinere Statistikabstände/-innenabstände und 10-px-Beschriftung wurden auf diesen Bereich begrenzt und erneut visuell geprüft.
- Die neue Buildwarnung über 500 kB wurde durch Lazy-Imports der beiden Ansichten behoben; Warnschwelle und Dependencies blieben unverändert.
- Zwei erste Unit-Assertions verglichen Fließkomma-Prozentwerte exakt; auf numerische Toleranz korrigiert. Kein Kennzahlenfehler versteckt.
- Ein Browserselektor für „Alles erledigt“ kollidierte mit einem versteckten Fixture-Steuerbutton. Auf die sichtbare Überschriftenrolle eingegrenzt.
- Veraltete Profil-Platzhalterassertionen in Auth-/Navigationsregression wurden durch echte Feld-/Navigationsprüfungen ersetzt; Kontowechsel und gezieltes Cleanup ergänzt.
- Ein read-only Figma-Skript enthielt `await` in einem nicht asynchronen Callback; Syntax korrigiert, keine Designmutation. Ein großer PNG-Transfer überschritt die Shell-Argumentgrenze; die Toolantwort wurde lokal zwischengespeichert und decodiert. Exportbilder unverändert.
- Asset-HTTP-403 wurde durch originalen Figma-Export gelöst. Der Firestore-JAR-Download bleibt dagegen ein nicht gelöstes Umgebungsproblem; Fehlerprotokolle liegen bei.
- Der abschließende Git-Whitespacecheck beanstandete die standardmäßigen CRLF-Zeilenenden des Python-CSV-Writers. Die CSV wurde auf LF normalisiert; Inhalt und Excel-Importierbarkeit bleiben erhalten. Diese Dokumentationskorrektur ist in der endgültigen Zeitmessung enthalten.

Die Entwicklerin musste in dieser Implementierungsphase keine manuellen Codekorrekturen oder Zugangsdaten liefern. Das ist keine Behauptung vollständiger autonomer Abnahme: Die vorherige Branch-Vorbereitung war vorgegeben; Agenten teilten Modell/UI, Auth-Tests und Review parallel auf, danach wurden Änderungen und Screenshots gemeinsam geprüft. Die gemessene Dauer ist verstrichene Gesamtzeit einschließlich Tool-/Testwartezeit, keine Summe von Agentenarbeitsstunden. Auf Windows noch ausstehende Firestore-Tests zählen nicht als hier ausgeführt.

Offen bleiben die erneute Firestore-CRUD-/Security-Rule-Abnahme mit Emulator, eine Produktivdaten-Sichtprüfung durch die Entwicklerin, externe Daten-/Profilsynchronisierung, O(N)-Ladegrenze und O(M log M)-Sortierung. Die eigenständige wissenschaftliche Evaluation von Usability, Performance, Skalierbarkeit/Kapazität einschließlich des theoretischen Million-User-Szenarios und Code-Erweiterbarkeit wird durch die UI-Tests dieser Aufgabe nicht ersetzt.

## Abschluss der Zeitmessung

Nach Abschluss von Implementierung, Testläufen, visuellen Korrekturen, Nachweiserstellung und Dokumentationsreview endet die Messung am **03.11.2026 um 17:36:56 UTC / 18:36:56 Europe/Berlin**. Seit Beginn um 17:15:10 UTC sind **21 Minuten 46 Sekunden = 1.306 Sekunden** verstrichen. Maschinenlesbarer Beleg: `verification/aufgabe-06/phase-timing.json` und Zeitzeile in `measurements.csv`. Branch-Vorbereitung sowie anschließender Commit, Push und Draft-PR-Veröffentlichung sind aus dieser Phase ausgeschlossen. Kein Merge, kein produktives Firebase-Deployment und keine Änderung produktiver Security Rules.

<a id="nachbesserung-anzeigename"></a>

## Nachbesserung vom 04.11.2026: Anzeigenamen bearbeiten und speichern

### Manueller Auslöser und zusätzliche Interaktion

**Auslöser war der manuelle Hinweis der Entwicklerin:** Bei einem Konto ohne Anzeigenamen erschien „Kein Name hinterlegt“, aber das Namensfeld war schreibgeschützt und es gab keinen Speicherweg. Die ursprüngliche Interpretation des statischen Figma-Profils hatte die Anzeige umgesetzt, jedoch diesen alltäglichen Benutzerablauf nicht berücksichtigt. Die bisherigen automatisierten Tests erwarteten sogar ein schreibgeschütztes Namensfeld; erfolgreiche Tests allein konnten die Usability-Lücke deshalb nicht aufdecken.

Diese Nachbesserung ist eine **zusätzliche Codex-Interaktion und zusätzlicher Korrekturaufwand**, keine nachträgliche Verkürzung oder Ersetzung der ursprünglichen Aufgabe. Ausgang ist Commit `5b874088d3bb04060200a7f505cda0ce2ba2a4fa` auf demselben Branch `feat/aufgabe-06-figma-dashboard-profile`; die Korrektur aktualisiert Draft PR #6. Separate Messung: **04.11.2026, 08:34:52–08:58:24 UTC / 09:34:52–09:58:24 Europe/Berlin**, tatsächlich **23 Minuten 32 Sekunden (1.412 Sekunden)** nach Prüfung des sauberen Arbeitsbaums. Die ursprünglichen **21 Minuten 46 Sekunden**, die damalige `phase-timing.json` und damalige Nachweise bleiben erhalten.

### Ursache und technische Lösung

1. Das Namensfeld ist im angemeldeten Produktivpfad bearbeitbar. Ein ausdrücklich sichtbarer **„Namen speichern“**-Button sendet Änderungen; ungespeicherte Eingaben ändern weder die bestätigte Profilanzeige noch den Avatar. Das E-Mail-Feld bleibt schreibgeschützt. Es gibt keine E-Mail-/Passwortänderung und keinen Profilbild-Upload.
2. `AuthProvider.updateDisplayName` normalisiert und validiert erneut und ruft ausschließlich die offizielle Funktion **`updateProfile(user, { displayName })`** auf. Es wird keine Firestore-Profilsammlung angelegt. Der Ziel-User muss vor dem Aufruf dem vom Auth-Observer bestätigten aktuellen User entsprechen; nach dem Await wird nochmals die Identität des aktuellen SDK-Users geprüft.
3. Firebase `User` ist ein veränderbares SDK-Objekt. `updateProfile` kann dessen `displayName` ändern, ohne für dieselbe UID erneut `onAuthStateChanged` auszulösen. Auch `setUser(dasselbeObjekt)` wäre wegen gleicher Referenz kein verlässlicher React-Trigger. Deshalb erhöht der Provider nach Erfolg eine **explizite Profilrevision**, die einen neuen memoisierten Context-Wert publiziert. Der originale Firebase-User wird nicht kopiert oder durch ein gewöhnliches JavaScript-Objekt ersetzt.
4. `TasksPanel` liest bei diesem Context-Update die bestätigte Identität neu und reicht sie über `TaskWorkspace` an das gemeinsame Layout und die Ansichten. UID-Schlüssel und das nach UID memoierte Repository bleiben stabil. Profilname, Desktop-Sidebar, beide Initialen-Avatare und Dashboard-Begrüßung aktualisieren sich sofort; ein Task-Reload oder Seiten-Reload ist dafür nicht erforderlich.
5. Ein synchroner Formular-Ref-Lock und ein zusätzlicher Provider-Lock verhindern doppelte gleichzeitige Speicheraktionen. **`savingDisplayName` liegt auch im Auth-Kontext** und wird bis zum Formular weitergereicht. Dadurch bleiben Feld und Speicherbutton selbst nach Profil → Dashboard → Profil bis zur Bestätigung gesperrt. Der lokale Zustand schützt zusätzlich gegen schnelle Submit-Ereignisse vor dem nächsten React-Render.
6. Das Formular zeigt Validierungsfehler mit Feldfokus, Pending-Zustand, SDK-/Sitzungsfehler und erst nach erfolgreichem Await „Name gespeichert.“. Eingabeänderungen löschen alte Rückmeldungen. Generation-/Unmount-Prüfung verhindert eine verspätete lokale Meldung in einem neu geöffneten Profil oder einem anderen Konto. Das Profil-Abmelden ist während eigener Speicherung deaktiviert; ein unabhängig ausgelöster Logout/Kontowechsel wird trotzdem sicher behandelt.

Validierung: Unicode-Leerraum nur am Anfang/Ende entfernen, keinen ausschließlich aus Leerraum bestehenden Namen zulassen, höchstens **100 Unicode-Codepoints** nach Normalisierung. Bindestriche, Apostrophe, Akzente und andere Schriftsysteme sind erlaubt; innere Schreibweise wird erhalten. Das HTML-Feld erlaubt bis zu 200 UTF-16-Codeunits, damit auch 100 Zeichen außerhalb der BMP eingegeben werden können; die maßgebliche 100-Codepoint-Grenze prüft der gemeinsame Validator im Formular und im Provider. Codepoints sind keine typografischen Graphemcluster: etwa kombinierte Akzente können mehrere Codepoints zählen.

Der gemeinsame Helper `identityInitials` verwendet die ersten Codepoints der ersten zwei Namenswörter, deutsche Großschreibung sowie E-Mail-/`K`-Fallback. Damit berechnen Profil und Sidebar dieselben Initialen auch bei Unicode-Namen. Der Avatar verwendet weiterhin ausschließlich Initialen des bestätigten Namens. Firebase Storage wird nicht verwendet; ein Profilbild-Upload bleibt mögliche **Future Work**, außerhalb dieser Korrektur.

### Ergänzter FR-/NFR-Stand

| Anforderung | Neuer Stand / Nachweis |
| --- | --- |
| FR-09 / FR-12 und manueller Namensablauf | Erstmaliges Setzen und späteres Ändern des eigenen Anzeigenamens über Firebase Authentication implementiert; erfolgreiche Speicherung, sofortige Anzeige und Persistenz real im Auth Emulator geprüft. Frühere N/A-Einordnung von FR-12 gilt für diesen neuen Umfang nicht mehr. |
| FR-13 und E-Mail | E-Mail bleibt schreibgeschützt, Passwort-/E-Mailänderung und Reauth-Ablauf werden nicht neu angeboten. |
| Usability | Sichtbare Speicheraktion, Hint und verständliche Rückmeldung statt dauerhaft leerem Read-only-Feld; 1440/390/320 geprüft. Ein einzelner manueller Mangelbericht ist keine vollständige Usability-Studie. |
| Zuverlässigkeit | Sofortige React-Aktualisierung unabhängig vom Auth-State-Observer, Reload/Login-Persistenz, Fehler ohne falschen Erfolg, Pending bei Navigation und verspäteter Save bei Kontowechsel getestet. |
| Security | Operation an aktuellen Auth-User gebunden; keine E-Mail-/Passwortänderung, keine neue Sammlung, keine Zugangsdaten in Nachweisen. Guards und bestehende Auth-Funktionen bleiben erhalten. |
| Performance | In isolierter Messung weiterhin zwei initiale StrictMode-Task-Reads, **null zusätzliche Task-Reads und null Task-Writes** durch Namensänderungen/Navigation. Das sind Repository-Aufrufe im Fixture, keine echte Firestore-Kostenmessung. |
| Wartbarkeit | Reiner gemeinsamer Namensvalidator und Initialen-Helper, eine zentrale Auth-Mutation und wiederverwendetes Layout. Keine parallele Task-CRUD- oder Profildatenbank. |
| Skalierbarkeit | Unveränderte O(N)-Taskladegrenze und O(M log M)-Sortierung; keine neue Last- oder Million-User-Abnahme durch diese Korrektur. |

### Geänderte Dateien der Nachbesserung

| Datei | Änderung |
| --- | --- |
| `src/auth/AuthProvider.tsx` | Neue Auth-Mutation, Profilrevision, globaler Pending-Zustand, Lock und Sitzungsprüfung. Registrierung, Login, Logout und Reset bleiben in ihrem Verhalten unverändert. |
| `src/auth/displayName.ts` | Neuer reiner Validator und Normalisierer mit gemeinsamem 100-Codepoint-Limit. |
| `src/layout/identity.ts`, `AppLayout.tsx` | Gemeinsame Unicode-korrekte Initialen für Sidebar und Profil. |
| `src/tasks/TasksPanel.tsx`, `TaskWorkspace.tsx` | Speichercallback und globalen Pending-Zustand weiterreichen; keine neuen Datenzugriffe. |
| `src/profile/ProfileView.tsx`, `profile.css` | Namensformular mit Zustand, Validierung, Fokus, Rückmeldungen und Speicherbutton. |
| `tests/display-name.test.ts` | Sechs neue Unit-Gruppen für Validierung, Normalisierung und Initialen. |
| `tests/browser-profile-name.py`, `tests/fixtures/profile-name.html`, `profile-name.tsx` | Neue ausdrücklich isolierte UI-/Callback-Prüfung mit Task-Aufrufzählern und Navigation während Pending. |
| `tests/browser-display-name-auth.py` | Neue echte Auth-Emulator-Browserintegration einschließlich Persistenz und verzögertem Save bei Kontowechsel. |
| `tests/browser-auth.py` | Alte Name-readOnly-Erwartungen aktualisiert; E-Mail bleibt readOnly; Testverkehr gegen unbeabsichtigte externe Requests abgesichert. |
| Dokumentation und `*/aufgabe-06/name-fix/` | Eigene Nachweise, Screenshots, Messdaten und separate Korrekturzeit; ursprüngliche Nachweise nicht überschrieben. |

Der produktive `TasksPanel` übergibt den Speichercallback immer. Der optionale Callback erlaubt bestehenden isolierten Einbettungen ohne Auth-Adapter weiterhin eine schreibgeschützte Anzeige; diese Legacy-Fixtures sind **kein Nachweis der neuen Speicherfunktion**. Dafür existieren die neue bearbeitbare Callback-Suite und die getrennte echte Auth-Integration.

### Tatsächlich ausgeführte Tests der Nachbesserung

| Prüfung | Ergebnis / Umgebung |
| --- | --- |
| `npm run typecheck` | Erfolgreich. |
| `npm run build` | Erfolgreich; keine neue Chunkgrößenwarnung. |
| `npm test` | **36/36** Gruppen bestanden: die bisherigen 30 plus sechs neue Namens-/Initialengruppen. Unicode-Leerraum, 100/101 ASCII-/Unicode-Codepoints, legitime Namen, Fehlercode und Avatar-Fallbacks abgedeckt. |
| `python3 tests/browser-profile-name.py` | **7/7** isolierte Gruppen: Entwurf ohne Identitätsänderung, Validierung vor API, 100 Emoji, Enter/Doppelsubmit, Fehler/Retry ohne falschen Erfolg, sofortige Anzeige, native Assets und Responsive, Pending-Sperre nach Profil-Navigation. Zähler zwei Task-Reads → zwei, null Task-Writes. Fünf simulierte Speicherversuche, vier Erfolge, ein absichtlicher Netzwerkfehler. |
| `python3 tests/browser-display-name-auth.py` | **14/14** Gruppen mit echtem Firebase-Auth-SDK gegen lokalen Auth Emulator: erstmaliger Name, Bearbeiten, sofortige Anzeige auf allen Flächen, Reload, Logout und erneutes Login, Grenze, Pending nach Seitenwechsel, exakt ein `accounts:update` bei schnellen Submits, abgebrochener Update-Request und echter Kontowechsel während verzögerter Antwort. Keine unbehandelten Seitenfehler. |
| Bestehende Auth-Regression | Auth-SDK **12/12**, Auth-Browser **19/19** erneut bestanden; bestehende Anmelde-/Registrierungs-/Reset-/Logout-/Zugriffsschutzabläufe erhalten. |
| Bestehende Aufgaben-/Kalenderregression | **6/6** Aufgaben-/Navigation und **5/5** Kalender bestanden, mit ausdrücklich isolierten Repositorys. |
| Bestehende Dashboard-/Profilregression | **6/6** inklusive 54/1.000 Aufgaben bestanden; das ältere Fixture ohne Speichercallback bleibt bewusst readOnly. |
| Git-Abgleich | TaskRepository, Task-Queries/-Hook, Kalender, Firebase-Konfiguration, Rules, Dependencies und ursprüngliche Zeitnachweise unverändert. |

Reproduktion mit Vite auf 5185 und lokalem Auth Emulator auf 9099:

```sh
npm run typecheck
npm run build
npm test
python3 tests/browser-profile-name.py
npm run test:auth:integration
AUTH_BROWSER_BASE_URL=http://127.0.0.1:5185/ DISPLAY_NAME_BROWSER_OUT=work/aufgabe-06-name-fix/display-name-browser-final python3 tests/browser-display-name-auth.py
AUTH_BROWSER_BASE_URL=http://127.0.0.1:5185/ AUTH_BROWSER_OUT=work/aufgabe-06-name-fix/auth-browser-final python3 tests/browser-auth.py
TASKS_BROWSER_BASE_URL=http://127.0.0.1:5185/ TASKS_BROWSER_OUT=work/aufgabe-06-name-fix/tasks-browser python3 tests/browser-tasks.py
```

Für Kalender und die ältere Dashboard-/Profil-Suite wurde nur der Ausgabeordner im Speicher nach `work/aufgabe-06-name-fix/` umgeleitet. Die jeweiligen Testdateien und damaligen Screenshots wurden erhalten. Neue zusammengehörige Prüfbelege liegen in `verification/aufgabe-06/name-fix/`, isolierte neue Namensscreenshots und Messungen in `visual/aufgabe-06/name-fix/`.

**Testgrenzen:** Auth Emulator und isolierter Callback sind getrennte Umgebungen. Nur der echte Auth-Test belegt die SDK-/Observer-Verkabelung und Persistenz; das Fixture belegt gezielt UI- und Repository-Aufrufverhalten. Kein produktives Firebase getestet. Der Firestore-Emulator blieb bei dieser reinen Auth-Nachbesserung deaktiviert; es wurde kein weiterer JAR-Download versucht und keine Firestore-Abnahme behauptet. Bei unerreichbarem Firestore veranlasst der vorhandene WebChannel-Code Konnektivitätsproben zu `www.google.com/images/cleardot.gif`; die Auth-Browsertests blockieren diese vor dem Netzwerk und dokumentieren die Versuche separat. Andere Off-Origin-Versuche lassen die Suite fehlschlagen.

### Visuelle/Responsive-Prüfung und begründete Layoutänderung

Die bestehende Figma-Gestaltung bleibt Grundlage; die manuell angeforderte Speicherfunktion erweitert bewusst den früher statischen Entwurf. Profilkarte, Farben, Typografie, 60-px-Avatar, Initialen und 48-px-Eingabefeld bleiben erhalten. Es wurden keine neuen Fremdassets oder generierten Figma-Make-Elemente verwendet. Der neue 48-px-Speicherbutton und seine Hinweise benötigen zusätzliche Höhe; ein unveränderter Vergleich zur alten statischen Gesamthöhe wäre daher irreführend.

| Breite | Neue Profilkarte, isolierter Standardzustand | Namensfeld / Speicherbutton |
| --- | --- | --- |
| 1440 px | x376/y134, **600 × 647** | Feld x400/y304, 552 × 48; Button y394, 552 × 48. |
| 390 px | x20/y104, **350 × 696** | Feld x44/y274, 302 × 48; Button y382, 302 × 48. |
| 320 px | x16/y104, **288 × 697** | Feld x36/y270, 248 × 48; Button y378, 248 × 48. |

Der Beginn des Namensfelds bleibt damit gegenüber der ursprünglichen Profilansicht an derselben Position. E-Mail, Fortschritt und Logout rücken unter den Speicherbereich. Die Kartenhöhen wachsen gegenüber dem ursprünglichen isolierten Standardbild um 108/126/126 px; Daten und Rückmeldungen können zusätzliche Umbrüche erzeugen. Bei 1440/390/320 px wurde kein horizontaler Überlauf festgestellt, sowohl isoliert als auch im echten Auth-Test. Es wird keine erneute vollständige Pixelidentität behauptet.

Isolierte Screenshots mit synthetischem, bestätigt gespeichertem Namen „Nora Winter“, `name-ui@example.test` und einer synthetischen Aufgabe: [1440 px](visual/aufgabe-06/name-fix/profile-name-1440.png), [390 px](visual/aufgabe-06/name-fix/profile-name-390.png), [320 px](visual/aufgabe-06/name-fix/profile-name-320.png), [Pending](visual/aufgabe-06/name-fix/profile-name-pending-1440.png), [Netzwerkfehler](visual/aufgabe-06/name-fix/profile-name-error-1440.png). Diese Daten sind kein Produktivbestand. Die Testuhr ist nur im Fixture auf den Figma-Referenztag gesetzt.

### Reviewkorrekturen, Automatisierungsgrenzen und verbleibendes Risiko

- Der manuelle Hinweis der Entwicklerin ergänzte einen fehlenden Benutzerablauf. Die ursprüngliche automatische Read-only-Abnahme war für diesen Ablauf nicht ausreichend; der Korrekturprompt ist ein beobachteter manueller Eingriff in der Fallstudie.
- Der Review reproduzierte zunächst einen Entwurfsverlust beim Verlassen und erneuten Öffnen des Profils während einer alten Speicherung. Der neue Formularmount wusste nichts vom laufenden Request. Der globale Pending-Zustand behebt dies; isolierter und echter Auth-Test prüfen die Sperre nach Rückkehr ausdrücklich.
- Im Testharness kollidierten zunächst zwei Request-Interceptor beim verzögerten Kontowechsel. Ein gemeinsamer Context-Handler ersetzt die Überlagerung. Außerdem wurde die bereits vorhandene, blockierte Firestore-Konnektivitätsprobe von echten unerwünschten Auth-Requests unterschieden. Es wurden keine Testerfolge aus den vorher fehlgeschlagenen Läufen übernommen.
- Der Netzwerkfehlertest zeigt einen Fehler ohne falschen Erfolg und bestätigt nach Reload den vorherigen Namen **für den absichtlich abgebrochenen Request**. Daraus folgt kein allgemeines Rollback-Versprechen: Ein bereits vom Server angenommener Save kann bei verlorener Antwort oder späterem lokalem Persistenzfehler trotzdem gespeichert sein.
- Bei Logout/Kontowechsel kann ein bereits abgesendeter Request das ursprüngliche Konto noch ändern; er wird nicht zurückgerollt. Geprüft wird, dass er weder den Namen des neuen Kontos überschreibt noch dort eine Erfolgsmeldung erzeugt. Der Provider-Lock kann das neue Konto kurz bis zum Ende dieses Requests am erneuten Speichern hindern.
- Eine externe Namensänderung aus einem anderen Gerät wird weiterhin nicht als sofort live synchronisiert zugesichert. Eigene Speicherung, Reload und erneutes Login sind ausdrücklich geprüft. Kein Profilbild-Upload, keine Storage-Anbindung, kein Merge oder Deployment und keine Änderung produktiver Security Rules.

### Separate Nachbesserungsdauer

Beginn **04.11.2026, 08:34:52 UTC / 09:34:52 Europe/Berlin**, Ende nach Implementierung, Tests, Screenshot-/Belegprüfung und Dokumentationsreview **08:58:24 UTC / 09:58:24 Europe/Berlin**. Tatsächlich zusätzliche Dauer: **23 Minuten 32 Sekunden = 1.412 Sekunden**. Parallel ausgeführte Agentenarbeit und Wartezeiten sind in dieser verstrichenen Gesamtzeit enthalten; Agentenzeiten werden nicht addiert. Commit/Push/PR-Aktualisierung zählen anschließend zur Veröffentlichung. Die ursprüngliche Dauer bleibt **21 Minuten 46 Sekunden (1.306 Sekunden)** und wird nicht überschrieben. Separate maschinenlesbare Zeit- und Excel-Nachweise: `verification/aufgabe-06/name-fix/phase-timing.json` und `measurements.csv`.
