# Efrei Logistique - cellule performance

Dépôt de travail du module Algorithmie comparative (M2 Dev Manager Full Stack, EFREI Bordeaux, 2026-2027).
Il contient le code de 2019 tel qu'il tourne en production, le générateur des jeux de données et le banc de mesure.
Vous y travaillez du 1er octobre au 5 mars. Le carnet d'ADR et le projet en sortent.

## Installation (une fois, dans PowerShell)

Prérequis : Node.js LTS (la version indiquée dans le mail de rentrée) et Git.

```powershell
git clone <adresse du dépôt> efrei-logistique-perf
cd efrei-logistique-perf
npm install
npm run ban                       # télécharge la Base Adresse Nationale de la Gironde (27 Mo) et prépare les référentiels
npm run data -- --echelle petite  # génère le premier jeu de données
npm run chrono                    # chronomètre l'affectation du legacy sur ce jeu
```

Si le réseau de l'école bloque le téléchargement, copiez le fichier `adresses-33.csv.gz` fourni sur Moodle dans
`data/referentiel/` puis lancez `npm run ban -- --sans-telechargement`.

## Les commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run ban` | Prépare `data/referentiel/adresses-gironde.csv` (732 000 adresses) et `adresses-metropole.csv` (229 000) |
| `npm run data -- --echelle petite` | Génère un jeu de 1 000 colis dans `data/jeux/petite/` (aussi `moyenne` : 10 000, `grande` : 100 000, ou `--n 250000`) |
| `npm run chrono -- --jeu petite --etape affectation --repetitions 3` | Chronomètre une étape du batch de nuit sur un jeu |
| `npm run chrono -- --jeu petite --repetitions 3 --csv` | Idem, et ajoute chaque répétition de l'affectation à `bench/resultats/j1-chrono.csv` |
| `npm run batch -- --jeu petite --limite-adresses 20` | Enchaîne les quatre étapes avec les logs de production |
| `npm run bench` | Le harness : compare les variantes d'affectation sur des lots croissants (à compléter en atelier 3) |
| `npm run bench:naif` | Le benchmark du CTO. À lire avant de le croire |
| `npm run couples -- --tailles 6412,9000,15000` | Compte les couples colis-livreur examinés par tri et map (ce que la base paie en production), sans chronomètre |
| `npm run courbe -- --log --ouvrir` | Trace en SVG la courbe du CSV le plus récent de `bench/resultats/`, affiche les médianes et ouvre la courbe (`--log` : axe des temps logarithmique ; un chemin de CSV peut être donné) |
| `npm test` | Vérifie que les variantes donnent le même résultat que le legacy |

Toutes les commandes s'exécutent depuis la racine du dépôt. Dans `npm run data` et `npm run chrono`, `--jeu` et
`--echelle` sont synonymes ; une option inconnue ou sans sa valeur arrête la commande au lieu de retomber sur le jeu petite.

Sous PowerShell, le chronomètre externe est `Measure-Command { npm run chrono -- --jeu petite }`.

## L'arborescence

```
legacy/         le monolithe "Quai" de 2019, en TypeScript : ne le modifiez pas, lisez-le
  src/          modeles, csv, geo, affectation (étape 2), adresses (étape 1), tournees (étape 3), chargement (étape 4), batch
  bin/chrono.ts le chronomètre d'une étape
data/
  generateur/   generer.ts (jeux de données à graine fixe), ban.ts (référentiel d'adresses), alea.ts
  referentiel/  adresses BAN préparées (Licence Ouverte 2.0)
  jeux/         les jeux générés : hubs, livreurs, clients, colis, scans, verite, MANIFESTE.json
bench/
  harness.ts    le banc de mesure, squelette à compléter
  bench-naif.ts le benchmark piégé
  couples.ts    le compte des couples colis-livreur examinés, sans chronomètre
  variantes/    les variantes d'une même fonction, à mesurer
  courbe.ts     la courbe SVG
  resultats/    vos CSV et vos courbes (une mesure sans CSV n'est pas une mesure)
adr/            les gabarits : fiche problème (journée 1), ADR et grille comparative (journée 2)
tests/          les tests d'égalité entre variantes
```

## Les fichiers d'un jeu de données

Séparateur `;`, encodage UTF-8, aucun champ ne contient de `;`.

| Fichier | Colonnes | Remarques |
| --- | --- | --- |
| `hubs.csv` | id, nom, lat, lon | Le hub de Brienne et les deux micro-hubs |
| `livreurs.csv` | id, nom, vehicule, capacite_kg, capacite_l, vagues_par_jour, hub_id, debut_service, fin_service | 60 vélos cargo (80 kg, 450 l, 4 vagues), 25 utilitaires (700 kg, 4 000 l, 3 vagues) |
| `clients.csv` | id, nom, type_client, adresse_id, adresse, code_postal, commune | Les destinataires connus |
| `colis.csv` | id, numero_suivi, client_id, destinataire, adresse_saisie, code_postal, commune, lat, lon, poids_kg, volume_l, priorite, creneau_debut, creneau_fin, type_client, cree_le | L'adresse saisie est celle du formulaire client, avec ses fautes. Le fichier contient des doublons de numéro de suivi, comme le vrai |
| `scans.csv` | id, numero_suivi, horodatage, type, lieu, livreur_id | Une dizaine d'événements par colis, presque triés par heure |
| `verite.csv` | colis_id, adresse_ban_id, sorte_saisie | L'adresse officielle de chaque colis, pour évaluer un rapprochement |
| `MANIFESTE.json` | | Graine, comptes, sommes de contrôle : deux jeux générés avec la même graine sont identiques |

Le jour de livraison des jeux est le jeudi 24 septembre 2026. Ce n'est pas un hasard.

## Règles

- Le dossier `legacy/` ne se modifie pas : c'est la référence, on la mesure et on la compare.
- Une mesure se fait avec le harness, se répète, et laisse un CSV dans `bench/resultats/`.
- Aucune IA générative sur ce dépôt, sauf indication contraire donnée en cours.
