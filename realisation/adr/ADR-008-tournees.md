# ADR-008 - Ordonner les quarante arrêts d'une tournée de Noël

## 1. Contexte

Le ticket T-0531 dit que les tournées calculées font 40 % de kilomètres de plus que celles que les livreurs tracent à la main, et que le pic de Noël loue dix utilitaires (pièce 06). Sur le jeu moyenne, 60 tournées de vélo cargo à 40 arrêts font 15 999,1 km dans l'ordre d'affectation, soit 266,7 km par tournée. La contrainte est la longueur de la journée, pas le temps de calcul : les trois calculs tiennent en moins d'une seconde pour les 60 tournées.

## 2. Options comparées

- Option A (legacy) : visiter les arrêts dans l'ordre d'affectation (`legacy/src/tournees.ts`, étape 3). Aucun calcul de plus.
- Option B (voisin) : depuis le hub, aller à l'arrêt le plus proche pas encore visité, le plus petit numéro à égalité. Complexité annoncée : O(n²).
- Option C (deuxopt) : partir de B, puis inverser un segment tant que les deux arêtes retirées sont plus longues que les deux arêtes ajoutées. On s'arrête à la première passe sans échange.
- Option D (recuit) : partir de B, inverser un segment tiré au hasard, l'accepter s'il raccourcit, sinon avec la probabilité exp(-delta / T). T part de 2 000 m et est multipliée par 0,99985 à chaque pas, 60 000 pas, graine 20261213. On rend le meilleur ordre rencontré.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Jeu : `moyenne`, 60 tournées de vélo cargo, distances par la route (cache calculé une fois, 11,6 s).
- Temps : tailles 1, 5 et 20 tournées, 3 répétitions, 1 tour d'échauffement. Statistique retenue : la médiane.
- Qualité : `npm run noel` sur les 60 tournées à 40 arrêts, puis `npm run noel -- --arrets 9` contre l'optimum (188 990 ordres complets essayés, 407 ms).
- Protocole de D, sans lequel le temps n'est pas rejouable : température 2 000 m, facteur 0,99985, 60 000 pas, graine 20261213.

Médiane du temps :

| Option | 1 tournée | 5 tournées | 20 tournées | Mémoire à 20 |
| --- | --- | --- | --- | --- |
| B (voisin) | 0,06 ms | 0,17 ms | 0,17 ms | 20 ko |
| C (deuxopt) | 0,27 ms | 0,42 ms | 0,80 ms | 38 ko |
| D (recuit) | 9,93 ms | 10,82 ms | 41,12 ms | 76 ko |

Kilomètres sur les 60 tournées à 40 arrêts, retour au hub compris :

| Option | km | Écart au plus court | Temps des 60 |
| --- | --- | --- | --- |
| A (legacy) | 15 999,1 | +240,1 % | — |
| B (voisin) | 5 521,0 | +17,4 % | 2 ms |
| C (deuxopt) | 4 822,1 | +2,5 % | 6 ms (978 échanges) |
| D (recuit) | 4 703,7 | le plus court | 126 ms |

C économise 11 177 km par jour sur l'ordre d'affectation (80,4 km par tournée au lieu de 266,7). D en économise 11 295, soit 118 km de plus que C, plus court sur 54 tournées, plus long sur 5, égal sur 1.

Écart moyen à l'optimum sur neuf arrêts : A +64,6 % (pire +114,5 %, 0 fois sur 60), B +11,4 % (pire +30,3 %, 0 fois), C +0,7 % (pire +6,1 %, 42 fois sur 60), D +0,0 % (60 fois sur 60).

Courbe : `bench/resultats/2026-11-13T15-45-39-tournees.svg`. Détail : `bench/resultats/2026-11-13T15-45-39-tournees.csv`, `bench/resultats/2026-11-13T15-46-16-noel.csv` et `bench/resultats/2026-11-13T15-46-17-noel.csv`.

## 4. Décision

On retient l'option C. Le total pondéré est 45, devant D à 41, B à 38 et A à 36. Le temps, de poids 3, ne départage personne : à 20 tournées, 0,80 ms et 41,12 ms sont tous deux sous 100 ms. La robustesse, de poids 3, écarte A et B. Entre C et D, à robustesse égale, la lisibilité et le coût tranchent.

## 5. Conséquences et limites

C réutilise B et n'ajoute aucun réglage. Sur 40 arrêts il reste 2,5 % au-dessus de D, soit 118 km par jour sur la flotte. D vaudrait ses quatre réglages si ce surplus passait 3 % du plus court trouvé, le cran où sa note de robustesse, lue sur un écart à l'optimum, tomberait de 5 à 4. Sur neuf arrêts, C est à 0,7 %, encore une note 5, et essayer tous les ordres ne coûte que 407 ms : on le garde jusqu'à 11 arrêts, au-delà le nombre d'ordres n'est plus tenable.

Domaine de validité : 60 tournées du jeu moyenne, vélos cargo, 9 puis 40 arrêts, distances par la route au mètre près, graine 20261213. On n'a pas mesuré les créneaux horaires, ni les arrêts d'un vrai calendrier de décembre : le jeu reste celui de septembre, allongé à 40 arrêts.

## 6. En trois phrases pour la directrice des opérations

À Noël, soixante tournées de vélo font quarante arrêts chacune : les visiter dans l'ordre où elles ont été constituées, c'est 16 000 km dans la journée. Partir vers l'arrêt le plus proche encore à faire descend à 5 500 km, et retirer les croisements descend à 4 800 km, sans faire attendre personne. Tenter des détours au hasard, d'abord souvent puis de plus en plus rarement, gagne encore 120 km, à condition de tenir une température de départ, sa baisse et un nombre de tentatives : pour ce gain, on garde le retrait des croisements.
