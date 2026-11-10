// Correcteur de l'atelier 3 - Le harness (journée 2, fiche 3).
// Il lance votre harness sur le sujet témoin (bench/sujets/temoin.ts), dont on connaît d'avance le nombre
// d'appels, la mémoire et les durées, dans un dossier temporaire : vos résultats ne sont pas touchés.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chemin, dossierTemporaire, ko, lancerNode, lireCsv, lireTexte, nombre, ok, protocole, resultats, type Atelier, type Resultat } from "./kit.js";

const ECHAUFFEMENT = 3, REPETITIONS = 5, TAILLES = [10, 20], VARIANTES = ["reguliere", "irreguliere", "gourmande"];
const ATTENDUS = (ECHAUFFEMENT + REPETITIONS) * TAILLES.length * VARIANTES.length;

interface Temoin { code: number | null; sortie: string; erreurs: string; csv: string | null }
let temoin: Temoin | null = null;
function lancerTemoin(): Temoin {
  if (temoin) return temoin;
  const tmp = dossierTemporaire();
  try {
    const r = lancerNode(["bench/harness.ts", "--sujet", "temoin", "--tailles", TAILLES.join(","), "--variantes", VARIANTES.join(","),
      "--repetitions", String(REPETITIONS), "--echauffement", String(ECHAUFFEMENT), "--resultats", tmp.chemin], 60_000);
    const csvs = readdirSync(tmp.chemin).filter(f => f.endsWith(".csv"));
    temoin = { ...r, csv: csvs.length ? lireTexte(join(tmp.chemin, csvs[0])) : null };
  } finally { tmp.effacer(); }
  return temoin;
}
// La chauffe plafonnée : 1 000 tours demandés, 100 ms au plus, sur une variante de 2 ms. Une cinquantaine d'appels
// si la chauffe s'arrête à temps, 1 001 sinon.
const CHAUFFE_TOURS = 1000, CHAUFFE_MAX_MS = 100, CHAUFFE_LIMITE = 200;
function appelsChauffePlafonnee(): number {
  const tmp = dossierTemporaire();
  try {
    const r = lancerNode(["bench/harness.ts", "--sujet", "temoin", "--tailles", "10", "--variantes", "reguliere", "--repetitions", "1",
      "--echauffement", String(CHAUFFE_TOURS), "--chauffe-max", String(CHAUFFE_MAX_MS), "--resultats", tmp.chemin], 60_000);
    return Number(r.sortie.match(/\[temoin\] appels=(\d+)/)?.[1] ?? NaN);
  } finally { tmp.effacer(); }
}
function lignesTemoin(): Record<string, string>[] {
  const t = lancerTemoin();
  if (!t.csv) return [];
  const l = t.csv.split(/\r?\n/).filter(x => x.trim());
  const e = l[0].split(";");
  return l.slice(1).map(x => { const c = x.split(";"); return Object.fromEntries(e.map((k, i) => [k.trim(), (c[i] ?? "").trim()])); });
}
function lignesHarness(): Record<string, string>[] {
  // Ce que le harness affiche à chaque mesure, si le CSV manque.
  return lancerTemoin().sortie.split(/\r?\n/).filter(l => l.startsWith("[harness] variante=")).map(l =>
    Object.fromEntries([...l.matchAll(/(\w+)=(\S*)/g)].map(m => [m[1], m[2]])));
}
function temoinLance(): Resultat | null {
  const t = lancerTemoin();
  if (t.code !== 0) return ko(`le harness s'arrête avec le code ${t.code} : ${(t.erreurs.trim().split(/\r?\n/).pop() ?? "").slice(0, 160)}`);
  return null;
}

// Les mesures réelles de l'affectation : CSV de bench/resultats avec leur protocole.
function mesuresAffectation(): { csv: string; echauffement: number; variantes: Set<string>; memeControle: boolean }[] {
  return resultats(/-affectation\.csv$/).map(csv => {
    const p = protocole(csv);
    const { lignes } = lireCsv(csv);
    const parTaille = new Map<string, Set<string>>();
    for (const l of lignes) { if (!parTaille.has(l.taille)) parTaille.set(l.taille, new Set()); parTaille.get(l.taille)!.add(l.controle); }
    return {
      csv, echauffement: Number(p?.echauffement ?? -1), variantes: new Set(lignes.map(l => l.variante)),
      memeControle: lignes.length > 0 && [...parTaille.values()].every(s => s.size === 1 && [...s][0] !== ""),
    };
  });
}

