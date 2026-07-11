# Verzahnung – Schlauchbootslalom (Prototyp)

**Live-Demo:** <https://motorbootslalom.github.io/verzahnung-prototyp/>

Interaktiver Konzept-**Prototyp** zur **Verzahnung von Startern** beim Schlauchbootslalom.
Ziel: mit den Fachteams klären, ob Darstellung und Verwaltung der Starterlisten hilfreich sind
und in das neue Auswertungstool übernommen werden sollen.

Es werden **zufällige Teilnehmer** generiert – keine echten personenbezogenen Daten.
Alle Daten liegen ausschließlich **lokal im Browser** (localStorage) und überleben ein Reload.

> **Fachliche Anforderungen** für das Entwicklerteam: siehe [LASTENHEFT.md](LASTENHEFT.md)
> (Verzahnung beider Disziplinen, Parallel-Slalom-Regeln, Boote, Export).

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
- **Boote & Bootbedarf:** Klassen E–3 fahren mit **kleinem**, 4–7 mit **großem** Boot; Klasse 4 kann
  per Umschalter ausnahmsweise klein fahren. Die vorhandenen Boote (klein/groß) sind einstellbar. Je
  Spur wird ein Boot benötigt; ein Boot darf erst nach **1 Starter Puffer** die Spur wechseln. Die
  automatische Verzahnung **hält den Bootbestand ein** – reichen die Boote nicht, wird die Anordnung
  entsprechend reduziert (weniger parallele Spuren). Oberhalb der Parcours zeigt ein Hinweis den
  aktuellen Bedarf und – falls dadurch nur eine schlechtere Verzahnung möglich ist – wie viele
  Zusatzboote die optimale ermöglichen würden. Parcours laufen parallel, der Bedarf addiert sich.
- **Parallel-Slalom:** Eigener Tab für die zweite Disziplin. Zwei parallele Parcours (A/B); je
  Lauf fahren zwei Starter **gleichen Bootstyps** gegeneinander auf Zeit. Die Klasse bestimmt nur
  den Bootstyp und zählt fürs Ergebnis – ansonsten kann z. B. Klasse E gegen Klasse 3 fahren (beide
  kleines Boot), nicht aber 2 gegen 4 (unterschiedliche Boote). Paare entstehen in Startreihenfolge
  innerhalb eines Bootstyps; jedes Paar fährt **zweimal** (2. Lauf mit getauschten Parcours). Die
  **Verzahnung wechselt den Bootstyp ab**: ein voller Block umfasst 4 Starter (klein-Paar Lauf 1,
  groß-Paar Lauf 1, klein-Paar Lauf 2, groß-Paar Lauf 2) und ist durch eine **farbige Linie**
  abgetrennt. Sobald ein Bootstyp aufgebraucht ist, ist keine Bootstyp-übergreifende Verzahnung mehr
  möglich – die übrigen Paare laufen dann als **2er-Blöcke** (Paar komplett: Lauf 1, Lauf 2). Bei
  **ungerader Anzahl** je Bootstyp wird ein **Dummy** (außer Wertung) eingesetzt. Eine Checkbox
  schaltet den **internationalen Modus** (Standard an): Klassen 6–7 werden ignoriert und Klasse E
  heißt **„Dolphin"**.
- **Export zur Optimierung:** In der Verzahnungs-Ansicht klappt eine Box („Für Optimierung
  exportieren“) die aktuelle Verzahnung als kompakten Text auf – Klassenverteilung, Spur-Aufteilung,
  Startreihenfolge, Startnummern je Klasse und eine Diagnose (Wechsel / un-verzahnter End-Block).
  Damit lassen sich verschiedene Sortierungen zur Bewertung weitergeben.
- **Konfigurations-Link:** „🔗 Konfig-Link kopieren“ erzeugt eine teilbare URL mit
  Klassenverteilung, Parcours und Wechsel-Faktoren (siehe unten).

### Konfiguration per URL-Parameter

Klassenverteilung, Parcours-Anzahl und Faktoren lassen sich direkt über die URL übergeben oder als
Link speichern. Beim Öffnen wird das Starterfeld anhand der Verteilung neu erzeugt und die Parameter
werden aus der Adresszeile entfernt (ein Reload würfelt also nicht erneut).

| Parameter | Bedeutung | Beispiel |
| --------- | --------- | -------- |
| `counts`  | Starter je Klasse in Reihenfolge `E,1,2,3,4,5,6,7`, punktgetrennt | `6.8.7.9.0.0.0.0` |
| `p`       | Parcours (per `_` getrennt): `<Klassen>*<Faktor>` und optional `*<Layout>` | `E123*2*3.E.1-2` |
| `boats`   | Vorhandene Boote `klein.gross` | `4.2` |
| `c4`      | `1`, wenn Klasse 4 mit kleinem Boot fährt | `1` |
| `event`   | Veranstaltungsname (optional) | `Testcup` |
| `jahr`    | Veranstaltungsjahr (optional) | `2026` |
| `origin`  | `verein` oder `bundesland` (optional) | `verein` |

**Layout** (dritter, optionaler Teil eines Parcours) hält die manuelle Anordnung fest: Spuren werden
per `-` getrennt, Elemente je Spur per `.`. Eine Klasse steht als ihre ID, eine Pause als `q<Länge>`.
Ohne Layout wird automatisch verteilt.

Beispiel: `?counts=1.4.8.9.6.10.7.11&p=E1234567*2*3.E.1.2.6-4.5.7&event=Testcup&jahr=2026&origin=verein`
(Faktor 2 · Spur A: `3,E,1,2,6` · Spur B: `4,5,7`)

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
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) automatisch nach
   <https://motorbootslalom.github.io/verzahnung-prototyp/>.

Der Vite-`base` ist auf `./` gesetzt, daher funktioniert die App sowohl unter einem
Projekt-Unterpfad (`https://<user>.github.io/<repo>/`) als auch lokal.

## Tech-Stack

React 19 · TypeScript · Vite · @dnd-kit (Drag&Drop). Persistenz via localStorage.
