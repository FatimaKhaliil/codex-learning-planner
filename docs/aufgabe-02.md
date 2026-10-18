# Aufgabe 02 – Firebase Authentication

## Bearbeitungsdauer

Datum: 18.10.2026. Beginn: 15:03:25 CEST.
Technische Bearbeitung und Dokumentation bis 15:20:14 CEST:
**16 Minuten 49 Sekunden verstrichene Zeit**. Parallele Prüfungen sind darin
enthalten, nicht als zusätzliche Arbeitszeit addiert. Die anschließende GitHub-Übergabe
ist in diesem Zwischen-Endzeitpunkt noch nicht enthalten.

## Auftrag und Ausgangspunkt

Repository: `FatimaKhaliil/codex-learning-planner`.
Basis: `origin/main` bei `d223d43` (Merge der abgeschlossenen Aufgabe 01).
Arbeitsbranch: `feat/aufgabe-02-firebase-auth`. Kein Merge im Rahmen dieser Aufgabe.
Vor Beginn war der Arbeitsbaum sauber; keine AGENTS.md im Repository oder den
geprüften übergeordneten Verzeichnissen vorhanden.

## Umgesetztes Verhalten

- Registrierung über `createUserWithEmailAndPassword`, Anmeldung über
  `signInWithEmailAndPassword`, Abmeldung über `signOut` aus `firebase/auth`.
- Passwort-Zurücksetzen über `sendPasswordResetEmail` mit deutscher Firebase-Sprache.
  Der eigentliche Reset erfolgt über den standardmäßigen Firebase-E-Mail-Link;
  kein eigener Passwort-Link-Handler implementiert.
- `AuthProvider` verwaltet Benutzer ausschließlich durch `onAuthStateChanged`.
  Initialer Ladezustand verhindert die Anzeige geschützter Inhalte vor der
  Statusauflösung; Subscription wird beim Unmount beendet. Observer-Fehler sperren
  den geschützten Bereich ebenfalls.
- Hash-Navigation zu Anmeldung, Registrierung, Reset und geschütztem Dashboard.
  Erfolgreiche Registrierung/Anmeldung führt ins Dashboard; Abmeldung zum Login.
  Dashboard zeigt ausschließlich den tatsächlichen Firebase-Benutzer, keine
  erfundenen Lernaufgaben, Kennzahlen oder Namen aus dem Design.
- Pflichtfelder, E-Mail-Format, mindestens sechs Zeichen bei Registrierung und
  exakte Passwortbestätigung; bestehende Login-Passwörter erhalten keine neue
  Mindestlängenregel. Passwörter werden nicht getrimmt.
- Verknüpfte Feldfehler, Fokus auf dem ersten Fehler, Ladezustände, deaktivierte
  Aktionen während Requests, Passwortsichtbarkeit und sichere deutsche Fehlertexte.
  Unbekanntes Konto und falsches Passwort haben dieselbe Login-Fehlermeldung.
  Reset antwortet für bekannte/unbekannte Adressen neutral.
- Fehlende/Platzhalter-Konfiguration verursacht keinen Absturz und keinen Demo-Login.
  Für Auth genügen API-Key, Auth-Domain, Projekt-ID und App-ID; Storage und Messaging
  sind optional. Eine gefüllte Konfiguration allein bestätigt noch keine Verbindung.
- Optionaler Auth-Emulator nur im DEV-Modus, mit lokaler Adresse und ohne eingebettete
  echte Zugangsdaten. Bestehendes modulares Firebase SDK unverändert beibehalten.

Keine Firestore-Operationen oder Aufgabenverwaltung hinzugefügt. Keine Passwörter
oder Service-Account-Schlüssel eingecheckt. Keine Produktivbenutzer angelegt.

## Figma und responsive Gestaltung

