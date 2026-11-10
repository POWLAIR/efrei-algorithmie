# Fiche problème - Préparer les tournées du lendemain avant 02h00, même avec le référentiel de la Gironde

Sources : pièces de la data room entre parenthèses (00, 01, 04, 06, 07).

## 1. Entrées

- Colis en attente : lus dans la base à 00h30, adresse tapée à la main par le client, avec des fautes (07) ; environ 1,5 % de doublons de scan (06).
- Référentiel d'adresses : métropole 229 272 adresses ou Gironde 732 658 adresses, chargé en mémoire (04, 07).
- Cache d'adresses : sert 90 % des colis en temps normal ; vide à chaque nouvelle version du référentiel (06, 07).
- Livreurs : 85 (60 vélos cargo de 80 kg, 25 utilitaires de 700 kg), capacité restante lue dans la base (01, 07).
- API de distance : service externe payant, 0,004 € par appel (06).

## 2. Sorties

- Une tournée par livreur, 85 tournées, arrêts dans l'ordre, pharmacies en tête, pour les tablettes des livreurs à partir de 06h00 (04, 07).
- Le total en kilomètres pour le planning des batteries : 4 211 km la nuit du 24/09 (04, 07).
- Le plan de chargement (caisses, donc vagues) pour les préparateurs de nuit : 299 vagues la nuit du 24/09 (04, 07).

## 3. Volumes

- Colis par jour : 6 000 aujourd'hui (06) ; 6 412 la nuit du 24/09 (04) ; 9 000 au 9 novembre 2026 (06) ; 15 000 au pic de décembre 2026 (06) ; record 14 800 le 19/12/2025 (01).
- Référentiel : 229 272 adresses aujourd'hui, 732 658 avec la Gironde, soit environ ×3 (04).
- Livreurs : 85 aujourd'hui, 95 en décembre avec 10 utilitaires loués (06).
- Travail de l'affectation : 545 020 requêtes SQL = 6 412 colis × 85 livreurs (04).
- Travail des tournées : 478 114 appels API le 24/09, contre environ 22 500 un jour ordinaire (90 € ÷ 0,004 €) (04, 06).
- Sorties la nuit du 24/09 : 85 tournées, 6 318 arrêts, 299 vagues (04).

## 4. Fréquence

- Une exécution par nuit, lancée par cron à 00h30 (07).
- Fin attendue à 02h00, donc une fenêtre de 1h30 (04).
- Ensuite : tablettes lues à partir de 06h00, départ des utilitaires à 06h30 et des vélos à 07h00, livraisons avant 10h00 (01, 04, 07).

## 5. Cas critiques

- Changement de référentiel : cache vide (cache_hits=0), l'étape 1 passe de 10 min à 6 h 35 (04).
- Pic de volume : +18 % de colis le 24/09 et l'affectation passe de 25 min à 2 h 15 (04).
- Doublons de scan : 94 le 24/09 (04).
- Colis de plus de 25 kg refusés par les vélos : 30 par jour (06).
- Personne ne surveille le batch la nuit : alerte donnée à 06h15 par les préparateurs (04).
- Ce que coûte la panne du 24/09 : batch de 9 h 40, 312 colis pharmacie en retard sur 480, 2 496 € de pénalités, 1 912 € d'API, 1 871 colis reportés, extension du contrat gelée (04).

## 6. Exigences non fonctionnelles

- Délai : batch entier fini avant 02h00 (04).
- Machine : VM OVH à 320 € par mois (06) ; mémoire et processeur non renseignés dans les pièces lues, à demander.
- Coût : API à 0,004 € par appel, 90 € un jour ordinaire (06).
- Contrat pharmacies : au plus 2 % de colis hors délai sur le mois, 8 € de pénalité par colis en retard (04).
- À ne pas casser : pharmacies en tête de tournée (07), aucun doublon livré (07), rapprochement d'adresses aussi juste qu'aujourd'hui.
- À pouvoir expliquer : des chiffres mesurés, pas des convictions (01).

## La question, en une phrase

Comment faire tourner le batch Aiguillage entier entre 00h30 (07) et 02h00 (04) pour 15 000 colis (06) avec le référentiel de la Gironde de 732 658 adresses (04), même quand le cache est vide (04) ?

## Ce que le post mortem ne dit pas

- Il ne calcule pas d'où vient le facteur 40 : une nuit normale, 549 adresses hors cache × 229 272 adresses ≈ 126 millions de comparaisons ; le 24/09, 6 412 × 732 658 ≈ 4,7 milliards, soit environ ×37 (04, 07).
- Le test de Julien (200 colis, référentiel métropole) ne reproduit ni le volume, ni la Gironde, ni le cache vide : il ne prouve pas que le code est hors de cause (04).
- Il n'explique pas pourquoi l'affectation dure 5,4 fois plus longtemps (1 490 s contre 8 077 s) pour seulement 19 % de colis en plus (04).
- Il ne compare pas les appels API : le compteur manque dans le log du 16/09 ; environ 22 500 appels un jour ordinaire contre 478 114, soit 76 appels par arrêt (04, 06).
- Il ne dit pas si les 2 310 adresses « approchées » étaient justes : il parle du temps, pas de la qualité du résultat (04).
- Il ne dit pas d'où vient la limite de 02h00 : les tablettes lisent à 06h00 (07), et la durée « normale » varie selon les pièces : 1 h 30 (04), 1 h 11 le 16/09 (04), environ 1 h en 2024 (07).
- Il ne relève pas que le batch du 25/09, revenu à la métropole, dure 1 h 41 et finit donc déjà après 02h00 (04).
- Il ne prévoit pas d'alerte : la surveillance repose sur une seule personne, Julien (04).
- Il ne mentionne pas la dette connue depuis 2019 : « optimiser quand on dépassera 1 000 colis par jour » (07).
- Il n'estime rien pour le 9 novembre (9 000 colis) ni pour décembre (15 000 colis) avec le même code (06).
