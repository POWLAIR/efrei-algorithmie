// Génère les jeux de données d'Efrei Logistique : hubs, livreurs, clients, colis, scans.
// Même graine, mêmes fichiers. Les adresses viennent du référentiel BAN de Bordeaux Métropole.
//
//   npm run data -- --echelle petite          1 000 colis
//   npm run data -- --echelle moyenne        10 000 colis
//   npm run data -- --echelle grande        100 000 colis
//   npm run data -- --n 250000               un volume libre (dossier n250000)
//   npm run data -- --echelle petite --pieges      ajoute des lignes invalides (journée 9)
//   npm run data -- --echelle grande --sans-scans  plus rapide, sans le fichier des scans
//
// --jeu est accepté comme synonyme de --echelle, c'est le mot de npm run chrono.
//
// Sortie : data/jeux/<echelle>/{hubs,livreurs,clients,colis,scans,verite}.csv + MANIFESTE.json
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Alea } from "./alea.js";
import { REFERENCE } from "./reference.js";
import { lireReferentiel } from "../../legacy/src/csv.js";
import type { AdresseReferentiel } from "../../legacy/src/modeles.js";

// ---------- paramètres ----------
const ECHELLES: Record<string, number> = { petite: 1_000, moyenne: 10_000, grande: 100_000 };
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
  valeur: ["echelle", "n", "graine", "jour", "sortie"], drapeau: ["pieges", "sans-scans"], alias: { jeu: "echelle" },
});
const argument = options.lire;
const echelle = argument("echelle", "");
const nLibre = Number(argument("n", "0"));
const n = nLibre > 0 ? nLibre : ECHELLES[echelle || "petite"];
if (!n) { console.error(`échelle inconnue : ${echelle} (petite, moyenne, grande) ou --n <nombre>`); process.exit(1); }
const nomJeu = nLibre > 0 ? `n${nLibre}` : (echelle || "petite");
const graine = Number(argument("graine", "2026"));
const pieges = options.present("pieges");
const sansScans = options.present("sans-scans");
const JOUR_LIVRAISON = argument("jour", "2026-09-24"); // le jeudi noir
const dossierSortie = resolve(argument("sortie", resolve("data", "jeux")), nomJeu);
const cheminReferentiel = ["adresses-metropole.csv", "adresses-metropole.csv.gz"].map(f => resolve("data", "referentiel", f)).find(existsSync);
if (!cheminReferentiel) { console.error("référentiel absent : lancez d'abord npm run ban"); process.exit(1); }

const alea = new Alea(graine);
const t0 = performance.now();

// ---------- référentiel ----------
const referentiel: AdresseReferentiel[] = lireReferentiel(cheminReferentiel);
console.log(`référentiel : ${referentiel.length} adresses (${cheminReferentiel.split(/[\\/]/).pop()})`);
const shaReferentiel = createHash("sha256").update(readFileSync(cheminReferentiel)).digest("hex");
const referentielDuModule = shaReferentiel === REFERENCE.metropole.sha256;
if (!referentielDuModule) console.log(`ATTENTION : ce référentiel n'est pas celui du module (version du ${REFERENCE.date}) ; lancez npm run ban avec l'archive de Moodle`);

// ---------- hubs et livreurs ----------
const HUBS = [
  { id: "H1", nom: "Hub Brienne (quai de Paludate)", lat: 44.8235, lon: -0.5545 },
  { id: "H2", nom: "Micro-hub Bastide", lat: 44.8410, lon: -0.5560 },
  { id: "H3", nom: "Micro-hub Mérignac", lat: 44.8390, lon: -0.6540 },
];
const PRENOMS = ["Camille", "Julien", "Nadia", "Thomas", "Inès", "Karim", "Léa", "Bastien", "Yasmine", "Hugo", "Manon", "Adam", "Chloé", "Mehdi", "Sarah", "Lucas", "Emma", "Nathan", "Jade", "Louis", "Lina", "Gabriel", "Zoé", "Rayan", "Alice", "Arthur", "Louna", "Noah", "Anna", "Ethan", "Mila", "Sacha", "Rose", "Ibrahim", "Ambre", "Paul", "Iris", "Malo", "Nour", "Tom", "Eva", "Maël", "Lou", "Aaron", "Léna", "Jules", "Romy", "Ali", "Agathe", "Tiago", "Maëlle", "Enzo", "Salomé", "Marius", "Farah", "Victor", "Elena", "Noé", "Awa", "Simon"];
const NOMS = ["Rousseau", "Bardet", "Ferreira", "Lecoq", "Marchand", "Dubois", "Morin", "Klein", "Aït-Ali", "Bernard", "Petit", "Garcia", "Martin", "Nguyen", "Lopez", "Fontaine", "Roux", "Blanc", "Guerin", "Diallo", "Benali", "Lambert", "Fournier", "Girard", "Mercier", "Bonnet", "Lefebvre", "Faure", "Andre", "Chevalier", "Da Silva", "Legrand", "Gauthier", "Perrin", "Robin", "Clement", "Traoré", "Henry", "Masson", "Duval", "Denis", "Meyer", "Lucas", "Renard", "Brun", "Leroy", "Barbier", "Arnaud", "Rolland", "Caron", "Picard", "Vidal", "Roger", "Fabre", "Aubert", "Lemoine", "Renaud", "Dumont", "Meunier", "Gaillard"];

