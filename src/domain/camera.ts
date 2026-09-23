// Camera profiles and GSD math (SPEC.md §4, §5).
import type { CameraProfile } from './types';

// TODO verify: fill sensor size, real focal length and pixel dimensions from
// DJI's official Air 3S specs and cite the source here (M2). Do not guess.
export const CAMERA_PROFILES: CameraProfile[] = [];

/** Altitude (m) needed for a ground sample distance (m/px). */
export function altitudeForGsd(gsdM: number, camera: CameraProfile): number {
  return (gsdM * camera.focalLengthMm * camera.imageWidthPx) / camera.sensorWidthMm;
}

/** Ground sample distance (m/px) at a given altitude (m). */
export function gsdForAltitude(altitudeM: number, camera: CameraProfile): number {
  return (altitudeM * camera.sensorWidthMm) / (camera.focalLengthMm * camera.imageWidthPx);
}
