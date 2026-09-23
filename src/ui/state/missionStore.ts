import { create } from 'zustand';
import { newId } from '../../domain/id';
import { createManualMission, duplicateMission } from '../../domain/planners/manual';
import type { Mission } from '../../domain/types';
import type { MissionRepository } from '../../storage/MissionRepository';

export interface MissionState {
  missions: Mission[];
  selectedMissionId?: string;
  selectedWaypointId?: string;
  loaded: boolean;
  error?: string;

  load(): Promise<void>;
  createMission(): void;
  selectMission(id: string | undefined): void;
  selectWaypoint(id: string | undefined): void;
  /** Applies a pure edit to a mission, bumps updatedAt and persists it. */
  editMission(id: string, edit: (m: Mission) => Mission): void;
  duplicate(id: string): void;
  remove(id: string): void;
  exportLibrary(): Promise<Blob>;
  importLibrary(file: Blob): Promise<void>;
}

const nowIso = () => new Date().toISOString();

export function createMissionStore(repo: MissionRepository) {
  return create<MissionState>()((set, get) => {
    const persist = (m: Mission) =>
      repo.save(m).catch((e: unknown) => set({ error: `Could not save: ${String(e)}` }));
    const upsert = (m: Mission) =>
      set((s) => ({
        missions: s.missions.some((x) => x.id === m.id)
          ? s.missions.map((x) => (x.id === m.id ? m : x))
          : [m, ...s.missions],
      }));

    return {
      missions: [],
      loaded: false,

      async load() {
        try {
          set({ missions: await repo.list(), loaded: true });
        } catch (e) {
          set({ loaded: true, error: `Could not load missions: ${String(e)}` });
        }
      },

      createMission() {
        const m = createManualMission(newId(), `Mission ${get().missions.length + 1}`, nowIso());
        upsert(m);
        set({ selectedMissionId: m.id, selectedWaypointId: undefined });
        void persist(m);
      },

      selectMission(id) {
        set({ selectedMissionId: id, selectedWaypointId: undefined });
      },

      selectWaypoint(id) {
        set({ selectedWaypointId: id });
      },

      editMission(id, edit) {
        const current = get().missions.find((m) => m.id === id);
        if (!current) return;
        const next = { ...edit(current), updatedAt: nowIso() };
        upsert(next);
        void persist(next);
      },

      duplicate(id) {
        const src = get().missions.find((m) => m.id === id);
        if (!src) return;
        const copy = duplicateMission(src, newId(), `${src.name} (copy)`, nowIso(), newId);
        upsert(copy);
        set({ selectedMissionId: copy.id, selectedWaypointId: undefined });
        void persist(copy);
      },

      remove(id) {
        set((s) => ({
          missions: s.missions.filter((m) => m.id !== id),
          selectedMissionId: s.selectedMissionId === id ? undefined : s.selectedMissionId,
          selectedWaypointId: s.selectedMissionId === id ? undefined : s.selectedWaypointId,
        }));
        repo.delete(id).catch((e: unknown) => set({ error: `Could not delete: ${String(e)}` }));
      },

      exportLibrary: () => repo.exportAll(),

      async importLibrary(file) {
        await repo.importAll(file);
        set({ missions: await repo.list() });
      },
    };
  });
}

export const selectedMission = (s: MissionState) =>
  s.missions.find((m) => m.id === s.selectedMissionId);
