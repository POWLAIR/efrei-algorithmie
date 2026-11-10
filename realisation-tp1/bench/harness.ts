// Le harness : le banc de mesure de la cellule performance.
// Il lance des variantes d'une même fonction sur des lots de tailles croissantes, répète les mesures
// et exporte les résultats. Squelette à compléter en atelier 3 (journée 2) : cherchez "À COMPLÉTER".
//
//   npm run bench
//   npm run bench -- --jeu moyenne --tailles 1000,2000,5000,10000 --variantes naive,tri,map --repetitions 5 --echauffement 60
//
// Résultats : bench/resultats/<horodatage>-affectation.csv, une ligne par mesure.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { lireColis, lireHubs, lireLivreurs } from "../legacy/src/csv.js";
import { VARIANTES, controle } from "./variantes/affectation.js";

function argument(nom: string, defaut: string): string {
  const i = process.argv.indexOf(`--${nom}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

const nomJeu = argument("jeu", "moyenne");
const tailles = argument("tailles", "1000,2000,5000,10000").split(",").map(Number);
const nomsVariantes = argument("variantes", "naive,tri,map").split(",");
const repetitions = Number(argument("repetitions", "1"));
const echauffement = Number(argument("echauffement", "0"));

const dossier = existsSync(nomJeu) ? resolve(nomJeu) : resolve("data", "jeux", nomJeu);
if (!existsSync(join(dossier, "colis.csv"))) { console.error(`jeu introuvable : ${dossier} (npm run data -- --echelle ${nomJeu})`); process.exit(1); }
const colis = lireColis(join(dossier, "colis.csv"));
const livreurs = lireLivreurs(join(dossier, "livreurs.csv"));
const hubs = lireHubs(join(dossier, "hubs.csv"));
if (Math.max(...tailles) > colis.length) { console.error(`le jeu ${nomJeu} n'a que ${colis.length} colis`); process.exit(1); }

interface Mesure { variante: string; taille: number; repetition: number; dureeMs: number; memoireKo: number; controle: string; }
const mesures: Mesure[] = [];

console.log(`[harness] jeu=${nomJeu} colis=${colis.length} tailles=${tailles.join(",")} variantes=${nomsVariantes.join(",")} repetitions=${repetitions} echauffement=${echauffement}`);
console.log(`[harness] node=${process.version} plateforme=${process.platform} ${process.arch}`);

for (const nom of nomsVariantes) {
  const fn = VARIANTES[nom];
  if (!fn) { console.error(`variante inconnue : ${nom} (${Object.keys(VARIANTES).join(", ")})`); process.exit(1); }
  for (const taille of tailles) {
    const lot = colis.slice(0, taille);

    // À COMPLÉTER 1 : l'échauffement. Exécuter fn(lot, livreurs, hubs) `echauffement` fois sans rien
    // noter, pour que le compilateur à la volée ait fait son travail avant la première mesure.
    

    
    for (let r = 1; r <= repetitions; r++) {
      // À COMPLÉTER 2 : la mémoire. Relever process.memoryUsage().heapUsed avant et après l'appel
      // (après un global.gc() : le script npm "bench" lance Node avec --expose-gc) et noter la différence en Ko.
      const memoireKo = 0;

      const debut = performance.now();
      const resultat = fn(lot, livreurs, hubs);
      const dureeMs = performance.now() - debut;

      // À COMPLÉTER 3 : consommer le résultat. Un résultat que personne ne lit peut être supprimé
      // par le compilateur. La somme de contrôle controle(resultat) sert aussi à vérifier que les
      // variantes donnent toutes le même résultat.
      const somme = "";

      mesures.push({ variante: nom, taille, repetition: r, dureeMs, memoireKo, controle: somme });
      console.log(`[harness] variante=${nom} taille=${taille} repetition=${r} duree_ms=${dureeMs.toFixed(2)} memoire_ko=${memoireKo} controle=${somme}`);
      void resultat;
    }
  }
}

// Résumé : une valeur par variante et par taille.
// À COMPLÉTER 4 : remplacer la moyenne par la médiane. La moyenne est tirée par la mesure la plus lente,
// la médiane ne l'est pas.
function resume(valeurs: number[]): number {
  return valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
}

console.log("\nvariante        taille   duree_ms   memoire_ko");
for (const nom of nomsVariantes) {
  for (const taille of tailles) {
    const m = mesures.filter(x => x.variante === nom && x.taille === taille);
    console.log(`${nom.padEnd(14)} ${String(taille).padStart(7)} ${resume(m.map(x => x.dureeMs)).toFixed(2).padStart(10)} ${resume(m.map(x => x.memoireKo)).toFixed(0).padStart(12)}`);
  }
}

// À COMPLÉTER 5 : l'export. Écrire les mesures dans bench/resultats/<horodatage>-affectation.csv,
// une ligne par mesure, colonnes : variante;taille;repetition;duree_ms;memoire_ko;controle.
// Sans le CSV, la mesure n'existe pas.
const dossierResultats = resolve("bench", "resultats");
mkdirSync(dossierResultats, { recursive: true });
void writeFileSync;
