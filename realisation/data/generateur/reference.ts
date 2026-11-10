// Le référentiel d'adresses du module, figé le 29 octobre 2026.
//
// La Base Adresse Nationale publie une nouvelle version chaque jour : deux postes qui la téléchargent
// à deux dates différentes n'ont pas les mêmes adresses, donc pas les mêmes jeux de données, donc pas
// les mêmes sommes de contrôle. Toute la promotion travaille sur l'archive déposée sur Moodle,
// et ces empreintes le vérifient.
export const REFERENCE = {
  date: "2026-10-29",
  archive: { fichier: "adresses-33.csv.gz", sha256: "9bcdd1c62070099abad1035b69caffaed93c0076b4f7072f16215908fa6cae8d" },
  gironde: { fichier: "adresses-gironde.csv", adresses: 730137, sha256: "e9297795a76d9f6192e0af487ee4abb7633ea1174a22dbb253d9c11cd47a8c79" },
  metropole: { fichier: "adresses-metropole.csv", adresses: 229329, sha256: "2e58f8782158c2862279c7a3687c252d19d55098d2777b44b44685785e877b57" },
};
