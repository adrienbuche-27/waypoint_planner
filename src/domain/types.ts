// Core domain model (SPEC.md §4).
// Units: metres, degrees, m/s. Coordinates are WGS84 { lat, lng }.

export type Action =
  | { type: 'hover'; seconds: number }
  | { type: 'photo' }
  | { type: 'startVideo' }
  | { type: 'stopVideo' }
  | { type: 'gimbal'; pitchDeg: number } // -90 = nadir
  | { type: 'yaw'; headingDeg: number };

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  altM: number; // relative to takeoff
  speedMs: number;
  headingMode: 'followRoute' | 'fixed' | 'poi';
  headingDeg?: number; // when fixed
  gimbalPitchDeg: number;
  actions: Action[]; // executed in order on arrival
}

export interface CameraProfile {
  id: 'air3s-wide' | 'air3s-tele' | (string & {});
  label: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  focalLengthMm: number; // real focal length, not 35mm-equivalent
  imageWidthPx: number;
  imageHeightPx: number;
  minPhotoIntervalS: number;
}

export interface GridParams {
  polygon: GeoJSON.Polygon;
  camera: CameraProfile['id'];
  targetGsdCmPx?: number; // either GSD...
  altitudeM?: number; // ...or altitude drives the other
  frontOverlap: number; // 0..1, default 0.75
  sideOverlap: number; // 0..1, default 0.65
  flightDirectionDeg: number; // line bearing; UI offers "auto" = longest edge
  speedMs: number;
  hoverBeforePhotoS: number; // default 1.0
  marginM: number; // extend lines past polygon edge, default 0
  gimbalPitchDeg: number; // default -90
  crosshatch: boolean; // second pass at +90°, default false
}

export interface FlightLogEntry {
  id: string;
  date: string;
  exportedFileHash: string; // proves exactly which KMZ was flown
  notes?: string;
}

export interface Mission {
  id: string;
  name: string;
  kind: 'manual' | 'grid' | 'repeat';
  createdAt: string;
  updatedAt: string;
  params?: GridParams | Record<string, unknown>; // source of truth for generated missions
  waypoints: Waypoint[]; // derived for grid, edited for manual
  finishAction: 'goHome' | 'hover' | 'land';
  rcLostAction: 'goBack' | 'hover' | 'land';
  notes?: string;
  flights?: FlightLogEntry[];
}
