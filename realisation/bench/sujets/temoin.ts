// Sujet "temoin" : un faux problème dont on connaît d'avance les durées, la mémoire et les résultats.
// Il ne sert qu'au correcteur (npm run verifier -- 3), qui l'utilise pour vérifier votre harness :
// échauffement fait, mémoire relevée, résultat consommé, médiane, export CSV. Ne le modifiez pas.
import type { Sujet } from "./types.js";

let appels = 0;
let suivi = false;
// Le nombre d'appels, affiché à la fin : le correcteur y lit si l'échauffement a eu lieu.
function compter(): void {
  if (!suivi) { suivi = true; process.on("exit", () => { console.log(`[temoin] appels=${appels}`); }); }
  appels++;
}

// Occupe le processeur `ms` millisecondes sans rien allouer : la mémoire relevée autour de l'appel reste
// proche de zéro. Une attente active, et pas une mise en sommeil : sous Windows, une mise en sommeil de
// 2 ms dure en pratique jusqu'à 15 ms (la granularité de l'horloge du système), et la médiane serait fausse.
// L'horloge n'est lue que tous les 2 000 tours d'une petite boucle sur des entiers, qui n'alloue rien.
let tours = 0;
function occuper(ms: number): void {
  const fin = performance.now() + ms;
  while (performance.now() < fin) {
    for (let i = 0; i < 2000; i++) tours = (tours + i) | 0;
  }
}

interface Entree { taille: number }

const sujet: Sujet<null, Entree, number[]> = {
  nom: "temoin",
  titre: "Sujet témoin du correcteur (durées, mémoire et résultats connus d'avance)",
  parDefaut: { jeu: "temoin", tailles: [10, 20], variantes: ["reguliere", "irreguliere", "gourmande"] },
  charger: () => null,
  tailleMax: () => Number.POSITIVE_INFINITY,
  preparer: (_d, taille) => ({ taille }),
  variantes: {
    // Deux millisecondes à chaque appel.
    reguliere: e => { compter(); occuper(2); return [e.taille]; },
    // Deux millisecondes, sauf un appel sur cinq qui en prend quarante : la moyenne et la médiane divergent.
    irreguliere: e => { compter(); occuper(appels % 5 === 2 ? 40 : 2); return [e.taille]; },
    // Garde 2 000 nombres par unité de taille : sa mémoire est connue d'avance.
    gourmande: e => {
      compter();
      const t: number[] = new Array(e.taille * 2000);
      for (let i = 0; i < t.length; i++) t[i] = i + 0.5;
      t[0] = e.taille;
      return t;
    },
  },
  controle: r => `t${r[0]}`,
};

export default sujet;
