// Étape 4 du batch de nuit : répartir les colis d'une tournée en vagues de chargement.
// Premier arrivé, premier chargé. Quand la caisse est pleine, on ouvre la suivante. (J. B., 2019)
import type { Chargement, Tournee, Vague } from "./modeles.js";

export function chargerVehicule(t: Tournee): Chargement {
  const vagues: Vague[] = [];
  let courante: Vague = { numero: 1, colis: [], poidsKg: 0, volumeL: 0 };
  for (const c of t.colis) {
    const deborde = courante.poidsKg + c.poidsKg > t.livreur.capaciteKg || courante.volumeL + c.volumeL > t.livreur.capaciteL;
    if (deborde && courante.colis.length > 0) {
      vagues.push(courante);
      courante = { numero: courante.numero + 1, colis: [], poidsKg: 0, volumeL: 0 };
    }
    courante.colis.push(c);
    courante.poidsKg += c.poidsKg;
    courante.volumeL += c.volumeL;
  }
  if (courante.colis.length > 0) vagues.push(courante);
  return { livreur: t.livreur, vagues };
}
