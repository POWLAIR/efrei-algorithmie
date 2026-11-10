# ADR-002 - Retrouver le dernier scan d'un colis

## 1. Contexte

La page « Où est mon colis » est appelée 40 000 fois par jour, dont 60 % entre 8 h et 12 h. Elle doit rendre le dernier scan d'un numéro de suivi. Le jeu grande compte 996 844 scans ; la base en garde 13 millions sur six mois. La contrainte est le temps d'une recherche, pas le temps de construction : la structure se bâtit une fois, la page est lue des dizaines de milliers de fois.

## 2. Options comparées

- Option A (tableau, legacy) : `dernierScan` filtre tous les scans du numéro, ligne 30 de `legacy/src/suivi.ts`, puis garde le plus récent. Rien à construire. Complexité annoncée : O(n) par recherche.
- Option B (set) : un ensemble des numéros connus refuse tout de suite un numéro mal tapé ; un numéro connu relit encore tous les scans. Complexité annoncée : O(n) pour construire, O(n) pour un numéro connu.
- Option C (map) : une table du numéro vers son scan le plus récent, tenu à jour avec `plusRecent`. Chaque recherche lit une case. Complexité annoncée : O(n) pour construire, O(1) pour chercher.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Jeu : `data/jeux/grande`, tailles 10 000, 100 000 et 996 844 scans.
- Répétitions : 5, après 3 tours d'échauffement.
- Statistique retenue : la médiane.
- Ce qui est mesuré : 100 recherches par appel (une sur cinq porte un numéro mal tapé), puis la construction seule. Le prix d'une recherche est la médiane divisée par 100. La projection à 13 millions de scans multiplie ce prix par 13.

Recherches, médiane des 100 appels :

| Option | 10 000 | 100 000 | 996 844 | Prix d'une recherche à 996 844 | Projeté à 13 millions |
| --- | --- | --- | --- | --- | --- |
| A (tableau) | 25,9 ms | 196,0 ms | 6 183,5 ms | 61,8 ms | 804 ms |
| B (set) | 8,8 ms | 82,7 ms | 1 071,8 ms | 10,7 ms | 139 ms |
| C (map) | 0,07 ms | 0,12 ms | 0,11 ms | 0,001 ms | 0,014 ms |

Construction à 996 844 scans : A 0,05 ms et 0,001 Mo, B 249 ms et 5,0 Mo, C 827 ms et 7,0 Mo. Les trois donnent la même somme de contrôle.

Courbe : `bench/resultats/2026-11-10T10-30-29-suivi.svg`. Détail : `bench/resultats/2026-11-10T10-30-29-suivi.csv` et `bench/resultats/2026-11-10T10-31-37-suivi-construction.csv`.

## 4. Décision

On retient l'option C : à 996 844 scans une recherche coûte 0,001 ms contre 62 ms pour le tableau, et c'est le critère Temps, de poids 5, qui tranche.

## 5. Conséquences et limites

C se paie une fois : 827 ms et 7,0 Mo à 996 844 scans, sans dépendance nouvelle. Face au tableau, ce coût est rattrapé à la 14e recherche (827 / 61,8). La page en fait 40 000 par jour. La table garde une case par colis, pas par scan : à raison d'environ 10 scans par colis, six mois et 13 millions de scans occupent environ 90 Mo. Un scan qui arrive sans reconstruction laisse l'ancienne réponse en place, sans erreur.

Domaine de validité : scans de 10 000 à 996 844, 100 recherches, 20 % de numéros mal tapés. Livreurs, hubs et proportion de fautes n'ont pas varié. La décision ne tient plus si la table n'est pas reconstruite après un nouveau scan, ni si le budget mémoire descend sous 90 Mo pour six mois de colis.

## 6. En trois phrases pour la directrice des opérations

On prépare la page en retenant, pour chaque colis, seulement son dernier passage au quai : le retrouver reste instantané, même avec six mois de passages. Tout relire à chaque fois approche la seconde au bout de ces six mois, alors que cette préparation est rentabilisée dès la quatorzième consultation de la journée. Il faut la refaire à chaque nouveau passage, sinon la page montre un passage dépassé, et sur six mois elle occupe environ 90 Mo.
