// Distances à vol d'oiseau. Le legacy n'a jamais eu de graphe routier : il multiplie par 1,3.
const RAYON_TERRE_KM = 6371.0;
const FACTEUR_VOIRIE = 1.3;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h)) * FACTEUR_VOIRIE;
}
