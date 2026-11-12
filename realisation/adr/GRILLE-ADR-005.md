# Grille comparative - ADR-005 Adresses

Une adresse saisie avec une faute doit être rapprochée des 229 329 adresses de la métropole pendant que la personne attend. Les poids et les barèmes ci-dessous sont fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée d'une saisie sur tout le référentiel de la métropole | 5 |
| Mémoire | taille de la structure construite sur les 229 329 adresses | 2 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 1 |
| Robustesse | la bonne adresse officielle, y compris faute, abréviation ou numéro absent | 1 |
| Coût de mise en oeuvre | lignes changées, structure à écrire, dépendance ajoutée | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (brute) | 2 | 5 | 5 | 4 | 5 | 34 |
| B (trigrammes) | 5 | 4 | 3 | 3 | 3 | 42 |
| C (postgres) | 4 | 4 | 2 | 3 | 1 | 34 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps d'une saisie : 5 sous 50 ms, 4 sous 200 ms, 3 sous 1 s, 2 sous 5 s, 1 au-delà.

Mémoire de la structure sur les 229 329 adresses : 5 sous 20 Mo, 4 sous 80 Mo, 3 sous 200 Mo, 2 sous 500 Mo, 1 au-delà. Rien à construire vaut 5.

Lisibilité : partir de 5 et retirer un point par idée à connaître pour lire le code.

Robustesse : 5 si toute saisie, exacte ou fautive, reçoit la bonne adresse ou un refus clair ; 4 si le parcours complet reste juste mais n'a été vu que sur les saisies faciles ; 3 si un cas courant, le numéro de rue absent, donne une mauvaise adresse en silence.

Coût : 5 si rien ne change ; 3 pour une structure à écrire et à tester ; 1 pour une dépendance ajoutée.

Justification des notes, après la mesure.

Temps, une saisie sur 229 329 adresses : A 4 588 ms, note 2. B 13,4 ms, note 5. C 187,4 ms, note 4.

Mémoire de la structure : A rien, note 5. B 58,8 Mo, note 4. C 42,1 Mo, note 4.

Lisibilité : A est une distance de saisie contre chaque adresse, note 5. B demande les groupes de trois lettres et le compteur remis à zéro, note 3. C ajoute une base embarquée et son extension, note 2.

Robustesse : B et C retrouvent 288 adresses sur 300 (96 %), et aucune des 9 saisies sans numéro. Note 3. A est juste sur les 10 saisies qu'il a eu le temps de traiter, toutes faciles, note 4.

Coût : A est déjà en place, note 5. B est l'index écrit dans `bench/variantes/adresses.ts`, note 3. C ajoute PGlite, note 1.

## 3. La sensibilité

Avec le temps à 5, B mène 42 à 34. En reportant deux points du temps sur le coût (temps 3, coût 3), A passe devant, 40 contre 38. La décision tient au poids du temps : il est à 5, et le basculement est à 3. Elle n'est pas fragile, mais elle le deviendrait si la saisie n'avait plus à répondre pendant que la personne attend.
