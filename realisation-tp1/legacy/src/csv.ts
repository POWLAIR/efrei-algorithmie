// Lecture et écriture des CSV du projet. Séparateur ";" et aucun champ ne contient de ";".
// Le legacy lit tout en mémoire : c'est voulu et répertorié.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { AdresseReferentiel, Colis, Hub, Livreur, Priorite, TypeClient, TypeVehicule } from "./modeles.js";

export const SEPARATEUR = ";";

export function lireTexte(chemin: string): string {
  const brut = readFileSync(chemin);
  const texte = chemin.endsWith(".gz") ? gunzipSync(brut).toString("utf-8") : brut.toString("utf-8");
  return texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte;
}

export function lireLignes(chemin: string): { entete: string[]; lignes: string[][] } {
  const texte = lireTexte(chemin);
  const lignes = texte.split(/\r?\n/).filter(l => l.length > 0);
  const entete = lignes[0].split(SEPARATEUR);
  return { entete, lignes: lignes.slice(1).map(l => l.split(SEPARATEUR)) };
}

export function ecrireCsv(chemin: string, entete: string[], lignes: (string | number)[][]): void {
  const corps = lignes.map(l => l.join(SEPARATEUR)).join("\n");
  writeFileSync(chemin, entete.join(SEPARATEUR) + "\n" + corps + "\n", "utf-8");
}

function colonne(entete: string[], nom: string): number {
  const i = entete.indexOf(nom);
  if (i === -1) throw new Error(`colonne absente : ${nom}`);
  return i;
}

export function lireColis(chemin: string): Colis[] {
  const { entete, lignes } = lireLignes(chemin);
  const c = (n: string) => colonne(entete, n);
  const iId = c("id"), iSuivi = c("numero_suivi"), iClient = c("client_id"), iDest = c("destinataire"),
    iAdr = c("adresse_saisie"), iCp = c("code_postal"), iCom = c("commune"), iLat = c("lat"), iLon = c("lon"),
    iPoids = c("poids_kg"), iVol = c("volume_l"), iPrio = c("priorite"), iDeb = c("creneau_debut"),
    iFin = c("creneau_fin"), iType = c("type_client"), iCree = c("cree_le");
  return lignes.map(l => ({
    id: l[iId], numeroSuivi: l[iSuivi], clientId: l[iClient], destinataire: l[iDest],
    adresseSaisie: l[iAdr], codePostal: l[iCp], commune: l[iCom],
    lat: Number(l[iLat]), lon: Number(l[iLon]), poidsKg: Number(l[iPoids]), volumeL: Number(l[iVol]),
    priorite: l[iPrio] as Priorite, creneauDebut: l[iDeb], creneauFin: l[iFin],
    typeClient: l[iType] as TypeClient, creeLe: l[iCree],
  }));
}

export function lireLivreurs(chemin: string): Livreur[] {
  const { entete, lignes } = lireLignes(chemin);
  const c = (n: string) => colonne(entete, n);
  return lignes.map(l => ({
    id: l[c("id")], nom: l[c("nom")], vehicule: l[c("vehicule")] as TypeVehicule,
    capaciteKg: Number(l[c("capacite_kg")]), capaciteL: Number(l[c("capacite_l")]),
    vaguesParJour: Number(l[c("vagues_par_jour")]), hubId: l[c("hub_id")],
    debutService: l[c("debut_service")], finService: l[c("fin_service")],
  }));
}

export function lireHubs(chemin: string): Hub[] {
  const { entete, lignes } = lireLignes(chemin);
  const c = (n: string) => colonne(entete, n);
  return lignes.map(l => ({ id: l[c("id")], nom: l[c("nom")], lat: Number(l[c("lat")]), lon: Number(l[c("lon")]) }));
}

export function lireReferentiel(chemin: string): AdresseReferentiel[] {
  const { entete, lignes } = lireLignes(chemin);
  const c = (n: string) => colonne(entete, n);
  const iId = c("id"), iNum = c("numero"), iRep = c("rep"), iVoie = c("nom_voie"), iCp = c("code_postal"),
    iInsee = c("code_insee"), iCom = c("nom_commune"), iLon = c("lon"), iLat = c("lat");
  return lignes.map(l => ({
    id: l[iId], numero: l[iNum], rep: l[iRep], nomVoie: l[iVoie], codePostal: l[iCp], codeInsee: l[iInsee],
    commune: l[iCom], lon: Number(l[iLon]), lat: Number(l[iLat]),
  }));
}
