// Raster map sources. Add WMTS/XYZ sources (e.g. national orthophoto services) here only.

export interface MapSource {
  id: string;
  label: string;
  kind: 'satellite' | 'street';
  tiles: string[];
  tileSize: number;
  maxZoom: number;
  attribution: string;
}

export const MAP_SOURCES: MapSource[] = [
  {
    id: 'esri-world-imagery',
    label: 'Satellite (Esri World Imagery)',
    kind: 'satellite',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    maxZoom: 19,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
  {
    id: 'osm',
    label: 'Streets (OpenStreetMap)',
    kind: 'street',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];

export const DEFAULT_MAP_SOURCE_ID = 'esri-world-imagery';
