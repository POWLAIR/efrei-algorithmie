# Grille comparative - ADR-008 Tournée de Noël

En décembre, les vélos cargo passent à 40 arrêts par vague (ticket T-0531). L'ordre d'affectation fait environ 40 % de kilomètres de trop. Les poids et les barèmes ci-dessous sont ceux de la fiche, fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | médiane à 20 tournées | 3 |
| Mémoire | pic du harness à 20 tournées | 1 |
| Lisibilité | idées à connaître pour lire `bench/variantes/tournees.ts` | 2 |
| Robustesse | écart moyen à l'optimum sur neuf arrêts | 3 |
| Coût de mise en oeuvre | longueur de la fonction, réglages à tenir | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (legacy) | 5 | 5 | 4 | 1 | 5 | 36 |
| B (voisin) | 5 | 5 | 4 | 2 | 4 | 38 |
| C (deuxopt) | 5 | 5 | 3 | 5 | 4 | 45 |
| D (recuit) | 5 | 5 | 2 | 5 | 2 | 41 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps, médiane à 20 tournées : 5 sous 100 ms, 4 sous 1 s, 3 sous 10 s, 2 sous 1 min, 1 au-delà.

Robustesse, écart moyen à l'optimum sur neuf arrêts : 5 sous 1 %, 4 sous 3 %, 3 sous 10 %, 2 sous 25 %, 1 au-delà. Elle se lit dans `npm run noel -- --arrets 9`.

Mémoire, pic du harness : 5 sous 10 Mo, 4 sous 50 Mo, 3 au-delà. Deux lancements à moins d'un facteur 2 l'un de l'autre ont la même note. Deux options à moins d'un facteur 2 l'une de l'autre aussi.

Lisibilité : partir de 5, retirer un point par idée qu'il faut connaître (rôle de la fonction, cas sans amélioration, endroit du réglage).

Coût : 5 si rien ne change, 4 pour une fonction courte sans réglage, 3 pour une fonction longue ou un réglage à tenir, 2 pour les deux, 1 pour une dépendance. La température, le budget de pas et la graine du recuit sont des réglages à tenir.

Justification des notes, après la mesure.

Temps : B 0,17 ms, C 0,80 ms, D 41,12 ms, tous sous 100 ms, note 5. A n'est pas chronométré : l'ordre d'affectation est déjà celui des arrêts, note 5.

Mémoire à 20 tournées : B 20 ko, C 38 ko, D 76 ko, tous sous 10 Mo, note 5. Un second lancement donne les mêmes pics (20, 38 et 76 ko). A n'alloue rien de plus, note 5.

Lisibilité : A suit l'ordre déjà écrit, une idée, note 4. B va au plus proche encore libre, le plus petit numéro à égalité, note 4. C demande le gain des deux arêtes et l'arrêt dès qu'une passe ne raccourcit plus, note 3. D demande d'accepter un allongement tant que la température baisse, et de garder le meilleur ordre rencontré plutôt que le dernier, note 2.

Robustesse sur neuf arrêts : A +64,6 %, note 1. B +11,4 %, note 2. C +0,7 %, note 5. D +0,0 % et l'optimum sur les 60 tournées, note 5.

Coût : A ne change rien, note 5. B et C sont une fonction sans réglage, note 4. D tient la température 2 000 m, le facteur 0,99985, 60 000 pas et la graine 20261213, note 2.
