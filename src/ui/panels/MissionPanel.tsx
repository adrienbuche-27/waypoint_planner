import { pathLengthM } from '../../domain/geo';
import type { Mission } from '../../domain/types';
import { validateMission } from '../../domain/validate';
import { selectedMission } from '../state/missionStore';
import { useMissionStore } from '../state/store';
import { SelectField } from './fields';
import { WaypointEditor } from './WaypointEditor';
import { WaypointTable } from './WaypointTable';

const FINISH_OPTIONS = [
  { value: 'goHome', label: 'Return to home' },
  { value: 'hover', label: 'Hover' },
  { value: 'land', label: 'Land' },
] as const;

const RC_LOST_OPTIONS = [
  { value: 'goBack', label: 'Return to home' },
  { value: 'hover', label: 'Hover' },
  { value: 'land', label: 'Land' },
] as const;

export function MissionPanel() {
  const mission = useMissionStore(selectedMission);
  const selectedWaypointId = useMissionStore((s) => s.selectedWaypointId);
  const editMission = useMissionStore((s) => s.editMission);

  if (!mission) {
    return (
      <aside className="panel panel-right">
        <p className="muted">No mission selected.</p>
      </aside>
    );
  }

  const edit = (patch: Partial<Mission>) => editMission(mission.id, (m) => ({ ...m, ...patch }));
  const issues = validateMission(mission);
  const selectedIndex = mission.waypoints.findIndex((w) => w.id === selectedWaypointId);

  return (
    <aside className="panel panel-right">
      <label className="field">
        <span>Name</span>
        <input value={mission.name} onChange={(e) => edit({ name: e.target.value })} />
      </label>
      <div className="field-grid">
        <SelectField
          label="On finish"
          value={mission.finishAction}
          options={FINISH_OPTIONS}
          onChange={(finishAction) => edit({ finishAction })}
        />
        <SelectField
          label="RC signal lost"
          value={mission.rcLostAction}
          options={RC_LOST_OPTIONS}
          onChange={(rcLostAction) => edit({ rcLostAction })}
        />
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={mission.notes ?? ''}
          onChange={(e) => edit({ notes: e.target.value || undefined })}
        />
      </label>

      <div className="stats">
        <span>{mission.waypoints.length} waypoints</span>
        <span>{Math.round(pathLengthM(mission.waypoints))} m path</span>
        <span>Max {Math.max(0, ...mission.waypoints.map((w) => w.altM))} m</span>
      </div>

      <p className="note small">
        Altitudes are relative to the takeoff point. Keep the drone in visual line of sight (VLOS).
      </p>

      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((i, k) => (
            <li key={k} className={i.severity}>
              {i.message}
            </li>
          ))}
        </ul>
      )}

      <WaypointTable mission={mission} />

      {selectedIndex >= 0 && (
        <WaypointEditor
          key={mission.waypoints[selectedIndex]!.id}
          missionId={mission.id}
          waypoint={mission.waypoints[selectedIndex]!}
          index={selectedIndex}
        />
      )}
    </aside>
  );
}
