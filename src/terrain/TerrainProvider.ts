/** Ground elevation source (future: DEM tiles). Not used for altitude in v1. */
export interface TerrainProvider {
  /** Elevation above the WGS84 ellipsoid/geoid in metres, or undefined if unknown. */
  elevationM(lat: number, lng: number): Promise<number | undefined>;
}
