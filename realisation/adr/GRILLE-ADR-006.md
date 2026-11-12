# Grille comparative - ADR-006 Réseau

Il faut charger les 46 565 carrefours de la métropole. Une grille de toutes les paires demanderait 16,2 Go, plus que les 10 Go de la machine. Les poids et les barèmes ci-dessous sont fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée d'un parcours de tout le réseau, ou du plus grand sous-réseau mesuré pour les trois | 2 |
| Mémoire | place occupée pour tenir les 46 565 carrefours | 5 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 1 |
| Robustesse | le même parcours, y compris deux rues entre les mêmes carrefours | 1 |
| Coût de mise en oeuvre | lignes changées, structure à maintenir, dépendance | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (matrice) | 2 | 1 | 5 | 4 | 4 | 22 |
| B (listes) | 5 | 4 | 4 | 5 | 4 | 43 |
| C (compacts) | 5 | 5 | 2 | 5 | 3 | 45 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps d'un parcours à 5 000 carrefours, le plus grand lot commun aux trois : 5 sous 5 ms, 4 sous 20 ms, 3 sous 100 ms, 2 sous 500 ms, 1 au-delà.

Mémoire pour tenir les 46 565 carrefours : 5 sous 10 Mo, 4 sous 40 Mo, 3 sous 200 Mo, 2 sous 1 Go, 1 au-delà ou qui ne tient pas dans les 10 Go de la machine.

Lisibilité : partir de 5 et retirer un point par idée à connaître pour lire le code.

Robustesse : 5 si le parcours retrouve les mêmes carrefours et les mêmes profondeurs, y compris deux rues parallèles ; 4 si une rue parallèle écrase l'autre.

Coût : 4 pour quelques lignes et des tableaux du langage ; 3 pour une structure plus dure à modifier.

Justification des notes, après la mesure.

Temps, médiane à 5 000 carrefours : A 165,4 ms, note 2. B 0,65 ms, note 5. C 0,35 ms, note 5.

Mémoire à l'échelle de la métropole : A 16,2 Go, note 1. B 15,7 Mo, note 4. C 6,7 Mo, note 5.

Lisibilité : A est une grille, note 5. B est une liste de rues par carrefour, note 4. C aligne ces listes dans trois grands tableaux, note 2.

Robustesse : A, B et C donnent la même somme de contrôle là où ils sont mesurés ensemble. A écrase une rue parallèle, note 4. B et C gardent chaque rue, note 5.

Coût : A et B sont quelques lignes, note 4. C se relit et se modifie moins facilement, note 3.

## 3. La sensibilité

Avec la mémoire à 5, C mène 45 à 43. En reportant deux points de mémoire sur la lisibilité (mémoire 3, lisibilité 3), B passe devant, 43 contre 39. L'écart retenu est de deux points, et il bascule dès que la lisibilité compte autant que trois points. La décision contre A ne bouge pas : 16,2 Go ne tiennent pas dans la machine.
