import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// MapLibre 6 looks for its worker next to its own module file, which does not exist once
// Vite has bundled it. Point it at a worker bundle that Vite emits instead.
maplibregl.setWorkerUrl(workerUrl);

export { maplibregl };
