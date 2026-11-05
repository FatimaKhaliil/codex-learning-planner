# Aufgabe 07 – Plan einer analytischen Usability-Evaluation

## 1. Status, Ziel und Abgrenzung

**Planungsstand vom 05.11.2026: Die eigentliche Evaluation wurde noch nicht durchgeführt.** Dieses Dokument enthält vorab festgelegte Verfahren, Aufgaben, Sollzustände und Erfassungsregeln. Es enthält keine Anwendungsbefunde, vergebenen Severity-Werte, absolvierten Durchläufe, gemessenen Aufgabenzeiten oder Erfolgsquoten. Die zugehörige [CSV-Vorlage](aufgabe-07-ergebnisse-vorlage.csv) enthält ausschließlich die Spaltenüberschrift.

Bachelorarbeitstitel unverändert: **„KI-gestützte Entwicklung einer Web-App mit OpenAI Codex: Eine evaluative Fallstudie zu Effizienz, Codequalität und Nachvollziehbarkeit“**.

- Repository: `FatimaKhaliil/codex-learning-planner`
- Festgelegter Anwendungsausgangsstand: `df24af7e3dd8e19bcf9e4bba40bb6f6e64fc8a61`
- Evaluationsbranch: `eval/aufgabe-07-usability`, direkt von diesem Commit erstellt.
- In dieser Phase ausschließlich Plan und leere CSV; kein produktiver Code, keine Regeln, kein Deployment oder Merge.
- Fragen der späteren Analyse: Wo erschweren Oberfläche und Rückmeldungen die acht festgelegten Abläufe? Welche Lernschwierigkeiten sind unter den dokumentierten Annahmen plausibel? Welche ausgewählten Accessibility-Prüfungen sind nachvollziehbar erfüllt, verletzt oder noch ungeklärt?

Das Design ist eine **formative analytische Inspektion mit einer einzigen Evaluatorin, die zugleich Entwicklerin ist**. Es ist keine empirische Nutzerstudie. Es gibt keine externen Testpersonen, Befragung, SUS-Erhebung oder repräsentative Zufriedenheitsmessung. Eigene Interaktionen liefern Beobachtungen am System; Aussagen über mögliche Erstnutzungsprobleme bleiben analytische Hypothesen.

## 2. Methodische Grundlage und Anpassung

Die drei Verfahren ergänzen sich: Nielsen strukturiert die Problemsuche, der Cognitive Walkthrough untersucht die Erlernbarkeit einzelner Handlungsschritte, technische/manuelle WCAG-Prüfungen liefern abgegrenzte Accessibility-Nachweise. Sie sind wegen derselben Evaluatorin und Oberfläche **keine drei unabhängigen Studien**. Die Reihenfolge und Anwendungsszenarien unten sind eine eigene Operationalisierung für diesen Lernplaner, keine Behauptung, dass die Quellen dieses konkrete Prüfprotokoll vorgeben.

Nielsens zehn Heuristiken dienen als Suchraster [Q1]. Die Severity-Skala wird erst nach der Inspektion je konsolidiertem Befund begründet angewendet [Q2]. Nielsen warnt ausdrücklich vor der Unzuverlässigkeit einzelner Schweregradbewertungen und empfiehlt mehrere unabhängige Bewertungen. Hier wird davon ressourcenbedingt abgewichen: Es gibt keine Interrater-Reliabilität und keinen Konsens mehrerer Fachpersonen; Severity ist eine nachvollziehbare Arbeitspriorisierung innerhalb dieses Einzelfalls.

Der Walkthrough verlangt vorab Nutzerannahmen, Aufgaben und eine korrekte Handlungskette; er ist kein spontanes Ausprobieren als vermeintlich unkundige Person [Q4]. Die Entwicklerin kann ihr Vorwissen nicht ablegen. Die vier Fragen werden deshalb mit begründeten Annahmen beantwortet, nicht mit erfundenen Gedanken oder Äußerungen tatsächlicher Nutzerinnen. WCAG 2.2 bildet den normativen Bezug für die ausgewählten technischen Kriterien [Q3]; die W3C-Understanding-Seiten erläutern sie, sind selbst aber informativ.

## 3. Vorbereitung der späteren Durchführung

### 3.1 Version und Testumgebung einfrieren

Vor der ersten Inspektion führt die Entwicklerin diese Schritte selbst aus; **hier noch nicht ausgeführt**:

1. Den oben genannten Code-Commit bereitstellen. `git rev-parse HEAD`, `git status --porcelain=v1` und `git diff --stat` als Textnachweise speichern. Bei nachfolgenden reinen Dokumentationscommits sowohl `code_commit` als auch tatsächlichen `execution_commit` erfassen und unveränderten Anwendungscode nachweisen. Bei anderem Anwendungscode einen neuen Baseline-Stand begründen; nicht unbemerkt mischen.
2. Plan-Commit und Planversion `E07-1` protokollieren. Änderungen an Aufgaben oder Bewertungsregeln nach Beginn als datierte Protokollabweichung festhalten, alte Regel erhalten.
3. Ein lokales Auth- und Firestore-Emulatorprojekt mit den eingecheckten Regeln und ausschließlich synthetischen Daten verwenden. Projektkennung, Ports, SDK-/Emulatorversionen und Regeldatei-Commit notieren. Vorher erfolgreiche Anmeldung sowie Task-Lesen/-Speichern verifizieren. Bei fehlendem Emulator, Downloadfehler oder Verbindungsproblem den betroffenen Ablauf **blockiert** dokumentieren; keine In-Memory-Persistenz als echten Backendnachweis ausgeben. Eine abweichende Staging-Umgebung müsste vorab ausdrücklich als neue Umgebung dokumentiert werden; keine stillschweigende Produktionsumstellung.
4. Betriebssystem, Browser mit vollständiger Version, Node-/Paketstand, Startbefehl, Buildart und Bildschirm-/Viewportwerte erfassen. Browsererweiterungen und Netz-/Zoomänderungen notieren. Für geplante automatische Teilchecks Werkzeug und Version festlegen; fehlende Werkzeuge nicht als bestandene Prüfung behandeln. Keine neuen Abhängigkeiten oder Testskripte sind Bestandteil dieser Planungsphase.
5. Für Persistenzprüfungen den realen SDK-/Emulatorpfad nutzen. Vorhandene isolierte Fixtures und frühere Testberichte dürfen als Kontext dienen, sind keine Ergebnisse dieser Evaluation und ersetzen keine manuellen Durchläufe.

Die Beschreibung ist auch auf dem Windows-Rechner der Entwicklerin umsetzbar; konkrete Browser-/Toolversionen sind vor dem Start einzutragen und werden hier nicht erfunden. Eine erfolgreiche Anmeldung allein bestätigt noch keine funktionierende Firestore-Verbindung.

### 3.2 Zielannahmen, Testdaten und Wiederherstellung

Analytisch betrachtete Zielgruppe: deutschsprachige Lernende mit grundlegender Browserkenntnis, vertraut mit Aufgaben und Fälligkeiten, aber ohne vorausgesetztes Wissen über Repository, Hash-Routing oder Firebase. Diese Annahme ist nicht durch eine Zielgruppenstudie validiert. Tastatur- und assistive Bedienung werden ausdrücklich berücksichtigt; es wird nicht behauptet, die Entwicklerin könne Erfahrungen von Menschen mit Behinderungen stellvertretend messen.

