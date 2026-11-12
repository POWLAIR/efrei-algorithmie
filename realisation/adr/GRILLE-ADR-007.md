# Grille comparative - ADR-007 Pont

Le 8 septembre à 14 h 02, le pont Chaban-Delmas se lève. 23 tournées sont à recalculer tout de suite. Les poids et les barèmes ci-dessous sont fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée du recalcul des 23 tournées, pont levé | 5 |
| Mémoire | pic pendant ce recalcul | 1 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 2 |
| Robustesse | les mêmes distances, au mètre près, pour chaque arrêt restant | 1 |
| Coût de mise en oeuvre | lignes changées, tas déjà écrit, dépendance | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (simple) | 1 | 5 | 4 | 5 | 4 | 27 |
| B (tas) | 5 | 5 | 4 | 5 | 4 | 47 |
| C (astar) | 4 | 5 | 2 | 5 | 3 | 37 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps des 23 tournées : 5 sous 500 ms, 4 sous 2 s, 3 sous 10 s, 2 sous 1 min, 1 au-delà. A n'est pas mesuré à 23 dans le harness : sa note vient de la projection du script du pont, 6 min 39 s.

Mémoire du recalcul : 5 sous 20 Mo, 4 sous 100 Mo, 3 sous 500 Mo, 1 au-delà.

Lisibilité : partir de 5 et retirer un point par idée à connaître pour lire le code.

Robustesse : 5 si les distances sont celles du parcours complet, au mètre près.

Coût : 4 pour quelques lignes et le tas déjà écrit à l'atelier 6 ; 3 si la priorité ajoutée est facile à régler de travers.

Justification des notes, après la mesure.

Temps : A 6 min 39 s pour les 23 tournées, note 1. B 187,4 ms, note 5. C 1 697 ms, note 4.

Mémoire, médiane à 23 tournées pour B et C, à 1 tournée pour A : A 7,0 Mo, B 2,5 Mo, C 2,1 Mo, note 5.

Lisibilité : A relit tous les carrefours, note 4. B réutilise le tas, note 4. C ajoute la visée à vol d'oiseau et une recherche par arrêt, note 2.

Robustesse : les trois donnent la même somme de contrôle là où elles sont mesurées ensemble, note 5.

Coût : A et B sont quelques lignes, note 4. C se dérègle si la priorité oublie la distance déjà parcourue, note 3.

## 3. La sensibilité

Avec le temps à 5, B mène 47 à 37. C ne passe devant que si sa note de temps passe à 5 et celle de B à 3, ce que les 187 ms contre 1 697 ms ne permettent pas. La décision n'est pas fragile : C est à la fois plus lent et plus difficile à lire sur les 23 tournées réelles.
