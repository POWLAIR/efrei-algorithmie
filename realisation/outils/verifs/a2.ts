// Correcteur de l'atelier 2 - Premier chrono (journée 2, fiche 2).
import { existsSync } from "node:fs";
import { REFERENCE } from "../../data/generateur/reference.js";
import { chemin, existe, ko, lireCsv, mediane, manifeste, nombre, ok, sha256, type Atelier } from "./kit.js";

const CSV = chemin("bench", "resultats", "j1-chrono.csv");

function medianesLegacy(): Map<number, { n: number; med: number }> {
  const m = new Map<number, number[]>();
  for (const l of lireCsv(CSV).lignes) {
    if (l.variante !== "legacy") continue;
    const t = nombre(l.taille), d = nombre(l.duree_ms);
    if (!Number.isFinite(t) || !Number.isFinite(d)) continue;
    if (!m.has(t)) m.set(t, []);
    m.get(t)!.push(d);
  }
  return new Map([...m].map(([t, ds]) => [t, { n: ds.length, med: mediane(ds) }]));
}

const atelier: Atelier = {
  numero: 2,
  titre: "Premier chrono",
  controles: [
    {
      titre: "L'archive du référentiel est celle du module",
      verifie: "l'empreinte de data/referentiel/adresses-33.csv.gz",
      voir: "fiche 2, sous-objectif 1 (l'archive est sur Moodle, section Journée 2)",
      test: () => {
        const p = chemin("data", "referentiel", "adresses-33.csv.gz");
        if (!existsSync(p)) return ko("data/referentiel/adresses-33.csv.gz absent");
        const s = sha256(p);
        return s === REFERENCE.archive.sha256 ? ok() : ko(`empreinte ${s.slice(0, 12)}..., ce n'est pas la version du ${REFERENCE.date}`);
      },
    },
    {
      titre: "Le référentiel de la métropole est préparé à partir de cette archive",
      verifie: "l'empreinte de data/referentiel/adresses-metropole.csv",
      voir: "fiche 2, sous-objectif 1 : la commande qui prépare les deux référentiels",
      test: () => {
        const p = chemin("data", "referentiel", "adresses-metropole.csv");
        if (!existsSync(p)) return ko("data/referentiel/adresses-metropole.csv absent");
        return sha256(p) === REFERENCE.metropole.sha256 ? ok() : ko("le fichier existe mais ne vient pas de l'archive du module");
      },
    },
    {
      titre: "Les jeux petite, moyenne et grande sont générés avec le référentiel du module",
      verifie: "le fichier MANIFESTE.json de chaque jeu dans data/jeux",
      voir: "fiche 2, sous-objectif 2",
      test: () => {
        const manques: string[] = [];
        for (const [jeu, n] of [["petite", 1000], ["moyenne", 10000], ["grande", 100000]] as const) {
          const m = manifeste(jeu);
          if (!m) manques.push(`${jeu} absent`);
          else if (m.colis?.lignes !== n) manques.push(`${jeu} : ${m.colis?.lignes} colis au lieu de ${n}`);
          else if (m.referentiel_sha256 !== REFERENCE.metropole.sha256) manques.push(`${jeu} généré avec un autre référentiel (régénérez-le)`);
        }
        return manques.length ? ko(manques.join(" ; ")) : ok();
      },
    },
    {
      titre: "Le legacy est chronométré aux trois tailles dans bench/resultats/j1-chrono.csv",
      verifie: "au moins trois mesures à 1 000 et à 10 000 colis, au moins une à 100 000, variante legacy",
      voir: "fiche 2, sous-objectif 3 : l'option qui ajoute chaque répétition au CSV",
      test: () => {
        if (!existsSync(CSV)) return ko("bench/resultats/j1-chrono.csv absent");
        const m = medianesLegacy();
        const manques = [[1000, 3], [10000, 3], [100000, 1]].filter(([t, k]) => (m.get(t)?.n ?? 0) < k)
          .map(([t, k]) => `${m.get(t)?.n ?? 0} mesure(s) à ${t} colis, ${k} attendue(s)`);
        return manques.length ? ko(manques.join(" ; ")) : ok();
      },
    },
    {
      titre: "Les mesures sont cohérentes entre elles (même zone chronométrée)",
      verifie: "les médianes du CSV croissent avec la taille et le rapport entre 100 000 et 10 000 colis dépasse 20",
      voir: "fiche 2, sous-objectif 3 : ce que mesure duree_ms, ce que mesure Measure-Command",
      test: () => {
        if (!existsSync(CSV)) return ko("bench/resultats/j1-chrono.csv absent");
        const m = medianesLegacy();
        const a = m.get(1000)?.med, b = m.get(10000)?.med, c = m.get(100000)?.med;
        if (a === undefined || b === undefined || c === undefined) return ko("il manque une des trois tailles");
        if (!(a < b && b < c)) return ko(`médianes ${a.toFixed(1)}, ${b.toFixed(1)}, ${c.toFixed(1)} ms : elles ne croissent pas avec la taille`);
        const r = c / b;
        return r > 20 ? ok(`rapports ${(b / a).toFixed(0)} puis ${r.toFixed(0)}`) : ko(`rapport ${r.toFixed(1)} entre 100 000 et 10 000 colis : deux mesures de nature différente dans le même fichier ?`);
      },
    },
    {
      titre: "La courbe est tracée",
      verifie: "bench/resultats/j1-chrono.svg existe",
      voir: "fiche 2, sous-objectif 4",
      test: () => existe("bench", "resultats", "j1-chrono.svg") ? ok() : ko("bench/resultats/j1-chrono.svg absent"),
    },
  ],
};

export default atelier;
