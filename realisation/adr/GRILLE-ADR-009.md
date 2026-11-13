# Grille comparative - ADR-009 Vélo cargo

La première vague part à 7 h 00, avec 80 kg et 450 l (ticket T-0655). Le contrat veut les pharmacies avant 10 h 00. Les points sont 10, 3 et 1. Les poids et les barèmes ci-dessous sont ceux de la fiche, fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | médiane à 20 tournées | 2 |
| Mémoire | pic à 20 tournées, table calculée à part | 2 |
| Lisibilité | idées à connaître pour lire `bench/variantes/chargement.ts` | 2 |
| Robustesse | points laissés sur le quai sur 60 tournées | 3 |
| Coût de mise en oeuvre | longueur de la fonction, réglages à tenir | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (legacy) | 5 | 5 | 4 | 1 | 5 | 36 |
| B (glouton) | 5 | 5 | 3 | 4 | 4 | 42 |
| C (dynamique) | 3 | 5 | 2 | 5 | 2 | 37 |
| D (backtracking) | 5 | 5 | 2 | 5 | 2 | 41 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps, médiane à 20 tournées : 5 sous 100 ms, 4 sous 1 s, 3 sous 10 s, 2 sous 1 min, 1 au-delà.

Mémoire : 5 sous 10 Mo, 4 sous 50 Mo, 3 sous 200 Mo, 2 sous 1 Go. Pour la table, le harness ne voit pas les tableaux typés : la note vient du calcul. Deux lancements à moins d'un facteur 2 l'un de l'autre ont la même note. Deux options à moins d'un facteur 2 l'une de l'autre aussi.

Robustesse, points laissés sur le quai sur 60 tournées : 5 si aucun, 4 sous 1 %, 3 sous 5 %, 2 sous 10 %, 1 au-delà. Elle se lit dans `npm run cargo`.

Lisibilité : partir de 5, retirer un point par idée qu'il faut connaître (rôle de la fonction, colis qui ne rentre pas, endroit du barème).

Coût : 5 si rien ne change, 4 pour une fonction courte sans réglage, 3 pour une fonction longue ou un réglage à tenir, 2 pour les deux, 1 pour une dépendance. L'arrondi au-dessus et le plafond de nœuds sont des réglages à tenir.

Justification des notes, après la mesure.

Temps : A 2 ms pour les 60 tournées dans `npm run cargo`, note 5. B 0,42 ms, note 5. C 1 030,70 ms, note 3. D 45,67 ms, note 5. Un second lancement donne C à 974,00 ms, qui serait une note 4 : le cran de 1 s est touché, le classement ne change pas.

Mémoire à 20 tournées, pic du harness : B 362 ko, D 2,2 Mo, les deux sous 10 Mo, note 5. Second lancement : 503 ko et 2,2 Mo, facteur inférieur à 2. C : le harness voit 705 ko, les tableaux typés ne sont pas comptés. Calcul : 801 × 451 cases, deux couches d'entiers de 4 octets (2,76 Mo), plus 82 colis × 45 160 octets de marques (3,53 Mo), soit 6,29 Mo, note 5. A n'alloue rien de plus, note 5.

Lisibilité : A charge dans l'ordre d'arrivée, note 4. B trie par points rapportés à la place, et saute un colis trop gros sans s'arrêter, note 3. C prend le meilleur des deux cases et ne marque le colis que s'il est strictement meilleur, puis remonte depuis la case pleine, note 2. D explore prendre ou laisser, coupe par une borne fractionnaire, et s'arrête à un plafond de nœuds, note 2.

Robustesse : A laisse 991 points (17,4 %), note 1. B en laisse 13 (0,2 %), note 4. C et D n'en laissent aucun, 5 710 points chacun, note 5.

Coût : A ne change rien, note 5. B est une fonction courte sans réglage, note 4. C est une fonction longue et l'arrondi au-dessus (hectogramme, litre) est un réglage, note 2. D est une fonction longue et le plafond de nœuds est un réglage, note 2.