Nur temporäre Konten mit synthetischen Adressen verwenden, etwa das **geplante** Muster `eval07-<run_id>@example.test` im lokalen Emulator. Kennwörter gehören weder in CSV, Screenshots noch Git. Das Konto für CW-01 muss vor seinem Durchlauf noch nicht existieren. Für CW-02 bis CW-08 wird ein angemeldetes Testkonto A mit folgendem wiederherstellbarem Bestand **D0** vorbereitet. Einrichtung und Wiederherstellung sind Setup, keine Aufgabenerfolge.

`D` bezeichnet das beim Setup festgehaltene lokale Kalenderdatum in `Europe/Berlin`; `D+n` sind Kalendertage, keine UTC-Zeitpunktverschiebung. `M+1/01` ist der erste Tag des nächsten Monats einschließlich korrektem Jahreswechsel. Die tatsächlich berechneten ISO-Daten werden vor dem Lauf im Setupnachweis festgehalten.

| Geplanter Schlüssel / Titel | Fach | Fälligkeit | Status | Beschreibung |
| --- | --- | --- | --- | --- |
| A01 – `E07 Mathematik – Integrale` | Mathematik | D+2 | Offen | `Übungsblatt bearbeiten.` |
| A02 – `E07 Deutsch – Essay` | Deutsch | D+4 | In Bearbeitung | leer |
| A03 – `E07 Biologie – Zellen` | Biologie | D−1 | Erledigt | leer |
| A04 – `E07 Suchnadel – Physik` | Physik | M+1/01 | Offen | leer |
| A05 – `E07 Geschichte – Quellen` | leer | D+2 | Offen | leer |

D0 hat als **Sollvorgabe**, nicht als Messergebnis, fünf Aufgaben: drei offen, eine in Bearbeitung, eine erledigt; vier nicht abgeschlossen, eine von fünf erledigt. Der Anzeigename ist zunächst nicht gesetzt. Tatsächlich erzeugte Task-IDs den Schlüsseln A01–A05 zuordnen; Titel sind keine Dokument-IDs. Für identische Daten die ID-Reihenfolge im Setupmanifest festhalten. Vor jedem Szenario-/Viewportdurchgang D0 und den vorgesehenen Auth-Zustand wiederherstellen und verifizieren. Keinen mutierten Endzustand unbemerkt als Start des nächsten Szenarios verwenden.

Für Leerzustände eine separat markierte leere Baseline D-LEER verwenden; für technische Lade-/Fehlerprüfungen einen getrennten Lauf mit dokumentierter Browser-Netzwerkeinstellung. Wiederholungen und Cache-/Sessionzustand protokollieren. Veränderungen nur an Testdaten; keine produktiven Konten oder Regeln bearbeiten.

### 3.3 Abdeckung und Reihenfolge

Geplant sind die acht CW-Szenarien jeweils bei **1440×900**, **390×844** und **320×812 CSS-Pixeln**, zunächst mit Browserzoom 100 %. Das ergibt 24 **geplante** Szenario-/Viewportkombinationen, keine bereits absolvierten Tests und keine 24 Testpersonen. Mobile Viewports im Desktopbrowser belegen keine native iOS-/Android-Bedienung; Emulation, Touchmodus und DPR protokollieren.

Spätere Reihenfolge: Setup → CW-01 bis CW-08 je Viewport (1440, 390, 320) → zehn Heuristikdurchgänge → technische/manuelle Accessibility-Checks → Befunde konsolidieren und Severity vergeben. Zusätzlicher Tastaturdurchgang der acht Handlungsketten bei 1440 px gehört zu den technischen Checks, nicht zu einer unabhängigen Nutzerstichprobe. Reflow/Zoom und auffällige Fokusstellen zusätzlich bei 320 px prüfen. Reihenfolge, Wiederholung und bekannte Abläufe sind mögliche Lern-/Reihenfolgeeffekte.

Während der Baseline-Inspektion keine UI-Fehler beheben. Ein blockierter Schritt beendet den tatsächlichen Ausführungspfad. Nachfolgende Schritte dürfen nur nach ausdrücklich dokumentiertem Setup-Bypass analytisch betrachtet werden; dadurch wird die ursprüngliche Aufgabe nicht nachträglich bestanden. Unbekannte Wartezustände nach höchstens 60 Sekunden als ungeklärten/blockierten Lauf anhalten und Ursache prüfen; diese organisatorische Abbruchgrenze ist kein WCAG- oder Performance-Grenzwert.

## 4. A – Heuristische Evaluation nach Nielsen

Die Bezeichnungen sind sinngemäß deutsch zusammengefasst; die konkreten Prüfimpulse sind eigene Anwendungsszenarien. Pro Heuristik auch unauffällige geprüfte Stellen und Lücken im Durchgangsprotokoll erfassen. Das folgende Raster benennt **Prüffragen, keine festgestellten Probleme** [Q1].

| ID | Heuristik | Geplanter konkreter Prüfimpuls |
| --- | --- | --- |
| H01 | Systemzustand erkennbar | Bei Anmeldung, Task-Speichern und Namenssave zwischen Laden, Erfolg und Fehler unterscheiden (CW-01/02/07). |
| H02 | Sprache der Lebenswelt | Fälligkeit, Statusbezeichnungen und Kalenderdatum auf Aufgaben-/Kalenderseite nachvollziehen (CW-02/04/06). |
| H03 | Kontrolle und Ausstieg | Bearbeitung abbrechen; Löschdialog öffnen und abbrechen, ohne Aufgabe zu verlieren (CW-03, Zusatzprüfung). |
| H04 | Einheitliche Konventionen | Gleiche Aufgabe, Status und Profilzugang über Übersicht, Aufgaben, Kalender und Mobile-Navigation vergleichen. |
| H05 | Fehler vorbeugen | Pflichtangaben, versehentliche Doppelaktion und Löschbestätigung an ausschließlich synthetischen Einträgen betrachten (CW-02/08). |
| H06 | Wiedererkennen unterstützen | Aufgabe über sichtbare Suche/Filter und Datum finden; aktiven Filter wiedererkennen (CW-05/06). |
| H07 | Flexible, effiziente Bedienung | Dieselbe Handlungskette mit Tastatur und Zeiger nachvollziehen; unnötige Wiederholungen notieren. |
| H08 | Relevantes hervorheben | D0 und D-LEER bei 320/390/1440 px betrachten: wesentliche Aktionen, Hinweise, lange Inhalte. |
| H09 | Fehler verständlich beheben | Absichtlichen Eingabefehler berichtigen; in separatem Lauf Verbindungsausfall und Wiederholung betrachten (CW-08). |
| H10 | Passende Hilfen | Orientierung zu Pflichtfeldern, Datumsformat und Anzeigenamenspeicherung suchen (CW-02/07/08). |

