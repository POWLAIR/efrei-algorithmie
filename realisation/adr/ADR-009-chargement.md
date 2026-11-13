# ADR-009 - Charger la première vague du vélo cargo

## 1. Contexte

Le ticket T-0655 porte sur la première vague, celle de 7 h 00 : 80 kg et 450 l. Le contrat (article 3) veut les colis pharmacie livrés avant 10 h 00, donc dans cette vague. Le legacy charge premier arrivé, premier chargé (`legacy/src/chargement.ts`). Sur le jeu moyenne, 60 vélos cargo emportent 3 930 colis, dont 336 pharmacies et 483 express. Les points d'urgence sont 10, 3 et 1. La contrainte est le nombre de points dans la première vague.

## 2. Options comparées

- Option A (legacy) : premier arrivé, premier chargé, tant que le colis rentre. Aucun calcul de plus.
- Option B (glouton) : trier les colis par points rapportés à l'encombrement (poids / 80 kg + volume / 450 l), les prendre dans cet ordre, sauter ceux qui ne rentrent plus. Complexité annoncée : O(n log n).
- Option C (dynamique) : une case par hectogramme et par litre, le meilleur des deux (sans le colis, ou avec lui s'il rapporte strictement plus). Deux couches, et un bit par colis et par case pour retrouver la vague. Le temps dépend des capacités, 800 × 450 × n, pas des données.
- Option D (backtracking) : prendre ou laisser chaque colis, couper une branche dont la borne (colis fractionnés, sur le poids puis sur le volume) ne bat pas le meilleur connu. Exact sur le problème arrondi. Le temps dépend des données.

Les trois travaillent sur les mêmes entiers : poids arrondi au-dessus à l'hectogramme, volume au-dessus au litre. Une vague tenable sur ces entiers l'est sur les vrais poids.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Jeu : `moyenne`, 60 tournées de vélo cargo, 3 930 colis. La plus chargée en a 82.
- Temps : tailles 1, 5 et 20 tournées, 3 répétitions, 1 tour d'échauffement. Statistique retenue : la médiane.
- Qualité : `npm run cargo` sur les 60 tournées, barème 10, 3, 1.
- Mémoire de C, hors harness : 801 × 451 cases × 4 octets × 2 couches = 2,76 Mo, plus 82 × 45 160 octets de marques = 3,53 Mo, soit 6,29 Mo.

Médiane du temps :

| Option | 1 tournée | 5 tournées | 20 tournées | Mémoire à 20 |
| --- | --- | --- | --- | --- |
| B (glouton) | 0,04 ms | 0,14 ms | 0,42 ms | 362 ko |
| C (dynamique) | 65,95 ms | 248,80 ms | 1 030,70 ms | 6,29 Mo calculés |
| D (backtracking) | 3,04 ms | 11,46 ms | 45,67 ms | 2,2 Mo |

Un second lancement, même protocole : B 0,41 ms et 503 ko, C 974,00 ms et 702 ko vus par le harness, D 41,19 ms et 2,2 Mo. Aucun pic ne bouge d'un facteur 2. C passe sous la seconde : sa note de temps passerait de 3 à 4, sans changer le classement.

Points sur les 60 premières vagues :

| Option | Points | Pharmacie | Express | Écart | Temps des 60 |
| --- | --- | --- | --- | --- | --- |
| A (legacy) | 4 719 | 334 / 336 | 419 / 483 | −991 (−17,4 %) | 2 ms |
| B (glouton) | 5 697 | 330 / 336 | 377 / 483 | −13 (−0,2 %) | 2 ms |
| C (dynamique) | 5 710 | 332 / 336 | 382 / 483 | le plus haut | 3,1 s |
| D (backtracking) | 5 710 | 331 / 336 | 378 / 483 | le plus haut | 181 ms (972 204 nœuds) |

C et D rendent les mêmes points. B laisse 13 points, soit 2 pharmacies de moins que C. A laisse 2 pharmacies pour une vague de 13 h, et 64 express, mais 991 points : le reste de la vague est mal rempli.

Courbe : `bench/resultats/2026-11-13T15-48-49-chargement.svg`. Détail : `bench/resultats/2026-11-13T15-48-49-chargement.csv` et `bench/resultats/2026-11-13T15-48-53-cargo.csv`.

## 4. Décision

On retient l'option B. Le total pondéré est 42, devant D à 41, C à 37 et A à 36. C et D ne laissent aucun point, mais B n'en laisse que 13, soit 0,2 % : sa note de robustesse reste 4, et elle est plus courte à lire, sans réglage. Le temps, de poids 2, écarte C (1 030,70 ms, note 3).

## 5. Conséquences et limites

L'arrondi est au-dessus, à l'hectogramme et au litre, avec un retrait de 1e-9 pour qu'un flottant déjà entier ne passe pas à l'unité suivante. C laisse quand même 4 pharmacies, les plus encombrantes : L017 (11,39 kg, 75,2 l), L030 (10,12 kg, 120,3 l), L034 (15,24 kg, 169,3 l et 24,33 kg, 159,1 l). Au barème 10, 3, 1, dix points ne paient pas cette place : la vague gagne plus avec des express et des standards plus petits. D fait de même, avec une pharmacie de moins et les mêmes 5 710 points. B en laisse deux de plus que C.

On changerait pour D si B laissait 1 % des points, soit 57 points au lieu de 13 : sa note de robustesse passerait à 3 et D passerait devant. Une finesse dix fois plus grande sur le poids seul multiplie les cases de C par dix : 20 tournées quitteraient la seconde pour la dizaine de secondes. On n'a pas mesuré les vagues suivantes, les créneaux horaires, ni un autre barème que 10, 3, 1.

## 6. En trois phrases pour la directrice des opérations

La première vague d'un vélo cargo emporte 80 kg et 450 litres, et une pharmacie compte dix fois plus qu'un colis ordinaire. Charger dans l'ordre d'arrivée laisse 991 points sur le quai ; prendre d'abord ce qui rapporte le plus pour la place que ça prend en laisse 13, et chercher le meilleur remplissage n'en laisse aucun. Ce meilleur remplissage prend une seconde pour vingt tournées, ou bien près d'un million de tentatives : pour 13 points, on garde le tri par rapport entre les points et la place occupée.
