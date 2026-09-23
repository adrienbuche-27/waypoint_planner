import { describe, expect, it } from 'vitest';
import {
  MANUAL_DEFAULTS,
  appendWaypoint,
  createManualMission,
  duplicateMission,
  moveWaypoint,
  removeWaypoint,
  reorderWaypoint,
  updateWaypoint,
} from './manual';

const NOW = '2026-09-23T10:00:00.000Z';
const base = () => {
  let m = createManualMission('m1', 'Test', NOW);
  m = appendWaypoint(m, { lat: 45, lng: 5 }, 'a');
  m = appendWaypoint(m, { lat: 45.001, lng: 5 }, 'b');
  m = appendWaypoint(m, { lat: 45.002, lng: 5 }, 'c');
  return m;
};
const ids = (m: { waypoints: { id: string }[] }) => m.waypoints.map((w) => w.id);

describe('manual planner', () => {
  it('creates a waypoint with defaults, then inherits from the previous one', () => {
    let m = appendWaypoint(createManualMission('m', 'M', NOW), { lat: 1, lng: 2 }, 'a');
    expect(m.waypoints[0]).toMatchObject({ lat: 1, lng: 2, ...MANUAL_DEFAULTS, actions: [] });
    m = updateWaypoint(m, 'a', { altM: 80, speedMs: 3 });
    m = appendWaypoint(m, { lat: 1.1, lng: 2 }, 'b');
    expect(m.waypoints[1]).toMatchObject({ altM: 80, speedMs: 3 });
  });

  it('does not mutate its input', () => {
    const m = base();
    const snapshot = structuredClone(m);
    moveWaypoint(m, 'a', { lat: 0, lng: 0 });
    removeWaypoint(m, 'b');
    reorderWaypoint(m, 'c', 0);
    expect(m).toEqual(snapshot);
  });

  it('moves, updates and removes by id', () => {
    let m = moveWaypoint(base(), 'b', { lat: 46, lng: 6 });
    expect(m.waypoints[1]).toMatchObject({ lat: 46, lng: 6 });
    m = removeWaypoint(m, 'b');
    expect(ids(m)).toEqual(['a', 'c']);
  });

  it('reorders with clamping', () => {
    expect(ids(reorderWaypoint(base(), 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(ids(reorderWaypoint(base(), 'a', 99))).toEqual(['b', 'c', 'a']);
    expect(ids(reorderWaypoint(base(), 'zz', 0))).toEqual(['a', 'b', 'c']);
  });

  it('duplicates with fresh ids and no flight log', () => {
    const src = { ...base(), flights: [{ id: 'f', date: NOW, exportedFileHash: 'x' }] };
    let k = 0;
    const copy = duplicateMission(src, 'm2', 'Copy', '2026-09-24T00:00:00Z', () => `n${k++}`);
    expect(copy).toMatchObject({ id: 'm2', name: 'Copy', flights: undefined });
    expect(ids(copy)).toEqual(['n0', 'n1', 'n2']);
    expect(copy.waypoints[0]!.lat).toBe(45);
    copy.waypoints[0]!.actions.push({ type: 'photo' });
    expect(src.waypoints[0]!.actions).toEqual([]);
  });
});