Für jeden möglichen Befund eine eindeutige `finding_id`, Ansicht/Route, primäre Heuristik und gegebenenfalls weitere H-IDs erfassen. Erwartung, konkrete Beobachtung, reproduzierbare Schritte, Nachweis und Verbesserungsvorschlag getrennt notieren. Gleiche Ursache über mehrere Ansichten/Methoden unter derselben Befund-ID verknüpfen; zusätzliche Vorkommen als Nachweise, nicht als künstlich zusätzliche Probleme zählen.

### Severity 0–4 und Status

Sinngemäße Skala nach [Q2]:

| Severity | Bedeutung für die spätere Einordnung |
| --- | --- |
| 0 | Nach Prüfung kein anzuerkennendes Usability-Problem. |
| 1 | Kosmetische Unstimmigkeit; Korrektur nachrangig. |
| 2 | Kleineres Nutzungsproblem; geringe Behebungspriorität. |
| 3 | Erhebliches Nutzungsproblem; hohe Behebungspriorität. |
| 4 | Usability-Katastrophe; zwingend vor Freigabe zu beheben. |

Nach der Sammlung begründet dieselbe Evaluatorin je Befund **Auftreten, Auswirkung und Fortbestehen**. Auftreten bezieht sich hier auf nachgewiesene Stellen/Prüfsituationen, nicht auf geschätzte Nutzerprävalenz. Annahmen als solche markieren. Keine mechanische Addition der drei Aspekte; keinen automatischen Zusammenhang zwischen WCAG-Level und Severity herstellen. Die ordinale Skala später als Verteilung und mit Begründungen darstellen, nicht als objektiven Mittelwert einer Nutzerpopulation.

`severity` bleibt leer, solange keine begründete Einstufung vorliegt. **Nicht geprüft, blockiert, unklar und nicht anwendbar sind weder Severity 0 noch bestanden.** Befundstatus: `offen`, `behoben`, `nicht bestätigt`. `offen` umfasst auch noch zu prüfende Hypothesen; dann bleibt die Severity leer und die Unsicherheit ausdrücklich bestehen. `behoben` erst nach dokumentierter Änderung und erfolgreicher Nachprüfung; eine bloße Empfehlung oder ein behaupteter Fix reicht nicht. `nicht bestätigt` erst nach begründeter Verwerfung eines geprüften Verdachts, nicht als Abschluss ungeklärter Fälle. Severity 0 setzt die ausdrückliche Entscheidung voraus, dass kein Usability-Problem vorliegt.

## 5. B – Cognitive Walkthrough mit acht Aufgaben

### 5.1 Einheitlicher Ablauf für jeden Handlungsschritt

Annahme und Handlungskette sind unten vorab festgelegt. Eine ganze Feldeingabe gilt als eine Aktion, eine Betätigung/Auswahl als eine weitere. Die nummerierten Aktionen erhalten je Szenario `.S01`, `.S02` usw.; Beobachtungen sind Prüfpunkte/Q4, keine zusätzlich erfundenen Benutzeraktionen. Die eingefrorene Schrittfolge wird im Sessionnachweis festgehalten. Bei notwendiger Korrektur erst die Abweichung protokollieren, dann einen neuen Lauf beginnen. So wird Exploration nicht nachträglich als vorab geplanter Walkthrough ausgegeben [Q4, Q5].

Für **jeden** Schritt vier getrennte Antworten `ja`, `nein` oder `unklar` samt Begründung; sinngemäße Übertragung der Originalfragen [Q4]:

1. **Q1 Teilziel:** Ist unter den Nutzerannahmen plausibel, dass die Person diesen nächsten Effekt anstrebt?
2. **Q2 Sichtbarkeit:** Würde sie die verfügbare passende Handlung bemerken?
3. **Q3 Zuordnung:** Würde sie Handlung und gewünschtes Ergebnis miteinander verbinden?
4. **Q4 Rückmeldung:** Könnte sie nach der Handlung den Fortschritt zum Ziel erkennen?

Vor der Aktion Q1–Q3 anhand des sichtbaren Zustands begründen, danach Q4 anhand der Rückmeldung. Tatsächlich sichtbare UI-Vorgänge gehören in `observed`; Aussagen über mögliche Nutzerkenntnis in `q*_reason` und als analytische Hypothese kennzeichnen. Keine erfundenen Nutzerzitate. Auch ein `ja` braucht eine nachvollziehbare UI-/Wissensbegründung. Ein fachlich erreichter Sollzustand kann gleichzeitig eine analytisch problematische Handlungskette aufweisen; funktionales Bestehen und Learnability-Hypothese sind getrennte Aussagen.

### CW-01 – Registrieren und anmelden

**Ziel/Start:** Nicht angemeldet auf `#/login`, noch nicht existentes temporäres Konto; kein Taskbestand vorausgesetzt.

1. Registrierung über den sichtbaren Wechsel aufrufen.
2. Synthetische E-Mail eingeben.
3. Lokal bereitgehaltenes gültiges Kennwort eingeben.
4. Identische Kennwortbestätigung eingeben.
5. Kontoerstellung auslösen. Prüfpunkt: Pending, Ergebnis, geschützte Übersicht und Kontozuordnung.
6. Abmelden auslösen. Prüfpunkt: geschützte Inhalte verlassen.
7. Dieselbe E-Mail auf der Anmeldung eingeben.
8. Dasselbe Kennwort eingeben.
9. Anmelden auslösen. Prüfpunkt: richtige eigene Übersicht.

**Bestanden im späteren Ablauf:** Konto angelegt und erneute Anmeldung erfolgreich, richtige eigene Sitzung erkennbar; keine widersprüchliche Erfolgsmeldung. **Integrität:** Nach Logout keine geschützte Ansicht zugänglich; kein fremdes Konto angezeigt. Zugangsdaten nicht als Nachweis speichern. Scheitert die lokale Auth-Umgebung, Lauf blockiert statt vermuteter UI-Fehler.

### CW-02 – Aufgabe mit Fälligkeitsdatum erstellen

**Ziel/Start:** Konto A, verifiziertes D0, `#/dashboard`, keine Bearbeitung geöffnet.

1. Zur Aufgabenansicht navigieren.
2. „Aufgabe hinzufügen“ aufrufen.
3. Titel `E07 Neue Lernaufgabe` eingeben.
4. Fälligkeit D+3 im Datumsfeld setzen.
5. Fach `Chemie` eingeben.
6. Beschreibung `Notiz E07` eingeben. Prüfpunkt: Standardstatus.
7. Speichern auslösen. Prüfpunkt: Rückmeldung und neue Aufgabenkarte.
8. Aufgabenansicht neu laden. Prüfpunkt: Eintrag erneut vorhanden.

**Bestanden:** Genau ein zusätzlicher Eintrag mit allen Eingaben und Standard Offen, auch nach Reload. **Integrität:** D0-Einträge unverändert; insgesamt sechs Aufgaben und weiterhin ein erledigter Eintrag. Eingabe und gespeicherter Zustand als getrennte Nachweise festhalten.

### CW-03 – Bestehende Aufgabe bearbeiten

**Ziel/Start:** D0 wiederhergestellt, `#/tasks`, A01 vorhanden.

