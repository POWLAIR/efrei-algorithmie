// Sujet "affectation" : l'étape 2 du batch, affecter les colis aux livreurs (ateliers 3 et 4, ADR-001).
// Les trois variantes sont dans bench/variantes/affectation.ts.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { lireColis, lireHubs, lireLivreurs } from "../../legacy/src/csv.js";
import type { Colis, Hub, Livreur } from "../../legacy/src/modeles.js";
import type { ResultatAffectation } from "../../legacy/src/affectation.js";
import { VARIANTES, controle } from "../variantes/affectation.js";
import type { Sujet } from "./types.js";

interface Donnees { colis: Colis[]; livreurs: Livreur[]; hubs: Hub[] }
interface Entree { colis: Colis[]; livreurs: Livreur[]; hubs: Hub[] }

const sujet: Sujet<Donnees, Entree, ResultatAffectation> = {
  nom: "affectation",
  titre: "Affecter les colis aux livreurs (étape 2 du batch)",
  parDefaut: { jeu: "moyenne", tailles: [1000, 2000, 5000, 10000], variantes: ["naive", "tri", "map"] },
  charger(dossier) {
    if (!existsSync(join(dossier, "colis.csv"))) throw new Error(`jeu introuvable : ${dossier} (npm run data -- --echelle moyenne)`);
    return {
      colis: lireColis(join(dossier, "colis.csv")),
      livreurs: lireLivreurs(join(dossier, "livreurs.csv")),
      hubs: lireHubs(join(dossier, "hubs.csv")),
    };
  },
  tailleMax: d => d.colis.length,
  // Les variantes ne modifient pas le tableau des colis : le même lot sert à tous les tours.
  preparer: (d, taille) => ({ colis: d.colis.slice(0, taille), livreurs: d.livreurs, hubs: d.hubs }),
  variantes: Object.fromEntries(Object.entries(VARIANTES).map(([nom, fn]) => [nom, (e: Entree) => fn(e.colis, e.livreurs, e.hubs)])),
  controle,
};

export default sujet;
