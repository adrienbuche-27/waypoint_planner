import type { TerrainProvider } from './TerrainProvider';

/** v1 provider: no terrain data, so no altitude adjustment. */
export class NullTerrainProvider implements TerrainProvider {
  async elevationM(): Promise<number | undefined> {
    return undefined;
  }
}
