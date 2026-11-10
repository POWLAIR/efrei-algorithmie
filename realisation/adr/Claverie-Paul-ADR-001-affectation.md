# ADR-001 - Affecter les colis du jour sans manger la fenêtre de 1 h 30

## 1. Contexte

Chaque nuit à 00h30, l'affectation donne chaque colis au livreur le plus proche qui a encore de la place. Le 24/09, 6 412 colis et 85 livreurs ont produit 545 020 lectures en base et 2 h 15 pour cette seule étape, au-delà des 1 h 30 du batch. En décembre le volume annoncé est 15 000 colis, toujours avec 85 livreurs. La contrainte est de finir l'étape assez tôt pour que le reste du batch tienne avant 02h00.

## 2. Options comparées

- Option A (legacy) : file vidée par décalage, recherche linéaire des numéros déjà vus, distance calculée pour chaque livreur, tri de la tournée à chaque colis. Complexité annoncée : O(n²), plus O(n × 85) distances.
- Option B (tri) : doublons repérés par un tri des numéros, même parcours des 85 livreurs, un seul tri de chaque tournée à la fin. Complexité annoncée : O(n log n) pour les doublons, O(n × 85) pour l'affectation.
- Option C (map) : numéros déjà vus dans un ensemble, livreurs groupés par hub, distance calculée une fois par hub et non par livreur, tri final. Complexité annoncée : O(n) pour les doublons, O(n × hubs) distances, moins de couples examinés tant qu'un hub proche a de la place.

## 3. Mesures

- Machine : Intel Core Ultra 7 155H, 8 cœurs, 10 Go, Linux WSL2, Node v20.20.2.
- Jeux : `data/jeux/moyenne` pour les temps (tailles 1 000, 2 000, 5 000, 10 000) ; `data/jeux/grande` pour les couples (6 412, 9 000, 12 000, 15 000, 18 000, 20 000). Pas de mesure à 100 000 : un appel du legacy y dure déjà plusieurs minutes.
- Répétitions : 5, après 200 tours d'échauffement plafonnés à 5 secondes.
- Statistique retenue : la médiane.
- Ce qui est mesuré : temps et mémoire d'un appel sur le poste, plus les couples colis-livreur que la production paie (`npm run couples`). Hypothèse de chiffrage, posée avant les notes : 25 minutes pour 6 000 × 85 couples, soit 2,9 ms par couple.

| Option | 1 000 | 2 000 | 5 000 | 10 000 | Mémoire à 10 000 |
| --- | --- | --- | --- | --- | --- |
| A (legacy) | 25,0 ms | 78,5 ms | 489,2 ms | 1 910,1 ms | 4,3 Mo |
| B (tri) | 4,1 ms | 42,5 ms | 34,0 ms | 81,1 ms | 0,8 Mo |
| C (map) | 1,7 ms | 4,3 ms | 17,5 ms | 29,5 ms | 1,0 Mo |

À 15 000 colis, tri examine 1 271 770 couples (84,8 par colis) et map 651 031 (43,4 par colis), même somme de contrôle. Courbe : `bench/resultats/2026-11-09T15-16-33-affectation.svg`. Détail : `bench/resultats/2026-11-09T15-16-33-affectation.csv` et `bench/resultats/2026-11-09T15-16-52-couples.csv`.

## 4. Décision

On retient l'option C : à 15 000 colis elle paie environ deux fois moins de couples que A et B, et c'est le critère Temps, de poids 5, qui tranche.

## 5. Conséquences et limites

C remplace le corps de l'affectation, sans dépendance nouvelle. Le pic mesuré à 10 000 colis est 1,0 Mo, contre 4,3 Mo pour A. Le temps du poste ne suffit pas : la production paie les couples, et 2,9 ms par couple est une hypothèse tirée de la nuit ordinaire, pas une mesure sur la VM. La nuit du 24/09, superlinéaire, n'a pas été rejouée en base.

Domaine de validité : volumes de 1 000 à 10 000 colis pour le temps, et de 6 412 à 20 000 pour les couples ; 85 livreurs et 3 hubs fixés. À 15 000 colis, 178 colis restent sans livreur ; à 18 000, 3 167. À partir de 18 000 colis la décision ne tient plus : le parc est plein, changer de structure ne crée pas de place.

## 6. En trois phrases pour la directrice des opérations

On prépare les tournées en cherchant d'abord l'entrepôt le plus proche, puis un livreur de cet entrepôt qui a encore de la place. Pour 15 000 colis, cette préparation regarde environ deux fois moins de paires colis-livreur que la méthode actuelle, qui a déjà pris plus de deux heures pour 6 412 colis. Avec les 85 livreurs d'aujourd'hui, au-delà de 15 000 colis une partie des colis ne part plus : il faudra des livreurs en plus.
