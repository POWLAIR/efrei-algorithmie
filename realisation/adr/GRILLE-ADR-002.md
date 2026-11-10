# Grille comparative - ADR-002 Suivi

La page « Où est mon colis » est appelée 40 000 fois par jour. Les poids et les barèmes ci-dessous sont fixés avant la mesure.

## 1. Les critères et leur poids pour ce ticket

| Critère | Ce qu'on mesure ou ce qu'on juge | Poids (somme = 10) |
| --- | --- | --- |
| Temps | durée d'une recherche, projetée sur les six mois de scans gardés en base | 5 |
| Mémoire | pic de la structure construite sur environ un million de scans | 2 |
| Lisibilité | un développeur qui découvre le code le comprend-il en cinq minutes | 1 |
| Robustesse | numéro connu, inconnu ou mal formé : bonne réponse ou erreur claire | 1 |
| Coût de mise en oeuvre | lignes changées, structure fournie par le langage, donnée à préparer, dépendance | 1 |

## 2. Les options, note de 1 à 5 par critère

Une note est un chiffre seul, de 1 à 5, par case. La justification va sous le tableau.

| Option | Temps | Mémoire | Lisibilité | Robustesse | Coût | Total pondéré |
| --- | --- | --- | --- | --- | --- | --- |
| A (tableau) | 2 | 5 | 5 | 4 | 5 | 34 |
| B (set) | 2 | 4 | 4 | 3 | 4 | 29 |
| C (map) | 5 | 4 | 3 | 3 | 4 | 43 |

Total pondéré = somme des notes multipliées par les poids.

Barèmes fixés avant la mesure.

Temps, par recherche projetée sur les six mois de scans en base : 5 sous 1 ms, 4 sous 10 ms, 3 sous 100 ms, 2 sous 1 s, 1 au-delà.

Mémoire de la structure construite sur environ un million de scans : 5 sous 1 Mo, 4 sous 10 Mo, 3 sous 50 Mo, 2 sous 200 Mo, 1 au-delà. Deux relevés à moins d'un facteur 2 prennent la même note.

Lisibilité : partir de 5 et retirer un point par idée à connaître pour lire le code.

Robustesse : 5 si tout numéro, connu, inconnu ou mal formé, reçoit la bonne réponse ou une erreur claire ; 4 si rien n'est à tenir à jour mais le format du numéro n'est pas vérifié ; 3 si un scan manqué rend la réponse périmée sans erreur ; 2 si un cas courant est faux en silence ; 1 si les tests échouent.

Coût : 5 si rien ne change ; 4 pour quelques lignes et une structure du langage ; 3 pour une structure à écrire et à tester ; 2 pour une donnée à préparer à chaque lancement ; 1 pour une dépendance ajoutée.

Justification des notes, après la mesure.

Temps : médiane à 996 844 scans divisée par 100, puis multipliée par 13. A : 804 ms, note 2. B : 139 ms, note 2. C : 0,014 ms, note 5.

Mémoire de la structure à 996 844 scans : A 0,001 Mo, note 5. B 5,0 Mo et C 7,0 Mo, à moins d'un facteur 2 l'un de l'autre, note 4.

Lisibilité : A se lit comme un parcours, note 5. B demande de connaître la table de hachage, note 4. C ajoute le choix du scan le plus récent, note 3.

Robustesse : aucun des trois ne signale un numéro mal formé, ils répondent « inconnu ». A n'a rien à tenir à jour, note 4. B et C deviennent fausses en silence si un scan arrive sans reconstruction, note 3. Les tests de suivi passent.

Coût : A est déjà en place, note 5. B et C sont quelques lignes et une structure du langage, note 4.

## 3. La sensibilité

Avec le temps à 5, C mène 43 à 34. En reportant les points retirés au temps sur la lisibilité, C passe derrière A dès que le poids du temps tombe à 3 (40 contre 39). À 4, C reste devant (41 contre 37). La décision n'est pas fragile : le poids retenu est 5, loin du basculement.
