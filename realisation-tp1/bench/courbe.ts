// Trace la courbe temps = f(taille) d'un fichier de résultats, en SVG, une ligne par variante.
//
//   npm run courbe -- --log --ouvrir         (le CSV le plus récent de bench/resultats, ouvert à la fin)
//   npm run courbe -- bench/resultats/j1-chrono.csv --log
//   npx tsx bench/courbe.ts bench/resultats/2026-10-02T10-12-33-affectation.csv --log
//
// --log met l'axe des temps en logarithme ; --ouvrir ouvre le SVG dans le navigateur.
// Le SVG se colle dans un ADR. La médiane des répétitions est tracée et affichée dans le terminal.
import { exec } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// Options de la ligne de commande. Une option inconnue, ou une option sans sa valeur, arrête le
// programme : une faute de frappe ne doit jamais retomber en silence sur le jeu par défaut.
// Si PowerShell a avalé le "--" de npm run, npm transmet les options en variables npm_config_* :
// on les relit, la commande marche dans les deux cas.
function lireOptions(spec: { valeur?: string[]; optionnelle?: string[]; drapeau?: string[]; alias?: Record<string, string>; positionnels?: number }) {
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
const options = lireOptions({ drapeau: ["log", "ouvrir"], positionnels: 1 });
const echelleLog = options.present("log");
const ouvrir = options.present("ouvrir");
function plusRecent(): string | undefined {
  const dossier = resolve("bench", "resultats");
  if (!existsSync(dossier)) return undefined;
  return readdirSync(dossier).filter(f => f.endsWith(".csv")).map(f => join(dossier, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}
const chemin = options.positionnels[0] ?? plusRecent();
if (!chemin || !existsSync(chemin)) {
  console.error("aucun CSV : lancez d'abord npm run chrono -- --jeu petite --repetitions 3 --csv, ou donnez le chemin du fichier");
  process.exit(1);
}
console.log(`fichier : ${relative(process.cwd(), resolve(chemin))}`);
// Un CSV écrit par PowerShell 5 (echo, Out-File) est en UTF-16 : on le relit tel quel.
const brut = readFileSync(chemin);
const texte = brut[0] === 0xff && brut[1] === 0xfe ? brut.toString("utf16le") : brut.toString("utf-8");
const lignes = texte.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(l => l.trim() !== "");
const entete = lignes[0].split(";");
const iVar = entete.indexOf("variante"), iTaille = entete.indexOf("taille"), iDuree = entete.indexOf("duree_ms");
if (iVar < 0 || iTaille < 0 || iDuree < 0) { console.error("colonnes attendues : variante;taille;duree_ms"); process.exit(1); }

const series = new Map<string, Map<number, number[]>>();
for (const l of lignes.slice(1)) {
  const c = l.split(";");
  // La virgule décimale est acceptée : 48,6 vaut 48.6.
  const v = c[iVar]?.trim(), t = Number(c[iTaille]?.replace(/\s/g, "")), d = Number(c[iDuree]?.trim().replace(",", "."));
  if (!v || !Number.isFinite(t) || !Number.isFinite(d)) { console.error(`ligne ignorée : ${l}`); continue; }
  if (!series.has(v)) series.set(v, new Map());
  const parTaille = series.get(v)!;
  if (!parTaille.has(t)) parTaille.set(t, []);
  parTaille.get(t)!.push(d);
}
const mediane = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const points: { variante: string; taille: number; ms: number }[] = [];
for (const [v, parTaille] of series) for (const [t, ds] of parTaille) points.push({ variante: v, taille: t, ms: mediane(ds) });
const tailles = [...new Set(points.map(p => p.taille))].sort((a, b) => a - b);
for (const [v, parTaille] of series)
  for (const t of [...parTaille.keys()].sort((a, b) => a - b))
    console.log(`  ${v.padEnd(10)} taille=${String(t).padStart(7)}  mediane_ms=${mediane(parTaille.get(t)!).toFixed(1).padStart(10)}  (${parTaille.get(t)!.length} mesure${parTaille.get(t)!.length > 1 ? "s" : ""})`);
if (points.length === 0) { console.error("aucune mesure lisible dans ce fichier"); process.exit(1); }
const maxMs = Math.max(...points.map(p => p.ms)) * 1.08;
const minMs = Math.max(0.01, Math.min(...points.map(p => p.ms)) / 1.5);

const L = 720, H = 420, mg = { g: 70, d: 20, h: 30, b: 50 };
const x = (t: number) => mg.g + (tailles.indexOf(t) / Math.max(1, tailles.length - 1)) * (L - mg.g - mg.d);
const y = (ms: number) => echelleLog
  ? H - mg.b - ((Math.log10(Math.max(ms, minMs)) - Math.log10(minMs)) / (Math.log10(maxMs) - Math.log10(minMs))) * (H - mg.h - mg.b)
  : H - mg.b - (ms / maxMs) * (H - mg.h - mg.b);
const couleurs = ["#00618A", "#B45F00", "#2E7D32", "#6A1B9A", "#AD1457"];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" font-family="Calibri, Arial, sans-serif" font-size="12">`;
svg += `<rect width="${L}" height="${H}" fill="white"/>`;
svg += `<line x1="${mg.g}" y1="${H - mg.b}" x2="${L - mg.d}" y2="${H - mg.b}" stroke="#333"/>`;
svg += `<line x1="${mg.g}" y1="${mg.h}" x2="${mg.g}" y2="${H - mg.b}" stroke="#333"/>`;
for (let k = 0; k <= 5; k++) {
  const ms = echelleLog ? minMs * Math.pow(maxMs / minMs, k / 5) : (maxMs / 5) * k;
  svg += `<line x1="${mg.g}" y1="${y(ms)}" x2="${L - mg.d}" y2="${y(ms)}" stroke="#ddd"/>`;
  svg += `<text x="${mg.g - 8}" y="${y(ms) + 4}" text-anchor="end">${ms.toFixed(ms < 10 ? 1 : 0)}</text>`;
}
for (const t of tailles) svg += `<text x="${x(t)}" y="${H - mg.b + 18}" text-anchor="middle">${t}</text>`;
svg += `<text x="${(L + mg.g) / 2}" y="${H - 12}" text-anchor="middle">taille du lot (colis)</text>`;
svg += `<text x="16" y="${H / 2}" text-anchor="middle" transform="rotate(-90 16 ${H / 2})">durée médiane (ms)${echelleLog ? ", échelle log" : ""}</text>`;
let k = 0;
for (const [v] of series) {
  const ps = points.filter(p => p.variante === v).sort((a, b) => a.taille - b.taille);
  const couleur = couleurs[k % couleurs.length];
  svg += `<polyline fill="none" stroke="${couleur}" stroke-width="2" points="${ps.map(p => `${x(p.taille)},${y(p.ms)}`).join(" ")}"/>`;
  for (const p of ps) svg += `<circle cx="${x(p.taille)}" cy="${y(p.ms)}" r="3.5" fill="${couleur}"/>`;
  svg += `<rect x="${mg.g + 10}" y="${mg.h + 6 + k * 18}" width="12" height="12" fill="${couleur}"/>`;
  svg += `<text x="${mg.g + 28}" y="${mg.h + 16 + k * 18}">${v}</text>`;
  k++;
}
svg += `</svg>`;
const sortie = chemin.replace(/\.csv$/, "") + ".svg";
writeFileSync(sortie, svg, "utf-8");
console.log(`courbe écrite : ${relative(process.cwd(), resolve(sortie))}`);
if (ouvrir) {
  const cmd = process.platform === "win32" ? `start "" "${sortie}"` : process.platform === "darwin" ? `open "${sortie}"` : `xdg-open "${sortie}"`;
  exec(cmd, err => { if (err) console.error(`ouverture impossible, ouvrez le fichier à la main : ${sortie}`); });
}
