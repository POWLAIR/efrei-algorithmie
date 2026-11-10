// Prépare le référentiel d'adresses à partir de la Base Adresse Nationale (BAN), département de la Gironde.
// Source : https://adresse.data.gouv.fr/data/ban/adresses/latest/csv/adresses-33.csv.gz (Licence Ouverte 2.0)
//
//   npm run ban                      télécharge le fichier s'il manque, puis produit les deux référentiels
//   npm run ban -- --sans-telechargement
//
// Sorties dans data/referentiel :
//   adresses-gironde.csv     tout le département, colonnes réduites (732 000 adresses environ)
//   adresses-metropole.csv   les 28 communes de Bordeaux Métropole (229 000 adresses environ)
import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const URL_BAN = "https://adresse.data.gouv.fr/data/ban/adresses/latest/csv/adresses-33.csv.gz";
const DOSSIER = resolve("data", "referentiel");
const SOURCE = resolve(DOSSIER, "adresses-33.csv.gz");

export const COMMUNES_METROPOLE: Record<string, string> = {
  "33003": "Ambarès-et-Lagrave", "33004": "Ambès", "33013": "Artigues-près-Bordeaux", "33032": "Bassens",
  "33039": "Bègles", "33056": "Blanquefort", "33063": "Bordeaux", "33065": "Bouliac", "33069": "Le Bouscat",
  "33075": "Bruges", "33096": "Carbon-Blanc", "33119": "Cenon", "33162": "Eysines", "33167": "Floirac",
  "33192": "Gradignan", "33200": "Le Haillan", "33249": "Lormont", "33273": "Martignas-sur-Jalle",
  "33281": "Mérignac", "33312": "Parempuyre", "33318": "Pessac", "33434": "Saint-Aubin-de-Médoc",
  "33449": "Saint-Médard-en-Jalles", "33487": "Saint-Louis-de-Montferrand", "33519": "Saint-Vincent-de-Paul",
  "33376": "Le Taillan-Médoc", "33522": "Talence", "33550": "Villenave-d'Ornon",
};

const COLONNES_SORTIE = ["id", "numero", "rep", "nom_voie", "code_postal", "code_insee", "nom_commune", "lon", "lat"];

async function telecharger(): Promise<void> {
  console.log(`téléchargement de ${URL_BAN} ...`);
  const reponse = await fetch(URL_BAN);
  if (!reponse.ok || !reponse.body) throw new Error(`téléchargement impossible : HTTP ${reponse.status}`);
  await pipeline(Readable.fromWeb(reponse.body as any), createWriteStream(SOURCE));
  console.log(`fichier enregistré : ${SOURCE}`);
}

async function preparer(): Promise<void> {
  const lecteur = createInterface({ input: createReadStream(SOURCE).pipe(createGunzip()), crlfDelay: Infinity });
  const gironde = createWriteStream(resolve(DOSSIER, "adresses-gironde.csv"));
  const metropole = createWriteStream(resolve(DOSSIER, "adresses-metropole.csv"));
  const entete = COLONNES_SORTIE.join(";") + "\n";
  gironde.write(entete); metropole.write(entete);
  let index: Record<string, number> | null = null;
  let total = 0, dansMetropole = 0;
  for await (const ligne of lecteur) {
    const champs = ligne.split(";");
    if (!index) { index = {}; champs.forEach((c, i) => { index![c] = i; }); continue; }
    if (champs.length < 15) continue;
    const sortie = COLONNES_SORTIE.map(c => champs[index![c]] ?? "").join(";") + "\n";
    gironde.write(sortie); total++;
    if (COMMUNES_METROPOLE[champs[index["code_insee"]]]) { metropole.write(sortie); dansMetropole++; }
  }
  await Promise.all([new Promise(r => gironde.end(r)), new Promise(r => metropole.end(r))]);
  writeFileSync(resolve(DOSSIER, "LICENCE_BAN.txt"),
    "Base Adresse Nationale, departement de la Gironde.\nSource : " + URL_BAN + "\nLicence Ouverte / Open Licence 2.0 (Etalab).\n" +
    `Preparation le ${new Date().toISOString().slice(0, 10)} : ${total} adresses en Gironde, ${dansMetropole} dans Bordeaux Metropole.\n`, "utf-8");
  console.log(`adresses-gironde.csv : ${total} adresses`);
  console.log(`adresses-metropole.csv : ${dansMetropole} adresses (28 communes)`);
}

mkdirSync(DOSSIER, { recursive: true });
if (!existsSync(SOURCE)) {
  if (process.argv.includes("--sans-telechargement")) { console.error(`source absente : ${SOURCE}`); process.exit(1); }
  await telecharger();
}
await preparer();
