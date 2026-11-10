// Trois façons d'affecter les colis aux livreurs. Même règle métier, même résultat, pas le même coût.
// Atelier 4 (journée 2) : mesurez-les avec votre harness, puis écrivez l'ADR-001.
//
// Règle métier commune : on parcourt les colis dans l'ordre d'arrivée, on ignore les doublons de numéro
// de suivi (on garde la première occurrence), on donne le colis au livreur le plus proche (hub à colis)
// qui a encore de la capacité pour la journée, et chaque tournée est rendue triée : pharmacies d'abord,
// puis fin de créneau, puis ordre d'arrivée.
import type { Colis, Hub, Livreur, Tournee } from "../../legacy/src/modeles.js";
import { distanceKm } from "../../legacy/src/geo.js";
import { affecterColis as affecterLegacy, type ResultatAffectation } from "../../legacy/src/affectation.js";

export type Variante = (colis: Colis[], livreurs: Livreur[], hubs: Hub[]) => ResultatAffectation;

const ORDRE_PRIORITE: Record<string, number> = { pharmacie: 0, express: 1, standard: 2 };
function parEcheance(a: Colis, b: Colis): number {
  const p = ORDRE_PRIORITE[a.priorite] - ORDRE_PRIORITE[b.priorite];
  if (p !== 0) return p;
  if (a.creneauFin !== b.creneauFin) return a.creneauFin < b.creneauFin ? -1 : 1;
  return a.creeLe < b.creeLe ? -1 : a.creeLe > b.creeLe ? 1 : 0;
}

function tourneesVides(livreurs: Livreur[], hubs: Hub[]): Tournee[] {
  return livreurs.map(l => {
    const hub = hubs.find(h => h.id === l.hubId);
    if (!hub) throw new Error(`hub inconnu : ${l.hubId}`);
    return { livreur: l, hub, colis: [], poidsKg: 0, volumeL: 0 };
  });
}

function peutPrendre(t: Tournee, c: Colis): boolean {
  if (c.poidsKg > t.livreur.capaciteKg) return false;
  if (t.poidsKg + c.poidsKg > t.livreur.capaciteKg * t.livreur.vaguesParJour) return false;
  if (t.volumeL + c.volumeL > t.livreur.capaciteL * t.livreur.vaguesParJour) return false;
  return true;
}

// Variante 1 : le legacy tel quel (dédoublonnage par parcours, file par shift, tri à chaque insertion).
export const naive: Variante = (colis, livreurs, hubs) => affecterLegacy(colis, livreurs, hubs);

// Variante 2 : tri puis parcours.
// On repère les doublons en triant une copie des numéros de suivi, on parcourt ensuite les colis
// dans l'ordre d'origine, puis on trie chaque tournée une seule fois à la fin.
export const tri: Variante = (colis, livreurs, hubs) => {
  const tournees = tourneesVides(livreurs, hubs);
  const indices = colis.map((_, i) => i);
  indices.sort((a, b) => {
    const x = colis[a].numeroSuivi, y = colis[b].numeroSuivi;
    return x < y ? -1 : x > y ? 1 : a - b;
  });
  const estDoublon = new Array<boolean>(colis.length).fill(false);
  for (let k = 1; k < indices.length; k++) {
    if (colis[indices[k]].numeroSuivi === colis[indices[k - 1]].numeroSuivi) estDoublon[indices[k]] = true;
  }
  const nonAffectes: Colis[] = [];
  let doublonsIgnores = 0;
  for (let i = 0; i < colis.length; i++) {
    if (estDoublon[i]) { doublonsIgnores++; continue; }
    const c = colis[i];
    let meilleure: Tournee | null = null, meilleureDistance = Number.POSITIVE_INFINITY;
    for (const t of tournees) {
      if (!peutPrendre(t, c)) continue;
      const d = distanceKm(t.hub.lat, t.hub.lon, c.lat, c.lon);
      if (d < meilleureDistance) { meilleureDistance = d; meilleure = t; }
    }
    if (!meilleure) { nonAffectes.push(c); continue; }
    meilleure.colis.push(c); meilleure.poidsKg += c.poidsKg; meilleure.volumeL += c.volumeL;
  }
  for (const t of tournees) t.colis.sort(parEcheance);
  return { tournees, nonAffectes, doublonsIgnores };
};

// Variante 3 : structures adaptées.
// Un Set pour les numéros déjà vus, les distances hub-colis calculées une fois par hub (trois hubs,
// pas quatre-vingt-cinq livreurs), les tournées triées une seule fois à la fin.
export const map: Variante = (colis, livreurs, hubs) => {
  const tournees = tourneesVides(livreurs, hubs);
  const parHub = new Map<string, Tournee[]>();
  for (const t of tournees) {
    const liste = parHub.get(t.hub.id) ?? [];
    liste.push(t); parHub.set(t.hub.id, liste);
  }
  const vus = new Set<string>();
  const nonAffectes: Colis[] = [];
  let doublonsIgnores = 0;
  for (const c of colis) {
    if (vus.has(c.numeroSuivi)) { doublonsIgnores++; continue; }
    vus.add(c.numeroSuivi);
    let meilleure: Tournee | null = null, meilleureDistance = Number.POSITIVE_INFINITY;
    for (const h of hubs) {
      const d = distanceKm(h.lat, h.lon, c.lat, c.lon);
      if (d >= meilleureDistance) continue;
      for (const t of parHub.get(h.id) ?? []) {
        if (peutPrendre(t, c)) { meilleureDistance = d; meilleure = t; break; }
      }
    }
    if (!meilleure) { nonAffectes.push(c); continue; }
    meilleure.colis.push(c); meilleure.poidsKg += c.poidsKg; meilleure.volumeL += c.volumeL;
  }
  for (const t of tournees) t.colis.sort(parEcheance);
  return { tournees, nonAffectes, doublonsIgnores };
};

export const VARIANTES: Record<string, Variante> = { naive, tri, map };

// Somme de contrôle d'un résultat : deux variantes correctes donnent la même valeur.
export function controle(r: ResultatAffectation): string {
  let h = 0;
  const melange = (s: string) => { for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; };
  for (const t of r.tournees) { melange(t.livreur.id); for (const c of t.colis) melange(c.id); }
  for (const c of r.nonAffectes) melange("!" + c.id);
  melange(String(r.doublonsIgnores));
  return (h >>> 0).toString(16).padStart(8, "0");
}
