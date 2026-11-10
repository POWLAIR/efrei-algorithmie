// Étape 1 du batch de nuit : rapprocher l'adresse saisie par le client de l'adresse officielle.
// On compare la saisie à toutes les adresses du référentiel et on garde la plus proche. (J. B., 2019)
import type { AdresseReferentiel, Colis, Rapprochement } from "./modeles.js";

export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function libelle(a: AdresseReferentiel): string {
  return `${a.numero}${a.rep ? " " + a.rep : ""} ${a.nomVoie} ${a.codePostal} ${a.commune}`;
}

// Distance de Levenshtein : le nombre de lettres à insérer, supprimer ou remplacer
// pour passer d'une chaîne à l'autre.
export function levenshtein(a: string, b: string): number {
  const n = a.length, m = b.length;
  let precedente = new Array<number>(m + 1);
  let courante = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) precedente[j] = j;
  for (let i = 1; i <= n; i++) {
    courante[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      const cout = ca === b.charCodeAt(j - 1) ? 0 : 1;
      courante[j] = Math.min(precedente[j] + 1, courante[j - 1] + 1, precedente[j - 1] + cout);
    }
    const t = precedente; precedente = courante; courante = t;
  }
  return precedente[m];
}

export function rapprocherAdresses(colis: Colis[], referentiel: AdresseReferentiel[]): Rapprochement[] {
  const resultats: Rapprochement[] = [];
  for (const c of colis) {
    const saisie = normaliser(c.adresseSaisie);
    let meilleure: AdresseReferentiel | null = null;
    let meilleureDistance = Number.POSITIVE_INFINITY;
    for (const a of referentiel) {
      const d = levenshtein(saisie, normaliser(libelle(a)));
      if (d < meilleureDistance) { meilleureDistance = d; meilleure = a; }
    }
    resultats.push({ colisId: c.id, adresseId: meilleure ? meilleure.id : null, distance: meilleureDistance });
  }
  return resultats;
}
