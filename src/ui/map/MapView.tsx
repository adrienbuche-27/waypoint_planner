import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { DEFAULT_MAP_SOURCE_ID, MAP_SOURCES } from '../../config/mapSources';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = MAP_SOURCES.find((s) => s.id === DEFAULT_MAP_SOURCE_ID) ?? MAP_SOURCES[0]!;
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: {
        version: 8,
        sources: {
          [source.id]: {
            type: 'raster',
            tiles: source.tiles,
            tileSize: source.tileSize,
            maxzoom: source.maxZoom,
            attribution: source.attribution,
          },
        },
        layers: [{ id: source.id, type: 'raster', source: source.id }],
      },
      center: [2.35, 48.85],
      zoom: 5,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    return () => map.remove();
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
