import { describe, expect, it } from 'vitest';
import { appendWaypoint, createManualMission, updateWaypoint } from './planners/manual';
import type { Mission } from './types';
import { DEFAULT_LIMITS, hasErrors, validateMission } from './validate';

const twoPoints = (): Mission => {
  let m = createManualMission('m', 'M', '2026-01-01T00:00:00Z');
  m = appendWaypoint(m, { lat: 45, lng: 5 }, 'a');
  return appendWaypoint(m, { lat: 45.001, lng: 5 }, 'b');
};
const codes = (m: Mission) => validateMission(m).map((i) => i.code);

describe('validateMission', () => {
  it('accepts a simple valid mission', () => {
    expect(validateMission(twoPoints())).toEqual([]);
  });

  it('requires a minimum number of waypoints', () => {
    const m = createManualMission('m', 'M', '2026-01-01T00:00:00Z');
    expect(codes(m)).toContain('too-few-waypoints');
    expect(hasErrors(validateMission(m))).toBe(true);
  });

  it('rejects too many waypoints', () => {
    const limits = { ...DEFAULT_LIMITS, maxWaypoints: 1 };
    expect(validateMission(twoPoints(), limits).map((i) => i.code)).toContain('too-many-waypoints');
  });

  it('warns above 120 m without blocking', () => {
    const issues = validateMission(updateWaypoint(twoPoints(), 'b', { altM: 121 }));
    expect(issues).toEqual([expect.objectContaining({ code: 'alt-above-limit', waypointId: 'b' })]);
    expect(hasErrors(issues)).toBe(false);
  });

  it('flags speed, gimbal, heading and hover errors', () => {
    let m = updateWaypoint(twoPoints(), 'a', { speedMs: 0.5, gimbalPitchDeg: -100 });
    m = updateWaypoint(m, 'b', {
      headingMode: 'fixed',
      actions: [
        { type: 'hover', seconds: 0 },
        { type: 'gimbal', pitchDeg: 70 },
      ],
    });
    expect(codes(m).sort()).toEqual(
      [
        'gimbal-out-of-range',
        'gimbal-out-of-range',
        'heading-missing',
        'hover-duration',
        'speed-out-of-range',
      ].sort(),
    );
  });

  it('checks start/stop video pairing across waypoints', () => {
    let m = updateWaypoint(twoPoints(), 'a', { actions: [{ type: 'startVideo' }] });
    expect(codes(m)).toEqual(['video-not-stopped']);
    m = updateWaypoint(m, 'b', { actions: [{ type: 'stopVideo' }] });
    expect(codes(m)).toEqual([]);
    m = updateWaypoint(m, 'a', { actions: [] });
    expect(codes(m)).toEqual(['video-not-recording']);
  });
});