interface LivreurGen { id: string; nom: string; vehicule: string; capaciteKg: number; capaciteL: number; vagues: number; hubId: string; debut: string; fin: string; }
const livreurs: LivreurGen[] = [];
for (let i = 1; i <= 85; i++) {
  const velo = i <= 60;
  livreurs.push({
    id: `L${String(i).padStart(3, "0")}`,
    nom: `${alea.choix(PRENOMS)} ${alea.choix(NOMS)}`,
    vehicule: velo ? "velo_cargo" : "utilitaire_electrique",
    capaciteKg: velo ? 80 : 700, capaciteL: velo ? 450 : 4000, vagues: velo ? 4 : 3,
    hubId: alea.pondere([["H1", 50], ["H2", 25], ["H3", 25]]),
    debut: velo ? "07:00" : "06:30", fin: velo ? "15:00" : "15:30",
  });
}

// ---------- clients (destinataires) ----------
const nUniques = Math.round(n * 0.985);           // 1,5 % de doublons dans le fichier des colis
const nClients = Math.max(50, Math.round(nUniques * 0.75));
const TYPES_CLIENT: readonly (readonly [string, number])[] = [["commerce", 45], ["e_commerce", 35], ["restaurant", 12], ["pharmacie", 8]];
interface ClientGen { id: string; nom: string; type: string; adresse: AdresseReferentiel; }
const clients: ClientGen[] = [];
for (let i = 1; i <= nClients; i++) {
  clients.push({
    id: `K${String(i).padStart(7, "0")}`,
    nom: `${alea.choix(PRENOMS)} ${alea.choix(NOMS).toUpperCase()}`,
    type: alea.pondere(TYPES_CLIENT),
    adresse: alea.choix(referentiel),
  });
}

// ---------- adresses saisies : la réalité d'un formulaire web ----------
const ABREVIATIONS: [RegExp, string][] = [[/\bAvenue\b/i, "av"], [/\bBoulevard\b/i, "bd"], [/\bSainte\b/i, "Ste"], [/\bSaint\b/i, "St"], [/\bPlace\b/i, "pl"], [/\bImpasse\b/i, "imp"], [/\bRue\b/i, "r"], [/\bAllée\b/i, "all"], [/\bChemin\b/i, "ch"]];
function sansAccents(s: string): string { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function faute(s: string): string {
  const i = alea.entier(1, Math.max(1, s.length - 2));
  const sorte = alea.entier(0, 2);
  if (sorte === 0) return s.slice(0, i) + s.slice(i + 1);                               // lettre manquante
  if (sorte === 1) return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);              // deux lettres inversées
  return s.slice(0, i) + alea.choix(["a", "e", "i", "o", "u", "n", "r", "s", "t"]) + s.slice(i + 1); // lettre remplacée
}
function saisir(a: AdresseReferentiel): { saisie: string; sorte: string } {
  const propre = `${a.numero}${a.rep ? " " + a.rep : ""} ${a.nomVoie}, ${a.codePostal} ${a.commune}`;
  const sorte = alea.pondere<string>([["exacte", 65], ["accents", 12], ["abreviation", 8], ["faute", 7], ["sans_numero", 4], ["commune", 2], ["double", 2]]);
  let s = propre;
  if (sorte === "accents") s = sansAccents(propre).toLowerCase();
  else if (sorte === "abreviation") { for (const [re, ab] of ABREVIATIONS) { if (re.test(s)) { s = s.replace(re, ab); break; } } }
  else if (sorte === "faute") s = faute(propre);
  else if (sorte === "sans_numero") s = `${a.nomVoie}, ${a.codePostal} ${a.commune}`;
  else if (sorte === "commune") s = `${a.numero} ${a.nomVoie}, ${a.codePostal}`;
  else if (sorte === "double") s = faute(sansAccents(propre).toLowerCase());
  return { saisie: s.replace(/;/g, ","), sorte };
}

