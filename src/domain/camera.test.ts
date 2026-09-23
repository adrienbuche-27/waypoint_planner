import { describe, expect, it } from 'vitest';
import { altitudeForGsd, gsdForAltitude } from './camera';
import type { CameraProfile } from './types';

// Synthetic camera: numbers are for the math only, not real Air 3S specs.
const cam: CameraProfile = {
  id: 'test',
  label: 'Test',
  sensorWidthMm: 13.2,
  sensorHeightMm: 8.8,
  focalLengthMm: 8.8,
  imageWidthPx: 5280,
  imageHeightPx: 3956,
  minPhotoIntervalS: 2,
};

describe('GSD/altitude', () => {
  it('round-trips', () => {
    expect(gsdForAltitude(altitudeForGsd(0.02, cam), cam)).toBeCloseTo(0.02, 12);
    expect(altitudeForGsd(gsdForAltitude(80, cam), cam)).toBeCloseTo(80, 9);
  });
});
