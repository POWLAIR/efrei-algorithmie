# Les biais du benchmark du CTO (bench/bench-naif.ts)

Une ligne par biais : la ligne du fichier où il se voit, la question (1 à 8) qu'il rate, puis ce qu'il fausse.

- biais 1 - ligne 17 - question 2 : l'échantillon fait 300 colis, loin des 6 412 de la nuit du 24/09 et des 15 000 de décembre, donc le classement ne dit rien de la production.
- biais 2 - lignes 17 à 32 - question 3 : chaque variante n'est lancée qu'une fois, sans échauffement, donc le premier passage paie la compilation et une valeur unique tient lieu de mesure.
- biais 3 - ligne 21 - questions 5 et 6 : le chrono de map englobe la lecture du CSV (`Date.now` avant `lireColis`), horloge à la milliseconde, alors que tri et naive ne paient que l'affectation.
- biais 4 - ligne 23 - question 7 : le résultat de map n'est ni lu ni comparé aux autres variantes, donc un résultat faux irait aussi vite dans ce classement.
- biais 5 - lignes 20 à 32 - question 8 : map est toujours chronométrée en premier, à froid, et la conclusion « on garde le code actuel » dépend de cet ordre.

## Les huit questions à poser à tout benchmark

Sur le protocole :

> Q1 : Qui l'a écrit, et pour prouver quoi ?
> Q2 : Sur quelle taille ? Ressemble-t-elle à la production ?
> Q3 : Combien de fois, après combien de tours d'échauffement ?
> Q4 : Quelle statistique : une valeur, la moyenne, la médiane ?

Sur la mesure elle-même :

> Q5 : Qu'y a-t-il entre les deux relevés du chrono ?
> Q6 : Quelle horloge, quelle résolution ?
> Q7 : Le résultat est-il lu, et comparé entre les variantes ?
> Q8 : L'ordre des variantes change-t-il le classement ?
