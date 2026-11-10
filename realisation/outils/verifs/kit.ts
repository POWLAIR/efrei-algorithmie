// Outils communs des correcteurs d'atelier (npm run verifier -- <numéro>).
// Un correcteur ne modifie rien dans le dépôt : il lit, lance des mesures dans un dossier temporaire, compare.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

export interface Resultat { ok: boolean; trouve: string }
export interface Controle {
  titre: string;      // ce qui doit être vrai, en une ligne
  verifie: string;    // comment le correcteur le vérifie
  voir: string;       // où regarder si c'est KO (la fiche, le sous-objectif, un fichier d'exemple)
  test: () => Resultat | Promise<Resultat>;
}
export interface Atelier { numero: number; titre: string; controles: Controle[] }

export const RACINE = process.cwd();
export const ok = (trouve = ""): Resultat => ({ ok: true, trouve });
export const ko = (trouve: string): Resultat => ({ ok: false, trouve });

export const chemin = (...p: string[]) => resolve(RACINE, ...p);
export const existe = (...p: string[]) => existsSync(chemin(...p));
export const rel = (p: string) => relative(RACINE, p).replace(/\\/g, "/");

export function sha256(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

// Lit un fichier texte, en UTF-8 ou en UTF-16 (ce qu'écrit la redirection > de PowerShell 5).
export function lireTexte(p: string): string {
  const brut = readFileSync(p);
  const t = brut[0] === 0xff && brut[1] === 0xfe ? brut.toString("utf16le") : brut.toString("utf-8");
  return t.replace(/^﻿/, "");
}

export interface Csv { entete: string[]; lignes: Record<string, string>[] }
export function lireCsv(p: string): Csv {
  const lignes = lireTexte(p).split(/\r?\n/).filter(l => l.trim() !== "" && !l.startsWith("#"));
  const entete = (lignes[0] ?? "").split(";").map(s => s.trim());
  return { entete, lignes: lignes.slice(1).map(l => { const c = l.split(";"); return Object.fromEntries(entete.map((e, i) => [e, (c[i] ?? "").trim()])); }) };
}

export const nombre = (s: string | undefined) => Number(String(s ?? "").replace(",", ".").replace(/\s/g, ""));

export function mediane(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Les fichiers de bench/resultats qui correspondent à un motif, du plus récent au plus ancien.
export function resultats(motif: RegExp): string[] {
  const d = chemin("bench", "resultats");
  if (!existsSync(d)) return [];
  return readdirSync(d).filter(f => motif.test(f)).map(f => join(d, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

// Le protocole écrit par le harness à côté de son CSV (même nom, extension .json), ou null.
export function protocole(csv: string): Record<string, any> | null {
  const j = csv.replace(/\.csv$/, ".json");
  if (!existsSync(j)) return null;
  try { return JSON.parse(lireTexte(j)); } catch { return null; }
}

export function manifeste(jeu: string): Record<string, any> | null {
  const p = chemin("data", "jeux", jeu, "MANIFESTE.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(lireTexte(p)); } catch { return null; }
}

// Lance Node avec les mêmes réglages que les scripts npm (tsx, --expose-gc), depuis la racine du dépôt.
export function lancerNode(args: string[], delaiMs = 120_000): { code: number | null; sortie: string; erreurs: string } {
  const r = spawnSync(process.execPath, ["--expose-gc", "--import", "tsx", ...args], {
    cwd: RACINE, encoding: "utf-8", timeout: delaiMs, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return { code: r.status, sortie: r.stdout ?? "", erreurs: (r.stderr ?? "") + (r.error ? String(r.error) : "") };
}

export function dossierTemporaire(): { chemin: string; effacer: () => void } {
  const d = mkdtempSync(join(tmpdir(), "verifier-"));
  return { chemin: d, effacer: () => rmSync(d, { recursive: true, force: true }) };
}

// Le texte sous un titre de niveau 2 d'un fichier Markdown ("## 3. Mesures" -> son corps).
export function rubriques(texte: string): Map<string, string> {
  const m = new Map<string, string>();
  let titre: string | null = null; let corps: string[] = [];
  for (const l of texte.split(/\r?\n/)) {
    if (/^##\s/.test(l)) { if (titre) m.set(titre, corps.join("\n").trim()); titre = l.replace(/^##\s+/, "").trim(); corps = []; }
    else if (titre) corps.push(l);
  }
  if (titre) m.set(titre, corps.join("\n").trim());
  return m;
}

// Le tas binaire de l'atelier 6, éprouvé par des ajouts et des retraits mêlés, sa règle vérifiée après chaque geste :
// un tas qui ne descend pas quand la case n'a qu'un enfant passe "tout ajouter puis tout retirer", pas ceci.
// Rend null si le tas tient, sinon la phrase du KO.
export async function tasMele(): Promise<string | null> {
  const { TasBinaire } = await import("../../bench/variantes/tas.js");
  const { Alea } = await import("../../data/generateur/alea.js");
  const alea = new Alea(11);
  const tas = new TasBinaire<number>((a, b) => a - b);
  for (let k = 0; k < 4000; k++) {
    tas.ajouter(alea.entier(0, 500));
    if (alea.entier(0, 1)) tas.retirer();
    const x = (tas as unknown as { t: number[] }).t;
    const i = x.findIndex((v, j) => j > 0 && x[(j - 1) >> 1] > v);
    if (i > 0) return `après ${k + 1} ajouts et retraits mêlés, la case ${i} passe avant son parent (case ${(i - 1) >> 1}) : souvent la descente quand la case n'a qu'un enfant`;
  }
  return null;
}