1. Aktionsmenü von A01 öffnen.
2. Bearbeiten wählen.
3. Titel auf `E07 Mathematik – Integrale bearbeitet` setzen.
4. Datum auf D+5 setzen.
5. Beschreibung auf `Überarbeitet E07` setzen; Fach/Status nicht ändern.
6. Änderungen speichern. Prüfpunkt: Karte und Rückmeldung.
7. Seite neu laden. Prüfpunkt: Werte erneut vorhanden.

**Bestanden:** Geänderte Werte am selben Eintrag dauerhaft sichtbar. **Integrität:** A01-ID und Gesamtzahl fünf erhalten, kein Duplikat, Fach/Status und übrige Einträge unverändert. Abbrechen ohne Speicherung wird zusätzlich unter H03 geprüft, getrennt vom erfolgreichen Bearbeiten.

### CW-04 – Status ändern und Fortschritt prüfen

**Ziel/Start:** D0 auf Aufgabenansicht; A01 Offen, eine von fünf Aufgaben erledigt.

1. Statusauswahl von A01 öffnen.
2. In Bearbeitung wählen. Prüfpunkt: Rückmeldung und unveränderter Erledigt-Fortschritt.
3. Statusauswahl von A01 erneut öffnen.
4. Erledigt wählen. Prüfpunkt: neue Zuordnung und Fortschritt.
5. Dashboard öffnen. Prüfpunkt: zugehörige Kennzahlen.
6. Seite neu laden. Prüfpunkt: Zuordnung und Kennzahlen erneut vorhanden.

**Bestanden:** Zwischenstatus erkennbar gespeichert, anschließend A01 erledigt; zwei von fünf erledigt (= 40 % Sollwert), drei nicht abgeschlossen. **Integrität:** Titel, Datum und Dokument-ID unverändert. Nach Auswahl In Bearbeitung (Schritt 2) bleibt eine von fünf erledigt; In Bearbeitung ist nicht Erledigt.

### CW-05 – Aufgabe über Suche und Filter finden

**Ziel/Start:** D0, Aufgabenansicht, leere Suche und Filter Alle.

1. `Suchnadel` in die Aufgabensuche eingeben.
2. Filter Offen wählen. Prüfpunkt: passender Eintrag A04.
3. Filter Erledigt wählen. Prüfpunkt: erwarteter Leerzustand.
4. Filter Alle wählen. Prüfpunkt: A04 wieder vorhanden.
5. Suche leeren. Prüfpunkt: vollständige Liste und globale Kennzahlen.

**Bestanden:** Ziel unter passender Kombination auffindbar, unter unpassender Kombination keine irreführende Aufgabe; Rücksetzen liefert wieder fünf Einträge. **Integrität:** Keine Datenänderung; globale Fortschrittswerte bleiben bei einer von fünf erledigt. Ein erwarteter leerer Suchtreffer ist kein Fehlerereignis.

### CW-06 – Aufgabe im Kalender finden

**Ziel/Start:** D0, Dashboard; Ziel A04 mit gespeichertem ISO-Datum M+1/01 bekannt.

1. Kalender über Navigation öffnen. Prüfpunkt: frischer Start im Monat von D; andernfalls Setupabweichung dokumentieren.
2. Nächsten Monat aufrufen. Prüfpunkt: Monat des Zieldatums, gegebenenfalls neues Jahr.
3. Den ersten Tag dieses Monats auswählen. Prüfpunkt: Tagesliste und Ziel A04.
4. Tagesauswahl über „Alle Aufgaben im Monat“ aufheben. Prüfpunkt: Monatsliste.
5. Zur Aufgabenansicht navigieren. Prüfpunkt: D0 vollständig vorhanden.

**Bestanden:** A04 erscheint am tatsächlichen lokalen Fälligkeitsdatum; Tagesliste enthält nur Aufgaben dieses Datums. Weitere Aufgaben mit demselben Datum sind zulässig und werden gegen das Setupmanifest geprüft. **Integrität:** Keine Datums-/Statusänderung, keine verschwundenen Aufgaben. Monats-/Jahresgrenze anhand des konkret vorbereiteten Datums nachvollziehen.

### CW-07 – Anzeigenamen ändern und dauerhaft speichern

**Ziel/Start:** D0 und Konto A ohne Anzeigenamen, `#/dashboard`.

1. Profil über sichtbaren Profilzugang öffnen.
2. `Nora Winter` eingeben. Prüfpunkt: bestätigte Anzeige/Initialen vor Speicherung unverändert.
3. „Namen speichern“ auslösen. Prüfpunkt: Pending, Bestätigung, Profil und Sidebar/Avatar.
4. Dashboard aufrufen. Prüfpunkt: Begrüßung ohne Reload.
5. Profil erneut öffnen.
6. Namen auf `Alex Wolff` ändern.
7. „Namen speichern“ auslösen. Prüfpunkt: zweite bestätigte Änderung.
8. Seite neu laden. Prüfpunkt: Profil und Initialen.
9. Abmelden auslösen.
10. E-Mail auf der Anmeldung eingeben.
11. Kennwort eingeben.
12. Anmelden auslösen. Prüfpunkt: Dashboard-Begrüßung.
13. Profil öffnen. Prüfpunkt: Name und Initialen dauerhaft vorhanden.

**Bestanden:** Erstmaliges Setzen und spätere Änderung bestätigt; zuletzt Alex Wolff/AW, Dashboard-Vorname Alex, auch nach Reload und Login. **Integrität:** E-Mail weiterhin schreibgeschützt/unverändert, Taskbestand D0 unverändert, keine Erfolgsmeldung vor Bestätigung. Nur der gespeicherte Name bestimmt den Avatar; kein Bild-Upload vorgesehen.

### CW-08 – Eingabefehler erkennen und beheben

**Ziel/Start:** D0, Aufgabenansicht.

1. Erstellung über „Aufgabe hinzufügen“ öffnen.
2. Bei weiterhin leerem Titel das gültige Datum D+3 setzen.
3. Fach `Chemie` eintragen.
4. Speicheraktion auslösen. Prüfpunkt: Fehlerzuordnung, Text, Fokus und noch kein neuer Eintrag.
5. Titel `E07 Fehler korrigiert` ergänzen; andere Eingaben beibehalten.
6. Speichern auslösen. Prüfpunkt: Rückmeldung und genau ein korrekter Eintrag.
7. Seite neu laden. Prüfpunkt: korrigierter Eintrag dauerhaft vorhanden.

**Bestanden:** Pflichtfeldfehler ist erkennbar und behebbar; gültige Eingaben bleiben erhalten; erst korrigierter Eintrag wird gespeichert und nach Reload gefunden. **Integrität:** Vor Korrektur fünf, danach sechs Aufgaben; kein leerer/teilweise gespeicherter Eintrag oder Duplikat. Der absichtlich ausgelöste Validierungshinweis ist erwartetes Systemverhalten, kein gemessener Nutzerfehler.

### 5.2 Einheitliche Ergebnisregel