// Une entrée de bench/BIAIS-bench-naif.md : un élément de liste ("- ", "* " ou "1. ", le mot "biais" est facultatif)
// qui cite au moins une ligne du fichier ("ligne 22", "lignes 21 à 24", "l. 22") et au moins une des huit questions
// ("question 5", "questions 3, 6 et 8", "Q5").
export function entreeDeBiais(l: string): boolean {
  if (!/^\s*(?:[-*]|\d+[.)])\s+/.test(l)) return false;
  const ligne = /\b(?:lignes?|l\.)\s*\d{1,4}/i.test(l);
  const question = /\bquestions?\s*(?:n°\s*)?[1-8]\b|\bQ\s?[1-8]\b/i.test(l);
  return ligne && question;
}

const atelier: Atelier = {
  numero: 3,
  titre: "Le harness",
  controles: [
    {
      titre: "Les biais du benchmark du CTO sont écrits",
      verifie: "au moins trois biais dans bench/BIAIS-bench-naif.md, un par élément de liste, chacun avec au moins un numéro de ligne et une question (1 à 8)",
      voir: "fiche 3, sous-objectif 1 (le format d'une entrée), et les huit questions recopiées dans bench/BIAIS-bench-naif-gabarit.md",
      test: () => {
        const p = chemin("bench", "BIAIS-bench-naif.md");
        if (!existsSync(p)) return ko("bench/BIAIS-bench-naif.md absent (copiez bench/BIAIS-bench-naif-gabarit.md)");
        const biais = lireTexte(p).split(/\r?\n/).filter(entreeDeBiais);
        return biais.length >= 3 ? ok(`${biais.length} biais`) : ko(`${biais.length} biais complet(s) : il faut une ligne et une question pour chacun`);
      },
    },
    {
      titre: "À COMPLÉTER 1 : l'échauffement est fait avant les mesures",
      verifie: `le sujet témoin, ${REPETITIONS} répétitions et ${ECHAUFFEMENT} tours d'échauffement : ${ATTENDUS} appels attendus ; puis ${CHAUFFE_TOURS} tours demandés avec --chauffe-max ${CHAUFFE_MAX_MS} : moins de ${CHAUFFE_LIMITE} appels`,
      voir: "fiche 3, sous-objectif 2, et le commentaire À COMPLÉTER 1 de bench/harness.ts",
      test: () => {
        const e = temoinLance(); if (e) return e;
        const n = Number(lancerTemoin().sortie.match(/\[temoin\] appels=(\d+)/)?.[1] ?? NaN);
        if (n !== ATTENDUS) return ko(`${n} appels : ${n < ATTENDUS ? "les tours d'échauffement manquent" : "trop d'appels pour une seule mesure"}`);
        const c = appelsChauffePlafonnee();
        return c < CHAUFFE_LIMITE ? ok() : ko(`${c} appels avec --chauffe-max ${CHAUFFE_MAX_MS} : la chauffe ne s'arrête pas quand le temps est dépassé`);
      },
    },
    {
      titre: "À COMPLÉTER 2 : la mémoire est relevée",
      verifie: "la colonne memoire_ko : non nulle, et plus grande pour la variante qui garde 2 000 nombres par unité de taille",
      voir: "fiche 3, sous-objectif 2, et le commentaire À COMPLÉTER 2 (lancez bien le harness par npm run bench)",
      test: () => {
        const e = temoinLance(); if (e) return e;
        const l = lignesTemoin().length ? lignesTemoin() : lignesHarness();
        const memo = (v: string) => l.filter(x => x.variante === v && x.taille === "20").map(x => nombre(x.memoire_ko));
        const g = memo("gourmande"), r = memo("reguliere");
        if (g.length === 0) return ko("aucune mesure de la variante gourmande à la taille 20");
        if (l.every(x => nombre(x.memoire_ko) === 0)) return ko("memoire_ko vaut 0 partout");
        const mg = g.sort((a, b) => a - b)[Math.floor(g.length / 2)], mr = r.sort((a, b) => a - b)[Math.floor(r.length / 2)];
        return mg > 150 && mg > mr ? ok(`${mg} Ko pour la variante gourmande`) : ko(`médiane ${mg} Ko pour la variante gourmande, ${mr} Ko pour la régulière`);
      },
    },
    {
      titre: "À COMPLÉTER 3 : le résultat est consommé par la somme de contrôle",
      verifie: "la colonne controle du sujet témoin (valeur attendue : t10 ou t20 selon la taille)",
      voir: "fiche 3, sous-objectif 2, et le commentaire À COMPLÉTER 3",
      test: () => {
        const e = temoinLance(); if (e) return e;
        const l = lignesTemoin().length ? lignesTemoin() : lignesHarness();
        const faux = l.filter(x => x.controle !== `t${x.taille}`);
        return l.length && faux.length === 0 ? ok() : ko(faux.length ? `controle="${faux[0].controle}" à la taille ${faux[0].taille}` : "aucune mesure lue");
      },
    },
    {
      titre: "À COMPLÉTER 4 : le résumé donne la médiane",
      verifie: "le résumé affiché pour la variante irrégulière (quatre mesures à 2 ms, une à 40 ms : médiane 2, moyenne près de 10)",
      voir: "fiche 3, sous-objectif 2, et le commentaire À COMPLÉTER 4",
      test: () => {
        const e = temoinLance(); if (e) return e;
        const ligne = lancerTemoin().sortie.split(/\r?\n/).find(l => /^irreguliere\s+10\s/.test(l));
        if (!ligne) return ko("ligne du résumé \"irreguliere 10\" introuvable");
        const v = nombre(ligne.trim().split(/\s+/)[2]);
        return v < 5 ? ok(`${v} ms`) : ko(`le résumé affiche ${v} ms`);
      },
    },
    {
      titre: "À COMPLÉTER 5 : les mesures sont exportées en CSV",
      verifie: `un CSV dans le dossier --resultats, en-tête variante;taille;repetition;duree_ms;memoire_ko;controle, ${REPETITIONS * TAILLES.length * VARIANTES.length} lignes`,
      voir: "fiche 3, sous-objectif 2, et le commentaire À COMPLÉTER 5 (écrire dans fichierCsv)",
      test: () => {
        const e = temoinLance(); if (e) return e;
        const t = lancerTemoin();
        if (!t.csv) return ko("aucun CSV écrit dans le dossier --resultats");
        const lignes = t.csv.split(/\r?\n/).filter(x => x.trim());
        if (lignes[0].trim() !== "variante;taille;repetition;duree_ms;memoire_ko;controle") return ko(`en-tête : ${lignes[0].slice(0, 80)}`);
        const n = lignes.length - 1, attendu = REPETITIONS * TAILLES.length * VARIANTES.length;
        return n === attendu ? ok() : ko(`${n} lignes de mesure au lieu de ${attendu}`);
      },
    },
    {
      titre: "L'affectation est mesurée avec 2 tours d'échauffement",
      verifie: "un CSV bench/resultats/*-affectation.csv dont le protocole indique echauffement=2, variantes tri et map",
      voir: "fiche 3, sous-objectif 3",
      test: () => {
        const m = mesuresAffectation();
        return m.some(x => x.echauffement === 2 && x.variantes.has("tri") && x.variantes.has("map")) ? ok() : ko(`${m.length} mesure(s) d'affectation, aucune avec 2 tours d'échauffement sur tri et map`);
      },
    },
    {
      titre: "L'affectation est mesurée avec un échauffement réglé, et les variantes concordent",
      verifie: "un CSV d'affectation avec au moins 100 tours d'échauffement, tri et map, la même somme de contrôle à chaque taille",
      voir: "fiche 3, sous-objectif 3 (les deux commandes de l'annexe)",
      test: () => {
        const m = mesuresAffectation().filter(x => x.echauffement >= 100 && x.variantes.has("tri") && x.variantes.has("map"));
        if (m.length === 0) return ko("aucune mesure d'affectation avec au moins 100 tours d'échauffement sur tri et map");
        return m.some(x => x.memeControle) ? ok() : ko("la colonne controle est vide ou diffère entre variantes");
      },
    },
  ],
};

export default atelier;
