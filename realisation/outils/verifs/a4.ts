// Correcteur de l'atelier 4 - La première décision, ADR-001 (journée 2, fiche 4).
import { existsSync, readdirSync } from "node:fs";
import { chemin, ko, lancerNode, lireCsv, lireTexte, nombre, ok, protocole, resultats, rubriques, type Atelier, type Resultat } from "./kit.js";

// Les mots qu'on n'emploie pas devant la directrice des opérations (slide "Trois phrases pour Nadia Ferreira", fiche 4, annexe).
const INTERDITS = ["algorithme", "complexité", "quadratique", "O(n", "boucle", "tableau", "indexOf", "cache", "référentiel",
  "index", "requête", "base de données", "variante", "benchmark", "performance", "harness", "map", "set", "médiane", "milliseconde", "ms"];

function sansAccents(s: string): string { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

function fichierAdr(): string | null {
  const d = chemin("adr");
  if (!existsSync(d)) return null;
  const f = readdirSync(d).find(x => /^ADR-001.*\.md$/i.test(x));
  return f ? chemin("adr", f) : null;
}

function rubrique(r: Map<string, string>, n: number): string | undefined {
  for (const [titre, corps] of r) if (titre.startsWith(`${n}.`)) return corps;
  return undefined;
}

function mesureComplete(): Resultat {
  const csvs = resultats(/-affectation\.csv$/);
  for (const csv of csvs) {
    const p = protocole(csv);
    const { lignes } = lireCsv(csv);
    const v = new Set(lignes.map(l => l.variante)), t = new Set(lignes.map(l => l.taille));
    if (Number(p?.echauffement ?? 0) < 100 || !["naive", "tri", "map"].every(x => v.has(x)) || t.size < 3) continue;
    const parTaille = new Map<string, Set<string>>();
    for (const l of lignes) { if (!parTaille.has(l.taille)) parTaille.set(l.taille, new Set()); parTaille.get(l.taille)!.add(l.controle); }
    if ([...parTaille.values()].every(s => s.size === 1 && [...s][0] !== "")) return ok(csv.split(/[\\/]/).pop());
    return ko(`${csv.split(/[\\/]/).pop()} : la colonne controle diffère entre variantes ; la mesure ne vaut rien tant que ce n'est pas réglé`);
  }
  return ko(`${csvs.length} mesure(s) d'affectation, aucune avec naive, tri et map, trois tailles et au moins 100 tours d'échauffement`);
}

const atelier: Atelier = {
  numero: 4,
  titre: "La première décision (ADR-001)",
  controles: [
    {
      titre: "Les trois variantes sont mesurées avec le harness, échauffement réglé",
      verifie: "un CSV bench/resultats/*-affectation.csv : naive, tri et map, trois tailles au moins, 100 tours d'échauffement au moins, même somme de contrôle",
      voir: "fiche 4, sous-objectif 1",
      test: mesureComplete,
    },
    {
      titre: "La courbe de cette mesure est tracée",
      verifie: "un fichier .svg à côté d'un CSV d'affectation",
      voir: "fiche 4, sous-objectif 1 : la commande de la courbe",
      test: () => resultats(/-affectation\.svg$/).length ? ok() : ko("aucune courbe *-affectation.svg dans bench/resultats"),
    },
    {
      titre: "Les couples colis-livreur sont comptés jusqu'au volume de décembre",
      verifie: "un CSV bench/resultats/*-couples.csv avec tri et map à 15 000 colis",
      voir: "fiche 4, sous-objectif 2",
      test: () => {
        for (const csv of resultats(/-couples\.csv$/)) {
          const l = lireCsv(csv).lignes;
          if (["tri", "map"].every(v => l.some(x => x.variante === v && nombre(x.taille) === 15000))) return ok();
        }
        return ko("aucun comptage de couples à 15 000 colis pour tri et map");
      },
    },
    {
      titre: "Les variantes donnent le même résultat que le legacy (npm test)",
      verifie: "les tests de tests/*.test.ts, lancés par le correcteur",
      voir: "fiche 4, sous-objectif 3",
      test: () => {
        const fichiers = readdirSync(chemin("tests")).filter(f => f.endsWith(".test.ts")).map(f => `tests/${f}`);
        // Le format TAP, quelle que soit la version de Node : le correcteur lit "# fail".
        const r = lancerNode(["--test", "--test-reporter=tap", ...fichiers], 300_000);
        const echecs = Number(r.sortie.match(/# fail (\d+)/)?.[1] ?? NaN), sautes = Number(r.sortie.match(/# skipped (\d+)/)?.[1] ?? 0);
        if (r.code === 0 && sautes === 0) return ok();
        if (sautes > 0) return ko(`${sautes} test(s) sauté(s) : un jeu de données manque`);
        return ko(`${Number.isNaN(echecs) ? "les tests ne se lancent pas" : echecs + " test(s) en échec"}`);
      },
    },
    {
      titre: "La grille comparative de l'ADR-001 est remplie",
      verifie: "adr/GRILLE-ADR-001.md : cinq poids dont la somme fait 10, puis une note par critère pour au moins trois options, un chiffre seul de 1 à 5 par case",
      voir: "fiche 4, sous-objectif 4, l'annexe (les barèmes), et adr/grille-comparative.md",
      test: () => {
        const p = chemin("adr", "GRILLE-ADR-001.md");
        if (!existsSync(p)) return ko("adr/GRILLE-ADR-001.md absent (copiez adr/grille-comparative.md)");
        const lignes = lireTexte(p).split(/\r?\n/).filter(l => l.trim().startsWith("|"));
        const cellules = (l: string) => l.split("|").slice(1, -1).map(c => c.trim());
        const poids = ["Temps", "Mémoire", "Lisibilité", "Robustesse", "Coût"].map(c => {
          const l = lignes.find(x => cellules(x)[0]?.startsWith(c) && cellules(x).length === 3);
          return l ? nombre(cellules(l)[2]) : Number.NaN;
        });
        if (poids.some(Number.isNaN)) return ko("un poids n'est pas un nombre dans le tableau des critères");
        const somme = poids.reduce((s, x) => s + x, 0);
        if (somme !== 10) return ko(`la somme des poids vaut ${somme}`);
        const options = lignes.filter(l => { const c = cellules(l); return c.length >= 7 && c.slice(1, 6).every(x => /^[1-5]$/.test(x)); });
        return options.length >= 3 ? ok(`poids ${poids.join(", ")} ; ${options.length} options notées`) : ko(`${options.length} option(s) notée(s) sur les cinq critères : il en faut trois, avec un chiffre seul de 1 à 5 par case (pas \"4/5\" ni \"4 (lisible)\")`);
      },
    },
    {
      titre: "L'ADR-001 a ses six rubriques, remplies",
      verifie: "adr/ADR-001-*.md : les six titres du gabarit, et plus aucune phrase du gabarit dedans",
      voir: "fiche 4, sous-objectif 5, et adr/ADR-000-gabarit.md",
      test: () => {
        const f = fichierAdr();
        if (!f) return ko("aucun fichier adr/ADR-001-*.md");
        const texte = lireTexte(f), r = rubriques(texte);
        const manques = [1, 2, 3, 4, 5, 6].filter(n => !rubrique(r, n) || rubrique(r, n)!.length < 40);
        if (manques.length) return ko(`rubrique(s) ${manques.join(", ")} absente(s) ou presque vide(s)`);
        const restes = ["Une phrase : l'option retenue", "Le ticket du jour, les volumes", "La même décision, sans un seul terme technique", "| A | ... ms"].filter(x => texte.includes(x));
        return restes.length ? ko(`texte du gabarit encore présent : "${restes[0]}"`) : ok();
      },
    },
    {
      titre: "La rubrique 3 renvoie à une mesure qui existe, et la rubrique 5 donne le domaine de validité",
      verifie: "un chemin bench/resultats/... cité en rubrique 3 et présent sur le disque ; un nombre en rubrique 5",
      voir: "fiche 4, sous-objectif 5, et l'annexe : le domaine de validité",
      test: () => {
        const f = fichierAdr();
        if (!f) return ko("aucun fichier adr/ADR-001-*.md");
        const r = rubriques(lireTexte(f));
        const cites = (rubrique(r, 3) ?? "").match(/bench[\\/]resultats[\\/][\w.:-]+\.(csv|svg)/g) ?? []; // \ sous Windows, / ailleurs
        if (!cites.some(c => existsSync(chemin(...c.split(/[\\/]/))))) return ko(cites.length ? `${cites[0]} cité mais absent du disque` : "aucun fichier de bench/resultats cité en rubrique 3");
        return /\d{2,}/.test(rubrique(r, 5) ?? "") ? ok() : ko("aucun nombre dans la rubrique 5");
      },
    },
    {
      titre: "Les trois phrases pour la directrice des opérations tiennent sans jargon",
      verifie: "la rubrique 6 : trois phrases, aucun mot de la liste des mots interdits (fiche 4, annexe)",
      voir: "fiche 4, l'annexe : la liste des mots interdits et une rubrique 6 complète sur un autre sujet",
      test: () => {
        const f = fichierAdr();
        if (!f) return ko("aucun fichier adr/ADR-001-*.md");
        const corps = (rubrique(rubriques(lireTexte(f)), 6) ?? "").split(/\r?\n/).filter(l => !/^\s*>/.test(l)).join(" ");
        const phrases = corps.split(/(?<=[.!?]["»”]?)\s+/).map(s => s.trim()).filter(s => s.length > 3);
        const brut = sansAccents(corps);
        // Le mot ou son pluriel (requêtes, tableaux) ; tous les mots trouvés d'un coup, pas un par passage.
        const trouves = INTERDITS.filter(m => new RegExp(`(^|[^a-z])${sansAccents(m).replace(/[()*]/g, "\\$&")}(?:s|x)?([^a-z]|$)`, "i").test(brut));
        if (trouves.length) return ko(`${trouves.length > 1 ? "mots techniques trouvés" : "mot technique trouvé"} : ${trouves.map(m => `"${m}"`).join(", ")}`);
        return phrases.length === 3 ? ok() : ko(`${phrases.length} phrase(s) au lieu de trois`);
      },
    },
  ],
};

export default atelier;