[Figma-Referenz](https://www.figma.com/design/I1M2Vz1vC3uDl0KWkyRyzF/Untitled?node-id=0-1)
war zugänglich. Der erste Design-Context-Aufruf auf Canvas `0:1` meldete zunächst
„nothing selected“. Die Metadaten lieferten die darunterliegenden Frames;
anschließend wurden deren Designkontext und Screenshots erfolgreich gelesen.

Verwendete Hauptreferenzen:

| Ansicht | Desktop | Mobile |
| --- | --- | --- |
| Anmeldung | `32:36318` | `32:36366` |
| Registrierung | `32:37010` | `32:37058` |
| Passwort-Reset | `49:42` | `49:92` |
| Dashboard-Grundlayout | `32:35294` | `32:35390` |

Übernommen wurden visuelle Vorgaben wie Grün-/Mint-Farben, Inter-Schrift,
Formularabmessungen, Abstände, Karten und das Desktop-/Mobile-Grundlayout.
Anwendungslogik und Komponenten wurden eigenständig in React/TypeScript und CSS
implementiert. Kein Figma Make verwendet und kein Figma-Make-Code übernommen.
Die statischen Designtexte „LEER“ und „Kein Backend verbunden“ wurden nicht als
Produktbehauptung übernommen. Aufgaben, Kalender, Musterbenutzer und Fortschrittswerte
wurden entsprechend dem Aufgabenumfang weggelassen. Kleine Hinweis-/Platzhaltertexte
wurden für besseren Kontrast gegenüber der Vorlage abgedunkelt.

Direkte SVG-Downloads aus Figma scheiterten in der Umgebung mit HTTP 403.
Die benötigten einzelnen Grafiken wurden deshalb über die Figma-MCP-Schnittstelle
als PNG exportiert und lokal in `public/assets` gespeichert. Keine temporären
Figma-Asset-URLs zur Laufzeit. Die Kreisexporte enthalten den im Originalframe
sichtbaren zugeschnittenen Bereich (270 × 360 bzw. 200 × 150); diese Abmessungen
bleiben erhalten. Keine vollständigen Design-Screenshots als App-Oberfläche verwendet.
`@fontsource/inter` wurde als einzige neue App-Abhängigkeit für lokale Schriften ergänzt.

## Dateien

| Datei / Bereich | Änderung |
| --- | --- |
| `src/auth/AuthProvider.tsx` | Auth-Kontext, echte SDK-Aktionen, Observer-Lifecycle |
| `src/auth/firebaseAuth.ts` | Auth-Initialisierung, Sprache, begrenzte DEV-Emulator-Anbindung |
| `src/auth/validation.ts`, `errors.ts` | Formularregeln und deutsche Fehlerzuordnung |
| `src/lib/firebase.ts` | Konfigurationsprüfung und abgefangene Initialisierungsfehler |
| `src/App.tsx` | Formulare, Hash-Navigation, geschütztes Dashboard |
| `src/styles.css`, `src/main.tsx` | Responsive Figma-orientierte Gestaltung, lokale Inter-Schrift |
| `src/vite-env.d.ts`, `.env.example` | Optionaler Emulator-Wert; keine echten Projektdaten |
| `public/assets/*.png` | Sieben lokale Figma-Grafikexporte |
| `firebase.json` | Ausschließlich lokale Auth-Emulator-Konfiguration |
| `tests/auth-core.test.ts` | Acht Unit-Tests für Validierung und Fehlertexte |
| `tests/auth-emulator.mjs` | Zwölf echte SDK-Prüfschritte gegen den lokalen Emulator |
| `tests/browser-auth.py` | Ausführbarer optionaler Playwright-Prüflauf |
| `package.json`, `package-lock.json` | Lokale Schrift, Unit-/Integrationstest-Skripte |
| `README.md` | Firebase-Einrichtung, Betrieb, Tests und bekannte Warnungen |
| `docs/aufgabe-02.md`, `docs/visual/aufgabe-02/` | Dieser Bericht und tatsächliche Prüfbelege |

## Ausgeführte Befehle

Alle Befehle ab Repository-Verzeichnis, sofern nicht anders angegeben. Dateien
wurden mit Shell-Heredocs und gezielten Python-Textänderungen erstellt/bearbeitet;
der Git-Diff zeigt die vollständigen Änderungen.

1. `date -u`, `git status --short`, `git branch -vv`, `git remote -v`,
   `rg --files --hidden …`, Prüfung auf AGENTS.md; Node/npm- und Laufzeitprüfung.
2. `git fetch origin`, `git log -3 --oneline origin/main`,
   `git ls-tree -r --name-only origin/main`.
3. `git switch -c feat/aufgabe-02-firebase-auth origin/main`.
4. Figma `get_design_context`, `get_metadata`, `get_screenshot` auf den genannten
   Canvas-/Frame-IDs; `curl -fLsS --max-time 20 …` für fünf SVGs jeweils HTTP 403;
   anschließend lokale PNG-Exporte über die Figma-Schnittstelle. Dimensionen/Dateigrößen geprüft.
5. `npm install --cache /workspace/.npm-cache @fontsource/inter`: Exit 0, ein Paket ergänzt.
6. `npm audit --json --cache /workspace/.npm-cache`,
   `npm audit --omit=dev --json --cache /workspace/.npm-cache`,
   `npm explain @grpc/grpc-js --json`, `npm ls … --all --json`,
   `npm outdated --json --cache /workspace/.npm-cache` (Ergebnisse unten).
7. Auth-Emulator-Werkzeug ausschließlich temporär installiert:
   `npm install --prefix work/aufgabe-02/emulator --no-save --package-lock=false --cache /workspace/.npm-cache firebase-tools`.
   Exit 0, CLI 15.34.0, 618 temporäre Pakete in 60 s; keine App-Abhängigkeit.
8. Ab `work/aufgabe-02/emulator/`:
   `XDG_CONFIG_HOME=…/work/aufgabe-02/emulator/config ./node_modules/.bin/firebase emulators:start --only auth --project demo-learning-planner --config firebase.json --non-interactive`.
   Logs ausschließlich ignoriert gespeichert; Auth auf `127.0.0.1:9099`, UI aus.
   Äquivalenter reproduzierbarer Start aus dem Repository steht in der README.
9. `node work/aufgabe-02/emulator/sdk-auth-test.mjs`: zwölf Prüfschritte erfolgreich;
   identisches versioniertes Skript anschließend mit `npm run test:auth:integration`
   erneut ausgeführt: Exit 0, zwölf Prüfschritte erfolgreich.
10. `node --experimental-strip-types --test --test-isolation=none tests/auth-core.test.ts`
    und danach `npm test`: Exit 0, acht Unit-Tests erfolgreich.
11. Emulator-UI-Server mit den ausschließlich lokalen Konfigurationsplatzhaltern
    aus der README gestartet: `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.
    Zusätzlich normaler Server ohne Firebase-Konfiguration auf Port 5176.
12. `python3 work/aufgabe-02/browser-check.py` (identischer Prüfcode jetzt unter
    `tests/browser-auth.py`): letzter vollständiger Lauf Exit 0, 15 Prüfgruppen.
    Zusätzlicher Python-Playwright-Lauf ohne Firebase-Konfiguration und zum Skip-Link:
    Exit 0, zwei Prüfungen. Screenshots mit dem Bildwerkzeug visuell betrachtet.
13. `npm run typecheck`, `npm run build`: nach Änderungen und nach Layoutkorrekturen
    erneut ausgeführt; letzter Stand jeweils Exit 0. Keine erfolgreiche Prüfung
    für einen abgebrochenen Zwischenlauf behauptet.
14. Produktions-Modulgraph über ein temporäres Vite-Skript mit `write:false`
    und `generateBundle` geprüft: `node work/aufgabe-02/inspect-browser-bundle.mjs`.
    Exit 0; finale Audit-Abfrage nach der Schrift-Ergänzung wiederholt.
15. Abschließende Diff-, Abhängigkeits-, Ignore- und Zugangsdatenprüfung sowie
    Commit/Push und Draft-PR-Übergabe: siehe Übergabestatus am Ende.

Netzwerk und lokale Portbindungen benötigten in dieser Umgebung den vorgesehenen
zusätzlichen Netzwerkzugriff. Standard-Sandbox-Aufrufe des Emulator-Starts scheiterten
zunächst mit EPERM. Der CLI-Konfigurationsordner wurde über `XDG_CONFIG_HOME` in den
beschreibbaren Arbeitsbereich gelegt; Proxy und TLS-Prüfung blieben erhalten.

## Tatsächliche Prüfergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 8/8 erfolgreich: Pflichtfelder, E-Mail, Registrierungslänge/Bestätigung, Passwort-Leerzeichen, Reset, sichere bekannte/unbekannte Fehler |
| `npm run test:auth:integration` | 12/12 erfolgreich gegen echten lokalen Auth-Emulator: Registrierung/Duplikat, Login/Logout, Observer, falsches Passwort, Reset-Anforderung, verifizierter Resetcode, Passwortänderung, altes Passwort abgelehnt/neues akzeptiert, Testnutzer gelöscht |
| Browser mit echtem SDK + Emulator | 15/15 Prüfgruppen erfolgreich, darunter echte UI-Registrierung/Login/Logout, geschütztes Dashboard, Reload-Persistenz, tabübergreifende Abmeldung, Duplikat/falsches Passwort, Reset-Aktion im Emulator, neutrale Antwort für unbekannte Adresse und verständlicher Fehler bei simulierter Netzstörung |
| Browser-Zusatzprüfungen | 2/2 erfolgreich: fehlende Konfiguration blockiert Aktionen ohne Absturz/Dashboard-Zugriff; Skip-Link fokussiert den Inhalt ohne Formularwechsel |
| Responsive Ansichten | Login, Registrierung und Reset jeweils bei 1440 × 800, 390 × 844 und 320 × 812: 9/9 ohne horizontalen Überlauf; alle lokalen Bildressourcen geladen |
| Dashboard | Desktop und Mobile visuell betrachtet; bei 390 px kein horizontaler Überlauf; lange generierte Testadresse bricht um |
| JavaScript | Keine unbehandelten `pageerror`-Ausnahmen im vollständigen UI-Prüflauf |
| Typprüfung | `npm run typecheck`: Exit 0 |
| Produktionsbuild | `npm run build`: Exit 0; 35 Module, JS 340,36 kB / gzip 104,29 kB; CSS 8,33 kB / gzip 2,42 kB, zusätzlich lokale Schriftdateien |
| npm-Sicherheitsprüfung | Exit 1 wegen bekannter Warnungen, ausdrücklich nicht als bestanden gewertet; Details unten |

Die Screenshots enthalten gegebenenfalls die vom Firebase SDK eingeblendete rote
Emulator-Warnleiste. Sie gehört zur lokalen Testumgebung und erscheint nicht im
Produktionsmodus. Falsche Zugangsdaten/Duplikate erzeugen erwartete Firebase-HTTP-Fehler;
die simulierte Netzstörung wurde absichtlich per Browser-Request-Abbruch erzeugt.
Diese erwarteten Befunde wurden nicht als unbehandelte App-Ausnahmen gewertet.
Das fehlende `/favicon.ico` aus Aufgabe 01 bleibt außerhalb dieses Funktionsumfangs.

### Belege

- [Desktop-Anmeldung](visual/aufgabe-02/login-desktop.png),
  [Mobile-Anmeldung](visual/aufgabe-02/login-mobile.png),
  [320-px-Anmeldung](visual/aufgabe-02/login-small-mobile.png).
- [Mobile-Registrierung](visual/aufgabe-02/register-mobile.png),
  [Ladezustand](visual/aufgabe-02/registration-loading.png).
- [Reset](visual/aufgabe-02/reset-mobile.png),
  [neutrale Bestätigung](visual/aufgabe-02/reset-confirmation-mobile.png),
  [Netzwerkfehler](visual/aufgabe-02/network-error-mobile.png).
- [Desktop-Dashboard](visual/aufgabe-02/dashboard-desktop.png),
  [Mobile-Dashboard](visual/aufgabe-02/dashboard-mobile.png),
  [fehlende Konfiguration](visual/aufgabe-02/missing-configuration-mobile.png).
- [Browser-Messwerte und Prüfschritte](visual/aufgabe-02/results.json),
  [Zusatzprüfungen](visual/aufgabe-02/configuration-results.json),
  [SDK-Ergebnisse](visual/aufgabe-02/sdk-auth-results.json).

## Aufgetretene Probleme und Korrekturen

- Figma-Canvas ohne Auswahl und blockierte direkte SVG-Downloads: passende
  Child-Frames gelesen und lokale einzelne PNG-Exporte verwendet; siehe oben.
- Unit-Test-Runner zeigte ohne `--test-isolation=none` zunächst nur den Datei-Subtest.
  Mit dieser Option wurden acht tatsächliche Einzelfälle ausgeführt und ausgewiesen.
- Erster Browserlauf scheiterte an einem Timingfehler im Prüfskript: Eingaben
  erfolgten noch vor dem Hash-Ansichtswechsel. Explizites Warten auf die Zielüberschrift
  ergänzte die notwendige Synchronisation; nachfolgender Lauf erfolgreich.
- Mobile Dashboard-Kopfzeile war durch gestreckte implizite Grid-Zeilen zu hoch.
  Mobile Layout auf Flex umgestellt und Sidebar entsprechend der mobilen Referenz
  ausgeblendet. Ein weiterer Zwischenlauf fand doppelte Logout-Buttons durch eine
  CSS-Spezifitätsüberschreibung. Selektoren korrigiert; letzter kompletter Browserlauf
  mit allen 15 Prüfgruppen erfolgreich. Die Fehlerläufe zählen nicht als bestanden.
- Review fand noch navigierbare Markenlinks während laufender Auth-Aktionen.
  Marke ist in den Auth-Ansichten nun statisch; Formularwechsel werden während
  Requests blockiert. Skip-Link fokussiert den Inhalt ohne Hash-Änderung.
- Kleine Hinweis- und Platzhaltertexte wurden für höheren Kontrast abgedunkelt.
  Keine vollständige WCAG-Zertifizierung oder Screenreader-Prüfung behauptet.

## Untersuchung der npm-Sicherheitswarnungen

Vollständiges und produktives Audit meldeten je **vier als high markierte Pakete**:
`@grpc/grpc-js`, `@firebase/firestore`, `@firebase/firestore-compat`, `firebase`.
Die letzten drei Meldungen propagieren denselben transitiven Befund; es sind nicht
vier unabhängige Schwachstellen. Ursache sind zwei Advisories in gRPC 1.9.16:

| Advisory | Schwere laut Audit | Betroffen / behoben |
| --- | --- | --- |
| [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) | high | `<1.13.6` / `>=1.13.6` |
| [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4) | low | `<1.13.6` / `>=1.13.6` |

Pfad: `firebase@13.0.0 → @firebase/firestore@4.18.0 → @grpc/grpc-js@1.9.16`,
zusätzlich über Firestore Compat. Firestore fordert `~1.9.0`; die korrigierte
Version liegt außerhalb dieser Range. `npm explain` bestätigt `dev:false`.
`npm outdated` meldete `{}` (Exit 0). Das Audit schlägt Firebase 9.14.0 mit
`isSemVerMajor:true` vor – ein inkompatibles Downgrade des vorhandenen SDK.

Kein `npm audit fix`, kein `--force`, kein pauschales Override und kein Downgrade
ausgeführt. Die installierte Lücke bleibt bestehen. Die Anwendung importiert nur
Firebase App und Auth. Im gemessenen Produktions-Modulgraph waren **35 Module,
Firestore 0, gRPC 0** enthalten; damit werden diese beiden Pakete im untersuchten
Browserbundle nicht ausgeliefert. Dies ist keine Behebung der npm-Lücke und keine
allgemeine Sicherheitsfreigabe. Vor späterer Firestore-Nutzung erneut bewerten und
auf ein kompatibles Upstream-Update prüfen.

[Audit-Rohbefund](visual/aufgabe-02/npm-audit.json) und
[gemessener Modulgraph](visual/aufgabe-02/final-bundle-module-graph.json).

Die temporäre Firebase-CLI-Installation meldete Deprecated-Warnungen für
`node-domexception@1.0.0`, `json-ptr@3.1.1`, `uuid@9.0.1` und `glob@10.5.0`
(letzteres mit Hinweis auf bekannte Sicherheitslücken). Dieser isolierte Werkzeugbaum
liegt ausschließlich im ignorierten `work/`, nicht in den App-Abhängigkeiten und
nicht im Git-Commit. Er wurde nicht als warnungsfrei bewertet.

## Einschränkungen und offene Punkte

- **Nicht ausgeführt:** Integration gegen ein echtes Firebase-Produktionsprojekt,
  echte Reset-E-Mail-Zustellung, Öffnen eines echten E-Mail-Links sowie Prüfung
  projektindividueller Quoten, Domains, E-Mail-Vorlagen und Passwort-Richtlinien.
  Dafür fehlen echte Projektkonfiguration und eine autorisierte Test-Mailbox.
- Die lokalen Integrationsprüfungen sind echte SDK-Aufrufe gegen den Firebase
  Auth Emulator, keine gemockten Erfolgsmeldungen. Sie ersetzen die oben genannten
  Produktionsprüfungen nicht. Vier temporäre Browser-Testkonten wurden anschließend
  gezielt einzeln gelöscht; keine passenden Konten verblieben, andere Emulatornutzer
  wurden nicht verändert. SDK-Tests löschen ihre eigenen Nutzer bei Erfolg.
- Mobile ist Chromium-Emulation, kein physisches Gerät. Kein Firefox/Safari/iOS-Test,
  keine Prüfung unter 320 px und keine vollständige Barrierefreiheitsprüfung.
- Dashboard-Schutz ist ein UI-Guard. Spätere Datenbank-/Serverzugriffe müssen eigene
  Firebase Security Rules oder serverseitige Tokenprüfung verwenden.
- Keine Aufgabenverwaltung, Firestore, Kalender, Profilbearbeitung, E-Mail-Verifizierung
  oder Deployment in diesem Schritt. Bestehende npm-Warnungen bleiben offen.


## Übergabestatus

`git diff --check` und `npm ls --depth=0`: Exit 0. Ignore-Prüfung bestätigt
`.env.local` und `work/` als ausgeschlossen; keine `.env.local` versioniert.
Zusätzliche unabhängige Prüfung der neuen Quellen, Tests, Dokumentation und
Belege: keine echten Zugangsdaten, festen Demo-Anmeldepasswörter,
Service-Account-Schlüssel oder temporären Figma-Asset-URLs gefunden.
Die App-Dateien verwenden ausschließlich lokale Grafik- und Schriftressourcen.

Der Stand wird auf dem separaten Branch committed und als Draft gegen `main`
zur Prüfung übergeben. Die tatsächlichen GitHub-Links und der Commit stehen
im abschließenden Ergebnisbericht im Chat. Kein Merge oder Deployment.
