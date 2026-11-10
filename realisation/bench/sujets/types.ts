// Un sujet de mesure : ce que le harness compare.
//
// Un sujet décrit un problème (affecter les colis, retrouver un colis, servir les urgences...) et les
// variantes qui le résolvent. Le harness ne connaît que cette interface : il charge les données une fois,
// prépare l'entrée de chaque appel hors chronomètre, puis ne chronomètre que l'appel de la variante.
//
// Deux règles pour qu'une comparaison soit juste :
//   - une variante ne modifie jamais son entrée (elle copie si elle doit trier ou retirer) : l'entrée
//     préparée sert à tous les tours, échauffement compris ;
//   - deux variantes correctes donnent la même somme de contrôle (controle) sur la même entrée.

export interface ParDefaut {
  jeu: string;          // le jeu de données (petite, moyenne, grande, ou un chemin)
  tailles: number[];    // les tailles de lot
  variantes: string[];  // les variantes comparées
}

export interface Sujet<D = unknown, E = unknown, R = unknown> {
  nom: string;                                  // le nom passé à --sujet
  titre: string;                                // une ligne, affichée en tête de mesure
  parDefaut: ParDefaut;
  // Lit les fichiers du jeu. Hors chronomètre. Lève une erreur claire si un fichier manque.
  charger(dossier: string): D | Promise<D>;
  // La plus grande taille que ce jeu permet.
  tailleMax(donnees: D): number;
  // L'entrée d'un appel pour une taille et une variante. Hors chronomètre.
  preparer(donnees: D, taille: number, variante: string): E | Promise<E>;
  // Les variantes : ce que le chronomètre mesure. Une variante peut rendre une promesse (requête à une base) :
  // le harness l'attend, et l'attente fait partie de la mesure.
  variantes: Record<string, (entree: E) => R | Promise<R>>;
  // Somme de contrôle d'un résultat : identique pour deux variantes correctes.
  controle(resultat: R): string;
}
