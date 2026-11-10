// Le batch de nuit "Aiguillage" : les quatre étapes dans l'ordre, avec les logs tels qu'ils sortent en production.
import { performance } from "node:perf_hooks";
import type { AdresseReferentiel, Colis, Hub, Livreur } from "./modeles.js";
import { rapprocherAdresses } from "./adresses.js";
import { affecterColis } from "./affectation.js";
import { ordonnerArrets } from "./tournees.js";
import { chargerVehicule } from "./chargement.js";

export type Etape = "adresses" | "affectation" | "tournees" | "chargement";
export const ETAPES: Etape[] = ["adresses", "affectation", "tournees", "chargement"];

export interface Jeu {
  nom: string;
  colis: Colis[];
  livreurs: Livreur[];
  hubs: Hub[];
  referentiel: AdresseReferentiel[] | null;
}

export interface MesureEtape {
  etape: Etape;
  dureeMs: number;
  details: Record<string, number | string>;
}

function log(ligne: string): void {
  const h = new Date().toISOString().slice(11, 19);
  console.log(`[${h}] ${ligne}`);
}

function formatDetails(d: Record<string, number | string>): string {
  return Object.entries(d).map(([k, v]) => `${k}=${typeof v === "number" ? Number(v.toFixed(2)) : v}`).join(" ");
}

export function executerEtape(etape: Etape, jeu: Jeu, options: { limiteAdresses?: number } = {}): MesureEtape {
  const debut = performance.now();
  let details: Record<string, number | string> = {};
  if (etape === "adresses") {
    if (!jeu.referentiel) throw new Error("référentiel d'adresses absent : lancez npm run ban");
    const lot = options.limiteAdresses ? jeu.colis.slice(0, options.limiteAdresses) : jeu.colis;
    const r = rapprocherAdresses(lot, jeu.referentiel);
    const exacts = r.filter(x => x.distance === 0).length;
    details = { colis: lot.length, referentiel: jeu.referentiel.length, exacts, approches: r.length - exacts };
  } else if (etape === "affectation") {
    const r = affecterColis(jeu.colis, jeu.livreurs, jeu.hubs);
    const affectes = r.tournees.reduce((s, t) => s + t.colis.length, 0);
    details = { colis: jeu.colis.length, tournees: r.tournees.length, affectes, non_affectes: r.nonAffectes.length, doublons: r.doublonsIgnores };
  } else if (etape === "tournees") {
    const r = affecterColis(jeu.colis, jeu.livreurs, jeu.hubs);
    let km = 0, arrets = 0;
    for (const t of r.tournees) { const o = ordonnerArrets(t); km += o.distanceTotaleKm; arrets += o.arrets.length; }
    details = { tournees: r.tournees.length, arrets, km_total: km };
  } else if (etape === "chargement") {
    const r = affecterColis(jeu.colis, jeu.livreurs, jeu.hubs);
    let vagues = 0;
    for (const t of r.tournees) vagues += chargerVehicule(t).vagues.length;
    details = { tournees: r.tournees.length, vagues };
  }
  const dureeMs = performance.now() - debut;
  return { etape, dureeMs, details };
}

export function executerBatch(jeu: Jeu, etapes: Etape[], options: { limiteAdresses?: number } = {}): MesureEtape[] {
  const mesures: MesureEtape[] = [];
  log(`batch=aiguillage jeu=${jeu.nom} colis=${jeu.colis.length} livreurs=${jeu.livreurs.length} debut`);
  for (const e of etapes) {
    log(`etape=${e} debut`);
    const m = executerEtape(e, jeu, options);
    mesures.push(m);
    log(`etape=${e} fin duree_ms=${m.dureeMs.toFixed(1)} ${formatDetails(m.details)}`);
  }
  const total = mesures.reduce((s, m) => s + m.dureeMs, 0);
  log(`batch=aiguillage fin duree_ms=${total.toFixed(1)}`);
  return mesures;
}
