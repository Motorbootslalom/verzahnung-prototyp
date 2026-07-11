# Lastenheft – Startlisten & Verzahnung im Schlauchboot-/Motorbootslalom

**Auftraggeber:** Fachbereich Schlauchbootslalom / Motorbootslalom
**Dokumentzweck:** Fachliche Anforderungen an die Startlisten-Erstellung und die
**Verzahnung** der Starter für beide Disziplinen. Dieses Dokument beschreibt das *Was*
(Anforderungen aus Sicht des Sports), nicht das *Wie* (technische Umsetzung).
**Referenz-Umsetzung:** Der in diesem Repository liegende interaktive Prototyp bildet die
Anforderungen bereits funktionsfähig ab und dient dem Entwicklerteam als lebende Spezifikation
(„so soll es sich verhalten"). Bei Widersprüchen zwischen Text und Prototyp gilt der Text; offene
Punkte sind in Kapitel 9 gesammelt.

---

## 1. Ausgangslage und Ziel

Bei Slalom-Veranstaltungen starten die Aktiven nicht klassenweise nacheinander, sondern **verzahnt**:
Die Reihenfolge wird so gemischt, dass zwischen zwei aufeinanderfolgenden Starts möglichst ein
Bootswechsel bzw. eine sinnvolle Pause liegt. Das spart Zeit (Boote/Bahnen werden besser ausgelastet)
und ist für die Aktiven fairer.

Es gibt **zwei Disziplinen** mit **unterschiedlichen Verzahnungs-Regeln**:

1. **Manövrieren** (Einzelstart auf einem Parcours, klassische Verzahnung mehrerer Klassen).
2. **Parallel-Slalom** (zwei Aktive fahren gleichzeitig auf zwei parallelen Parcours gegeneinander
   auf Zeit).

**Ziel** ist ein Werkzeug, das aus einem Starterfeld für beide Disziplinen eine korrekt verzahnte,
druck-/exportfähige Startliste erzeugt und dabei die u. g. Fachregeln automatisch einhält. Das
Werkzeug soll später in das neue **Auswertungstool** integriert werden.

---

## 2. Geltungsbereich / Abgrenzung

- **Enthalten:** Starterfeld verwalten, Klassen/Bootstypen/Altersjahrgänge, Verzahnung beider
  Disziplinen, Ressourcen (Boote), Export/Weitergabe der Startordnung.
- **Nicht Gegenstand dieses Lastenhefts (aber Schnittstellen vorsehen):** Zeitmessung, Ergebnis-/
  Wertungsberechnung, Anmeldeverwaltung, Benutzerverwaltung. Die Startliste ist die Eingangsgröße
  für die spätere Zeitmessung/Wertung.
- Der Prototyp erzeugt **zufällige Testteilnehmer**; das Produktivsystem übernimmt **reale
  Meldedaten**.

---

## 3. Begriffe (Glossar)

| Begriff | Bedeutung |
| --- | --- |
| **Klasse** | Alters-/Leistungsklasse (E, 1–7). Bestimmt Altersjahrgang, Bootstyp und Wertung. |
| **Dolphin** | Internationale Bezeichnung der Klasse **E**. |
| **Bootstyp** | **klein** oder **groß**. Ergibt sich aus der Klasse (siehe 4.2). |
| **Parcours** | Ein Wettkampf-Kurs. Manövrieren: i. d. R. 1–2 Parcours. Parallel-Slalom: genau 2 (A und B). |
| **Spur** | Beim Manövrieren die logische „Bahn" innerhalb eines Parcours, über die verzahnt wird (Anzahl = Wechselfaktor). |
| **Wechselfaktor** | Anzahl der Spuren, die im Manövrieren gegeneinander verzahnt werden (1–4). |
| **Verzahnung** | Das Mischen der Startreihenfolge, sodass Bootswechsel/Pausen entstehen. |
| **Paar** | Beim Parallel-Slalom zwei Starter gleichen Bootstyps, die gegeneinander fahren. |
| **Lauf** | Ein einzelner Start eines Paares (jedes Paar fährt zwei Läufe, siehe 5). |
| **Block** | Zusammengehörige, optisch abgetrennte Gruppe von Starts. |
| **Dummy** | Ersatzstarter außerhalb der Wertung, der bei ungerader Starterzahl ein Paar auffüllt. |
| **Startnummer** | Präfix je Klasse + laufende Nummer, z. B. `E01`, `312`, `405`. |

---

## 4. Grundlagen (für beide Disziplinen)

### 4.1 Klassen und Altersjahrgänge

- Klassen: **E, 1, 2, 3, 4, 5, 6, 7**.
- Die Altersklasse ist **jahrgangsbezogen**: `Altersklasse = Veranstaltungsjahr − Geburtsjahr`.
  Die zulässigen Geburtsjahrgänge werden immer aus dem eingestellten Veranstaltungsjahr berechnet.

| Klasse | Alter | Klasse | Alter |
| --- | --- | --- | --- |
| E | 6–7 | 4 | 14–15 |
| 1 | 8–9 | 5 | 16–18 |
| 2 | 10–11 | 6 | 19–21 |
| 3 | 12–13 | 7 | 22–27 |

- **LH-01:** Jede Startnummer trägt ein klassenspezifisches Präfix (`E` bzw. die Ziffer) und eine
  laufende Nummer. Startnummern sind je Klasse fortlaufend und eindeutig.

### 4.2 Bootstypen

- **LH-02:** Klassen **E, 1, 2, 3** fahren mit **kleinem** Boot, Klassen **4, 5, 6, 7** mit **großem**
  Boot.
- **LH-03:** Klasse **4** kann per Umschalter ausnahmsweise mit **kleinem** Boot fahren
  (veranstaltungsweite Einstellung). Dies verschiebt Klasse 4 in beiden Disziplinen konsistent in den
  kleinen Bootstyp.

### 4.3 Teilnehmerverwaltung

- **LH-04:** Teilnehmer können pro Klasse angelegt, bearbeitet und entfernt werden (Name, Vorname,
  Geburtsdatum, Herkunft = Verein **oder** Bundesland, Klasse, Startnummer).
- **LH-05:** Das Starterfeld ist die gemeinsame Datengrundlage **beider** Disziplinen.

---

## 5. Disziplin „Manövrieren" – Verzahnung mehrerer Klassen

Einzelstart: Die Klassen eines Parcours werden auf **Spuren** verteilt und diese Spuren im Wechsel
abgearbeitet, sodass zwischen zwei Starts möglichst ein Klassen-/Bootswechsel liegt.

- **LH-10 (Parcours & Klassenzuordnung):** Ein Veranstaltungssetup besteht aus einem oder mehreren
  Parcours. Jeder Klasse mit Startern ist genau einem Parcours zugeordnet. Es muss erkennbar sein,
  wenn eine Klasse **keinem** Parcours zugeordnet ist.
- **LH-11 (Wechselfaktor 1–4):** Je Parcours ist ein Wechselfaktor wählbar:
  - **1** = keine Verzahnung (Klassen laufen in Blöcken nacheinander),
  - **2/3/4** = 2/3/4 Spuren im Wechsel (`A,B,A,B…` bzw. `A,B,C,…`).
- **LH-12 (automatische Verteilung):** Die vorhandenen Klassen werden **nach Starterzahl möglichst
  gleichmäßig** auf die Spuren verteilt, sodass durchgehend ein Bootswechsel möglich ist und der
  **un-verzahnte End-Block** (letzte Starter derselben Klasse ohne Wechselpartner) **möglichst kurz**
  bleibt.
- **LH-13 (manuelle Anpassung):** Die Zuordnung von Klassen zu Spuren und ihre Reihenfolge müssen
  manuell veränderbar sein (im Prototyp per Drag & Drop). Passt eine manuelle Anordnung nicht mehr
  zur Klassen-/Faktor-Situation, wird automatisch auf die Auto-Verteilung zurückgefallen.
- **LH-14 (Pausen / Versatz):** In eine Spur lassen sich **Pausen** einfügen. Eine Pause der Länge *n*
  lässt die Spur *n* Starts aussetzen, sodass die nachfolgende Klasse später einsetzt – **ohne**
  Leerstart/Leerzeile in der Startliste. Damit lässt sich verhindern, dass eine Klasse direkt nach
  einer bestimmten anderen startet oder sich am Ende alles einer Klasse staut.
- **LH-15 (Diagnose):** Zu jeder erzeugten Reihenfolge sind Kennzahlen auszuweisen: Anzahl echter
  Wechsel, Anzahl direkter Wiederholungen derselben Klasse und Länge/Klasse des un-verzahnten
  End-Blocks.

### 5.1 Boote als Ressourcenschranke (Manövrieren)

- **LH-16:** Die vorhandene Anzahl **kleiner** und **großer** Boote ist einstellbar.
- **LH-17:** Modell: Jede Spur belegt, solange sie einen Bootstyp fährt, **ein** Boot dieses Typs.
  Ein frei gewordenes Boot darf erst nach einem **Puffer von 1 Starter** die Spur wechseln.
- **LH-18:** Die automatische Verzahnung **hält den Bootbestand ein**. Reichen die Boote nicht für die
  optimale Anzahl paralleler Spuren, wird auf weniger Spuren reduziert.
- **LH-19:** Oberhalb der Parcours wird der aktuelle **Bootbedarf** (klein/groß) angezeigt sowie – bei
  Engpass – wie viele **Zusatzboote** die optimale Verzahnung ermöglichen würden. Parcours laufen
  parallel, ihr Bedarf **addiert** sich.

### 5.2 Export & Konfiguration (Manövrieren)

- **LH-20:** Die aktuelle Verzahnung ist als **kompakter Text** exportierbar (Klassenverteilung,
  Spur-Aufteilung, Startreihenfolge, Startnummern je Klasse, Diagnose, Bootbedarf).
- **LH-21:** Die gesamte Konfiguration (Klassenverteilung, Parcours, Wechselfaktoren, Boote,
  Layout, Klasse-4-Umschalter) ist als **teilbarer Link** (URL-Parameter) kodierbar, sodass ein
  Szenario direkt wieder geöffnet werden kann.

---

## 6. Disziplin „Parallel-Slalom" – Verzahnung von Paaren

Zwei parallele Parcours **A** und **B**. Je Lauf fahren **zwei** Starter **gleichen Bootstyps**
gleichzeitig gegeneinander auf Zeit.

### 6.1 Paarbildung

- **LH-30:** Ein Paar besteht immer aus zwei Startern **gleichen Bootstyps** (beide klein oder beide
  groß).
- **LH-31:** Für die Paarbildung ist **nur der Bootstyp** maßgeblich, **nicht die Klasse**. Innerhalb
  eines Bootstyps darf klassenübergreifend gepaart werden (z. B. **E gegen 3** – beide klein).
  Unterschiedliche Bootstypen dürfen **nicht** gepaart werden (z. B. **2 gegen 4** ist unzulässig).
- **LH-32:** Innerhalb eines Bootstyps werden die Starter **in Startreihenfolge** (kanonische
  Klassenreihenfolge E→7, darin nach Startnummer) genommen und **je zwei aufeinanderfolgende** zu
  einem Paar zusammengefasst.
- **LH-33 (Dummy):** Ist die Starterzahl eines Bootstyps **ungerade**, wird **ein Dummy** eingesetzt:
  eine Person außerhalb der Wertung, die im gleichen Bootstyp mitfährt und das letzte Paar auffüllt.
  Der Dummy ist in der Darstellung klar als „außer Wertung" zu kennzeichnen.

### 6.2 Läufe und Fairness

- **LH-34:** Jedes Paar fährt **zwei Läufe**. Im **2. Lauf werden die Parcours getauscht**: Wer im
  1. Lauf auf A war, fährt im 2. Lauf auf B (und umgekehrt). So absolviert jeder Starter je einen
  Lauf auf A und auf B.

### 6.3 Verzahnung der Läufe

- **LH-35 (voller Block, Bootstyp abwechselnd):** Solange **beide** Bootstypen noch ein Paar liefern,
  bildet je **ein kleines und ein großes Paar** einen **vollen Block aus 4 Startern** in dieser
  Reihenfolge:
  1. kleines Paar – Lauf 1,
  2. großes Paar – Lauf 1 (*Verzahnungswechsel*),
  3. kleines Paar – Lauf 2 (Parcours getauscht),
  4. großes Paar – Lauf 2.

  Dadurch bekommt jeder Starter zwischen seinen beiden Läufen eine Pause (das jeweils andere Paar
  fährt dazwischen).

  *Beispiel:* Kleines Paar `E01/E02`, großes Paar `401/402`:

  | # | Boot | Parcours A | Parcours B |
  | --- | --- | --- | --- |
  | 1 | klein | E01 | E02 |
  | 2 | groß | 401 | 402 |
  | 3 | klein | E02 | E01 |
  | 4 | groß | 402 | 401 |

- **LH-36 (2er-Block als Rückfall):** Sobald ein Bootstyp **aufgebraucht** ist, ist keine
  Bootstyp-übergreifende Verzahnung mehr möglich. Die **übrigen Paare** desselben Bootstyps werden
  dann **nicht** miteinander verzahnt, sondern laufen als **2er-Blöcke** – jedes Paar **komplett**
  (Lauf 1, danach Lauf 2), dann das nächste Paar.

  *Beispiel Fortsetzung* (nur noch kleine Paare übrig, `221/222` und `301/302`):

  | # | Boot | Parcours A | Parcours B |
  | --- | --- | --- | --- |
  | … | klein | 221 | 222 |
  | … | klein | 222 | 221 |
  | … | klein | 301 | 302 |
  | … | klein | 302 | 301 |

- **LH-37 (nur ein Bootstyp im Feld):** Sind ausschließlich Starter eines Bootstyps vorhanden, gibt es
  keine Bootstyp-übergreifende Verzahnung; das gesamte Feld läuft in **2er-Blöcken** (siehe LH-36).
  *(Offener Punkt – siehe 9.1.)*

### 6.4 Darstellung Parallel-Slalom

- **LH-38 (Blocktrennung):** Die Blöcke (voll = 4 Starter, Rückfall = 2 Starter) sind optisch
  **deutlich abgetrennt** – im Prototyp über eine **farbige Trennlinie** vor jedem neuen Block.
- **LH-39 (Startliste):** Je Lauf werden fortlaufende Startposition, Bootstyp, sowie **Parcours A**
  und **Parcours B** (Klasse, Startnummer, Name) angezeigt; der 2. Lauf ist als Tausch erkennbar.
- **LH-40 (internationaler Modus):** Eine **Checkbox** schaltet den internationalen Modus. Er ist
  **standardmäßig aktiv** und bewirkt:
  - **Klassen 6 und 7 werden ignoriert** (international wird nur bis Klasse 5 gefahren),
  - **Klasse E wird als „Dolphin" bezeichnet**.

  Ist die Checkbox deaktiviert (nationaler Modus), werden alle Klassen (inkl. 6/7) berücksichtigt und
  Klasse E als „E" bezeichnet.
- **LH-41:** Die Klasse zählt im Parallel-Slalom fachlich nur für **Bootstyp** (Paarbildung) und
  **Ergebnis/Wertung**. Sie hat keinen Einfluss auf die Paarungslogik über den Bootstyp hinaus.
- **LH-42 (Export):** Der Parallel-Slalom-Startplan ist als kompakter Text exportierbar (Modus,
  Starterzahlen je Bootstyp inkl. eingesetzter Dummys, Anzahl Läufe/Paare/Blöcke, Startordnung mit
  Blocktrennung).

---

## 7. Nicht-funktionale Anforderungen

- **LH-50 (Nachvollziehbarkeit):** Jede erzeugte Reihenfolge muss ohne Fachwissen nachvollziehbar
  dargestellt sein (klare Kennzeichnung von Klasse, Bootstyp, Parcours/Spur, Block, Dummy).
- **LH-51 (Robustheit):** Randfälle dürfen nicht zu Fehlern führen: leere Klassen, nur ein Bootstyp,
  ungerade Anzahlen (Dummy), Klassen ohne Parcours, sehr große Felder.
- **LH-52 (Determinismus):** Bei gleicher Eingabe/Konfiguration muss dieselbe Startliste entstehen.
- **LH-53 (Persistenz):** Eingaben und Konfiguration bleiben über einen Neustart erhalten
  (im Prototyp lokal im Browser).
- **LH-54 (Datenschutz):** Der öffentliche Prototyp verwendet ausschließlich **zufällige**
  Testdaten; keine echten personenbezogenen Daten. Das Produktivsystem behandelt Meldedaten
  entsprechend Datenschutz.
- **LH-55 (Testbarkeit):** Die Fachregeln (Altersberechnung, Verzahnung Manövrieren inkl. Pausen und
  Bootschranke, Parallel-Slalom inkl. Paarbildung/Dummy/2er-Rückfall/internationaler Modus) sind
  automatisiert testabgedeckt.

---

## 8. Abnahmekriterien (Auszug)

- **AK-1:** Das E01/E02 + 401/402-Beispiel erzeugt exakt die Reihenfolge aus LH-35.
- **AK-2:** Nach Aufbrauchen eines Bootstyps entstehen 2er-Blöcke gemäß LH-36 (Paar komplett vor dem
  nächsten Paar), **nicht** verzahnte gleichartige Paare.
- **AK-3:** Ungerade Starterzahl je Bootstyp erzeugt genau einen entsprechend gekennzeichneten Dummy.
- **AK-4:** Im internationalen Modus fehlen Klassen 6/7 vollständig und E erscheint als „Dolphin".
- **AK-5:** Jeder Starter fährt im Parallel-Slalom genau zweimal – je einmal auf A und auf B.
- **AK-6:** Beim Manövrieren hält die Auto-Verzahnung den eingestellten Bootbestand ein und weist
  Bedarf bzw. fehlende Zusatzboote korrekt aus.

---

## 9. Offene Punkte / Ausblick

### 9.1 Zu klären

- **OP-1 (Parallel-Slalom, nur ein Bootstyp / Rest gleicher Boote):** Aktuell laufen gleichartige
  Restpaare als 2er-Blöcke ohne Verzahnung (LH-36/37). Zu bestätigen ist, ob in reinen
  Ein-Bootstyp-Feldern grundsätzlich **keine** Verzahnung gewünscht ist oder ob dort doch zwei
  gleichartige Paare miteinander verzahnt werden sollen.
- **OP-2 (Reihenfolge der Bootstypen im Block):** Festlegung, ob im vollen Block stets „klein vor
  groß" gilt (aktuell so) oder situativ anders.
- **OP-3 (Dummy-Zuweisung):** Woher stammt der Dummy konkret (fester Helfer, ausgeloste Person) und
  wie wird er in Ergebnislisten geführt?

### 9.2 Ausblick / spätere Ausbaustufen

- **AB-1:** Integration in das **Auswertungstool** (Übernahme der Startliste als Eingangsgröße für
  Zeitmessung und Wertung).
- **AB-2:** Import **realer Meldedaten** statt Zufallsgenerierung.
- **AB-3:** Druck-/PDF-Ausgabe der Startlisten inkl. Blocktrennung.
- **AB-4:** Ergebnis-/Wertungsanzeige je Klasse (unter Berücksichtigung des Bootstyps als
  Wertungsbezug).

---

*Dieses Lastenheft wird gemeinsam mit dem Prototyp fortgeschrieben. Änderungen an den Fachregeln
werden hier nachgezogen.*
