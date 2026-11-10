# Les biais du benchmark du CTO (bench/bench-naif.ts)

Copiez ce fichier en bench/BIAIS-bench-naif.md. Une ligne par biais, au moins trois, sur ce modèle :
la ligne du fichier où il se voit, la question (1 à 8) qu'il rate, puis ce qu'il fausse en une phrase.

Format d'une entrée : un tiret, puis au moins un numéro de ligne et au moins un numéro de question.
Plusieurs lignes ou plusieurs questions s'écrivent aussi : "lignes N à M", "questions P et Q".

- biais 1 - ligne ... - question ... : ...
- biais 2 - ligne ... - question ... : ...
- biais 3 - ligne ... - question ... : ...

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
