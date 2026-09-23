import { useRef, useState } from 'react';
import { useMissionStore } from '../state/store';

export function MissionList() {
  const { missions, selectedMissionId, loaded } = useMissionStore();
  const { createMission, selectMission, duplicate, remove, exportLibrary, importLibrary } =
    useMissionStore.getState();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const visible = q ? missions.filter((m) => m.name.toLowerCase().includes(q)) : missions;

  const backup = async () => {
    const blob = await exportLibrary();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waypoint-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importLibrary(file);
      setMessage(`Restored from ${file.name}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <aside className="panel panel-left">
      <header className="panel-header">
        <h1>Missions</h1>
        <button className="primary" onClick={createMission}>
          + New
        </button>
      </header>
      <input
        type="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search missions"
      />
      <ul className="mission-list">
        {!loaded && <li className="muted">Loading…</li>}
        {loaded && visible.length === 0 && (
          <li className="muted">{missions.length ? 'No match.' : 'No missions yet.'}</li>
        )}
        {visible.map((m) => (
          <li
            key={m.id}
            className={m.id === selectedMissionId ? 'selected' : undefined}
            onClick={() => selectMission(m.id)}
          >
            <div className="mission-name">{m.name}</div>
            <div className="muted small">
              {m.waypoints.length} wp · {new Date(m.updatedAt).toLocaleDateString()}
            </div>
            <div className="row-actions">
              <button
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicate(m.id);
                }}
              >
                Duplicate
              </button>
              <button
                title="Delete"
                className="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete “${m.name}”? This cannot be undone.`)) remove(m.id);
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <footer className="panel-footer">
        <div className="muted small">Library backup (browser storage can be wiped)</div>
        <div className="button-row">
          <button onClick={() => void backup()}>Back up…</button>
          <button onClick={() => fileRef.current?.click()}>Restore…</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void restore(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        {message && <div className="small">{message}</div>}
      </footer>
    </aside>
  );
}
