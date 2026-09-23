import { removeWaypoint, reorderWaypoint } from '../../domain/planners/manual';
import type { Mission } from '../../domain/types';
import { actionSummary } from './actionLabels';
import { useMissionStore } from '../state/store';

export function WaypointTable({ mission }: { mission: Mission }) {
  const selectedWaypointId = useMissionStore((s) => s.selectedWaypointId);
  const { selectWaypoint, editMission } = useMissionStore.getState();

  if (mission.waypoints.length === 0) return null;

  return (
    <table className="wp-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Alt</th>
          <th>Speed</th>
          <th>Actions</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {mission.waypoints.map((w, i) => (
          <tr
            key={w.id}
            className={w.id === selectedWaypointId ? 'selected' : undefined}
            onClick={() => selectWaypoint(w.id)}
          >
            <td>{i + 1}</td>
            <td>{w.altM} m</td>
            <td>{w.speedMs} m/s</td>
            <td className="small">{w.actions.map(actionSummary).join(', ') || '—'}</td>
            <td className="row-buttons" onClick={(e) => e.stopPropagation()}>
              <button
                title="Move up"
                disabled={i === 0}
                onClick={() => editMission(mission.id, (m) => reorderWaypoint(m, w.id, i - 1))}
              >
                ↑
              </button>
              <button
                title="Move down"
                disabled={i === mission.waypoints.length - 1}
                onClick={() => editMission(mission.id, (m) => reorderWaypoint(m, w.id, i + 1))}
              >
                ↓
              </button>
              <button
                title="Delete waypoint"
                className="danger"
                onClick={() => {
                  editMission(mission.id, (m) => removeWaypoint(m, w.id));
                  if (w.id === selectedWaypointId) selectWaypoint(undefined);
                }}
              >
                ✕
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
