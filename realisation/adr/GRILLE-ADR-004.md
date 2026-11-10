# Grille comparative - ADR-004 Rapport

Le rapport de 6 h sort les cent premiers clients du mois. La VM du site tombe par la mémoire plus que par la seconde. Les poids et les barèmes ci-dessous sont fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée du rapport à 3 000 000 de lignes, avant 6 h | 3 |
| Mémoire | pic relevé pendant ce rapport, celui qui fait tomber la VM | 4 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 1 |
| Robustesse | les cent mêmes clients, dans le même ordre, y compris à total égal | 1 |
| Coût de mise en oeuvre | lignes changées, structure déjà écrite, dépendance | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (tri) | 3 | 2 | 4 | 5 | 5 | 31 |
| B (tas) | 5 | 5 | 4 | 4 | 4 | 47 |
| C (quickselect) | 5 | 5 | 2 | 3 | 4 | 44 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps du rapport à 3 000 000 de lignes : 5 sous 150 ms, 4 sous 500 ms, 3 sous 2 s, 2 sous 10 s, 1 au-delà. Deux durées dans la même case prennent la même note.

Mémoire du rapport à 3 000 000 de lignes : 5 sous 1 Mo, 4 sous 10 Mo, 3 sous 50 Mo, 2 sous 200 Mo, 1 au-delà.

Lisibilité : partir de 5 et retirer un point par idée à connaître pour lire le code.

Robustesse : 5 si le classement est celui du legacy sans état caché ; 4 si une comparaison inversée peut laisser tomber un client en silence ; 3 si le découpage autour du pivot peut décaler le centième.

Coût : 5 si rien ne change ; 4 pour quelques lignes et une structure déjà dans le dépôt ; 1 pour une dépendance ajoutée.

Justification des notes, après la mesure.

Temps, médiane à 3 000 000 de lignes : A 1 144,1 ms, note 3. B 97,2 ms et C 95,4 ms, même case, note 5.

Mémoire, médiane à 3 000 000 de lignes : A 65,0 Mo, note 2. B 0,29 Mo et C 0,23 Mo, note 5.

Lisibilité : A enchaîne deux tris, note 4. B garde les cent meilleurs et jette le moins bon du tas, note 4. C demande le pivot, les deux indices et la graine, note 2.

Robustesse : les trois donnent la même somme de contrôle, y compris à total égal. A n'a rien à tenir à jour, note 5. B devient faux si la comparaison du tas est remise dans le bon sens, note 4. C devient faux si la place du centième est décalée d'un cran, note 3.

Coût : A est déjà en place, note 5. B et C sont quelques lignes déjà dans le dépôt, sans dépendance, note 4.

## 3. La sensibilité

Avec la mémoire à 4 et le temps à 3, B mène 47 à 44. En inversant ces poids (temps 4, mémoire 3), B reste devant, 47 contre 44 : A, B et C gardent les mêmes notes de temps et de mémoire. La bascule B/C n'arrive que si la lisibilité de C passe à 5 et celle de B à 3. La décision contre A n'est pas fragile. Celle entre B et C l'est sur la lisibilité, pas sur le temps : 97,2 ms et 95,4 ms sont dans la même case.
