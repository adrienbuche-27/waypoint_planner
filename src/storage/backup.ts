// JSON backup format for the whole mission library.
import type { Mission } from '../domain/types';

export const BACKUP_FORMAT = 'waypoint-planner-library';
export const BACKUP_VERSION = 1;

export interface LibraryBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  missions: Mission[];
}

export function toBackupJson(missions: Mission[], now: string): string {
  const backup: LibraryBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    missions,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseBackupJson(text: string): Mission[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
  const b = data as Partial<LibraryBackup>;
  if (b?.format !== BACKUP_FORMAT) throw new Error('Not a Waypoint Planner backup file.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${String(b.version)}.`);
  }
  if (!Array.isArray(b.missions)) throw new Error('Backup file has no mission list.');
  for (const m of b.missions) {
    if (typeof m?.id !== 'string' || !Array.isArray(m.waypoints)) {
      throw new Error('Backup file contains an invalid mission.');
    }
  }
  return b.missions;
}
