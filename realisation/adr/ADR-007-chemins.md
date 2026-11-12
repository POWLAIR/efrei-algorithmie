# ADR-007 - Recalculer les tournées quand le pont se lève

## 1. Contexte

Le 8 septembre à 14 h 02, le pont Jacques Chaban-Delmas se lève. Sur le jeu moyenne, 75 tournées sont en cours, 20 passaient par le pont, et 23 sont à recalculer (15 vélos cargo, 8 utilitaires). Le détour total est de 65,5 km, dont 9,0 km pour la tournée L068. Il reste 2 593 km à parcourir pont ouvert, 2 658 km pont levé. La contrainte est le temps de ce recalcul, pendant que les livreurs attendent.

## 2. Options comparées

- Option A (simple) : à chaque tour, parcourir tous les carrefours pour trouver le plus proche encore ouvert. Complexité annoncée : O(n²) par départ.
- Option B (tas) : le même calcul, le plus proche sortant du tas de l'atelier 6. Un carrefour déjà fixé n'y retourne pas. Complexité annoncée : O((n + m) log n) par départ, et on s'arrête quand tous les arrêts sont atteints.
- Option C (astar) : une recherche par arrêt, la priorité étant la distance déjà parcourue plus la distance à vol d'oiseau jusqu'à l'arrêt. Complexité annoncée : moins de carrefours visités par arrêt, mais une recherche par arrêt.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Scénario : jeu `moyenne`, pont levé, réseau en tableaux compacts. Tailles : 1, 2, 5 et 23 tournées.
- Répétitions : 3 sans échauffement pour A et B sur 1 et 2 tournées ; 5 après 3 tours d'échauffement pour B et C sur 1, 5 et 23.
- Statistique retenue : la médiane.
- Ce qui est mesuré : les distances aux arrêts restants. Les sommes de contrôle concordent. Le script du pont projette A sur les 23 tournées à partir d'une seule.

Une et deux tournées, médiane :

| Option | 1 tournée | 2 tournées | Mémoire à 1 |
| --- | --- | --- | --- |
| A (simple) | 2 145 ms | 7 832 ms | 7,0 Mo |
| B (tas) | 7,5 ms | 17,0 ms | 0,7 Mo |

B et C jusqu'aux 23 tournées, médiane :

| Option | 1 | 5 | 23 | Mémoire à 23 |
| --- | --- | --- | --- | --- |
| B (tas) | 9,1 ms | 41,1 ms | 187,4 ms | 2,5 Mo |
| C (astar) | 30,1 ms | 137,5 ms | 1 697 ms | 2,1 Mo |

Le script du pont, sur les 23 tournées : B 681 ms, C 1,5 s, A 17,3 s par tournée soit 6 min 39 s pour les 23.

Courbe : `bench/resultats/2026-11-12T09-39-40-chemins.svg`. Détail : `bench/resultats/2026-11-12T09-39-40-chemins.csv` et `bench/resultats/2026-11-12T09-39-21-chemins.csv`.

## 4. Décision

On retient l'option B : les 23 tournées se recalculent en 187 ms, contre 1 697 ms pour la visée à vol d'oiseau et 6 min 39 s pour le parcours de tous les carrefours. Le temps, de poids 5, tranche. Les distances sont les mêmes.

## 5. Conséquences et limites

B réutilise le tas de l'atelier 6, sans dépendance nouvelle, et occupe 2,5 Mo. C visite moins de carrefours par arrêt, mais relance une recherche pour chaque arrêt : sur ces tournées, le total est neuf fois plus lent. A ne tient pas l'après-midi : 6 min 39 s, les livreurs sont déjà repartis.

Domaine de validité : 23 tournées du jeu moyenne, pont levé, 15 vélos et 8 utilitaires, distances au mètre près. A n'a été chronométré dans le harness que sur 1 et 2 tournées. La décision ne tient plus si une tournée n'a plus qu'un arrêt lointain à rejoindre : la visée peut alors éviter le reste du réseau. Elle ne tient plus non plus si un carrefour déjà fixé retourne dans le tas : les distances restent justes, le temps non.

## 6. En trois phrases pour la directrice des opérations

À 14 h 02 le pont Chaban-Delmas se lève : 23 tournées sont à recalculer, pour 65 km de détour. Chercher le carrefour le plus proche en relisant tous les autres prend six minutes et demie ; garder les carrefours encore en attente, le plus proche au-dessus, ramène ce recalcul à deux dixièmes de seconde. Viser chaque arrêt à vol d'oiseau donne les mêmes distances, mais met une seconde et demie : trop long pour un gain nul.
