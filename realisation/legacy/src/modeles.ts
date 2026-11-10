// Modèles du monolithe "Quai" (Efrei Logistique, 2019).
// Ces types décrivent les lignes des fichiers CSV du dossier data/jeux.

export type Priorite = "standard" | "express" | "pharmacie";
export type TypeVehicule = "velo_cargo" | "utilitaire_electrique";
export type TypeClient = "commerce" | "restaurant" | "e_commerce" | "pharmacie";

export interface Colis {
  id: string;
  numeroSuivi: string;
  clientId: string;
  destinataire: string;
  adresseSaisie: string;
  codePostal: string;
  commune: string;
  lat: number;
  lon: number;
  poidsKg: number;
  volumeL: number;
  priorite: Priorite;
  creneauDebut: string; // "08:00"
  creneauFin: string;   // "10:00"
  typeClient: TypeClient;
  creeLe: string;       // ISO 8601
}

export interface Hub {
  id: string;
  nom: string;
  lat: number;
  lon: number;
}

export interface Livreur {
  id: string;
  nom: string;
  vehicule: TypeVehicule;
  capaciteKg: number;   // par vague de chargement
  capaciteL: number;
  vaguesParJour: number;
  hubId: string;
  debutService: string;
  finService: string;
}

export interface Tournee {
  livreur: Livreur;
  hub: Hub;
  colis: Colis[];
  poidsKg: number;
  volumeL: number;
}

export interface Arret {
  colis: Colis;
  ordre: number;
  distanceDepuisPrecedentKm: number;
}

export interface TourneeOrdonnee {
  livreur: Livreur;
  arrets: Arret[];
  distanceTotaleKm: number;
}

export interface Vague {
  numero: number;
  colis: Colis[];
  poidsKg: number;
  volumeL: number;
}

export interface Chargement {
  livreur: Livreur;
  vagues: Vague[];
}

export interface AdresseReferentiel {
  id: string;
  numero: string;
  rep: string;
  nomVoie: string;
  codePostal: string;
  codeInsee: string;
  commune: string;
  lon: number;
  lat: number;
}

export interface Rapprochement {
  colisId: string;
  adresseId: string | null;
  distance: number; // distance de Levenshtein entre la saisie normalisée et l'adresse retenue
}
