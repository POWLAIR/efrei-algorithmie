# Constat J1 - Premier chrono de l'affectation legacy

Pièces jointes : `bench/resultats/j1-chrono.csv` (9 mesures) et `bench/resultats/j1-chrono.svg` (courbe, axe log).
Machine : poste WSL2, 8 cœurs, Node 20. « mesuré » = chiffre de ce banc ; (0x) = pièce de la data room.

## 1. Mesure

| Jeu | Colis | Médiane affectation (3 rép.) | Temps externe (`time`) |
| --- | ---: | ---: | ---: |
| petite | 1 000 | 23,7 ms | 1,0 s |
| moyenne | 10 000 | 2 100,5 ms | 3,1 s |
| grande | 100 000 | 372 551,9 ms (6 min 13) | non mesuré (≈ 6 min) |

Le temps externe ajoute ≈ 1 s fixe (démarrage de tsx, lecture des CSV) : sur petite, l'affectation n'en est que 2 %.
On compare donc les médianes internes, pas le chrono externe.

Log du 24/09 : 545 020 requêtes SQL ÷ 6 412 colis = **85**, le nombre de livreurs (04) : une requête par couple colis × livreur.

## 2. Hypothèse (avant d'ouvrir le code)

Taille × 10 → temps × 89 (petite → moyenne), puis × 177 (moyenne → grande). Pente log ≈ 1,95 puis 2,25 :
**l'affectation est en O(n²)**. Le second saut dépasse n² : à 100 000 colis, 83 716 colis ne trouvent plus de place
mais parcourent quand même les 85 livreurs, et la liste des numéros déjà vus ne tient plus dans le cache processeur.

## 3. Confirmation dans `legacy/src/affectation.ts`

- l.37-38 `while (file.length > 0) { const c = file.shift()!;` : `shift` décale tout le tableau à chaque colis → n².
- l.39 `dejaTraites.indexOf(c.numeroSuivi)` : recherche linéaire dans un tableau qui grandit → n².
- l.60 `meilleure.colis.sort(parEcheance)` : tri complet de la tournée à chaque ajout → n²/85 × log.
- l.45 `for (const t of tournees)` : boucle sur les 85 livreurs pour chaque colis → n × 85,
  c'est elle qui explique la division requetes_sql ÷ colis = 85 (en production, chaque passage est une requête SQL).

Étape adresses (`--limite-adresses 5`, référentiel métropole) : médiane 13 301,3 ms (mesuré)
→ 13 301,3 × 1 000 / (5 × 229 272) = **11,6 µs par comparaison** (mesuré).
Rejeu du jeudi noir : 6 412 × 732 658 ≈ 4,7 milliards de comparaisons (04) × 11,6 µs ≈ **15 h 09** ici,
pour 6 h 35 réelles (04), soit 5,0 µs en production : la VM est ≈ 2,3 × plus rapide que ce poste,
mais le nombre de comparaisons suffit à expliquer le facteur ×37 entre une nuit normale et le 24/09.

## 4. Projection à 15 000 colis en décembre (06)

- Affectation, en n² à partir du 24/09 : 8 077 s (04) × (15 000 / 6 412)² ≈ **12 h 17**, pour une fenêtre de 1 h 30 (04).
- Adresses, Gironde et cache vide : 15 000 × 732 658 × 5,0 µs ≈ **15 h 24** (cadence de production du 24/09).
- Conclusion : avec le même code, ni l'une ni l'autre étape ne tient avant 02h00. Le coût vient du nombre
  d'opérations (n² et n × référentiel), pas de la machine : une VM plus grosse ne suffira pas.
