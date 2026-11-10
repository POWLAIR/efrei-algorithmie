// Générateur pseudo-aléatoire à graine fixe (mulberry32). Même graine, mêmes fichiers, sur toutes les machines.
export class Alea {
  private etat: number;
  constructor(graine: number) { this.etat = graine >>> 0; }

  // Réel dans [0, 1[
  reel(): number {
    this.etat = (this.etat + 0x6d2b79f5) >>> 0;
    let t = this.etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Entier dans [a, b] inclus
  entier(a: number, b: number): number { return a + Math.floor(this.reel() * (b - a + 1)); }

  choix<T>(liste: readonly T[]): T { return liste[this.entier(0, liste.length - 1)]; }

  // Choix pondéré : poids = [[valeur, poids], ...]
  pondere<T>(poids: readonly (readonly [T, number])[]): T {
    const total = poids.reduce((s, [, p]) => s + p, 0);
    let r = this.reel() * total;
    for (const [v, p] of poids) { r -= p; if (r < 0) return v; }
    return poids[poids.length - 1][0];
  }

  // Loi normale centrée réduite (Box-Muller)
  normale(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.reel();
    while (v === 0) v = this.reel();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Loi log-normale de médiane donnée
  logNormale(mediane: number, sigma: number): number { return mediane * Math.exp(sigma * this.normale()); }

  melanger<T>(liste: T[]): T[] {
    for (let i = liste.length - 1; i > 0; i--) {
      const j = this.entier(0, i);
      const t = liste[i]; liste[i] = liste[j]; liste[j] = t;
    }
    return liste;
  }
}
