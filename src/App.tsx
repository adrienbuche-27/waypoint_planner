import { useEffect } from 'react';
import { MapView } from './ui/map/MapView';
import { MissionList } from './ui/panels/MissionList';
import { MissionPanel } from './ui/panels/MissionPanel';
import { useMissionStore } from './ui/state/store';

export function App() {
  const error = useMissionStore((s) => s.error);

  useEffect(() => {
    void useMissionStore.getState().load();
  }, []);

  return (
    <div className="layout">
      <MissionList />
      <main className="map-area">
        <MapView />
        {error && <div className="toast error">{error}</div>}
      </main>
      <MissionPanel />
    </div>
  );
}
