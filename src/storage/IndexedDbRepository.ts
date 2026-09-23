import Dexie, { type EntityTable } from 'dexie';
import type { Mission } from '../domain/types';
import { parseBackupJson, toBackupJson } from './backup';
import type { MissionRepository } from './MissionRepository';

class MissionDb extends Dexie {
  missions!: EntityTable<Mission, 'id'>;

  constructor(name: string) {
    super(name);
    // Schema history: add a new version() block for every change; never edit an old one.
    this.version(1).stores({ missions: 'id, name, updatedAt' });
  }
}

export class IndexedDbRepository implements MissionRepository {
  private readonly db: MissionDb;

  constructor(dbName = 'waypoint-planner') {
    this.db = new MissionDb(dbName);
  }

  async list(): Promise<Mission[]> {
    return (await this.db.missions.orderBy('updatedAt').reverse().toArray()) as Mission[];
  }

  get(id: string): Promise<Mission | undefined> {
    return this.db.missions.get(id);
  }

  async save(mission: Mission): Promise<void> {
    await this.db.missions.put(mission);
  }

  async delete(id: string): Promise<void> {
    await this.db.missions.delete(id);
  }

  async exportAll(): Promise<Blob> {
    const json = toBackupJson(await this.list(), new Date().toISOString());
    return new Blob([json], { type: 'application/json' });
  }

  /** Merges a backup into the library: missions with the same id are overwritten. */
  async importAll(blob: Blob): Promise<void> {
    const missions = parseBackupJson(await blob.text());
    await this.db.missions.bulkPut(missions);
  }

  close(): void {
    this.db.close();
  }
}
