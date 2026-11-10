// Étape 2 du batch de nuit : affecter les colis du jour aux livreurs.
// Écrit en avril 2019 pour 150 colis par jour. Marche très bien. (J. B.)
import type { Colis, Hub, Livreur, Tournee } from "./modeles.js";
import { distanceKm } from "./geo.js";

const ORDRE_PRIORITE: Record<string, number> = { pharmacie: 0, express: 1, standard: 2 };

function parEcheance(a: Colis, b: Colis): number {
  // les urgents d'abord, puis par fin de créneau, puis par ordre d'arrivée
  const p = ORDRE_PRIORITE[a.priorite] - ORDRE_PRIORITE[b.priorite];
  if (p !== 0) return p;
  if (a.creneauFin !== b.creneauFin) return a.creneauFin < b.creneauFin ? -1 : 1;
  return a.creeLe < b.creeLe ? -1 : a.creeLe > b.creeLe ? 1 : 0;
}

export interface ResultatAffectation {
  tournees: Tournee[];
  nonAffectes: Colis[];
  doublonsIgnores: number;
}

export function affecterColis(colis: Colis[], livreurs: Livreur[], hubs: Hub[]): ResultatAffectation {
  const tournees: Tournee[] = livreurs.map(l => {
    const hub = hubs.find(h => h.id === l.hubId);
    if (!hub) throw new Error(`hub inconnu pour le livreur ${l.id} : ${l.hubId}`);
    return { livreur: l, hub, colis: [], poidsKg: 0, volumeL: 0 };
  });

  // Le scanner du quai envoie parfois deux fois le même colis : on garde la liste
  // des numéros déjà traités pour ne pas les affecter deux fois.
  const dejaTraites: string[] = [];
  const nonAffectes: Colis[] = [];
  let doublonsIgnores = 0;

  // On dépile les colis dans l'ordre d'arrivée, comme une file d'attente au guichet.
  const file = colis.slice();
  while (file.length > 0) {
    const c = file.shift()!;
    if (dejaTraites.indexOf(c.numeroSuivi) !== -1) { doublonsIgnores++; continue; }
    dejaTraites.push(c.numeroSuivi);

    // Le livreur le plus proche du colis (depuis son hub) qui a encore de la place aujourd'hui.
    let meilleure: Tournee | null = null;
    let meilleureDistance = Number.POSITIVE_INFINITY;
    for (const t of tournees) {
      const capKg = t.livreur.capaciteKg * t.livreur.vaguesParJour;
      const capL = t.livreur.capaciteL * t.livreur.vaguesParJour;
      if (t.poidsKg + c.poidsKg > capKg) continue;
      if (t.volumeL + c.volumeL > capL) continue;
      if (c.poidsKg > t.livreur.capaciteKg) continue; // un colis ne tient pas dans une caisse de vélo
      const d = distanceKm(t.hub.lat, t.hub.lon, c.lat, c.lon);
      if (d < meilleureDistance) { meilleureDistance = d; meilleure = t; }
    }
    if (!meilleure) { nonAffectes.push(c); continue; }

    meilleure.colis.push(c);
    meilleure.poidsKg += c.poidsKg;
    meilleure.volumeL += c.volumeL;
    // On garde la tournée toujours triée : les pharmacies en tête, c'est ce que veut l'exploitation.
    meilleure.colis.sort(parEcheance);
  }

  return { tournees, nonAffectes, doublonsIgnores };
}
