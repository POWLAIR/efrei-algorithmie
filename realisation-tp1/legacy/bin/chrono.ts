// Chronomètre une étape du batch de nuit sur un jeu de données.
//
//   npm run chrono -- --jeu petite --etape affectation
//   npm run chrono -- --jeu moyenne --etape affectation --repetitions 3
//   npm run chrono -- --jeu petite --etape adresses --limite-adresses 20
//   npm run batch  -- --jeu petite --limite-adresses 20
//   npm run chrono -- --jeu moyenne --repetitions 3 --csv
//
// --jeu accepte un nom (petite, moyenne, grande, n12345) ou un chemin vers un dossier de jeu ;
// --echelle est accepté comme synonyme, c'est le mot de npm run data.
// --csv ajoute chaque répétition de l'affectation à bench/resultats/j1-chrono.csv (ou au fichier
// donné après --csv), au format que bench/courbe.ts sait tracer : npm run courbe -- --log
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { lireColis, lireHubs, lireLivreurs, lireReferentiel } from "../src/csv.js";
import { ETAPES, executerBatch, executerEtape, type Etape, type Jeu } from "../src/batch.js";

// Options de la ligne de commande. Une option inconnue, ou une option sans sa valeur, arrête le
// programme : une faute de frappe ne doit jamais retomber en silence sur le jeu par défaut.
// Si PowerShell a avalé le "--" de npm run, npm transmet les options en variables npm_config_* :
// on les relit, la commande marche dans les deux cas.
function lireOptions(spec: { valeur?: string[]; optionnelle?: string[]; drapeau?: string[]; alias?: Record<string, string>; positionnels?: number }) {
  const valeur = spec.valeur ?? [], optionnelle = spec.optionnelle ?? [], drapeau = spec.drapeau ?? [], alias = spec.alias ?? {};
  const connues = [...valeur, ...optionnelle, ...drapeau, ...Object.keys(alias)].map(o => `--${o}`).join(", ");
  const arreter = (m: string): never => { console.error(`${m}\noptions possibles : ${connues}`); process.exit(1); };
  const lues = new Map<string, string>(), positionnels: string[] = [];
  const a = process.argv.slice(2);
  const viaNpm = [...valeur, ...optionnelle, ...drapeau, ...Object.keys(alias)]
    .filter(nom => process.env[`npm_config_${nom.replace(/-/g, "_")}`] !== undefined);
  if (viaNpm.length > 0 && a.length > 0 && !a.some(x => x.startsWith("--"))) {
    arreter(`les options ne sont pas arrivées jusqu'au programme : le "--" après npm run a été avalé (PowerShell).\n`
      + `Relancez avec npm.cmd au lieu de npm, ou écrivez les options avec un égal : --${viaNpm[0]}=${a[0]}`);
  }
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) {
      if (positionnels.length < (spec.positionnels ?? 0)) { positionnels.push(a[i]); continue; }
      arreter(`argument inattendu : ${a[i]}`);
    }
    let tape = a[i].slice(2), v: string | undefined;
    const egal = tape.indexOf("=");
    if (egal !== -1) { v = tape.slice(egal + 1); tape = tape.slice(0, egal); }
    const nom = alias[tape] ?? tape;
    const suivant = a[i + 1] !== undefined && !a[i + 1].startsWith("--") ? a[i + 1] : undefined;
    if (valeur.includes(nom)) {
      if (v === undefined) { if (suivant === undefined) arreter(`--${tape} attend une valeur`); v = suivant; i++; }
    } else if (optionnelle.includes(nom)) {
      if (v === undefined && suivant !== undefined) { v = suivant; i++; }
    } else if (!drapeau.includes(nom)) {
      arreter(`option inconnue : --${tape}`);
    }
    lues.set(nom, v ?? "true");
  }
  if (a.length === 0) {
    for (const nom of [...valeur, ...optionnelle, ...drapeau, ...Object.keys(alias)]) {
      const env = process.env[`npm_config_${nom.replace(/-/g, "_")}`];
      if (env !== undefined && env !== "") lues.set(alias[nom] ?? nom, env);
    }
  }
  return {
    lire: (nom: string, defaut: string) => lues.get(nom) ?? defaut,
    present: (nom: string) => lues.has(nom),
    positionnels,
  };
}

