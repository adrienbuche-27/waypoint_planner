import type { Mission } from '../domain/types';

/** All persistence goes through this interface so an HttpRepository can be swapped in later. */
export interface MissionRepository {
  list(): Promise<Mission[]>;
  get(id: string): Promise<Mission | undefined>;
  save(mission: Mission): Promise<void>;
  delete(id: string): Promise<void>;
  exportAll(): Promise<Blob>;
  importAll(blob: Blob): Promise<void>;
}
