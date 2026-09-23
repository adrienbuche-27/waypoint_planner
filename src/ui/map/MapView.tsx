import { useEffect, useRef, useState } from 'react';
import { maplibregl } from './maplibre';
import { DEFAULT_MAP_SOURCE_ID, MAP_SOURCES } from '../../config/mapSources';
import { bearingDeg, midpoint } from '../../domain/geo';
import { newId } from '../../domain/id';
import { appendWaypoint, moveWaypoint } from '../../domain/planners/manual';
import type { Waypoint } from '../../domain/types';
import { selectedMission } from '../state/missionStore';
import { useMissionStore } from '../state/store';

const ROUTE_SOURCE = 'route';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [baseId, setBaseId] = useState(DEFAULT_MAP_SOURCE_ID);

  const mission = useMissionStore(selectedMission);
  const selectedWaypointId = useMissionStore((s) => s.selectedWaypointId);

  // Create the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: {
        version: 8,
        sources: Object.fromEntries(
          MAP_SOURCES.map((s) => [
            s.id,
            {
              type: 'raster' as const,
              tiles: s.tiles,
              tileSize: s.tileSize,
              maxzoom: s.maxZoom,
              attribution: s.attribution,
            },
          ]),
        ),
        layers: MAP_SOURCES.map((s) => ({
          id: s.id,
          type: 'raster' as const,
          source: s.id,
          layout: { visibility: s.id === DEFAULT_MAP_SOURCE_ID ? 'visible' : 'none' } as const,
        })),
      },
      center: [2.35, 48.85],
      zoom: 5,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: emptyLine() });
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: ROUTE_SOURCE,
        paint: { 'line-color': '#000', 'line-width': 5, 'line-opacity': 0.4 },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: ROUTE_SOURCE,
        paint: { 'line-color': '#ffd400', 'line-width': 3 },
      });
      setReady(true);
    });

    // Click on the map (not on a marker) adds a waypoint to the selected mission.
    map.on('click', (e) => {
      const { selectedMissionId, editMission, selectWaypoint } = useMissionStore.getState();
      if (!selectedMissionId) return;
      const id = newId();
      editMission(selectedMissionId, (m) =>
        appendWaypoint(m, { lat: e.lngLat.lat, lng: e.lngLat.lng }, id),
      );
      selectWaypoint(id);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Base layer switch.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const s of MAP_SOURCES) {
      map.setLayoutProperty(s.id, 'visibility', s.id === baseId ? 'visible' : 'none');
    }
  }, [baseId, ready]);

  // Route line, numbered draggable markers and direction arrows.
  const waypoints = mission?.waypoints;
  const missionId = mission?.id;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const wps = waypoints ?? [];

    (map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource).setData(
      wps.length > 1
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: wps.map((w) => [w.lng, w.lat]) },
          }
        : emptyLine(),
    );

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (let i = 1; i < wps.length; i++) {
      const a = wps[i - 1]!;
      const b = wps[i]!;
      const mid = midpoint(a, b);
      const el = document.createElement('div');
      el.className = 'route-arrow';
      markersRef.current.push(
        new maplibregl.Marker({
          element: el,
          rotation: bearingDeg(a, b),
          rotationAlignment: 'map',
        })
          .setLngLat([mid.lng, mid.lat])
          .addTo(map),
      );
    }

    wps.forEach((w, i) => markersRef.current.push(waypointMarker(map, w, i, missionId!)));
  }, [waypoints, missionId, ready]);

  // Selection highlight without rebuilding markers.
  useEffect(() => {
    for (const m of markersRef.current) {
      const el = m.getElement();
      if (el.dataset.id) el.classList.toggle('selected', el.dataset.id === selectedWaypointId);
    }
  }, [selectedWaypointId, waypoints]);

  // Frame the mission when a different one is selected.
  useEffect(() => {
    const map = mapRef.current;
    const wps = useMissionStore.getState().missions.find((m) => m.id === missionId)?.waypoints;
    if (!map || !ready || !wps?.length) return;
    const bounds = new maplibregl.LngLatBounds();
    wps.forEach((w) => bounds.extend([w.lng, w.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 0 });
  }, [missionId, ready]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <select
        className="basemap-select"
        value={baseId}
        onChange={(e) => setBaseId(e.target.value)}
        aria-label="Base map"
      >
        {MAP_SOURCES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {mission && mission.waypoints.length === 0 && (
        <div className="map-hint">Click on the map to add waypoints.</div>
      )}
      {!mission && <div className="map-hint">Select or create a mission.</div>}
    </div>
  );
}

function waypointMarker(map: maplibregl.Map, w: Waypoint, index: number, missionId: string) {
  const el = document.createElement('div');
  el.className = 'wp-marker';
  el.dataset.id = w.id;
  el.textContent = String(index + 1);
  el.title = `Waypoint ${index + 1} · ${w.altM} m`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    useMissionStore.getState().selectWaypoint(w.id);
  });
  const marker = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([w.lng, w.lat])
    .addTo(map);
  marker.on('dragstart', () => useMissionStore.getState().selectWaypoint(w.id));
  marker.on('dragend', () => {
    const { lat, lng } = marker.getLngLat();
    useMissionStore.getState().editMission(missionId, (m) => moveWaypoint(m, w.id, { lat, lng }));
  });
  return marker;
}

function emptyLine(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