// ---------- colis ----------
const veilleISO = (() => { const d = new Date(JOUR_LIVRAISON + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })();
function heureISO(jour: string, minutes: number): string {
  const h = Math.floor(minutes / 60), m = Math.floor(minutes % 60), s = Math.floor((minutes * 60) % 60);
  return `${jour}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function cleSuivi(base: string): string { let s = 0; for (const ch of base) s = (s * 31 + ch.charCodeAt(0)) % 23; return "ABCDEFGHJKLMNPQRSTUVWXY"[s]; }

interface ColisGen { id: string; suivi: string; client: ClientGen; adresse: AdresseReferentiel; saisie: string; sorte: string; lat: number; lon: number; poids: number; volume: number; priorite: string; debut: string; fin: string; creeLe: string; }
const colisUniques: ColisGen[] = [];
const jourCompact = JOUR_LIVRAISON.replace(/-/g, "").slice(2);
const minutesCreation: number[] = [];
for (let i = 0; i < nUniques; i++) minutesCreation.push(7 * 60 + alea.reel() * 12 * 60); // la veille, entre 7h et 19h
minutesCreation.sort((a, b) => a - b);
for (let i = 1; i < minutesCreation.length; i++) if (alea.reel() < 0.03) { const t = minutesCreation[i]; minutesCreation[i] = minutesCreation[i - 1]; minutesCreation[i - 1] = t; } // presque trié

for (let i = 0; i < nUniques; i++) {
  const client = alea.choix(clients);
  const memeAdresse = alea.reel() < 0.6; // six colis sur dix vont à l'adresse habituelle du destinataire
  const adresse = memeAdresse ? client.adresse : alea.choix(referentiel);
  const { saisie, sorte } = saisir(adresse);
  const poids = Math.min(30, Math.max(0.2, alea.logNormale(2.5, 0.9)));
  const volume = Math.min(200, Math.max(1, poids * (3 + alea.reel() * 9)));
  const priorite = client.type === "pharmacie" ? "pharmacie" : alea.pondere<string>([["express", 13], ["standard", 87]]);
  const [debut, fin] = priorite === "pharmacie" ? ["08:00", "10:00"] : priorite === "express" ? ["08:00", "12:00"] : ["08:00", "18:00"];
  const base = `EFL${jourCompact}${String(i + 1).padStart(6, "0")}`;
  colisUniques.push({
    id: `C${String(i + 1).padStart(7, "0")}`, suivi: base + cleSuivi(base), client, adresse, saisie, sorte,
    lat: adresse.lat, lon: adresse.lon, poids: Math.round(poids * 100) / 100, volume: Math.round(volume * 10) / 10,
    priorite, debut, fin, creeLe: heureISO(veilleISO, minutesCreation[i]),
  });
}
// doublons : le scanner du quai envoie parfois deux fois le même colis
const lignesColis: ColisGen[] = colisUniques.slice();
const nDoublons = n - nUniques;
for (let d = 0; d < nDoublons; d++) {
  const original = alea.choix(colisUniques);
  const position = alea.entier(Math.min(lignesColis.length, 1), lignesColis.length);
  lignesColis.splice(position, 0, original);
}

// ---------- scans ----------
const TYPES_SCAN_INTERMEDIAIRES = ["scan_quai", "scan_tri", "scan_caisse", "scan_depart"];
interface ScanGen { suivi: string; minutes: number; jour: string; type: string; lieu: string; livreurId: string; }
const scans: ScanGen[] = [];
let absents = 0;
if (!sansScans) {
  for (const c of colisUniques) {
    const livreur = alea.choix(livreurs);
    const hub = HUBS.find(h => h.id === livreur.hubId)!.nom;
    const pousser = (jour: string, minutes: number, type: string, lieu: string) => scans.push({ suivi: c.suivi, minutes, jour, type, lieu, livreurId: livreur.id });
    pousser(veilleISO, 19 * 60 + alea.reel() * 240, "pris_en_charge", hub);
    pousser(JOUR_LIVRAISON, 4 * 60 + alea.reel() * 150, "tri", hub);
    const kInter = alea.entier(2, 6);
    for (let k = 0; k < kInter; k++) pousser(JOUR_LIVRAISON, 5 * 60 + alea.reel() * 120, alea.choix(TYPES_SCAN_INTERMEDIAIRES), hub);
    pousser(JOUR_LIVRAISON, 6.5 * 60 + alea.reel() * 60, "charge", hub);
    const depart = 7 * 60 + alea.reel() * 60;
    pousser(JOUR_LIVRAISON, depart, "depart_hub", hub);
    const arrivee = depart + 15 + alea.reel() * 480;
    pousser(JOUR_LIVRAISON, arrivee - 8, "en_approche", c.adresse.commune);
    if (alea.reel() < 0.12) {
      absents++;
      pousser(JOUR_LIVRAISON, arrivee, "absent", c.adresse.commune);
      pousser(JOUR_LIVRAISON, arrivee + 60 + alea.reel() * 240, "retour_hub", hub);
    } else {
      pousser(JOUR_LIVRAISON, arrivee, "livre", c.adresse.commune);
    }
  }
  scans.sort((a, b) => (a.jour + heureISO("", a.minutes)) < (b.jour + heureISO("", b.minutes)) ? -1 : 1);
  for (let i = 1; i < scans.length; i++) if (alea.reel() < 0.02) { const t = scans[i]; scans[i] = scans[i - 1]; scans[i - 1] = t; } // presque trié
}

// ---------- écriture ----------
mkdirSync(dossierSortie, { recursive: true });
function ecrire(nom: string, entete: string[], lignes: string[][]): string {
  const contenu = entete.join(";") + "\n" + lignes.map(l => l.join(";")).join("\n") + "\n";
  writeFileSync(resolve(dossierSortie, nom), contenu, "utf-8");
  return createHash("sha1").update(contenu).digest("hex");
}
const sommes: Record<string, string> = {};
sommes["hubs.csv"] = ecrire("hubs.csv", ["id", "nom", "lat", "lon"], HUBS.map(h => [h.id, h.nom, String(h.lat), String(h.lon)]));
sommes["livreurs.csv"] = ecrire("livreurs.csv", ["id", "nom", "vehicule", "capacite_kg", "capacite_l", "vagues_par_jour", "hub_id", "debut_service", "fin_service"],
  livreurs.map(l => [l.id, l.nom, l.vehicule, String(l.capaciteKg), String(l.capaciteL), String(l.vagues), l.hubId, l.debut, l.fin]));
sommes["clients.csv"] = ecrire("clients.csv", ["id", "nom", "type_client", "adresse_id", "adresse", "code_postal", "commune"],
  clients.map(c => [c.id, c.nom, c.type, c.adresse.id, `${c.adresse.numero}${c.adresse.rep ? " " + c.adresse.rep : ""} ${c.adresse.nomVoie}`, c.adresse.codePostal, c.adresse.commune]));

let lignesColisCsv: string[][] = lignesColis.map(c => [c.id, c.suivi, c.client.id, c.client.nom, c.saisie, c.adresse.codePostal, c.adresse.commune,
  String(c.lat), String(c.lon), String(c.poids), String(c.volume), c.priorite, c.debut, c.fin, c.client.type, c.creeLe]);
const ENTETE_COLIS = ["id", "numero_suivi", "client_id", "destinataire", "adresse_saisie", "code_postal", "commune", "lat", "lon", "poids_kg", "volume_l", "priorite", "creneau_debut", "creneau_fin", "type_client", "cree_le"];
const compteurPieges: Record<string, number> = {};
if (pieges) {
  const nPieges = Math.max(5, Math.round(lignesColisCsv.length * 0.005));
  const sortes = ["ligne_vide", "coordonnees_nulles", "poids_negatif", "adresse_vide", "colonne_manquante", "entete_repetee"];
  for (let k = 0; k < nPieges; k++) {
    const i = alea.entier(1, lignesColisCsv.length - 1);
    const sorte = sortes[k % sortes.length];
    compteurPieges[sorte] = (compteurPieges[sorte] || 0) + 1;
    const l = lignesColisCsv[i].slice();
    if (sorte === "ligne_vide") lignesColisCsv.splice(i, 0, [""]);
    else if (sorte === "coordonnees_nulles") { l[7] = "0"; l[8] = "0"; lignesColisCsv[i] = l; }
    else if (sorte === "poids_negatif") { l[9] = String(-Number(l[9])); lignesColisCsv[i] = l; }
    else if (sorte === "adresse_vide") { l[4] = ""; lignesColisCsv[i] = l; }
    else if (sorte === "colonne_manquante") { l.pop(); lignesColisCsv[i] = l; }
    else if (sorte === "entete_repetee") lignesColisCsv.splice(i, 0, ENTETE_COLIS.slice());
  }
}
sommes["colis.csv"] = ecrire("colis.csv", ENTETE_COLIS, lignesColisCsv);
sommes["verite.csv"] = ecrire("verite.csv", ["colis_id", "adresse_ban_id", "sorte_saisie"], colisUniques.map(c => [c.id, c.adresse.id, c.sorte]));
if (!sansScans) {
  sommes["scans.csv"] = ecrire("scans.csv", ["id", "numero_suivi", "horodatage", "type", "lieu", "livreur_id"],
    scans.map((s, i) => [`S${String(i + 1).padStart(8, "0")}`, s.suivi, heureISO(s.jour, s.minutes), s.type, s.lieu.replace(/;/g, ","), s.livreurId]));
}

// ---------- assertions ----------
const parSorte: Record<string, number> = {};
for (const c of colisUniques) parSorte[c.sorte] = (parSorte[c.sorte] || 0) + 1;
const pharmacie = colisUniques.filter(c => c.priorite === "pharmacie").length;
const lourds = colisUniques.filter(c => c.poids > 25).length;
function verifier(condition: boolean, message: string): void { if (!condition) { console.error("ASSERTION : " + message); process.exit(2); } }
verifier(lignesColis.length === n, `nombre de lignes de colis : ${lignesColis.length} attendu ${n}`);
verifier(new Set(colisUniques.map(c => c.suivi)).size === nUniques, "numéros de suivi non uniques");
verifier(colisUniques.every(c => c.lat > 44.7 && c.lat < 45.1 && c.lon > -0.9 && c.lon < -0.4), "coordonnées hors métropole");
verifier(n < 500 || Math.abs(pharmacie / nUniques - 0.08) < 0.02, `part pharmacie ${(pharmacie / nUniques * 100).toFixed(1)} %`);
verifier(sansScans || scans.length >= nUniques * 8, "trop peu de scans");
verifier(livreurs.filter(l => l.vehicule === "velo_cargo").length === 60, "60 vélos cargo attendus");

const manifeste = {
  jeu: nomJeu, graine, jour_livraison: JOUR_LIVRAISON, genere_le: new Date().toISOString(),
  referentiel: cheminReferentiel.split(/[\\/]/).pop(), adresses_referentiel: referentiel.length,
  referentiel_sha256: shaReferentiel, referentiel_du_module: referentielDuModule,
  colis: { lignes: lignesColis.length, uniques: nUniques, doublons: nDoublons, pharmacie, express: colisUniques.filter(c => c.priorite === "express").length, plus_de_25_kg: lourds, saisies: parSorte },
  livreurs: livreurs.length, clients: clients.length, scans: sansScans ? 0 : scans.length, absents,
  pieges: pieges ? compteurPieges : null, sha1: sommes,
};
writeFileSync(resolve(dossierSortie, "MANIFESTE.json"), JSON.stringify(manifeste, null, 2) + "\n", "utf-8");
console.log(`jeu ${nomJeu} : ${lignesColis.length} colis (${nDoublons} doublons, ${pharmacie} pharmacie, ${lourds} de plus de 25 kg), ${clients.length} clients, ${sansScans ? 0 : scans.length} scans`);
console.log(`saisies : ${Object.entries(parSorte).map(([k, v]) => `${k}=${v}`).join(" ")}`);
if (pieges) console.log(`pièges : ${Object.entries(compteurPieges).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`écrit dans ${dossierSortie} en ${((performance.now() - t0) / 1000).toFixed(1)} s`);
