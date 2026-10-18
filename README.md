# Lernplaner

Eine mit OpenAI Codex entwickelte React-Web-App im Rahmen einer evaluativen Bachelorarbeit.
Aufgabe 01 legt ausschließlich die technische Grundlage mit TypeScript, Vite und dem modularen Firebase SDK an.

## Voraussetzungen und Installation

Node.js ab 22.12 (empfohlen: aktuelle LTS-Version) und npm.

```bash
npm ci
cp .env.example .env.local
```

In `.env.local` alle sechs Platzhalter durch die Web-App-Konfiguration aus der
Firebase Console unter **Projekteinstellungen → Allgemein → Deine Apps** ersetzen.
Die Variablen stehen in `.env.example`. `.env.local` wird durch `.gitignore` ausgeschlossen.
Nach Änderungen an Umgebungsvariablen den Entwicklungsserver neu starten.

Vite stellt `VITE_*`-Werte im Browser bereit. Hier nur Firebase-Web-Konfiguration
verwenden, niemals Service-Account-Schlüssel oder andere private Zugangsdaten.
Firebase Security Rules und weitere Dienste sind noch nicht Teil dieser Aufgabe.

## Lokal starten

```bash
npm run dev
```

Die im Terminal angezeigte URL öffnen (standardmäßig `http://localhost:5173`).
Die Startseite funktioniert auch ohne `.env.local`. In diesem Fall wird Firebase
nicht initialisiert und ein entsprechender Hinweis angezeigt. Sind alle sechs Werte
gesetzt, initialisiert `src/lib/firebase.ts` die Standard-App und verwendet eine
bereits vorhandene Instanz bei Hot Module Replacement erneut. Das Vorhandensein
der Werte bestätigt keine Verbindung oder Gültigkeit der Firebase-Konfiguration.

## TypeScript und Produktionsbuild

```bash
npm run typecheck
npm run build
npm run preview
```

`typecheck` prüft ohne Dateiausgabe. `build` führt zuerst dieselbe Prüfung aus
und erstellt anschließend den Vite-Build in `dist/`. `preview` zeigt den fertigen
Build lokal (standardmäßig `http://localhost:4173`); es ist kein Produktionsserver.

## Projektstruktur

- `src/App.tsx`: einfache responsive Startseite „Lernplaner“.
- `src/styles.css`: Layout und mobile Darstellung.
- `src/lib/firebase.ts`: ausschließlich Firebase-App-Initialisierung.
- `.env.example`: Konfigurationsvorlage ohne echte Projektdaten.
- `docs/aufgabe-01.md`: Ergebnisbericht, Befehle und Prüfergebnisse.

Keine Authentifizierung, Firestore-Operationen oder Aufgabenverwaltung implementiert.
Es wurde kein Code aus Figma Make übernommen. Es gibt in diesem Schritt keine
Unit- oder End-to-End-Tests; Build und Typprüfung sind separat dokumentiert.
