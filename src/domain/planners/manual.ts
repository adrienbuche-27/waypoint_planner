// Manual mission editing: pure, immutable operations on Mission / Waypoint[].
import type { LatLng } from '../geo';
import type { Action, Mission, Waypoint } from '../types';

/** App defaults for a new manual waypoint (not hardware values). */
export const MANUAL_DEFAULTS = {
  altM: 50,
  speedMs: 5,
  gimbalPitchDeg: -30,
} as const;

export function createManualMission(id: string, name: string, now: string): Mission {
  return {
    id,
    name,
    kind: 'manual',
    createdAt: now,
    updatedAt: now,
    waypoints: [],
    finishAction: 'goHome',
    rcLostAction: 'goBack',
  };
}

/** Appends a waypoint. Altitude, speed and gimbal are inherited from the previous waypoint. */
export function appendWaypoint(mission: Mission, at: LatLng, id: string): Mission {
  const prev = mission.waypoints.at(-1);
  const wp: Waypoint = {
    id,
    lat: at.lat,
    lng: at.lng,
    altM: prev?.altM ?? MANUAL_DEFAULTS.altM,
    speedMs: prev?.speedMs ?? MANUAL_DEFAULTS.speedMs,
    headingMode: 'followRoute',
    gimbalPitchDeg: prev?.gimbalPitchDeg ?? MANUAL_DEFAULTS.gimbalPitchDeg,
    actions: [],
  };
  return { ...mission, waypoints: [...mission.waypoints, wp] };
}

export function updateWaypoint(
  mission: Mission,
  id: string,
  patch: Partial<Omit<Waypoint, 'id'>>,
): Mission {
  return {
    ...mission,
    waypoints: mission.waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  };
}

export function moveWaypoint(mission: Mission, id: string, to: LatLng): Mission {
  return updateWaypoint(mission, id, { lat: to.lat, lng: to.lng });
}

export function removeWaypoint(mission: Mission, id: string): Mission {
  return { ...mission, waypoints: mission.waypoints.filter((w) => w.id !== id) };
}

/** Moves a waypoint to `toIndex` (clamped). */
export function reorderWaypoint(mission: Mission, id: string, toIndex: number): Mission {
  const from = mission.waypoints.findIndex((w) => w.id === id);
  if (from < 0) return mission;
  const list = [...mission.waypoints];
  const [wp] = list.splice(from, 1);
  const to = Math.max(0, Math.min(list.length, toIndex));
  list.splice(to, 0, wp!);
  return { ...mission, waypoints: list };
}

/** Deep copy with fresh mission and waypoint ids; the flight log is not carried over. */
export function duplicateMission(
  mission: Mission,
  newMissionId: string,
  name: string,
  now: string,
  newWaypointId: () => string,
): Mission {
  const copy = structuredClone(mission);
  return {
    ...copy,
    id: newMissionId,
    name,
    createdAt: now,
    updatedAt: now,
    flights: undefined,
    waypoints: copy.waypoints.map((w) => ({ ...w, id: newWaypointId() })),
  };
}

export function defaultAction(type: Action['type']): Action {
  switch (type) {
    case 'hover':
      return { type, seconds: 2 };
    case 'gimbal':
      return { type, pitchDeg: -90 };
    case 'yaw':
      return { type, headingDeg: 0 };
    default:
      return { type };
  }
}
