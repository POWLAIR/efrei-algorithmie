# ADR-006 - Charger le réseau routier de Bordeaux

## 1. Contexte

Les tournées du 8 septembre se recalculent sur le réseau de Bordeaux Métropole : 46 565 carrefours et 111 288 rues orientées, environ 5 177 km. Le legacy range les arrêts d'une tournée dans une grille de distances (`legacy/src/tournees.ts`). Étendre cette grille à toute la métropole ferait 46 565 × 46 565 cases, soit 16,2 Go. La machine de mesure a 10 Go. La contrainte est donc la place en mémoire.

## 2. Options comparées

- Option A (matrice) : une grille n × n, la case vaut la longueur de la rue, 0 s'il n'y en a pas. Trouver les voisins, c'est lire toute la ligne. Complexité annoncée : O(n²) en mémoire et pour un parcours.
- Option B (listes) : pour chaque carrefour, la liste des rues qui en partent. Complexité annoncée : O(n + m) en mémoire et pour un parcours, m le nombre de rues.
- Option C (compacts) : les mêmes listes rangées bout à bout dans trois tableaux (début, cible, longueur). Complexité annoncée : O(n + m), avec moins d'objets et une modification plus difficile.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Réseau : `data/referentiel/graphe/`, 46 565 carrefours. Les sous-réseaux sont pris autour du hub de Brienne.
- Répétitions : 3 pour la grille et les listes jusqu'à 5 000, après 2 tours d'échauffement ; 5 pour les listes et les compacts jusqu'à 46 565, après 5 tours.
- Statistique retenue : la médiane.
- Ce qui est mesuré : construire la structure puis un parcours en largeur depuis le carrefour 0. La grille n'est pas lancée sur les 46 565 carrefours.

Parcours, médiane, grille et listes :

| Option | 1 000 | 2 000 | 5 000 | Mémoire à 5 000 |
| --- | --- | --- | --- | --- |
| A (matrice) | 5,9 ms | 24,7 ms | 165,4 ms | 191,6 Mo |
| B (listes) | 0,15 ms | 0,22 ms | 0,65 ms | 1,9 Mo |

Listes et compacts, médiane, jusqu'à la métropole :

| Option | 5 000 | 20 000 | 46 565 | Mémoire à 46 565 |
| --- | --- | --- | --- | --- |
| B (listes) | 1,3 ms | 2,7 ms | 10,1 ms | 15,7 Mo |
| C (compacts) | 0,35 ms | 1,6 ms | 3,8 ms | 6,7 Mo |

Les sommes de contrôle concordent à chaque taille commune. Une case de la grille sur 19 484 contient une rue. A demanderait 16,2 Go pour toute la métropole.

Courbe : `bench/resultats/2026-11-12T09-36-42-graphe.svg`. Détail : `bench/resultats/2026-11-12T09-36-42-graphe.csv` et `bench/resultats/2026-11-12T09-36-41-graphe.csv`.

## 4. Décision

On retient l'option C : à 46 565 carrefours le parcours dure 3,8 ms et occupe 6,7 Mo, contre 10,1 ms et 15,7 Mo pour les listes, et 16,2 Go pour la grille. La mémoire, de poids 5, écarte la grille et départage C et B.

## 5. Conséquences et limites

C réutilise trois tableaux, sans dépendance nouvelle. Retirer une rue, le pont qui se lève, se fait en reconstruisant ces tableaux, pas en effaçant une case. B coûterait 9 Mo de plus et 6 ms de plus, pour un code plus simple à modifier à la main.

Domaine de validité : sous-réseaux de 1 000, 2 000 et 5 000 carrefours pour la grille, puis 5 000, 20 000 et 46 565 pour les listes et les compacts. Le pont levé n'est pas encore retiré de ce parcours. La décision ne tient plus si une rue doit être retirée sans reconstruire, ni si le réseau dépasse ce que 6,7 Mo laissent voir : à 46 565 carrefours, C occupe environ 150 octets par carrefour.

## 6. En trois phrases pour la directrice des opérations

Pour calculer un trajet dans Bordeaux, il faut d'abord tenir en mémoire les 46 565 carrefours et les 111 288 rues. Une grande grille de toutes les paires de carrefours demanderait 16 Go, ce que la machine n'a pas, alors qu'une liste des rues qui partent de chaque carrefour tient en 16 Mo et se parcourt en un centième de seconde. Ranger ces listes bout à bout descend à 7 Mo et à quatre millièmes de seconde : c'est le choix, tant qu'on n'a pas à en retirer une rue à la main.
