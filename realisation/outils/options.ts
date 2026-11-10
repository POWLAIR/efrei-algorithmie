// Lecture des options de la ligne de commande, commune aux outils du dépôt (bench, verifier).
// Copie de la fonction de legacy/bin/chrono.ts : legacy/ ne s'importe pas depuis les outils de la cellule.
// Options de la ligne de commande. Une option inconnue, ou une option sans sa valeur, arrête le
// programme : une faute de frappe ne doit jamais retomber en silence sur le jeu par défaut.
// Si PowerShell a avalé le "--" de npm run, npm transmet les options en variables npm_config_* :
// on les relit, la commande marche dans les deux cas.
export function lireOptions(spec: { valeur?: string[]; optionnelle?: string[]; drapeau?: string[]; alias?: Record<string, string>; positionnels?: number }) {
  const valeur = spec.valeur ?? [], optionnelle = spec.optionnelle ?? [], drapeau = spec.drapeau ?? [], alias = spec.alias ?? {};
  const connues = [...valeur, ...optionnelle, ...drapeau, ...Object.keys(alias)].map(o => `--${o}`).join(", ");
  const arreter = (m: string): never => { console.error(`${m}\noptions possibles : ${connues}`); process.exit(1); };
  const lues = new Map<string, string>(), positionnels: string[] = [];
  const a = process.argv.slice(2);
  const viaNpm = [...valeur, ...optionnelle, ...drapeau, ...Object.keys(alias)]
    .filter(nom => process.env[`npm_config_${nom.replace(/-/g, "_")}`] !== undefined);
  if (viaNpm.length > 0 && a.length > 0 && !a.some(x => x.startsWith("--"))) {
    arreter(`les options ne sont pas arrivées jusqu'au programme : le "--" après npm run a été avalé (PowerShell).\n`
      + `Relancez avec npm.cmd au lieu de npm, ou écrivez les options avec un égal : --${viaNpm[0]}=${a[0]}`);
  }
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) {
      if (positionnels.length < (spec.positionnels ?? 0)) { positionnels.push(a[i]); continue; }
      arreter(`argument inattendu : ${a[i]}`);
    }
    let tape = a[i].slice(2), v: string | undefined;
    const egal = tape.indexOf("=");
    if (egal !== -1) { v = tape.slice(egal + 1); tape = tape.slice(0, egal); }
    const nom = alias[tape] ?? tape;
    const suivant = a[i + 1] !== undefined && !a[i + 1].startsWith("--") ? a[i + 1] : undefined;
    if (valeur.includes(nom)) {
      if (v === undefined) { if (suivant === undefined) arreter(`--${tape} attend une valeur`); v = suivant; i++; }
    } else if (optionnelle.includes(nom)) {
      if (v === undefined && suivant !== undefined) { v = suivant; i++; }
    } else if (!drapeau.includes(nom)) {
      arreter(`option inconnue : --${tape}`);
    }
    lues.set(nom, v ?? "true");
  }
  if (a.length === 0) {
    for (const nom of [...valeur, ...optionnelle, ...drapeau, ...Object.keys(alias)]) {
      const env = process.env[`npm_config_${nom.replace(/-/g, "_")}`];
      if (env !== undefined && env !== "") lues.set(alias[nom] ?? nom, env);
    }
  }
  return {
    lire: (nom: string, defaut: string) => lues.get(nom) ?? defaut,
    present: (nom: string) => lues.has(nom),
    positionnels,
  };
}
