# ADR-004 - Sortir les cent premiers clients du mois

## 1. Contexte

Le premier jour ouvré, à 6 h, le rapport classe les clients professionnels par chiffre d'affaires et n'en garde que cent. Le code de 2020 trie les trois millions de lignes du mois, les regroupe, puis retrie tous les clients (`legacy/src/rapport.ts`, lignes 32 à 40). Octobre 2026 compte 3 000 000 de lignes et 1 900 clients, pour 1 071 429 euros. La contrainte qui fait tomber la VM est la mémoire, pas la seconde de calcul.

## 2. Options comparées

- Option A (tri, legacy) : trier toutes les lignes par client, additionner, trier les clients, garder les K premiers. Complexité annoncée : O(n log n) sur les lignes, puis O(m log m) sur les clients.
- Option B (tas) : additionner par client en une passe, puis un tas de taille K qui ne garde que les K meilleurs. Complexité annoncée : O(n) pour additionner, O(m log K) pour le tas.
- Option C (quickselect) : les mêmes totaux, puis placer le K-ième et ne trier que les K premiers. Complexité annoncée : O(n) pour additionner, O(m) en moyenne pour la sélection.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Jeu : `data/jeux/mois`, tailles 100 000, 1 000 000 et 3 000 000 de lignes, K = 100.
- Répétitions : 5, après 2 tours d'échauffement.
- Statistique retenue : la médiane.
- Ce qui est mesuré : le temps et la mémoire du classement. Les trois options donnent la même somme de contrôle à chaque taille.

Médiane du rapport :

| Option | 100 000 | 1 000 000 | 3 000 000 | Mémoire à 3 000 000 |
| --- | --- | --- | --- | --- |
| A (tri) | 43,8 ms | 361,0 ms | 1 144,1 ms | 65,0 Mo |
| B (tas) | 4,0 ms | 33,5 ms | 97,2 ms | 0,29 Mo |
| C (quickselect) | 3,4 ms | 32,7 ms | 95,4 ms | 0,23 Mo |

De 100 000 à 3 000 000 de lignes, le volume est multiplié par 30. Le temps de A est multiplié par 26, celui de B par 24, celui de C par 28.

Courbe : `bench/resultats/2026-11-10T13-29-11-rapport.svg`. Détail : `bench/resultats/2026-11-10T13-29-11-rapport.csv`.

## 4. Décision

On retient l'option B : à 3 000 000 de lignes elle dure 97,2 ms et 0,29 Mo, contre 1 144,1 ms et 65,0 Mo pour le tri. C est dans la même case de temps et de mémoire (95,4 ms, 0,23 Mo). La mémoire, de poids 4, écarte le tri ; la lisibilité départage B et C.

## 5. Conséquences et limites

B réutilise le tas de l'atelier 6, sans dépendance nouvelle. Le sommet du tas est le moins bon des cent : la comparaison est inversée par rapport au classement. Une comparaison remise dans l'autre sens garderait les cent plus petits. C occupe 0,23 Mo, soit 0,06 Mo de moins, pour 1,8 ms de moins : trop peu pour le code du pivot.

Domaine de validité : 100 000 à 3 000 000 de lignes, 1 900 clients, K = 100, graine 2026, 5 répétitions. Le nombre de clients et K n'ont pas varié. La décision ne tient plus si K approche les 1 900 clients : le tas de taille K ne jette plus grand-chose, et l'écart avec un tri des seuls clients disparaît. Elle ne tient plus non plus si la VM ne peut pas garder les lignes du mois en mémoire avant même le classement.

## 6. En trois phrases pour la directrice des opérations

À 6 h, le rapport doit sortir les cent clients qui ont le plus rapporté dans le mois, sur trois millions de lignes. Tout trier prend un peu plus d'une seconde et occupe 65 Mo, alors que garder seulement les cent meilleurs au fur et à mesure reste sous le dixième de seconde et sous un mégaoctet. L'autre façon de ne garder que ces cent clients est à peine plus courte, et trop difficile à relire pour cet écart.
