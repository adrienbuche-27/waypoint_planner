// Mission checks shown inline in the UI. Errors block export; warnings do not.
import {
  GIMBAL_PITCH_MAX_DEG,
  GIMBAL_PITCH_MIN_DEG,
  MAX_ALT_M,
  MAX_SPEED_MS,
  MAX_WAYPOINTS,
  MIN_SPEED_MS,
  MIN_WAYPOINTS,
} from '../config/limits';
import type { Mission } from './types';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  waypointId?: string;
}

export interface ValidationLimits {
  maxAltM: number;
  minWaypoints: number;
  maxWaypoints: number;
  minSpeedMs: number;
  maxSpeedMs: number;
  gimbalPitchMinDeg: number;
  gimbalPitchMaxDeg: number;
}

export const DEFAULT_LIMITS: ValidationLimits = {
  maxAltM: MAX_ALT_M,
  minWaypoints: MIN_WAYPOINTS,
  maxWaypoints: MAX_WAYPOINTS,
  minSpeedMs: MIN_SPEED_MS,
  maxSpeedMs: MAX_SPEED_MS,
  gimbalPitchMinDeg: GIMBAL_PITCH_MIN_DEG,
  gimbalPitchMaxDeg: GIMBAL_PITCH_MAX_DEG,
};

export function validateMission(
  mission: Mission,
  limits: ValidationLimits = DEFAULT_LIMITS,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const n = mission.waypoints.length;

  if (n < limits.minWaypoints) {
    issues.push({
      severity: 'error',
      code: 'too-few-waypoints',
      message: `A mission needs at least ${limits.minWaypoints} waypoints (has ${n}).`,
    });
  }
  if (n > limits.maxWaypoints) {
    issues.push({
      severity: 'error',
      code: 'too-many-waypoints',
      message: `${n} waypoints exceeds the limit of ${limits.maxWaypoints}.`,
    });
  }

  let recording = false;
  mission.waypoints.forEach((w, i) => {
    const label = `Waypoint ${i + 1}`;
    const add = (severity: ValidationIssue['severity'], code: string, message: string) =>
      issues.push({ severity, code, message: `${label}: ${message}`, waypointId: w.id });

    if (w.altM > limits.maxAltM) {
      add('warning', 'alt-above-limit', `${w.altM} m is above the ${limits.maxAltM} m limit.`);
    }
    if (w.altM <= 0) {
      add('warning', 'alt-below-takeoff', `${w.altM} m is at or below the takeoff point.`);
    }
    if (w.speedMs < limits.minSpeedMs || w.speedMs > limits.maxSpeedMs) {
      add(
        'error',
        'speed-out-of-range',
        `speed ${w.speedMs} m/s is outside ${limits.minSpeedMs}–${limits.maxSpeedMs} m/s.`,
      );
    }
    const pitches = [w.gimbalPitchDeg];
    for (const a of w.actions) if (a.type === 'gimbal') pitches.push(a.pitchDeg);
    if (pitches.some((p) => p < limits.gimbalPitchMinDeg || p > limits.gimbalPitchMaxDeg)) {
      add(
        'error',
        'gimbal-out-of-range',
        `gimbal pitch must be within ${limits.gimbalPitchMinDeg}° to ${limits.gimbalPitchMaxDeg}°.`,
      );
    }
    if (w.headingMode === 'fixed' && w.headingDeg === undefined) {
      add('error', 'heading-missing', 'fixed heading mode needs a heading.');
    }
    if (w.headingMode === 'poi') {
      add('error', 'poi-unsupported', 'point-of-interest heading is not supported yet.');
    }
    for (const a of w.actions) {
      if (a.type === 'hover' && !(a.seconds > 0)) {
        add('error', 'hover-duration', 'hover duration must be greater than 0 s.');
      } else if (a.type === 'startVideo') {
        if (recording) add('warning', 'video-already-recording', 'video is already recording.');
        recording = true;
      } else if (a.type === 'stopVideo') {
        if (!recording) add('warning', 'video-not-recording', 'stop video without a start.');
        recording = false;
      }
    }
  });

  if (recording) {
    issues.push({
      severity: 'warning',
      code: 'video-not-stopped',
      message: 'Video recording is never stopped.',
    });
  }
  return issues;
}

export const hasErrors = (issues: ValidationIssue[]) => issues.some((i) => i.severity === 'error');
