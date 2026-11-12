# ADR-005 - Rapprocher une adresse mal saisie

## 1. Contexte

L'étape d'adresses du batch de nuit, et la saisie d'un opérateur, doivent retrouver l'adresse officielle parmi les 229 329 adresses de Bordeaux Métropole. Le code de 2019 compare la saisie à chacune d'elles (`legacy/src/adresses.ts`, ligne 44). La contrainte est le temps d'une saisie : la structure, elle, se construit une fois.

## 2. Options comparées

- Option A (brute, legacy) : la distance de Levenshtein contre tout le référentiel, à chaque saisie. Rien à construire. Complexité annoncée : O(n) par saisie.
- Option B (trigrammes) : un index en mémoire des groupes de trois lettres, puis Levenshtein sur les dix adresses les plus semblables. Complexité annoncée : O(n) pour construire, puis le coût des listes touchées par saisie.
- Option C (postgres) : le même principe dans PGlite, avec l'extension pg_trgm et un index GiST. Complexité annoncée : O(n) pour construire, puis une lecture d'index par saisie.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Référentiel : `data/referentiel/adresses-metropole.csv`, 229 329 adresses, version figée du 29 octobre 2026. Saisies : le jeu `petite`.
- Répétitions : 3. Échauffement : 0 pour la force brute, 1 pour les deux index. La construction est mesurée à part, 3 répétitions, sans échauffement.
- Statistique retenue : la médiane pour les lots du harness ; le temps moyen pour l'exactitude.
- Ce qui est mesuré : un lot de saisies, puis l'exactitude contre `verite.csv` (300 saisies, 10 seulement pour la force brute), puis la construction seule.

Lot de saisies, médiane du lot :

| Option | 1 ou 10 saisies | 2 ou 20 | 3 ou 50 | Une saisie (exactitude) |
| --- | --- | --- | --- | --- |
| A (brute) | 2 151,2 ms | 4 811,4 ms | 11 582,0 ms | 4 588,2 ms |
| B (trigrammes) | 120,5 ms | 265,5 ms | 692,2 ms | 13,4 ms |
| C (postgres) | 1 427,7 ms | 3 574,2 ms | 6 632,0 ms | 187,4 ms |

Exactitude sur le jeu petite : A 10/10 sur les saisies faciles qu'il a traitées. B et C 288/300 (96 %), dont 21/24 fautes et 0/9 saisies sans numéro de rue. Même résultat pour les deux index.

Construction des 229 329 adresses, médiane : B 1 438,3 ms et 58,8 Mo en mémoire, C 6 500,5 ms et 42,1 Mo sur son disque. A ne construit rien.

Courbe des saisies : `bench/resultats/2026-11-12T09-31-52-adresses.svg`. Détail : `bench/resultats/2026-11-12T09-31-52-adresses.csv`, `bench/resultats/2026-11-12T09-30-32-adresses.csv`, `bench/resultats/2026-11-12T09-33-56-exactitude.csv` et `bench/resultats/2026-11-12T09-34-59-adresses-index.csv`.

## 4. Décision

On retient l'option B : une saisie dure 13,4 ms contre 4 588 ms pour le parcours complet et 187 ms pour la base embarquée, avec la même exactitude que cette base (96 %). Le temps, de poids 5, tranche.

## 5. Conséquences et limites

B se construit en 1,4 s et occupe 58,8 Mo, sans dépendance nouvelle. C occupe un peu moins (42,1 Mo) mais ajoute PGlite et reste quatorze fois plus lent à la saisie. Les deux index manquent les neuf saisies sans numéro de rue : le parcours complet n'a pas été mesuré sur ces cas, seulement sur dix saisies faciles.

Domaine de validité : 229 329 adresses de la métropole, lots de 10, 20 et 50 saisies pour les index, 1 à 3 pour la force brute, 300 saisies d'exactitude. La Gironde (730 137 adresses) n'a pas été mesurée. La décision ne tient plus si la structure ne peut pas garder 59 Mo, ni si les saisies sans numéro deviennent le cas à réussir : ni B ni C ne le font aujourd'hui.

## 6. En trois phrases pour la directrice des opérations

Quand un client tape une adresse avec une faute, il faut retrouver la bonne parmi les 229 329 adresses de la métropole, pendant qu'il attend. Tout comparer prend environ cinq secondes, alors que préparer une fois une liste des groupes de trois lettres ramène chaque recherche à un centième de seconde, avec la même réponse que l'outil déjà en production dans 96 % des cas. Cette préparation occupe 59 Mo et se refait en une seconde et demie ; elle se trompe quand le numéro de rue a disparu.