Pro tatsächlichem Szenariolauf gelten alle genannten Endzustands- **und** Integritätskriterien. `bestanden` nur bei vollständig nachgewiesenem Sollzustand. `nicht bestanden` erfordert eine beobachtete Abweichung; bei fehlendem Nachweis `unklar`, bei fehlender Voraussetzung `blockiert`. Ohne Durchführung `nicht geprüft`. Keine automatische Hochstufung zum Erfolg durch Codewissen, einen früheren Test oder einen manuell hergestellten Endzustand. Ein unauffälliger eigener Durchlauf beweist keine leichte Erstnutzung durch andere Personen.

## 6. C – Technische Accessibility- und UI-Prüfung

Ausgewählte A-/AA-Kriterien aus der fixierten WCAG-2.2-Fassung [Q3]. **Keine Gesamtkonformitätsprüfung.** Die Prüfschritte sind eigene Operationalisierung für die Szenarien. Kennzeichnung: **A** = automatisierbarer Teilnachweis, **M** = manuell erforderlich. A/M bedeutet, dass ein Werkzeugbefund die manuelle Beurteilung nicht ersetzt. Jede Zeile bleibt bis zur späteren Durchführung ungeprüft; N/A nur nach begründeter Anwendbarkeitsprüfung.

| Check | Kriterium / Level | Geplanter Teilcheck und Nachweis | Art |
| --- | --- | --- | --- |
| AC-01 | 1.1.1 / A | Symbolbuttons benannt, dekorative Icons passend ausgeblendet; Accessibility-Baum und Bedeutung vergleichen. | A/M |
| AC-02 | 1.3.1 / A | Formular-Labels, Gruppen, Überschriften und Kalendertabelle programmatisch zugeordnet. | A/M |
| AC-03 | 1.3.2 / A | DOM-/Lesereihenfolge mit sichtbarer Reihenfolge vergleichen, einschließlich Mobile-Karten. | M |
| AC-04 | 1.3.5 / AA | Eingabezwecke von Name, E-Mail und Kennwort passend erkennbar/ausgezeichnet. | A/M |
| AC-05 | 1.4.1 / A | Status, Auswahl und Fehler auch ohne alleinige Farbunterscheidung verständlich. | M |
| AC-06 | 1.4.3 / AA | Tatsächliche Text-/Hintergrundpaare messen; auch Hinweise, Statuslabels, Hover/Fokus berücksichtigen. | A/M |
| AC-07 | 1.4.4 / AA | Text auf 200 % vergrößern; Inhalte/Aktionen erhalten, keine überdeckten Felder. | M |
| AC-08 | 1.4.10 / AA | 320 CSS-px-Reflow und äquivalenten Zoom prüfen; 390/1440 zusätzlich als Responsive-Szenarien. | A/M |
| AC-09 | 1.4.11 / AA | Relevante Steuerkonturen, Zustände und grafische Informationen gegen Nachbarfarben messen. | A/M |
| AC-10 | 2.1.1 / A | Alle acht Handlungsketten ohne Maus, einschließlich Datum, Status, Menü und Namenssave. | M |
| AC-11 | 2.1.2 / A | Kein Fokusfang; insbesondere Aktionsmenüs, Löschbestätigung und Kalender verlassen können. | M |
| AC-12 | 2.4.1 / A | Wiederholte Navigation per Sprungmöglichkeit umgehen und Ziel erreichen. | M |
| AC-13 | 2.4.2 / A | Seitentitel beim internen Ansichtswechsel auf aussagekräftigen Zweck prüfen. | A/M |
| AC-14 | 2.4.3 / A | Tab-Reihenfolge und Fokus nach Fehler, Speichern, Abbruch und Ansichtswechsel verfolgen. | M |
| AC-15 | 2.4.6 / AA | Beschriftungen/Überschriften beschreiben den Zweck; Formular und Aktionen verständlich. | M |
| AC-16 | 2.4.7 / AA | Fokus bei jeder erreichbaren Steuerung sichtbar, Screenshots der relevanten Zustände. | M |
| AC-17 | 2.4.11 / AA | Fokussiertes Element nicht vollständig durch eigene UI verdeckt, auch bei kleinem Viewport. | M |
| AC-18 | 2.5.3 / A | Sichtbarer Button-/Feldtext im zugänglichen Namen enthalten. | A/M |
| AC-19 | 2.5.8 / AA | Effektive anklickbare Flächen/Abstände messen, begründete Ausnahmen separat beurteilen. | A/M |
| AC-20 | 3.1.1 / A | Seitensprache Deutsch programmatisch erkennbar. | A/M |
| AC-21 | 3.2.1 / A | Fokussieren allein löst keinen unerwarteten Kontextwechsel aus. | M |
| AC-22 | 3.2.2 / A | Eingabe/Statusauswahl führt nicht ohne Hinweis zu unvorhersehbarem Kontextwechsel. | M |
| AC-23 | 3.2.3 / AA | Wiederholte Hauptnavigation je Darstellungsvariante konsistent angeordnet. | M |
| AC-24 | 3.2.4 / AA | Wiederkehrende Funktionen konsistent benannt/erkennbar. | M |
| AC-25 | 3.3.1 / A | Pflichtfeldfehler als Text mit betroffenem Feld nachvollziehbar (CW-08). | A/M |
| AC-26 | 3.3.2 / A | Sichtbare Labels und benötigte Hinweise vor Eingabe vorhanden. | A/M |
| AC-27 | 3.3.3 / AA | Erkannter Fehler bietet eine passende Korrekturmöglichkeit. | M |
| AC-28 | 3.3.4 / AA | Schutz bei Änderung/Löschung eigener gespeicherter Daten; Bestätigung/Prüfung/Rücknahme passend beurteilen. | M |
| AC-29 | 3.3.8 / AA | Login mit Einfügen und Passwortmanager untersuchen; keine unbelegte Notwendigkeit eines Gedächtnistests annehmen. | M |
| AC-30 | 4.1.2 / A | Namen, Rollen und Zustände von Menüs, Filtern, Auswahl und Formularbuttons im Accessibility-Baum. | A/M |
| AC-31 | 4.1.3 / AA | Lade-/Speicher-/Fehlerrückmeldung mit Screenreader/Accessibility-Werkzeug nachvollziehen, ohne unnötigen Fokuswechsel. | A/M |

Messregeln für die besonders relevanten Teilchecks:

