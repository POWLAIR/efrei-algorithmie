// Le benchmark que le CTO a lancé jeudi soir pour départager les trois variantes d'affectation.
// Sa conclusion : la nouvelle variante est plus lente, on garde le code actuel.
// Atelier 3, première partie : trouvez ce qui cloche dans ce fichier avant de le croire.
//
//   npm run bench:naif
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { lireColis, lireHubs, lireLivreurs } from "../legacy/src/csv.js";
import { VARIANTES } from "./variantes/affectation.js";

// On prend le plus gros fichier disponible, comme en prod.
const dossier = ["grande", "moyenne", "petite"].map(e => resolve("data", "jeux", e)).find(d => existsSync(join(d, "colis.csv")))!;
const livreurs = lireLivreurs(join(dossier, "livreurs.csv"));
const hubs = lireHubs(join(dossier, "hubs.csv"));

// Un échantillon suffit pour se faire une idée.
const TAILLE = 300;
const resultats: { variante: string; ms: number }[] = [];

// La nouvelle variante d'abord, testée depuis le fichier pour être au plus près de la prod.
let debut = Date.now();
const colis = lireColis(join(dossier, "colis.csv")).slice(0, TAILLE);
VARIANTES.map(colis, livreurs, hubs);
resultats.push({ variante: "map (nouvelle)", ms: Date.now() - debut });

debut = Date.now();
VARIANTES.tri(colis, livreurs, hubs);
resultats.push({ variante: "tri", ms: Date.now() - debut });

debut = Date.now();
VARIANTES.naive(colis, livreurs, hubs);
resultats.push({ variante: "naive (legacy)", ms: Date.now() - debut });

console.log(`Benchmark d'affectation sur ${TAILLE} colis (${dossier.split(/[\\/]/).pop()})`);
for (const r of resultats) console.log(`  ${r.variante.padEnd(16)} ${String(r.ms).padStart(6)} ms`);
const legacy = resultats[2].ms, nouvelle = resultats[0].ms;
console.log(`\nLa nouvelle variante est ${nouvelle > legacy ? Math.round(nouvelle / Math.max(1, legacy)) + " fois plus lente" : "à peine plus rapide"} que le legacy.`);
console.log("Conclusion : on garde le code actuel.");
