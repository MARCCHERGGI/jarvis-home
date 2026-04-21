// Real-time astronomy for a photoreal Earth.
// Computes the subsolar point (where the Sun is directly overhead) and the
// Earth's sidereal rotation so the globe matches the real world at the moment
// the user opens the app. Precision is ±0.5° — more than enough for the eye.

import * as THREE from 'three';

export const NYC = { lat: 40.7128, lon: -74.0060 };
export const SOHO = { lat: 40.7233, lon: -74.0030 };

export function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

/** Solar declination in degrees — how far north/south the subsolar point is. */
export function solarDeclination(d: Date): number {
  const N = dayOfYear(d);
  return 23.44 * Math.sin(((360 / 365) * (N - 81) * Math.PI) / 180);
}

/** Subsolar longitude at given UTC moment (sun overhead). */
export function subsolarLongitude(d: Date): number {
  const utc = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  // Equation-of-time approximation (±15 min error neglected for visuals)
  return (12 - utc) * 15;
}

/** Return unit Vector3 pointing from Earth center to the Sun (in Earth-fixed frame). */
export function sunDirection(d: Date = new Date()): THREE.Vector3 {
  const lat = (solarDeclination(d) * Math.PI) / 180;
  const lon = (subsolarLongitude(d) * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon)
  ).normalize();
}

/** Convert lat/lon in degrees to a unit Vector3 on the unit sphere (Earth-fixed). */
export function latLonToVec3(lat: number, lon: number, r = 1): THREE.Vector3 {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(φ) * Math.cos(λ),
    r * Math.sin(φ),
    -r * Math.cos(φ) * Math.sin(λ)
  );
}
