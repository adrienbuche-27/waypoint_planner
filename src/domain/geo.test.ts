import { describe, expect, it } from 'vitest';
import { bearingDeg, distanceM, pathLengthM } from './geo';

describe('geo', () => {
  it('measures one degree of latitude as ~111.2 km', () => {
    expect(distanceM({ lat: 45, lng: 5 }, { lat: 46, lng: 5 })).toBeCloseTo(111_195, -1);
  });

  it('gives cardinal bearings', () => {
    const o = { lat: 45, lng: 5 };
    expect(bearingDeg(o, { lat: 45.001, lng: 5 })).toBeCloseTo(0, 6);
    expect(bearingDeg(o, { lat: 45, lng: 5.001 })).toBeCloseTo(90, 3);
    expect(bearingDeg(o, { lat: 44.999, lng: 5 })).toBeCloseTo(180, 6);
    expect(bearingDeg(o, { lat: 45, lng: 4.999 })).toBeCloseTo(270, 3);
  });

  it('includes climb in path length', () => {
    const a = { lat: 45, lng: 5, altM: 0 };
    const b = { lat: 45, lng: 5, altM: 30 };
    expect(pathLengthM([a, b])).toBeCloseTo(30, 9);
    expect(pathLengthM([a])).toBe(0);
  });
});