const options = lireOptions({
  valeur: ["jeu", "etape", "repetitions", "limite-adresses"], optionnelle: ["csv"], alias: { echelle: "jeu" },
});
const nomJeu = options.lire("jeu", "petite");
const etapeDemandee = options.lire("etape", "affectation");
const repetitions = Number(options.lire("repetitions", "1"));
if (!Number.isInteger(repetitions) || repetitions < 1) { console.error(`--repetitions attend un entier positif, pas ${options.lire("repetitions", "")}`); process.exit(1); }
const limiteAdresses = Number(options.lire("limite-adresses", "0")) || undefined;
const dossier = existsSync(nomJeu) ? resolve(nomJeu) : resolve("data", "jeux", nomJeu);
if (!existsSync(join(dossier, "colis.csv"))) {
  console.error(`jeu introuvable : ${dossier}\nGénérez-le d'abord : npm run data -- --echelle ${nomJeu}`);
  process.exit(1);
}

const t0 = performance.now();
const colis = lireColis(join(dossier, "colis.csv"));
const livreurs = lireLivreurs(join(dossier, "livreurs.csv"));
const hubs = lireHubs(join(dossier, "hubs.csv"));
const etapes: Etape[] = etapeDemandee === "toutes" ? ETAPES : [etapeDemandee as Etape];
if (!etapes.every(e => ETAPES.includes(e))) {
  console.error(`étape inconnue : ${etapeDemandee} (attendu : ${ETAPES.join(", ")} ou toutes)`);
  process.exit(1);
}
const valeurCsv = options.lire("csv", "");
const cheminCsv = !options.present("csv") ? null
  : resolve(valeurCsv && valeurCsv !== "true" ? valeurCsv : join("bench", "resultats", "j1-chrono.csv"));
if (cheminCsv && (etapes.length !== 1 || etapes[0] !== "affectation")) {
  console.error("--csv ne s'emploie qu'avec l'étape affectation (la courbe compare des durées d'affectation)");
  process.exit(1);
}
const ENTETE_CSV = "variante;taille;duree_ms;jeu;repetition;horodatage";
function ecrireCsv(dureeMs: number, repetition: number): void {
  if (!cheminCsv) return;
  mkdirSync(dirname(cheminCsv), { recursive: true });
  const vide = !existsSync(cheminCsv) || readFileSync(cheminCsv, "utf-8").trim() === "";
  const ligne = ["legacy", colis.length, dureeMs.toFixed(1), nomJeu, repetition, new Date().toISOString()].join(";");
  appendFileSync(cheminCsv, (vide ? ENTETE_CSV + "\n" : "") + ligne + "\n", "utf-8");
}

let referentiel = null;
if (etapes.includes("adresses")) {
  const candidats = ["adresses-metropole.csv", "adresses-metropole.csv.gz", "adresses-gironde.csv", "adresses-gironde.csv.gz"]
    .map(f => resolve("data", "referentiel", f)).filter(existsSync);
  if (candidats.length === 0) { console.error("référentiel absent dans data/referentiel : lancez npm run ban"); process.exit(1); }
  referentiel = lireReferentiel(candidats[0]);
}
const jeu: Jeu = { nom: nomJeu, colis, livreurs, hubs, referentiel };
console.log(`[chrono] jeu=${nomJeu} colis=${colis.length} livreurs=${livreurs.length} chargement_ms=${(performance.now() - t0).toFixed(0)}`);

if (etapes.length > 1) {
  executerBatch(jeu, etapes, { limiteAdresses });
} else {
  const durees: number[] = [];
  for (let r = 0; r < repetitions; r++) {
    const m = executerEtape(etapes[0], jeu, { limiteAdresses });
    durees.push(m.dureeMs);
    ecrireCsv(m.dureeMs, r + 1);
    const details = Object.entries(m.details).map(([k, v]) => `${k}=${typeof v === "number" ? Number(v.toFixed(2)) : v}`).join(" ");
    console.log(`[chrono] etape=${m.etape} repetition=${r + 1} duree_ms=${m.dureeMs.toFixed(1)} ${details}`);
  }
  if (repetitions > 1) {
    const triees = durees.slice().sort((a, b) => a - b);
    console.log(`[chrono] mediane_ms=${triees[Math.floor(triees.length / 2)].toFixed(1)} min_ms=${triees[0].toFixed(1)} max_ms=${triees[triees.length - 1].toFixed(1)}`);
  }
  if (cheminCsv) console.log(`[chrono] csv=${relative(process.cwd(), cheminCsv)} lignes_ajoutees=${repetitions}`);
}
