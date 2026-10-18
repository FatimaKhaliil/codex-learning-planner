import { firebaseApp } from './lib/firebase'

export default function App() {
  return (
    <div className="page">
      <header className="header">
        <a className="brand" href="#start" aria-label="Lernplaner – Startseite">
          <span className="brand-icon" aria-hidden="true">L</span>
          Lernplaner
        </a>
        <span className="stage">Schritt 01 · Projektgrundlage</span>
      </header>
      <main id="start">
        <section className="welcome" aria-labelledby="title">
          <p className="eyebrow">Raum für deinen Lernfortschritt</p>
          <h1 id="title">Lernplaner</h1>
          <p className="intro">Große Ziele beginnen mit einem klaren Plan.
            Hier entsteht dein persönlicher Ort für organisiertes Lernen.</p>
          <div className="status"><span aria-hidden="true" />Die technische Grundlage steht.</div>
        </section>
        <aside className="note" aria-labelledby="note-title">
          <span className="note-number" aria-hidden="true">01</span>
          <h2 id="note-title">Ein Anfang mit Struktur</h2>
          <p>Die erste Version schafft die Basis für die nächsten Entwicklungsschritte.</p>
          <p className="config-status">{firebaseApp
            ? 'Firebase-App ist lokal initialisiert.'
            : 'Firebase-Konfiguration noch nicht hinterlegt.'}</p>
        </aside>
      </main>
      <footer>Lernplaner · Ein Entwicklungsprojekt im Rahmen einer Bachelorarbeit</footer>
    </div>
  )
}