- **Kontrast:** Normaltext mindestens 4,5:1, großer Text mindestens 3:1; Größe/Gewicht und zulässige Ausnahmen dokumentieren. Als groß gelten grundsätzlich 18 pt oder 14 pt fett, nicht pauschal jedes Heading. Messwerte und tatsächliche Farben speichern, Grenzwerte nicht durch Aufrunden erreichen [Q6]. Relevante nichttextliche Informationen grundsätzlich 3:1, jeweilige Ausnahmen prüfen [Q7]. Ein Screenshot-Farbeindruck ist kein vollständiger Kontrastnachweis.
- **Reflow:** Bei vertikalem Inhalt 320 CSS-px äquivalente Breite; ergänzend 1280 CSS-px Ausgangsbreite mit 400 % Zoom dokumentieren. Kein Informations-/Funktionsverlust und grundsätzlich kein zweidimensionales Scrollen. Ausnahmen für notwendige zweidimensionale Inhalte sind zu begründen, nicht pauschal dem gesamten Kalender oder seiner Aufgabenliste zu gewähren [Q8]. `scrollWidth <= clientWidth` ist nur ein Teilcheck.
- **Zielgröße:** Effektive Klickfläche mindestens 24×24 CSS-px oder eine zutreffende Ausnahme, etwa ausreichend Abstand. Die sichtbare Icongröße ist nicht automatisch die Zielgröße. 44×44 gehört zum strengeren AAA-Kriterium 2.5.5 und wird hier nicht als AA-Grenze ausgegeben [Q9].
- **Fokus/Rückmeldung:** Sichtbarkeit und Verdeckung getrennt prüfen [Q10, Q11]; für 2.4.11 AA nicht die strengere vollständige Unverdeckt-Anforderung erfinden. 2.4.13 Focus Appearance ist AAA, nicht dieses AA-Prüfziel. Meldungsrollen allein beweisen noch nicht, dass eine konkrete Assistenztechnik Rückmeldungen sinnvoll ausgibt [Q12].
- **Authentifizierung:** Einfügen/Passwortmanager sind relevante Unterstützungen; 3.3.8 bezieht sich auf Authentifizierung bestehender Konten. Registrierung und Passwortbestätigung zusätzlich als Usability-Abläufe betrachten, nicht pauschal unter denselben normativen Geltungsbereich setzen [Q13].

Geplantes Werkzeugvorgehen: Optional ein versioniertes Accessibility-Prüfwerkzeug (z. B. axe-basiert) je Route und dynamischem Zustand einsetzen, Rohbericht mit Regel-ID/Elementbezug sichern, automatische Treffer manuell prüfen. DevTools ergänzend für Accessibility-Baum, Farben und Geometrie; Windows etwa mit dokumentierter NVDA-/Browserversion für Ankündigungen. Keine Tools wurden für diese Evaluation bereits ausgeführt. Falls ein Tool nicht bereitsteht, den Teilcheck manuell abdecken oder als nicht geprüft festhalten, nicht als bestanden. Die genaue Toolkombination ist vor dem ersten Durchlauf zu protokollieren.

Automatisierbar sind vor allem begrenzte Struktur-/Namens-/Kontrast-/Geometrieprüfungen. Sinnvoller Fokusverlauf, verständliche Fehlersprache, tatsächliche Tastaturbedienung, vollständiger Reflow und erwartete Screenreader-Ausgabe benötigen manuelle Prüfung. 4.1.1 Parsing ist in WCAG 2.2 entfernt und wird nicht als gültiges SC bewertet. Selbst vollständig bestandene ausgewählte Checks begründen keine WCAG-2.2-AA-Konformitätsaussage; dafür fehlen gegebenenfalls weitere Kriterien, komplette Prozesse, Zustände und Unterstützungsnachweise [Q3].

## 7. Datenerhebung, Nachweise und leere CSV

### 7.1 Erfassungseinheiten und kontrollierte Werte

Vorlage: `docs/aufgabe-07-ergebnisse-vorlage.csv`, Schemaversion `E07-1`, **UTF-8 mit BOM, Semikolon, LF**, genau eine Headerzeile. Es gibt keine Beispiel-/Null-/Erfolgszeilen. Bei späterer Durchführung in eine Ergebnisdatei kopieren und Vorlage unverändert lassen. Excel über „Daten → Aus Text/CSV“ mit UTF-8/Semikolon importieren; IDs, SHA und Zeitstempel als Text, Messzeiten bei Bedarf mit Punkt als Dezimalzeichen importieren. Kein bestehendes Bachelorarbeits-Excel wird jetzt geändert; konkretes Blatt-/Spaltenmapping bleibt vor Import abzugleichen.

Eine CSV mit klaren Zeilentypen; nicht jede Spalte gilt für jeden Typ:

| `record_type` | Granularität / Pflichtinhalt |
| --- | --- |
| `session` | Ein später tatsächlich begonnener Inspektionsabschnitt: Version, Umgebung, Evaluatorin, Datum, Setup-/Manifestbezug und geplante Abweichungen. |
| `scenario` | Ein tatsächlicher Szenario-/Viewportdurchlauf mit Startzustand, Soll-/Ist-Endzustand, Integrität und `check_result`. |
| `cw_step` | Ein Handlungsschritt mit Aktion, sichtbarer Rückmeldung und **vier Antworten plus vier Begründungen**. Kein pauschales Szenario-Ja als Ersatz. |
| `heuristic_check` | Ein H-Prüfimpuls × Ansicht × UI-Zustand × Viewport; auch unauffällige Stellen, Unsicherheit und ausgelassene Prüfungen dokumentieren. |
| `finding` | Eine deduplizierte mögliche Problemursache mit H-/SC-Zuordnung, Reproduktion, Nachweis, Schweregradbegründung, Verbesserung und anfänglichem Status. |
| `wcag_check` | Ein SC × Ansicht/Element × Prüfzustand × Viewport/Bedienmodus × Teilmethode; Tool- und manuelle Teilchecks bleiben unterscheidbar. |
| `change_event` | Spätere, getrennte Änderung bzw. Nachprüfung zu einer vorhandenen Befund-ID, mit Verweis auf alten Datensatz, Change-Commit und Retest. |

Kontrollierte Werte:

- `method`: `HE`, `CW`, `A11Y`, `META`, `RETEST`.
- `evidence_type`: `Beobachtung`, `analytische Hypothese`, `automatischer Messwert`.
- `q1_answer` bis `q4_answer`: `ja`, `nein`, `unklar`; bei anderen Zeilentypen leer. Die vier Begründungsspalten sind bei `cw_step` Pflicht. `check_result` dort leer lassen; die vier Antworten sind kein funktionales Pass/Fail.
- `check_result` bei tatsächlichen Szenario-/Teilchecks: `bestanden`, `nicht bestanden`, `blockiert`, `unklar`, `nicht anwendbar`, `nicht geprüft`. N/A braucht einen Grund. Ein bestandener automatischer Teilcheck ist kein Gesamt-SC-Pass.
- `check_result` bei `heuristic_check`: `unauffällig`, `auffällig`, `unklar`, `blockiert`, `nicht anwendbar`, `nicht geprüft`; der begrenzte Prüfimpuls wird beschrieben. Unauffällig bedeutet weder Severity 0 noch vollständige Erfüllung der Heuristik in der gesamten Anwendung. Auffälligkeiten verweisen auf eine gesonderte `finding`-Zeile.
- `status` nur für Befunde/Statusereignisse: `offen`, `behoben`, `nicht bestätigt`.
- `severity`: leer oder eine begründete ganze Zahl 0–4, nicht aus fehlenden Daten ableiten.
- `event_kind`: beispielsweise `erwartete Validierung`, `unerwartete Abweichung`, `Umgebungsblockade`, `Bedienabweichung der Evaluatorin`, `Änderung`, `Nachprüfung`; keine erfundenen Nutzerfehler.

