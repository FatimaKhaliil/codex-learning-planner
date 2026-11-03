# Aufgabe 05 – Figma-getreue Kalenderimplementierung

## Ausgangsbasis und Umfang

- Repository: `FatimaKhaliil/codex-learning-planner`
- Branch: `feat/aufgabe-05-figma-calendar`
- Unveränderter Ausgangscommit: `8f40be1b436c1d63cbd2bfc4bb0fafc76bcafec7`
- Design: [Figma Design](https://www.figma.com/design/I1M2Vz1vC3uDl0KWkyRyzF/Untitled), Kalender Desktop `32:35472`, Kalender Mobile `32:35637`.
- Der Arbeitsbaum war zu Beginn sauber. Es wurde ausschließlich auf dem bereits vorbereiteten Feature-Branch gearbeitet. Kein Merge und kein Firebase-Deployment.

`#/calendar` zeigt jetzt einen Monatskalender und die zugehörige Aufgabenliste. Die reguläre Anwendung verwendet dieselben benutzerspezifischen Firestore-Aufgaben wie Übersicht und Aufgabenansicht. Die neue Kalenderkomponente enthält weder Firebase-Zugriffe noch Beispieldaten. Figma wurde direkt ausgelesen; es wurde kein Figma-Make-Code übernommen.

## Funktionale Anforderungen und Umsetzung

| FR | Umsetzung / Nachweis |
| --- | --- |
| Kalender-Platzhalter ersetzen | Eigene `CalendarView` unter der bestehenden geschützten Route `#/calendar`; Profil bleibt ausdrücklich unvollständig. |
| Monatsraster und Navigation | Montag bis Sonntag, vollständige Wochen einschließlich benachbarter Tage, voriger/nächster Monat, deutsche Monatsnamen. Je nach Monat 28, 35 oder 42 Zellen. |
| Aufgaben am richtigen Tag | Index nach dem unveränderten `dueDate`-String. Ein Punkt zeigt mindestens eine Aufgabe an; der zugängliche Buttonname enthält die genaue Anzahl. |
| Bestehende Daten nutzen | Weiterhin `users/{userId}/tasks/{taskId}` über `TaskRepository`, `loadAllTasks` und `useTasks`. Keine neue Sammlung oder Datenmigration. |
| Monats- und Tagesliste | Standardmäßig alle Aufgaben des sichtbaren Monats. Tagesauswahl filtert die Liste; erneute Auswahl oder „Alle Aufgaben im Monat“ entfernt den Tagesfilter. Auswahl eines Nachbartags wechselt den Monat. |
| Aufgabeninformationen und Status | Bestehende `TaskList`, `StatusSelect` und Aktionsmenüs. Offen, In Bearbeitung und Erledigt bleiben unverändert. Status und Löschen funktionieren im Kalender; Bearbeiten führt zum vorhandenen `TaskForm` auf der Aufgabenseite. |
| Gemeinsame Navigation | Vorhandene `AppLayout`-Sidebar, Mobile-Header und untere Navigation; originales aktives Kalender-Icon ergänzt. Navigation zu Übersicht und Aufgaben erhält Kalendermonat und Tagesauswahl in der laufenden Sitzung. |
| Kalenderdatum statt Zeitpunkt | Gregorianische Ganzzahlberechnung für Raster und Schaltjahre, keine UTC-Konvertierung gespeicherter Fälligkeiten. Nur „heute“ verwendet lokale `Date`-Getter. Jahreswechsel und Grenzen 1000–9999 werden berücksichtigt. |

Die Liste zeigt zunächst höchstens 50 Karten und bietet bei Bedarf „Weitere Aufgaben anzeigen“. Gruppierung, Monatsfilter und Tagesanzahl verwenden bereits den **vollständigen** geladenen Aufgabenbestand, einschließlich Datensätzen nach der ersten Cursorseite. Ein Monats- oder Tageswechsel verändert keine gespeicherten Aufgaben.

## Nichtfunktionale Anforderungen und Grenzen

| NFR | Umsetzung und Grenze |
| --- | --- |
| Security / Benutzertrennung | Unveränderter geschützter Einstieg und aus Authentication abgeleitete UID. Kalender erhält nur den bereits geladenen Bestand des bestehenden Repositorys. Keine editierbare UID, keine zusätzlichen Datenpfade, keine Änderung an Security Rules. Die erneute Firestore-Sicherheitsprüfung für diesen Commit ist in dieser Umgebung blockiert, siehe Tests. |
| Performance | Keine Kalender-Queries. Monatswechsel, Tagesauswahl und interne Seitennavigation arbeiten auf demselben Bestand. `useMemo` für Raster, Tagesindex und Monatsliste; höchstens 42 Kalenderzellen. |
| Skalierbarkeit | Bestehender vollständiger Cursordurchlauf bleibt **O(N)** bezüglich geladener Dokumente und Speicher. Tagesindex O(N) beim Bestandswechsel; Monatsfilter O(N) beim Monatswechsel. Korrekt bei mehr als 50 Aufgaben, aber keine unbegrenzt skalierende Monatsabfrage. |
| Zuverlässigkeit | Vorhandene Lade-/Retry-/Mutationsmeldungen wiederverwendet. Bei Laden oder Fehler werden alte Karten und Tagespunkte ausgeblendet. Nach CRUD wird wie bisher neu geladen. Monat und Auswahl bleiben beim internen Seitenwechsel erhalten. |
| Usability | Aktueller Tag mintfarben; ausgewählter Tag mintfarben, heutiger Tag bei anderer Auswahl zusätzlich umrandet. Leere Monate und Tage haben konkrete Hinweise. Ein Fehler kann erneut geladen werden. |
| Accessibility | Beschriftete Monatsbuttons, Tabelle mit Wochentagsüberschriften, `aria-current`, `aria-pressed`, Aufgabenanzahl, Live-Überschriften und sichtbarer vorhandener Fokusstil. Roving-Tabindex für Tage. Pfeile bewegen den Fokus innerhalb des angezeigten Rasters; Home/End zum Wochenanfang/-ende; PageUp/PageDown wechseln den Monat. Enter/Leertaste wählen aus. Kein automatischer Monatswechsel mit Pfeilen über den äußeren Rasterrand; dafür Monatsbuttons/PageUp/PageDown. Fokus bleibt nach Nachbartagswechsel und Aufheben der Auswahl am passenden Kalendertag. |
| Responsive Design | Figma-Geometrie bei 1440 und 390 px geprüft, zusätzliche 320-px-Anpassung von Innenabstand und Monatsschrift. Kein horizontaler Überlauf in den geprüften Ansichten. |
| Wartbarkeit | Kalenderberechnung unabhängig von React und Firestore testbar. Anzeige erhält Daten und Zustandsänderungen über Props; vorhandene CRUD-Komponenten werden weitergenutzt. Keine neue Abhängigkeit. |

### Leseverhalten konkret

Das unveränderte Repository liest mit `getDocsFromServer`, nach `dueDate` und Dokument-ID sortiert, maximal 50 Dokumente je Query. `loadAllTasks` durchläuft alle Seiten, bevor ein vollständiger Bestand angezeigt wird. Bei N Dokumenten entstehen im fehlerfreien Durchlauf `floor(N / 50) + 1` Listenabfragen: bei 54 Dokumenten zwei, bei genau 50 zwei einschließlich einer leeren Abschlussabfrage, bei null Dokumenten eine. Das folgt aus `hasMore = snapshot.size === 50` im bestehenden Repository. Diese Anzahl bezeichnet Query-Aufrufe, keine gemessene Firestore-Abrechnung.

Der isolierte Browser-Test mit 54 Datensätzen erfasst zunächst **drei** Repository-Aufrufe: React StrictMode startet zusätzlich einen abgebrochenen ersten Durchlauf, danach folgen zwei vollständige Seiten. Monatswechsel, Tagesauswahl und Übersicht → Aufgaben → Kalender verursachen dort **null zusätzliche Aufrufe und null Schreiboperationen**. Das sind Messungen an der expliziten Testimplementierung des Repository-Interfaces, keine Messung produktiver Firestore-Kosten. StrictMode kann auch mit dem echten SDK bereits gestartete Serverrequests nicht zurücknehmen.

Initiales Laden, expliziter Retry und der bestehende Reload nach CRUD benötigen weiterhin Queries. Es gibt keinen neuen globalen Cache und keinen Echtzeitlistener. Externe Änderungen aus einer zweiten Sitzung erscheinen erst bei erneutem Laden; mehrere Cursorabfragen bilden keinen gemeinsamen transaktionalen Snapshot. Diese Grenzen stammen aus der bestehenden Datenladearchitektur und werden durch den Kalender nicht gelöst.

## Wiederverwendung und geänderte Dateien

| Datei / Komponente | Änderung bzw. Wiederverwendung |
| --- | --- |
| `src/calendar/model.ts` | Neu: reine Datumsvalidierung, Monatsverschiebung, gregorianisches Raster, Tages-/Monatsfilter und Index. |
| `src/calendar/CalendarView.tsx` | Neu: Monatsnavigation, Tabelle, Tagesauswahl, Tastaturfokus und Aufgabenliste über Render-Prop. |
| `src/calendar/calendar.css` | Neu: Figma-Abmessungen, Farben, Abstände, Responsive-Anpassungen; auf Kalenderklassen begrenzt. |
| `src/tasks/TaskWorkspace.tsx` | Kalenderzustand und neue Ansicht integriert; bestehender `useTasks`-Aufruf und dieselben Mutationshandler bleiben zentral. |
| `src/layout/AppLayout.tsx` | Aktives Kalender-Icon und ansichtsbezogene CSS-Klasse; vorhandenes Layout bleibt gemeinsam. |
| `src/layout/Icon.tsx` | Vier originale SVG-Assets zugeordnet. |
| `public/assets/figma/32-38172.svg`, `32-38178.svg`, `32-38181.svg`, `32-35546.svg` | Unveränderte Figma-Exporte: aktiver Kalender, zwei Monats-Pfeile, Aufgabenpunkt. Herkunft: `visual/aufgabe-05/assets.json`. |
| `tests/calendar-core.test.ts` | Neu: sieben Kalender-Unit-Testgruppen. |
| `tests/fixtures/calendar.html`, `calendar.tsx` | Neu: ausdrücklich isoliertes In-Memory-Repository ausschließlich für Browserprüfungen. Wird vom Produktiveinstieg nicht importiert und nicht als Vite-Build-Einstieg verwendet. |
| `tests/browser-calendar.py` | Neu: Kalenderfunktionen, Daten nach Cursorseite eins, Read-Zähler, Fokus, Zustände, CRUD-Verknüpfung und Screenshots. |
| `tests/browser-navigation.py` | Vorhandene Regression aktualisiert: Kalender ist implementiert; Profil bleibt Platzhalter. Basis-URL und Ausgabeordner konfigurierbar. |
| `docs/aufgabe-05.md`, `docs/visual/aufgabe-05/` | Dokumentation, Originalreferenzen, Browser-Screenshots, Vergleichsbilder, Messwerte und Testergebnisse. |

Weiterverwendet ohne Änderung: `TaskRepository`, `useTasks`, `loadAllTasks`, `TaskList`, `StatusSelect`, `TaskForm`, `DeleteTaskDialog`, Authentication und bestehende Routing-/Schutzlogik. Git-Vergleich mit dem Ausgangscommit bestätigt unveränderte Auth-, Repository-, Query-, Hook-, Firebase-Konfigurations-, Rules- und Abhängigkeitsdateien.

## Ausgeführte Tests

Umgebung: Node.js 24.19, installiertes Projekt-Lockfile, Chromium über Python Playwright. Lokaler Vite-Server auf Port 5185, Auth Emulator auf 9099. Es wurden keine produktiven Firebase-Daten verändert.

| Befehl / Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| `npm run typecheck` | Erfolgreich. |
| `npm run build` | Erfolgreich; TypeScript und Vite-Produktionsbuild. |
| `npm test` | **24/24** erfolgreich: 17 bestehende und sieben neue Kalender-Testgruppen. |
| Neue Kalender-Unit-Tests | Montag als Wochenstart, Nachbartage, 28/35/42 Zellen, Schaltjahre 1900/2000/2024/2100, Jahresgrenzen, ungültige Eingaben, Aufgaben nach den ersten 50, unveränderte Datensätze und lokale Datumsschlüssel in UTC+14, UTC−8 und Europe/Berlin. |
| Unabhängiger ergänzender Kalendervergleich | Alle **108.000 Monate** von 1000-01 bis 9999-12 gegen eine separate UTC-Gregorian-Referenz für Monatsanfangs-Wochentag und Tagesanzahl geprüft: erfolgreich. UTC wurde nur in diesem Prüforakel verwendet. |
| `python3 tests/browser-calendar.py` | **5/5** Gruppen erfolgreich. 54 isolierte Aufgaben, Datensatz nach Cursorseite eins, Monats-/Jahreswechsel, Schaltjahr, Tageszuordnung, Navigation ohne neue Reads, Auswahl/Fokus, 1440/390/320, Lade-/Fehler-/Leerzustände sowie Statusspeichern, Bearbeiten mit Datumswechsel und Löschbestätigung im Kalenderkontext. Keine unbehandelten Seitenfehler. |
| `TASKS_BROWSER_BASE_URL=http://127.0.0.1:5185/ TASKS_BROWSER_OUT=work/aufgabe-05/tasks-browser python3 tests/browser-tasks.py` | **6/6** bestehende Browser-Regressionsgruppen erfolgreich: Erstellen/Validierung/Bearbeiten/Status/Löschen, Fehler/Retry, Suche/Filter, Bestand >50, Navigation und Responsive Design. Isoliertes Repository. |
| `npm run test:auth:integration` | **12/12** Prüfungen mit echtem Firebase-SDK gegen lokalen Auth Emulator erfolgreich. |
| `AUTH_BROWSER_BASE_URL=http://127.0.0.1:5185/ python3 tests/browser-auth.py` | **16/16** Auth-Browserprüfungen erfolgreich: Schutz aller vier Routen, Registrierung/Anmeldung, Sitzungswiederherstellung, Abmeldung in zwei Tabs, Reset, Fehler- und Responsive-Zustände. Unverändertes Testskript wurde im Speicher mit Ausgabeumleitung nach `work/aufgabe-05/auth-browser` ausgeführt, um ältere Nachweise nicht zu überschreiben. Keine unbehandelten Seitenfehler. |
| Firestore-Emulatorstart, danach `npm run test:tasks:integration` | **Nicht erfolgreich ausführbar.** Ein Startversuch konnte `cloud-firestore-emulator-v1.22.0.jar` von `storage.googleapis.com` nicht laden. Ohne laufenden Emulator schlägt das Integrationsskript mit `ECONNREFUSED 127.0.0.1:8081` fehl. Keine erneute Behauptung bestandener CRUD-/Benutzertrennungstests für diesen Commit. |
| `git diff --check` und Vergleich geschützter Bestandsdateien | Vor Veröffentlichung geprüft; keine Whitespacefehler bzw. Änderungen an Rules, Auth, Datenzugriff oder Dependencies. |

Nachweise liegen unter `visual/aufgabe-05/`: `browser-calendar-results.json`, `tasks-browser-results.json`, `auth-sdk-results.json`, `auth-browser-results.json`, `environment-regression-summary.json` sowie die beiden `firestore-*-error.txt`-Fehlerprotokolle. Die Auth-Ergebnisse gelten für den realen lokalen Auth Emulator; Aufgaben-/Kalender-Browserergebnisse gelten für das isolierte Repository. Sie ersetzen keine Firestore-Integration.

Reproduktion des Kalender-Browsertests: Vite auf 5185 starten, Python Playwright mit Chromium unter `/usr/bin/chromium` bereitstellen und `python3 tests/browser-calendar.py` ausführen. Alternativer Server über `CALENDAR_BROWSER_BASE_URL`. Der Test setzt ausschließlich seine eigene Browseruhr auf 09.10.2026 und verwendet `Europe/Berlin`, um denselben Referenzmonat wie Figma zu prüfen. Die Anwendung selbst hat keine festgeschriebene Uhr oder Aufgaben.

## Figma- und Screenshotvergleich

Beide verbindlichen Frames wurden direkt als PNG in Originalgröße und die benötigten Icons direkt als SVG aus Figma Design exportiert. Sämtliche benötigten Kalender-Assets waren damit verfügbar. Exportierte Referenzen: Desktop **1440 × 1009**, Mobile **390 × 1055**. Kein Figma-Dokument wurde verändert.

Direkt geprüfte Bildpaare (jeweils links Figma, rechts Browser):

- [Desktopvergleich](visual/aufgabe-05/comparison-1440.png), Einzelbilder [Figma](visual/aufgabe-05/figma-calendar-1440.png) / [Browser](visual/aufgabe-05/calendar-1440.png).
- [Mobilevergleich](visual/aufgabe-05/comparison-390.png), Einzelbilder [Figma](visual/aufgabe-05/figma-calendar-390.png) / [Browser](visual/aufgabe-05/calendar-390.png).
- [Zusätzliche 320-px-Prüfung](visual/aufgabe-05/calendar-320.png); dafür liegt kein eigener verbindlicher Figma-Frame vor.

Die Screenshots verwenden **ausdrücklich isolierte Testdaten**: drei synthetische Oktober-Aufgaben, weitere Januar-Aufgaben außerhalb des sichtbaren Monats und eine fiktive `example.test`-Identität. Im Funktionslauf enthält das Fixture zusätzlich eine 54. Aufgabe nach der ersten Cursorseite; nur für die vergleichbare Dreieransicht wird diese Testaufgabe entfernt. Figma-Beispielperson und Original-Aufgabentitel wurden nicht in die Anwendung übernommen.

Messwerte in CSS-Pixeln, Oktober mit fünf Wochen; Browserwerte aus `getBoundingClientRect`, Sollwerte aus den Figma-Frames:

| Element | 1440 px: Figma / Browser | 390 px: Figma / Browser |
| --- | --- | --- |
| Kalenderposition | x376, y134 / x376, y134 | x20, y104 / x20, y104 |
| Kalenderkarte | 992 × 483 / 992 × 483 | 350 × 373 / 350 × 373 |
| Monatszeile | 944 × 24 / 944 × 24 | 302 × 24 / 302 × 24 |
| Tagesraster | 944 × 356 / 944 × 356 | 302 × 246 / 302 × 246 |
| Tageszelle | ca. 131,429 × 68 / 131,422 × 68 | ca. 39,714 × 46 / 39,703 × 46 |
| Erste Aufgabenkarte | x376, y695, 992 × 84 / identisch | x20, y555, 350 × 126 / identisch |
| Mobile Navigation | entfällt | y981, Höhe 74 / identisch |

Die verbleibenden Zellbreitendifferenzen betragen etwa **0,007 px Desktop** bzw. **0,011 px Mobile** durch die Aufteilung auf CSS-Subpixel. Bei 320 px: Kalender x16/y104, 288 × 357, Tageszellen ca. 33,141 × 46, `scrollWidth = innerWidth = 320`. Innenabstand und Monatsschrift sind dort bewusst kleiner als im 390-px-Frame.

Zusätzlich wurde der Kalenderkartenausschnitt ohne Neuausrichtung per RGB-Pixeldifferenz verglichen (`pixel-comparison.json`). Mittlere absolute Kanalabweichung auf der Skala 0–255: **0,425 Desktop**, **1,554 Mobile**. Mehr als 16 Kanalwerte Unterschied an **3.059 von 479.136 Pixeln (0,638 %)** bzw. **3.039 von 130.550 Pixeln (2,328 %)**. Diese Werte gelten nur für die Kalenderkarte, deren Inhalt zwischen Referenz und Browser vergleichbar ist; sie sind keine Genauigkeitsquote für die gesamte Seite.

Verbleibende sichtbare Unterschiede: Rasterung und Positionierung einzelner Schrift-/Iconkanten, Rundungs-/Rahmenpixel und teilweise Tagesziffern im Mobile-Export. Die separate, semantisch korrekte Zuordnung benachbarter Monatstage bleibt erhalten; im Figma-Mobile-Export stehen einzelne Nachbartageszahlen sehr dicht an Monatszahlen. Aufgabenüberschriften, Aufgabenanzahl im Navigationsbadge und Benutzername/-adresse sind datenabhängig und weichen absichtlich von den Figma-Beispielen ab. Der längere Testbenutzername verschiebt den unteren Desktop-Profilblock gegenüber der kurzen Figma-Beispielidentität. Zusätzliche Zustände wie Tagesfilter, sechs Kalenderwochen, Fehlermeldungen oder Tastaturfokus haben keinen eigenen gelieferten Kalender-Referenzframe. **Keine vollständige Pixelidentität behauptet.**

## Fehler, Korrekturen und offene Punkte

- Der erste TypeScript-Lauf fand eine nach Entfernen des Kalender-Platzhalters unmögliche Fallunterscheidung im Profilzweig; auf den verbleibenden Profiltext vereinfacht.
- Der Review fand Fokusverlust beim Wechsel durch einen Nachbartag und beim Entfernen des Tagesfilters. Der Fokus wird nach dem Rendern zum ausgewählten Datum zurückgeführt; beide Abläufe sind im Browser geprüft.
- Wochentagszeile, Kartengrenze einschließlich 1-px-Rahmen, Rasterabstände und mobiles Titelmaß wurden anhand der direkten Figma-Messungen korrigiert. Nach der Korrektur wurden die gespeicherten Browserbilder direkt mit den Originalbildern verglichen.
- Browser-Testselektoren mussten den echten Navigationsbadge berücksichtigen: „Aufgaben“ hat auf Desktop eine zusätzliche Zahl im zugänglichen Namen. Der Regressionstest verwendet dafür den Routenlink. Fixture-Neuladen und Wartebedingungen wurden korrigiert, damit Zustand und kalter Vite-Start die Prüfung nicht verfälschen.
- Ein erster Zeitzonen-Test mit Unterprozess war durch `EPERM` blockiert. Der endgültige synchrone Test setzt `TZ` nur innerhalb des Tests und stellt den vorherigen Wert im `finally` wieder her.
- Der Firestore-Emulatordownload bleibt blockiert. Auf einer Umgebung mit vorhandenem JAR sind die bestehenden Integrations-/Sicherheitstests erneut auszuführen und der Kalender mit dem echten Firestore Emulator zu prüfen. Auch ein visueller Lauf des neuen Kalenders gegen persönliche produktive Firestore-Daten wurde hier nicht durchgeführt.
- Große Datenbestände bleiben durch vollständiges O(N)-Laden und fehlende Live-Synchronisierung begrenzt. Eine spätere Optimierung müsste vollständige Monatsabfragen und übergreifende Statistiken konsistent behandeln; hier wurde keine ungetestete Änderung des Datenzugriffs eingeführt.
- Keine produktiven Rules, Zugangsdaten, Benutzeraufgaben oder Abhängigkeiten verändert. Keine pauschale Sicherheitszusage aus isolierten UI-Tests.

## Tatsächlich gemessene Bearbeitungsdauer

Beginn der separaten Implementierungs-, Test- und Dokumentationsmessung: **02.11.2026, 10:05:46 UTC (11:05:46 Europe/Berlin)**. Ende nach Implementierung, Tests, Screenshotvergleich und Dokumentationsreview: **10:28:09 UTC (11:28:09 Europe/Berlin)**. Tatsächlich verstrichene Dauer: **22 Minuten 23 Sekunden**. Die bereits vorher abgeschlossene Branch-Vorbereitung ist ausgeschlossen. Parallel ausgeführte Prüfungen werden als gemeinsame verstrichene Zeit gezählt, nicht addiert. Commit, Push und PR-Veröffentlichung folgen danach und gehören nicht zu dieser Messung.
