// Étape 3 du batch de nuit : ordonner les arrêts de chaque tournée.
// L'ordre d'affectation est déjà le bon (les urgents d'abord), on calcule juste les distances. (J. B., 2019)
import type { Arret, Tournee, TourneeOrdonnee } from "./modeles.js";
import { distanceKm } from "./geo.js";

// Toutes les distances entre les arrêts d'une tournée, hub compris en position 0.
export function matriceDistances(t: Tournee): number[][] {
  const points = [{ lat: t.hub.lat, lon: t.hub.lon }, ...t.colis.map(c => ({ lat: c.lat, lon: c.lon }))];
  const n = points.length;
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    m.push([]);
    for (let j = 0; j < n; j++) m[i].push(distanceKm(points[i].lat, points[i].lon, points[j].lat, points[j].lon));
  }
  return m;
}

export function ordonnerArrets(t: Tournee): TourneeOrdonnee {
  const arrets: Arret[] = [];
  let total = 0;
  for (let i = 0; i < t.colis.length; i++) {
    // on recalcule la matrice à chaque arrêt, comme ça elle est toujours à jour
    const m = matriceDistances(t);
    const d = m[i][i + 1];
    total += d;
    arrets.push({ colis: t.colis[i], ordre: i + 1, distanceDepuisPrecedentKm: d });
  }
  if (t.colis.length > 0) total += matriceDistances(t)[t.colis.length][0]; // retour au hub
  return { livreur: t.livreur, arrets, distanceTotaleKm: total };
}