Leer bedeutet „für diese Zeile kein Wert vorhanden/nicht erhoben“, niemals automatisch null, bestanden oder Severity 0. Jeder Datensatz erhält eindeutige `record_id`; `finding_id` verknüpft Methoden und spätere Ereignisse. IDs sind Muster für die spätere Erhebung, etwa Session `E07-S{Nr}`, Run `E07-R{Nr}`, Befund `E07-F{Nr}`; aktuell existiert kein solcher Ergebnisdatensatz.

### 7.2 Spaltenvertrag

| Spalten | Festgelegte Bedeutung |
| --- | --- |
| `schema_version`, `record_type`, `record_id`, `session_id`, `run_id`, `evaluator_id` | Schema, Zeilentyp und eindeutige Verknüpfungen; Evaluatorin pseudonym, keine Teilnehmer-ID. |
| `recorded_at`, `started_at`, `ended_at`, `elapsed_inspection_s` | Tatsächliche ISO-8601-Zeitstempel mit UTC/Offset; Dauer nur wenn gemessen. Denk-/Protokollzeit und Unterbrechungen notieren. Keine Nutzer-Time-on-Task ableiten. |
| `code_commit`, `execution_commit`, `plan_commit` | Eingefrorener Anwendungscode, tatsächlich ausgeführter Checkout und Regelstand des Plans; volle SHA. |
| `method`, `scenario_id`, `view`, `route`, `element_ref`, `ui_state`, `baseline_id`, `step_id` | Methode, CW-/AC-/H-Bezug, konkretes UI-Element, Zustand (z. B. default, loading, error, focused, menu_open), verifizierter Datenstart und Handlungsschritt. |
| `viewport_width_css_px`, `viewport_height_css_px`, `input_mode`, `environment`, `browser_os`, `tool_version` | Tatsächliche CSS-Maße, Zeiger/Tastatur/Assistenztechnik, Emulator/Staging/isoliert, Versionen. Zoom/DPR in `notes` oder verlinktem Sessionnachweis. |
| `action`, `expected`, `observed`, `evidence_type` | Handlung, vorher festgelegte Erwartung, konkrete Sichtung/Messung und Art der Aussage. Auch Integritätsprüfung hier festhalten. |
| `q1_answer`, `q1_reason`, …, `q4_answer`, `q4_reason` | Vier getrennte analytische CW-Antworten und nachvollziehbare Begründungen je Schritt. |
| `check_result`, `event_kind` | Tatsächliches Teilcheck-/Szenarioergebnis und Art einer Abweichung; erwartete Fehlerprovokation ist nicht automatisch Nichtbestehen. |
| `finding_id`, `heuristic_primary`, `heuristics_secondary`, `wcag_sc`, `wcag_level` | Konsolidierter Befund, primäre H-ID, weitere H-IDs mit `|` getrennt, exaktes SC/Level. Mehrere SC getrennt protokollieren. |
| `frequency_basis`, `impact_basis`, `persistence_basis`, `severity`, `severity_reason` | Beobachtungsgrundlage und begründete Priorisierung; keine Nutzerhäufigkeit vortäuschen. |
| `reproduction_steps`, `evidence_refs`, `improvement`, `status` | Reproduzierbare Folge, Belegpfade/Hashes, möglicher Verbesserungsansatz, Befundstatus. |
| `related_record_id`, `change_commit`, `retest_record_id`, `notes` | Verknüpfung zu Ursprung/Änderung/Nachprüfung und verbleibende Unsicherheit/Abweichung. |

### 7.3 Nachweise und Trennung von Befund/Korrektur

Erst bei späterer Evaluation einen Nachweisordner je Session anlegen. Dateien nach Session, Methode, Szenario/SC, Schritt, Breite und Zustand benennen, z. B. als **Namensmuster** `E07-S{Nr}_CW-07_S{Nr}_390_fokus.png`. Vorher-/Nachherbilder getrennt. Zu einem Problem möglichst Übersicht plus Detail/Fokuszustand; bei Persistenz vor Save, Bestätigung und Zustand nach Reload/Login unterscheiden. Screenshots allein belegen weder Serverpersistenz noch Screenreader-Ausgabe.

Zusätzlich tatsächlich speichern: Git-/Umgebungsnachweise aus Abschnitt 3, Setupmanifest mit berechneten Daten und Task-ID-Zuordnung, zutreffende Werkzeug-Rohberichte und relevante anonymisierte Log-/Accessibility-Auszüge. Belegindex mit Dateipfad, Aufnahmezeit, Code-Commit und SHA-256-Hash; `evidence_refs` verweist darauf. Keine Passwörter, Tokens oder fremden personenbezogenen Inhalte aufnehmen. Screenshots werden nicht nachträglich so verändert, dass ein Fehler verschwindet; notwendige Anonymisierung kenntlich machen und Originale geschützt aufbewahren.

Baseline-Ergebnisdatei nach der Inspektion unverändert archivieren/committen. Neue Feststellungen ergänzen; alte Beobachtungen, Severity und Reproduktionsschritte nicht stillschweigend überschreiben. Spätere Korrekturen erst in einer separat beauftragten Umsetzungsphase mit eigenem Branch/Commit. In `change_event` Ursprung und Änderung verknüpfen; Retest mit eigener Run-ID und neuem Code-Commit. `behoben` erst mit positivem Nachweis. Wird ein Verdacht verworfen oder ein Rating revidiert, ebenfalls ein begründetes Ereignis ergänzen. Der letzte verknüpfte Status kann für Excel abgeleitet werden, der Erstbefund bleibt erhalten.

Spätere Auswertung: tatsächlich geprüfte Abdeckung, offene/blockierte Stellen, deduplizierte Befunde je Heuristik/Severity und qualitative Handlungsketten darstellen. Mehrfachvorkommen nicht als unabhängige Befunde aufblasen. Keine SUS-Werte, Teilnehmerstatistik, Nutzer-Erfolgsquote oder repräsentative Zufriedenheit berechnen. Ein dokumentierter eigener Funktionsdurchlauf ist keine gemessene Nutzerleistung.

## 8. Wissenschaftliche Grenzen und Umgang mit Verzerrungen

- **Doppelrolle:** Vertrautheit, Bestätigungs-/Investitionsbias und Codewissen können Entdeckbarkeit überschätzen und Probleme übersehen. Vorab definierte Schritte, genaue Belege und begründete Gegenhypothesen mindern dies, beseitigen es aber nicht.
- **Nur eine Evaluatorin:** Keine unabhängige Problementdeckung, Ratingabstimmung, Sättigungs- oder Reliabilitätsbehauptung. Ein zweiter Durchgang derselben Person und technische Agentenprüfungen ersetzen keine weiteren menschlichen Evaluatorinnen.
- **Annahmen zur Zielgruppe:** Die modellierte Erstnutzung und Wissenserwartung sind nicht empirisch validiert. CW liefert mögliche Lernprobleme, keine beobachteten Reaktionen realer Lernender [Q4].
- **Methodenbegrenzung:** Heuristiken garantieren keine Vollständigkeit; automatische Regeln prüfen nur erfasste Zustände und können falsch-positive wie falsch-negative Befunde liefern. Fachlich sinnvolle Sprache und Assistenztechnik-Nutzung bleiben manuelle Aufgaben.
- **Umgebung und Wiederholung:** Emulator, Browser, Viewportemulation, Seed-Daten, feste Reihenfolge und Wiederholungslernen begrenzen Übertragbarkeit. Eine erfolgreiche lokale Prüfung ist kein Produktions-, Mobilgeräte- oder Lastnachweis.
- **Reichweite:** Keine Generalisierbarkeit auf eine Nutzerpopulation, keine Umfrage und keine behauptete vollständige WCAG-Konformität. Performance-/Million-User-Szenario sowie weitergehende wissenschaftliche Erweiterbarkeitstests bleiben getrennte Evaluationen.

