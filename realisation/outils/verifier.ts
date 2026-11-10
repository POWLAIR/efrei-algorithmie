// Le correcteur d'atelier : il dit, point par point, si ce que la fiche demande est fait.
//
//   npm run verifier -- 3        (le numéro de l'atelier)
//   npm run verifier -- --liste  (les ateliers que ce correcteur connaît)
//
// Chaque point affiche OK ou KO. Un KO dit ce qui a été vérifié, ce qui a été trouvé, et où regarder ;
// il ne donne jamais la commande ni le code qui corrige. Le correcteur ne modifie rien dans le dépôt.
// Il dit qu'un atelier est fini, pas qu'il est compris : la question de compréhension s'en charge.
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lireOptions } from "./options.js";
import type { Atelier } from "./verifs/kit.js";

const options = lireOptions({ drapeau: ["liste"], positionnels: 1 });
const ici = dirname(fileURLToPath(import.meta.url));
const disponibles = readdirSync(join(ici, "verifs")).map(f => f.match(/^a(\d+)\.ts$/)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);

if (!existsSync(resolve("package.json")) || !existsSync(resolve("legacy"))) {
  console.error("lancez le correcteur depuis la racine du dépôt efrei-logistique-perf");
  process.exit(1);
}
if (options.present("liste") || options.positionnels.length === 0) {
  console.log(`ateliers connus : ${disponibles.join(", ")}`);
  console.log("usage : npm run verifier -- <numéro de l'atelier>");
  process.exit(options.present("liste") ? 0 : 1);
}
const n = Number(options.positionnels[0]);
if (!disponibles.includes(n)) {
  console.error(`atelier inconnu : ${options.positionnels[0]} (ateliers connus : ${disponibles.join(", ")})`);
  process.exit(1);
}

const atelier: Atelier = (await import(`./verifs/a${n}.js`)).default;
console.log(`[verifier] atelier ${atelier.numero} - ${atelier.titre}\n`);
let kos = 0;
for (const c of atelier.controles) {
  let r;
  try { r = await c.test(); } catch (e) { r = { ok: false, trouve: `erreur pendant la vérification : ${(e as Error).message.split("\n")[0]}` }; }
  if (r.ok) {
    console.log(`OK  ${c.titre}`);
  } else {
    kos++;
    console.log(`KO  ${c.titre}`);
    console.log(`    Vérifié : ${c.verifie}`);
    console.log(`    Trouvé  : ${r.trouve}`);
    console.log(`    Voir    : ${c.voir}`);
  }
}
const total = atelier.controles.length;
console.log(`\n${total} contrôles, ${kos} KO`);
process.exitCode = kos === 0 ? 0 : 1;
