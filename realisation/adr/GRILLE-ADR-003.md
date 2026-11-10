# Grille comparative - ADR-003 Priorité

La file du quai sert les pharmacies, puis les express, puis le standard, un soir de 1 000 à 15 000 colis. Les poids et les barèmes ci-dessous sont fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée de toute la soirée à 15 000 colis, et sa croissance depuis 1 000 | 4 |
| Mémoire | pic relevé pendant la soirée à 15 000 colis | 1 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 1 |
| Robustesse | même ordre de sortie que le legacy, y compris si les colis n'arrivent pas dans l'ordre de création | 3 |
| Coût de mise en oeuvre | lignes changées, structure à écrire, dépendance | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (tableau) | 2 | 3 | 5 | 5 | 5 | 36 |
| B (tas) | 5 | 4 | 3 | 5 | 3 | 45 |
| C (seaux) | 5 | 5 | 4 | 1 | 4 | 36 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps, durée de la soirée à 15 000 colis : 5 sous 50 ms, 4 sous 500 ms, 3 sous 2 s, 2 sous 10 s, 1 au-delà.

Mémoire pendant la soirée à 15 000 colis : 5 sous 1 Mo, 4 sous 5 Mo, 3 sous 20 Mo, 2 sous 100 Mo, 1 au-delà.

Lisibilité : partir de 5 et retirer un point par idée à connaître pour lire le code.

Robustesse : 5 si l'ordre de sortie reste celui du legacy, arrivées triées ou non ; 3 si un cas limite est faux mais signalé ; 1 si un cas courant, le camion en retard, change l'ordre en silence.

Coût : 5 si rien ne change ; 4 pour quelques lignes et une structure du langage ; 3 pour une structure à écrire et à tester ; 1 pour une dépendance ajoutée.

Justification des notes, après la mesure.

Temps, médiane à 15 000 colis : A 5 719,5 ms, note 2. B 32,5 ms, note 5. C 2,3 ms, note 5.

Mémoire, médiane à 15 000 colis : A 11,3 Mo, note 3. B 2,2 Mo, note 4. C 0,87 Mo, note 5.

Lisibilité : A se lit comme un tri puis une prise en tête, note 5. B demande le tas et le rang d'arrivée qui départage les égalités, note 3. C est trois files, une par priorité, note 4.

Robustesse : A et B donnent la même somme de contrôle sur la soirée ordonnée et sur les arrivées désordonnées, note 5. C diverge dès 1 000 colis arrivés dans l'ordre du fichier (`bc776f41` contre `89c52d41`), note 1.

Coût : A est déjà en place, note 5. B est le tas écrit et testé dans `bench/variantes/tas.ts`, note 3. C est quelques lignes et des listes du langage, note 4.

## 3. La sensibilité

Avec le temps à 4 et la robustesse à 3, B mène 45 à 36. En reportant deux points de robustesse sur le temps (temps 6, robustesse 1), B reste devant C, 45 contre 44. La bascule n'arrive que si la robustesse passe à 0 : C mène alors 48 à 45. La décision n'est pas fragile : le poids retenu est 3, loin de ce basculement.
