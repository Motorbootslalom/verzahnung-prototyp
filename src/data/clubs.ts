// Erfundene (bzw. an reale angelehnte) Wassersport-/Yacht-/Motorbootclubs,
// jeweils einem Bundesland zugeordnet. Dient als Zufallspool für die generierte Herkunft.

export interface Club {
  name: string
  bundesland: string
}

export const BUNDESLAENDER: string[] = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
]

export const CLUBS: Club[] = [
  // Brandenburg (angelehnt an die realen Möwepokal-Vereine)
  { name: 'WSC Möwe Oranienburg e.V.', bundesland: 'Brandenburg' },
  { name: 'MC Birkenwerder e.V.', bundesland: 'Brandenburg' },
  { name: 'MC Neuruppin e.V.', bundesland: 'Brandenburg' },
  { name: 'SBC Havelland e.V.', bundesland: 'Brandenburg' },
  { name: 'Seesportclub Ketzin e.V.', bundesland: 'Brandenburg' },
  { name: 'MTC Brandenburg e.V.', bundesland: 'Brandenburg' },
  { name: 'MBC Havelbucht e.V.', bundesland: 'Brandenburg' },
  { name: 'MYWSC Schwielochsee e.V.', bundesland: 'Brandenburg' },
  // Berlin
  { name: 'Berliner Wassersportvereinigung e.V.', bundesland: 'Berlin' },
  { name: 'MYC Spandau e.V.', bundesland: 'Berlin' },
  { name: 'WSF Tegeler See e.V.', bundesland: 'Berlin' },
  // Mecklenburg-Vorpommern
  { name: 'Warnemünder Segel-Club e.V.', bundesland: 'Mecklenburg-Vorpommern' },
  { name: 'MSV Müritz Waren e.V.', bundesland: 'Mecklenburg-Vorpommern' },
  { name: 'Stralsunder Wassersportverein e.V.', bundesland: 'Mecklenburg-Vorpommern' },
  // Hamburg
  { name: 'Alster-Yacht-Club Hamburg e.V.', bundesland: 'Hamburg' },
  { name: 'MBC Elbe Hamburg e.V.', bundesland: 'Hamburg' },
  // Schleswig-Holstein
  { name: 'Kieler Yacht-Club e.V.', bundesland: 'Schleswig-Holstein' },
  { name: 'Förde Wassersport Flensburg e.V.', bundesland: 'Schleswig-Holstein' },
  { name: 'Plöner See MC e.V.', bundesland: 'Schleswig-Holstein' },
  // Niedersachsen
  { name: 'Steinhuder Meer YC e.V.', bundesland: 'Niedersachsen' },
  { name: 'MBC Weser Nienburg e.V.', bundesland: 'Niedersachsen' },
  { name: 'Dümmer Wassersportverein e.V.', bundesland: 'Niedersachsen' },
  // Bremen
  { name: 'Weser Yacht Club Bremen e.V.', bundesland: 'Bremen' },
  // Nordrhein-Westfalen
  { name: 'Rheinischer MYC Düsseldorf e.V.', bundesland: 'Nordrhein-Westfalen' },
  { name: 'MSC Baldeneysee Essen e.V.', bundesland: 'Nordrhein-Westfalen' },
  { name: 'Wassersportfreunde Ruhr e.V.', bundesland: 'Nordrhein-Westfalen' },
  // Hessen
  { name: 'Edersee Yacht-Club e.V.', bundesland: 'Hessen' },
  { name: 'MBC Main Frankfurt e.V.', bundesland: 'Hessen' },
  // Rheinland-Pfalz
  { name: 'MYC Mosel Trier e.V.', bundesland: 'Rheinland-Pfalz' },
  { name: 'Wassersportverein Rhein-Nahe e.V.', bundesland: 'Rheinland-Pfalz' },
  // Saarland
  { name: 'Bostalsee Wassersport e.V.', bundesland: 'Saarland' },
  // Baden-Württemberg
  { name: 'Bodensee-Yachtclub Konstanz e.V.', bundesland: 'Baden-Württemberg' },
  { name: 'MBC Neckar Stuttgart e.V.', bundesland: 'Baden-Württemberg' },
  { name: 'Wassersportclub Friedrichshafen e.V.', bundesland: 'Baden-Württemberg' },
  // Bayern
  { name: 'Chiemsee Yacht-Club e.V.', bundesland: 'Bayern' },
  { name: 'MYC Starnberger See e.V.', bundesland: 'Bayern' },
  { name: 'Ammersee Wassersport e.V.', bundesland: 'Bayern' },
  // Sachsen
  { name: 'MBC Elbe Dresden e.V.', bundesland: 'Sachsen' },
  { name: 'Leipziger Wassersportverein e.V.', bundesland: 'Sachsen' },
  // Sachsen-Anhalt
  { name: 'Motorwassersportverein Saaletalstauseen e.V.', bundesland: 'Sachsen-Anhalt' },
  { name: 'MBC Magdeburg e.V.', bundesland: 'Sachsen-Anhalt' },
  // Thüringen
  { name: 'Stausee Hohenwarte MC e.V.', bundesland: 'Thüringen' },
  { name: 'Wassersportfreunde Saale Jena e.V.', bundesland: 'Thüringen' },
]
