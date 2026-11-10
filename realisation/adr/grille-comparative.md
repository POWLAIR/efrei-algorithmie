# Grille comparative - gabarit

La grille sert à décider, pas à classer par vitesse. Les poids dépendent du ticket : un traitement de nuit
qui tient sa fenêtre supporte d'être lent, un traitement qui en déborde ne le supporte plus, une page appelée
40 000 fois par jour ne l'a jamais supporté. Les poids et le barème de chaque note se fixent avant de mesurer.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | ce que la production paiera : durée estimée à l'échelle et à l'heure de production (requêtes x coût d'une requête, plus le calcul mesuré), croissance quand le volume grandit | ... |
| Mémoire | pic mémoire à l'échelle de production | ... |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | ... |
| Robustesse | comportement sur les doublons, les vides, les entrées invalides | ... |
| Coût de mise en oeuvre | lignes changées, dépendances ajoutées, données à préparer | ... |

Gardez les cinq lignes. Un critère qui ne compte pas pour ce ticket reçoit le poids 0 : c'est une décision, écrivez pourquoi.

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case : "4", pas "4/5" ni "4 (lisible)". La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (legacy) | | | | | | |
| B | | | | | | |
| C | | | | | | |

Total pondéré = somme des notes multipliées par les poids. Une note de temps ne se donne pas sans une mesure dans `bench/resultats/` : le CSV du harness et celui de `npm run couples` quand la production paie des requêtes.

Barème de la note de temps, à écrire ici avant de mesurer : la durée qui vaut 5, celle qui vaut 1 et ce qui sépare les deux. Il se fixe sur le budget du ticket (la fenêtre, le temps de réponse attendu), pas sur la plus rapide des options.

## 3. La sensibilité

Poussez le poids du temps à 5 et celui de la lisibilité à 1 : la décision change-t-elle ? Une phrase. Si vous avez le temps, cherchez aussi le poids du temps à partir duquel elle bascule. Si la décision bascule près des poids choisis, dites-le dans l'ADR : c'est une décision fragile, le CTO doit le savoir.
