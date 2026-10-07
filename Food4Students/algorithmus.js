// Preisklassen als Zahl: $ = 1, $$ = 2, $$$ = 3
const PREIS_STUFEN = { "$": 1, "$$": 2, "$$$": 3 };

/**
 * Berechnet für jedes Restaurant einen Matching-Score (0–100)
 * und gibt die Restaurants sortiert zurück.
 *
 * @param {Array}  restaurants  Liste aller Restaurants
 * @param {Object} wunsch       { kueche, maxPreis, bezirk }  (kueche/bezirk leer = egal)
 * @param {Object} gewichtung   { kueche, preis, bezirk } jeweils 0–10
 */
function empfehleRestaurants(restaurants, wunsch, gewichtung) {
  // Gewichte zusammenrechnen und in maximale Punkte pro Merkmal umrechnen
  const summe = gewichtung.kueche + gewichtung.preis + gewichtung.bezirk;
  const maxPunkte = (k) => (summe === 0 ? 0 : (gewichtung[k] / summe) * 100);

  return restaurants
    .map((r) => {
      // Erfüllungsgrad pro Merkmal (0 bis 1); "egal" zählt als erfüllt
      const kueche = !wunsch.kueche || r.kueche === wunsch.kueche ? 1 : 0;
      const bezirk = !wunsch.bezirk || r.bezirk === wunsch.bezirk ? 1 : 0;

      // Preis: im Budget = voll, 1 Stufe drüber = halb, 2 Stufen drüber = 0
      const differenz = PREIS_STUFEN[r.preis] - PREIS_STUFEN[wunsch.maxPreis];
      const preis = differenz <= 0 ? 1 : Math.max(0, 1 - differenz * 0.5);

      const punkte =
        kueche * maxPunkte("kueche") +
        preis  * maxPunkte("preis") +
        bezirk * maxPunkte("bezirk");

      return {
        ...r,
        punkte: Math.round(punkte),
        kuecheTreffer: kueche === 1,
        details: { kueche, preis, bezirk },
      };
    })
    .sort((a, b) => {
      // Die gewählte Küche hat immer Vorrang, danach entscheiden die Punkte
      if (wunsch.kueche && a.kuecheTreffer !== b.kuecheTreffer) {
        return a.kuecheTreffer ? -1 : 1;
      }
      return b.punkte - a.punkte;
    });
}
