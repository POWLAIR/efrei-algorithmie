// Compte les couples colis-livreur examinés par les variantes tri et map, sans chronomètre.
// En production, chaque couple examiné coûte une requête à la base : la capacité restante du livreur
// y est lue (pièce 07). Ce nombre ne dépend pas de la machine, il se compare d'un poste à l'autre.
//
//   npm run couples
//   npm run couples -- --jeu grande --tailles 6412,9000,15000
//
// Pourquoi une copie des variantes ici, et pas un compteur dans bench/variantes/affectation.ts ?
// Parce qu'un compteur dans la fonction mesurée la ralentit (30 % sur tri à 10 000 colis, mesuré le
// 28 septembre) et fausserait le harness. Les deux copies ci-dessous rejouent tri et map avec un
// compteur ; leur somme de contrôle est comparée à celle des variantes mesurées : identique, ou arrêt.
//
// Le legacy (variante naive) n'est pas compté : legacy/ ne se modifie pas. Sa boucle parcourt
// les tournées de tous les livreurs pour chaque colis, comme tri. Relisez-la pour vous en convaincre.
//
// Résultats : bench/resultats/<horodatage>-couples.csv, une ligne par variante et par taille.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { lireColis, lireHubs, lireLivreurs } from "../legacy/src/csv.js";
import { distanceKm } from "../legacy/src/geo.js";
import type { ResultatAffectation } from "../legacy/src/affectation.js";
import type { Colis, Hub, Livreur, Tournee } from "../legacy/src/modeles.js";
import { VARIANTES, controle } from "./variantes/affectation.js";

function argument(nom: string, defaut: string): string {
  const i = process.argv.indexOf(`--${nom}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

// ---------- copies instrumentées de tri et map (même règle métier, un compteur en plus) ----------
let couples = 0;
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
  couples++; // un couple colis-livreur examiné = une requête en production
  if (c.poidsKg > t.livreur.capaciteKg) return false;
  if (t.poidsKg + c.poidsKg > t.livreur.capaciteKg * t.livreur.vaguesParJour) return false;
  if (t.volumeL + c.volumeL > t.livreur.capaciteL * t.livreur.vaguesParJour) return false;
  return true;
}
function triCompte(colis: Colis[], livreurs: Livreur[], hubs: Hub[]): ResultatAffectation {
  const tournees = tourneesVides(livreurs, hubs);
  const indices = colis.map((_, i) => i);
  indices.sort((a, b) => { const x = colis[a].numeroSuivi, y = colis[b].numeroSuivi; return x < y ? -1 : x > y ? 1 : a - b; });
  const estDoublon = new Array<boolean>(colis.length).fill(false);
  for (let k = 1; k < indices.length; k++) if (colis[indices[k]].numeroSuivi === colis[indices[k - 1]].numeroSuivi) estDoublon[indices[k]] = true;
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
}
function mapCompte(colis: Colis[], livreurs: Livreur[], hubs: Hub[]): ResultatAffectation {
  const tournees = tourneesVides(livreurs, hubs);
  const parHub = new Map<string, Tournee[]>();
  for (const t of tournees) { const l = parHub.get(t.hub.id) ?? []; l.push(t); parHub.set(t.hub.id, l); }
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
      for (const t of parHub.get(h.id) ?? []) if (peutPrendre(t, c)) { meilleureDistance = d; meilleure = t; break; }
    }
    if (!meilleure) { nonAffectes.push(c); continue; }
    meilleure.colis.push(c); meilleure.poidsKg += c.poidsKg; meilleure.volumeL += c.volumeL;
  }
  for (const t of tournees) t.colis.sort(parEcheance);
  return { tournees, nonAffectes, doublonsIgnores };
}
const COMPTEES: Record<string, (c: Colis[], l: Livreur[], h: Hub[]) => ResultatAffectation> = { tri: triCompte, map: mapCompte };

// ---------- le comptage ----------
const nomJeu = argument("jeu", "grande");
const tailles = argument("tailles", "6412,9000,15000").split(",").map(Number);

const dossier = existsSync(nomJeu) ? resolve(nomJeu) : resolve("data", "jeux", nomJeu);
if (!existsSync(join(dossier, "colis.csv"))) {
  console.error(`jeu introuvable : ${dossier}\nGénérez-le d'abord : npm run data -- --echelle ${nomJeu}`);
  process.exit(1);
}
const colis = lireColis(join(dossier, "colis.csv"));
const livreurs = lireLivreurs(join(dossier, "livreurs.csv"));
const hubs = lireHubs(join(dossier, "hubs.csv"));
if (Math.max(...tailles) > colis.length) { console.error(`le jeu ${nomJeu} n'a que ${colis.length} colis`); process.exit(1); }

console.log(`[couples] jeu=${nomJeu} livreurs=${livreurs.length} hubs=${hubs.length} tailles=${tailles.join(",")}`);
const lignes: string[] = ["variante;taille;doublons;non_affectes;couples;couples_par_colis;controle"];
for (const taille of tailles) {
  const lot = colis.slice(0, taille);
  for (const nom of ["tri", "map"]) {
    couples = 0;
    const r = COMPTEES[nom](lot, livreurs, hubs);
    const c = controle(r);
    const reference = controle(VARIANTES[nom](lot, livreurs, hubs));
    if (c !== reference) { console.error(`[couples] ARRÊT : la copie comptée de ${nom} ne donne pas le résultat de la variante mesurée (${c} contre ${reference})`); process.exit(1); }
    const parColis = couples / taille;
    console.log(`[couples] variante=${nom} taille=${taille} doublons=${r.doublonsIgnores} non_affectes=${r.nonAffectes.length} couples=${couples} couples_par_colis=${parColis.toFixed(1)} controle=${c}`);
    lignes.push(`${nom};${taille};${r.doublonsIgnores};${r.nonAffectes.length};${couples};${parColis.toFixed(2)};${c}`);
  }
}

const dossierResultats = resolve("bench", "resultats");
mkdirSync(dossierResultats, { recursive: true });
const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fichier = join(dossierResultats, `${horodatage}-couples.csv`);
writeFileSync(fichier, lignes.join("\n") + "\n", "utf-8");
console.log(`[couples] écrit ${fichier}`);