## 9. Verifizierte Quellen und Belegumfang

Alle folgenden Webquellen am **05.11.2026** geprüft. Keine langen Originalpassagen übernommen; Heuristikbezeichnungen, Skala und CW-Fragen sind sinngemäß übertragen. Literaturdaten nur soweit auf der jeweiligen Quelle nachweisbar.

- **[Q1]** Nielsen, Jakob (1994, 24. April; zuletzt geprüft laut Seite 30.01.2024): *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group. [Originalseite](https://www.nngroup.com/articles/ten-usability-heuristics/). Autor, Datumsangaben und alle zehn Prinzipien gelesen; Anwendungsszenarien dieses Plans sind eigene Ableitungen.
- **[Q2]** Nielsen, Jakob (1994, 1. November): *Severity Ratings for Usability Problems*. Nielsen Norman Group. [Originalseite](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/). Skala 0–4, drei Einflussaspekte und Warnung vor Einzelratings gelesen.
- **[Q3]** W3C (2024, 12. Dezember): *Web Content Accessibility Guidelines (WCAG) 2.2*, W3C Recommendation. [Vom Auftrag benannte aktuelle Adresse](https://www.w3.org/TR/WCAG22/), [fixierte Fassung](https://www.w3.org/TR/2024/REC-WCAG22-20241212/). Versionskopf und die ausgewählten normativen Kriterien/Level geprüft; keine Aussage, sämtliche Kriterien des Standards in der Anwendung geprüft zu haben.
- **[Q4]** Lewis, Clayton; Rieman, John (Copyrightangabe 1993, 1994): *Task-Centered User Interface Design: A Practical Introduction*, Kapitel 4, insbesondere 4.1.2–4.1.3. [Universitärer HTML-Mirror des Originalautorentexts](https://cspages.ucalgary.ca/~tam/2001/hci_topics/papers/LewisRiemanBook/chap-4.html). Voraussetzungen, vier Fragen und ausdrückliche Abgrenzung zu realen Nutzertests gelesen. Kein separates genaueres Publikationsdatum aus der Copyrightzeile abgeleitet.
- **[Q5]** Wharton, Cathleen; Rieman, John; Lewis, Clayton; Polson, Peter (o. J.): *The Cognitive Walkthrough Method: A Practitioner's Guide*, technischer Bericht CU-ICS-93-07, University of Colorado. [Universitäts-PDF](https://www.colorado.edu/ics/sites/default/files/attached-files/93-07.pdf). Ergänzende Originalquelle; bibliografische Angaben aus Titel-/indexiertem Berichtstext, kein verifiziertes exaktes Berichtsdatum. Der PDF-Abruf war möglich, die strukturierte Volltextextraktion lieferte hier keine lesbaren Zeilen. Die verwendeten Methodenschritte wurden deshalb zusätzlich im lesbaren Originalautorentext [Q4] verifiziert; kein pauschal vollständig gelesener Verlagsvolltext behauptet.
- **[Q6]** W3C WAI, *Understanding SC 1.4.3: Contrast (Minimum)*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Grenzwerte, Großtext und Ausnahmen geprüft.
- **[Q7]** W3C WAI, *Understanding SC 1.4.11: Non-text Contrast*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **[Q8]** W3C WAI, *Understanding SC 1.4.10: Reflow*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). CSS-Breite, Zoombezug und Ausnahmen geprüft.
- **[Q9]** W3C WAI, *Understanding SC 2.5.8: Target Size (Minimum)*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Mindestgröße und Ausnahmen geprüft.
- **[Q10]** W3C WAI, *Understanding SC 2.4.7: Focus Visible*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).
- **[Q11]** W3C WAI, *Understanding SC 2.4.11: Focus Not Obscured (Minimum)*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- **[Q12]** W3C WAI, *Understanding SC 4.1.3: Status Messages*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- **[Q13]** W3C WAI, *Understanding SC 3.3.8: Accessible Authentication (Minimum)*: [offizielle Erläuterung](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html). Login-Geltungsbereich und unterstützende Mechanismen geprüft.

Bei späterer Erhebung Änderungen an Quellfassungen dokumentieren; die fixierte WCAG-Fassung nicht stillschweigend ersetzen. Weitere Bibliografieangaben zum 1992er Walkthrough-Verlagsartikel werden hier nicht für ungelesene Inhalte ausgegeben.

## 10. Vollständigkeitskontrolle und Vorbereitungsdauer

Durchgeführte Planprüfung vor Commit: exakter Ausgangscommit und sauberer Start; zehn Heuristiken plus Severity/Statusregeln; acht Aufgaben mit Start, insgesamt 60 vorab definierten Aktionen, Sollende und Integrität; vier getrennte Fragen je Aktion; 31 ausgewählte WCAG-2.2-Checks mit manuellen/automatisierbaren Anteilen; Nachweis-/Git-/CSV-Vertrag; Beobachtung/Korrektur getrennt; Single-Evaluator-Grenzen und verifizierte Quellen. Fachlicher Dokumentreview und Parserprüfung abgeschlossen: CSV mit genau einer Headerzeile, 59 eindeutigen Spalten, UTF-8-BOM, LF und **null Ergebniszeilen**. Git-Whitespaceprüfung sauber; ausschließlich die beiden vorgesehenen Dokumentdateien ergänzt. Dies sind **Dokumentprüfungen, keine Ergebnisse der Anwendungsevaluation**. Keine App-/Browser-/Accessibility-Tests wurden in dieser Phase gestartet.

Separat gemessene Vorbereitung am **05.11.2026, 12:49:23–13:14:15 UTC / 13:49:23–14:14:15 Europe/Berlin**: tatsächlich **24 Minuten 52 Sekunden = 1.492 Sekunden**. Sie umfasst Git-Vorbereitung, Quellenprüfung, Plan/CSV und fachlichen Dokumentreview einschließlich parallel bearbeiteter Quellen-/Methodikfragen und Wartezeit; Agentenzeiten werden nicht addiert. Commit/Push/Draft-PR sind anschließende Veröffentlichung; frühere Implementierungszeiten werden nicht zugerechnet. Diese Vorbereitungszeit ist keine Zeit eines Usability-Durchlaufs.

Offen für die spätere Durchführung: funktionierende Emulatorumgebung, tatsächliche Browser-/Assistenztechnik-/Toolversionen, erzeugtes Setupmanifest, abgeglichene Excel-Zielspalten und die vollständige manuelle Inspektion durch die Entwicklerin. Es gibt bisher keine Evaluationsbefunde, Ergebniszeilen oder vorgenommenen Korrekturen.
