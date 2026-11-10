# ADR-003 - Servir le colis le plus urgent sur le quai

## 1. Contexte

Le soir, les préparateurs prennent toujours le colis le plus urgent : pharmacies, puis express, puis standard, puis fin de créneau, puis heure de création. Le quai de 2019 retrie toute la file à chaque arrivée (`legacy/src/quai.ts`, lignes 20 et 24). Le 9 novembre compte environ 9 000 colis, décembre environ 15 000. La contrainte est double : la soirée doit rester courte, et l'ordre de sortie doit tenir si un camion arrive en retard.

## 2. Options comparées

- Option A (tableau, legacy) : `ajouter` pousse le colis puis retrie toute la file, `prendre` retire le premier. Complexité annoncée : O(n log n) par arrivée, O(n) par prise.
- Option B (tas) : un tas binaire, plus le rang d'arrivée pour départager deux colis égaux. Complexité annoncée : O(log n) par arrivée et par prise.
- Option C (seaux) : trois files, une par priorité, servies dans l'ordre d'arrivée. Complexité annoncée : O(1) par arrivée et par prise, à condition que les colis arrivent dans l'ordre de création et qu'une priorité n'ait qu'une fin de créneau.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Jeu : `data/jeux/grande`, tailles 1 000, 9 000 et 15 000 colis uniques, dans l'ordre de création.
- Répétitions : 5, après 2 tours d'échauffement.
- Statistique retenue : la médiane.
- Ce qui est mesuré : toute la soirée (arrivées, prises de 0 ou 1 colis, puis vidage). Les trois options donnent la même somme de contrôle. Une seconde mesure, arrivées dans l'ordre du fichier, éprouve l'hypothèse des seaux.

Soirée dans l'ordre de création, médiane :

| Option | 1 000 | 9 000 | 15 000 | Mémoire à 15 000 |
| --- | --- | --- | --- | --- |
| A (tableau) | 88,9 ms | 2 226,7 ms | 5 719,5 ms | 11,3 Mo |
| B (tas) | 1,5 ms | 19,3 ms | 32,5 ms | 2,2 Mo |
| C (seaux) | 0,2 ms | 1,3 ms | 2,3 ms | 0,87 Mo |

De 1 000 à 15 000 colis, le volume est multiplié par 15, le temps de A par 64, celui de B par 22, celui de C par 12.

Arrivées désordonnées : à 1 000 colis, A et B restent d'accord (`89c52d41`), C donne un autre ordre (`bc776f41`) et la mesure s'arrête. À 9 000, A et B sont encore d'accord (`cfa0b5e5`), en 2 119,9 ms et 18,5 ms.

Courbe : `bench/resultats/2026-11-10T13-26-11-priorite.svg`. Détail : `bench/resultats/2026-11-10T13-26-11-priorite.csv` et `bench/resultats/2026-11-10T13-26-45-priorite-arrivees.csv`.

## 4. Décision

On retient l'option B : à 15 000 colis la soirée dure 32,5 ms contre 5 719,5 ms pour le tri, et les seaux, à 2,3 ms, perdent le bon ordre dès que les arrivées ne suivent plus la création. Le temps, de poids 4, écarte le tri ; la robustesse, de poids 3, écarte les seaux.

## 5. Conséquences et limites

B se paie un tas écrit et testé, 2,2 Mo à 15 000 colis, sans dépendance nouvelle. Le rang d'arrivée est nécessaire : sans lui, deux colis de même priorité, même créneau et même seconde de création sortent dans un ordre qui dépend de la forme du tas.

Domaine de validité : 1 000, 9 000 et 15 000 colis du jeu grande, prises de 0 ou 1, 5 répétitions. Livreurs et hubs n'ont pas varié. L'épreuve désordonnée s'arrête à 1 000 colis pour C et confirme B jusqu'à 9 000. La décision ne tient plus si les arrivées sont garanties dans l'ordre de création avec une seule fin de créneau par priorité : C suffit alors. Elle ne tient plus non plus si le rang d'arrivée est retiré.

## 6. En trois phrases pour la directrice des opérations

Le soir, les pharmacies passent avant les express, puis les autres, et un camion en retard ne doit pas changer cet ordre. Retrier toute la pile à chaque arrivée prend près de six secondes pour 15 000 colis, alors qu'une pile qui sait sortir le plus urgent reste sous le dixième de seconde et donne le même ordre. Trois files, une par urgence, sont encore plus rapides, mais elles se trompent dès que les colis n'arrivent pas dans l'ordre où ils ont été créés.
