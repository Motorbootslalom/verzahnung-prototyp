# Verzahnung – Schlauchbootslalom (Prototyp)

Interaktiver Konzept-**Prototyp** zur **Verzahnung von Startern** beim Schlauchbootslalom.
Ziel: mit den Fachteams klären, ob Darstellung und Verwaltung der Starterlisten hilfreich sind
und in das neue Auswertungstool übernommen werden sollen.

Es werden **zufällige Teilnehmer** generiert – keine echten personenbezogenen Daten.
Alle Daten liegen ausschließlich **lokal im Browser** (localStorage) und überleben ein Reload.

## Funktionen

- **Setup:** Anzahl Teilnehmer pro Klasse, Veranstaltungsjahr und Herkunfts-Modus wählen.
- **Zufallsgenerierung:** Vorname, Nachname, Geburtsdatum (gültiger Jahrgang zur Klasse),
  Verein **oder** Bundesland, Startnummer nach Klassen-Präfix (`E01`, `101`, `301`, …).
- **Teilnehmerverwaltung:** pro Klasse generieren, manuell hinzufügen, einzeln entfernen, Klasse leeren.
- **Verzahnung:** mehrere Parcours, je Parcours zugeordnete Klassen und Wechsel-Faktor **1–4**.
  Klassen werden nach Starterzahl gleichmäßig auf Spuren verteilt, sodass möglichst immer ein
  Boots-Wechsel stattfindet. Per **Drag&Drop** lassen sich Klassen zwischen und innerhalb der Spuren
  verschieben, um das Timing zu ändern.
- **Pausen (Versatz):** In jede Spur lassen sich Pausen-Blöcke einfügen (**+ Pause**), frei per
  Drag&Drop vor oder zwischen Klassen platzierbar und in der Länge einstellbar. Eine Pause lässt die
  Spur die angegebene Anzahl Starts aussetzen – die nachfolgende Klasse setzt entsprechend später ein
  (kein Leerstart / keine Leerzeile in der Startliste). So verhindert man z. B., dass eine Klasse
  direkt nach einer anderen startet, oder dass sich am Ende alles einer Klasse staut.

### Klassen & Altersberechnung

Altersklasse = Veranstaltungsjahr − Geburtsjahr (jahrgangsbezogen). Die Geburtsjahrgänge werden
immer aus dem eingestellten Veranstaltungsjahr berechnet.

| Klasse | Alter  | Klasse | Alter   |
| ------ | ------ | ------ | ------- |
| E      | 6–7    | 4      | 14–15   |
| 1      | 8–9    | 5      | 16–18   |
| 2      | 10–11  | 6      | 19–21   |
| 3      | 12–13  | 7      | 22–27   |

### Wechsel-Faktor

- **1er:** keine Verzahnung – Klassen laufen in Blöcken nacheinander.
- **2er:** zwei Spuren im Wechsel `A,B,A,B …` (z. B. `3,1,3,1,3,2,3,2 …`).
- **3er:** drei Spuren `A,B,C,A,B,C …`.
- **4er:** vier Spuren `A,B,C,D …`.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

## Tests

Die Kernlogik (Altersberechnung, Teilnehmer-Generierung, Verzahnung inkl. Pausen) und ein
UI-Render-Smoke-Test sind mit **Vitest** abgedeckt.

```bash
npm test         # alle Tests einmal ausführen
npm run test:watch  # Watch-Modus während der Entwicklung
npm run check    # Typecheck (tsc) + Tests – wird auch im pre-commit-Hook ausgeführt
```

Die Tests laufen automatisch:

- **Lokal bei jedem Commit** über einen Git-Hook (`.githooks/pre-commit`). Er wird durch
  `npm install` aktiviert (`prepare`-Script setzt `core.hooksPath`). Falls nötig manuell:
  `git config core.hooksPath .githooks`. Umgehen im Notfall: `git commit --no-verify`.
- **In der CI** bei jedem Push/PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) und
  vor jedem Pages-Deploy.

## Deployment auf GitHub Pages

1. Repository auf GitHub anlegen und pushen.
2. In **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** stellen.
3. Bei jedem Push auf `main` baut und deployt der Workflow
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) automatisch.

Der Vite-`base` ist auf `./` gesetzt, daher funktioniert die App sowohl unter einem
Projekt-Unterpfad (`https://<user>.github.io/<repo>/`) als auch lokal.

## Tech-Stack

React 19 · TypeScript · Vite · @dnd-kit (Drag&Drop). Persistenz via localStorage.
