# Grille comparative - ADR-001 Affectation

La grille sert à décider, pas à classer par vitesse. Ticket : le batch de nuit doit finir en 1 h 30, et chaque couple colis-livreur examiné est payé en production. Les poids et le barème ci-dessous sont fixés avant la mesure des trois options.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée estimée à 15 000 colis : temps mesuré sur le poste, plus les couples colis-livreur que la production paie, et la croissance avec le volume | 5 |
| Mémoire | pic mémoire relevé par le harness à 10 000 colis | 1 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 2 |
| Robustesse | même résultat que le legacy sur les doublons de numéro de suivi, somme de contrôle identique | 1 |
| Coût de mise en oeuvre | lignes changées, dépendances ajoutées, données à préparer | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (legacy) | 1 | 4 | 4 | 5 | 5 | 27 |
| B (tri) | 2 | 5 | 4 | 5 | 4 | 32 |
| C (map) | 3 | 5 | 3 | 5 | 4 | 35 |

Total pondéré = somme des notes multipliées par les poids. Les notes de temps viennent du CSV du harness et du CSV de `npm run couples`.

Barème de la note de temps, fixé avant la mesure, sur la fenêtre de 90 minutes et non sur l'option la plus rapide. On projette l'étape à 15 000 colis (pic de décembre) en comptant les couples examinés comme ce que la production paie :

- 5 : l'étape tient dans 15 minutes, avec de la marge pour le reste du batch.
- 4 : elle tient dans 30 minutes.
- 3 : elle tient dans 60 minutes.
- 2 : elle tient dans 90 minutes, sans marge.
- 1 : elle dépasse 90 minutes.

Justification des notes, après la mesure.

Temps, barème appliqué à 15 000 colis. On convertit les couples mesurés avec 2,9 ms par couple (25 minutes pour 6 000 × 85). B : 1 271 770 couples, 62 minutes, note 2. C : 651 031 couples, 32 minutes, note 3. A a déjà pris 2 h 15 à 6 412 colis, et la médiane locale passe de 25 ms à 1 910 ms entre 1 000 et 10 000 colis : note 1.

Mémoire à 10 000 colis : A 4,3 Mo (note 4), B 0,8 Mo et C 1,0 Mo (note 5). Tout tient dans la VM ; l'écart ne pèse que 1.

Lisibilité : A et B se lisent comme le parcours actuel (note 4). C ajoute le regroupement par hub (note 3).

Robustesse : les trois donnent la même somme de contrôle à chaque taille, et `npm test` passe, y compris sur un lot vide (note 5).

Coût : A est déjà en place (note 5). B et C sont un changement local, sans dépendance (note 4).

## 3. La sensibilité

En passant la lisibilité de 2 à 1 et en reportant le point sur le coût, les totaux deviennent 28, 32 et 36 : C reste devant. C devance B tant que le poids du temps dépasse celui de la lisibilité (ici 5 contre 2). La décision n'est pas fragile.
