# Abschließende visuelle Prüfung – Aufgabe 01

Prüfzeitpunkt: 18.10.2026, 14:18:29 CEST.
Geprüfter Anwendungsstand: `2d9bba43123b470a2acaa65b19c7139095902507`.
Branch: `feat/aufgabe-01-projektgrundlage`.
Browser: Chromium 151.0.7922.173, headless über Python Playwright.

## Durchführung

1. Branch und Arbeitsbaum geprüft: richtiger Branch, vor Beginn sauber. Keine AGENTS.md im Repository vorhanden.
2. Bestehende Laufzeitvorgaben und verfügbare Browserwerkzeuge geprüft. Python Playwright und Chromium waren bereits installiert; keine neuen Abhängigkeiten installiert.
3. Anwendung mit `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort` gestartet. Port 5174 wurde verwendet, da aus dem früheren Durchlauf noch ein Entwicklungsserver auf 5173 lief. Vite war nach 279 ms bereit.
4. Chromium mit `/usr/bin/chromium`, `headless=True`, 15 s Start-Timeout und den Argumenten `--no-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`, `--no-zygote` gestartet. Start und Browserzugriff waren erfolgreich. Der frühere Chromium-Hänger ist damit eine historische Einschränkung des ersten Durchlaufs; die Ursache dieses Hängers ist nicht abschließend geklärt.
5. Zunächst Desktop-Probe durchgeführt, danach sechs getrennte Browserkontexte mit den unten genannten Viewports. Mobile-Fälle mit Touch- und Mobile-Emulation; Gerätepixelfaktor jeweils 1. Seite mit `wait_until='networkidle'` geöffnet, sichtbare Überschrift und geladene Schriften abgewartet.
6. Vollständige Seitenscreenshots erstellt und alle sechs Bilder visuell betrachtet. Zusätzlich Seitenbreite, Scrollbreite, CSS-Layout, außerhalb des Viewports liegende Elemente, JavaScript-Fehler und Browserkonsole erfasst.
7. Den einzigen Konsolenfehler in einem zusätzlichen Desktop-Browserlauf untersucht: Ressourcenadresse `/favicon.ico`, HTTP 404 durch gesonderten HTTP-Aufruf bestätigt.

Der temporäre Prüfcode wurde unter `work/visual-check.py` angelegt und mit
`python3 work/visual-check.py` ausgeführt; Probe und zusätzliche Konsolendiagnose
über Python-Heredocs. `work/` bleibt ignoriert. Die Belege liegen unter
`docs/visual/aufgabe-01/`. Es wurden keine Browser- oder Projektpakete installiert.

## Tatsächliche Ergebnisse

Alle sechs Seitenaufrufe lieferten HTTP 200. Titel und sichtbare Hauptüberschrift
waren jeweils „Lernplaner“. Gemessene Breiten in CSS-Pixeln:

| Fall | Viewport | clientWidth / scrollWidth | Horizontaler Überlauf | Visueller Befund |
| --- | --- | --- | --- | --- |
| Desktop | 1440 × 900 | 1440 / 1440 | Nein | Zweispaltiges Layout, Titel, Infokarte und Footer vollständig sichtbar. |
| Tablet | 768 × 1024 | 768 / 768 | Nein | Zweispaltig, schmalere Karte mit sauberen Textumbrüchen. |
| Oberhalb des Breakpoints | 701 × 900 | 701 / 701 | Nein | Zweispaltig; Karte und Haupttext überlappen nicht. |
| Am Breakpoint | 700 × 900 | 700 / 700 | Nein | Header und Hauptbereich wechseln korrekt in die vertikale Darstellung. |
| Mobile | 390 × 844 | 390 / 390 | Nein | Einspaltig, gut lesbar; unterer Seitenbereich durch normales vertikales Scrollen erreichbar. |
| Kleines Mobile | 320 × 812 | 320 / 320 | Nein | Titel, Texte, Karte und Footer bleiben innerhalb der Breite; Umbrüche ohne Abschneiden. |

In allen sechs Fällen lagen auch keine gemessenen Elementbegrenzungen mehr als
1 CSS-Pixel außerhalb des horizontalen Viewports. Keine JavaScript-Ausnahmen
(`pageerror`) und keine fehlgeschlagenen Netzwerkanfragen auf Transportebene.
Ein HTTP-Fehler zählt bei Playwright nicht als `requestfailed`; der folgende
404-Befund wird deshalb separat ausgewiesen.

Bei der visuellen Betrachtung waren keine abgeschnittenen Inhalte, Überlappungen,
unleserlichen Texte oder sonstigen sichtbaren Layoutfehler erkennbar. Der Hinweis
„Firebase-Konfiguration noch nicht hinterlegt.“ wird erwartungsgemäß angezeigt.
Keine echten Firebase-Werte für diese Prüfung angelegt.

### Offener technischer Befund

Beim ersten Seitenaufruf fragt Chromium automatisch `/favicon.ico` an. Diese
Ressource fehlt und liefert HTTP 404; dadurch erscheint ein Fehler in der
Browserkonsole. Die Inhalte der Startseite sind dadurch nicht beeinträchtigt,
ein eigenes Tab-Symbol fehlt. Der Befund wurde ausschließlich dokumentiert;
kein Favicon und keine neue Funktion hinzugefügt.

## Belege

- [Desktop](visual/aufgabe-01/desktop.png)
- [Tablet](visual/aufgabe-01/tablet.png)
- [701 px](visual/aufgabe-01/breakpoint-wide.png)
- [700 px](visual/aufgabe-01/breakpoint-narrow.png)
- [Mobile 390 px](visual/aufgabe-01/mobile.png)
- [Mobile 320 px](visual/aufgabe-01/mobile-small.png)
- [Messwerte aller sechs Fälle](visual/aufgabe-01/results.json)
- [Konsolendiagnose und Favicon-Status](visual/aufgabe-01/console-diagnosis.json)

## Umfang und Grenzen

Dies war eine echte Browserprüfung mit gerenderten Screenshots und DOM-Messungen,
keine reine Quelltextprüfung. Mobile wurde in Chromium emuliert, nicht auf einem
physischen Smartphone geprüft. Keine Prüfung in Firefox, Safari oder auf iOS,
keine vollständige Barrierefreiheitsprüfung, keine Firebase-Verbindungsprüfung.
Breiten unter 320 px wurden nicht geprüft; die vorhandene CSS-Mindestbreite beträgt
320 px. Der Test betrifft den lokalen Entwicklungsserver, nicht ein Deployment.

Build und TypeScript-Prüfung wurden bei diesem reinen Prüfschritt nicht erneut
ausgeführt; ihre früheren Ergebnisse stehen im [ursprünglichen Bericht](aufgabe-01.md).
Es wurden ausschließlich Prüfdokumentation und Belege ergänzt. Keine Änderungen
an Anwendungsquellen, Konfiguration oder Abhängigkeiten. Kein Merge durchgeführt.
