import { useState } from 'react';
import {
  GIMBAL_PITCH_MAX_DEG,
  GIMBAL_PITCH_MIN_DEG,
  MAX_SPEED_MS,
  MIN_SPEED_MS,
} from '../../config/limits';
import { defaultAction, updateWaypoint } from '../../domain/planners/manual';
import type { Action, Waypoint } from '../../domain/types';
import { useMissionStore } from '../state/store';
import { NumberField, SelectField } from './fields';
import { ACTION_LABELS } from './actionLabels';

// POI heading needs a point of interest, which the model does not hold yet.
const HEADING_OPTIONS = [
  { value: 'followRoute', label: 'Follow route' },
  { value: 'fixed', label: 'Fixed heading' },
] as const;

const ACTION_TYPES = Object.keys(ACTION_LABELS) as Action['type'][];

interface Props {
  missionId: string;
  waypoint: Waypoint;
  index: number;
}

export function WaypointEditor({ missionId, waypoint: w, index }: Props) {
  const editMission = useMissionStore((s) => s.editMission);
  const [newAction, setNewAction] = useState<Action['type']>('photo');

  const patch = (p: Partial<Omit<Waypoint, 'id'>>) =>
    editMission(missionId, (m) => updateWaypoint(m, w.id, p));
  const setActions = (actions: Action[]) => patch({ actions });
  const setAction = (i: number, a: Action) =>
    setActions(w.actions.map((x, k) => (k === i ? a : x)));
  const moveAction = (i: number, d: -1 | 1) => {
    const list = [...w.actions];
    [list[i], list[i + d]] = [list[i + d]!, list[i]!];
    setActions(list);
  };

  return (
    <section className="wp-editor">
      <h2>Waypoint {index + 1}</h2>
      <div className="field-grid">
        <NumberField
          label="Latitude"
          value={w.lat}
          step={0.00001}
          onChange={(lat) => patch({ lat })}
        />
        <NumberField
          label="Longitude"
          value={w.lng}
          step={0.00001}
          onChange={(lng) => patch({ lng })}
        />
        <NumberField
          label="Altitude"
          unit="m"
          value={w.altM}
          onChange={(altM) => patch({ altM })}
        />
        <NumberField
          label="Speed"
          unit="m/s"
          step={0.5}
          min={MIN_SPEED_MS}
          max={MAX_SPEED_MS}
          value={w.speedMs}
          onChange={(speedMs) => patch({ speedMs })}
        />
        <SelectField
          label="Heading"
          value={w.headingMode === 'poi' ? 'followRoute' : w.headingMode}
          options={HEADING_OPTIONS}
          onChange={(headingMode) =>
            patch({
              headingMode,
              headingDeg: headingMode === 'fixed' ? (w.headingDeg ?? 0) : undefined,
            })
          }
        />
        {w.headingMode === 'fixed' && (
          <NumberField
            label="Heading"
            unit="°"
            min={0}
            max={359}
            value={w.headingDeg}
            onChange={(headingDeg) => patch({ headingDeg: ((headingDeg % 360) + 360) % 360 })}
          />
        )}
        <NumberField
          label="Gimbal pitch"
          unit="°"
          min={GIMBAL_PITCH_MIN_DEG}
          max={GIMBAL_PITCH_MAX_DEG}
          value={w.gimbalPitchDeg}
          onChange={(gimbalPitchDeg) => patch({ gimbalPitchDeg })}
        />
      </div>

      <h3>Actions on arrival</h3>
      {w.actions.length === 0 && <p className="muted small">No actions.</p>}
      <ol className="action-list">
        {w.actions.map((a, i) => (
          <li key={i}>
            <span className="action-label">{ACTION_LABELS[a.type]}</span>
            {a.type === 'hover' && (
              <NumberField
                label=""
                unit="s"
                min={0}
                value={a.seconds}
                onChange={(seconds) => setAction(i, { ...a, seconds })}
              />
            )}
            {a.type === 'gimbal' && (
              <NumberField
                label=""
                unit="°"
                min={GIMBAL_PITCH_MIN_DEG}
                max={GIMBAL_PITCH_MAX_DEG}
                value={a.pitchDeg}
                onChange={(pitchDeg) => setAction(i, { ...a, pitchDeg })}
              />
            )}
            {a.type === 'yaw' && (
              <NumberField
                label=""
                unit="°"
                value={a.headingDeg}
                onChange={(headingDeg) => setAction(i, { ...a, headingDeg })}
              />
            )}
            <span className="row-buttons">
              <button title="Up" disabled={i === 0} onClick={() => moveAction(i, -1)}>
                ↑
              </button>
              <button
                title="Down"
                disabled={i === w.actions.length - 1}
                onClick={() => moveAction(i, 1)}
              >
                ↓
              </button>
              <button
                title="Remove"
                className="danger"
                onClick={() => setActions(w.actions.filter((_, k) => k !== i))}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className="button-row">
        <select value={newAction} onChange={(e) => setNewAction(e.target.value as Action['type'])}>
          {ACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTION_LABELS[t]}
            </option>
          ))}
        </select>
        <button onClick={() => setActions([...w.actions, defaultAction(newAction)])}>
          Add action
        </button>
      </div>
    </section>
  );
}
