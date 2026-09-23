import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { appendWaypoint, createManualMission } from '../domain/planners/manual';
import { IndexedDbRepository } from './IndexedDbRepository';

let n = 0;
const repos: IndexedDbRepository[] = [];
const newRepo = () => {
  const r = new IndexedDbRepository(`test-${n++}`);
  repos.push(r);
  return r;
};
afterEach(() => repos.splice(0).forEach((r) => r.close()));

const mission = (id: string, updatedAt: string) =>
  appendWaypoint(
    { ...createManualMission(id, `Mission ${id}`, updatedAt), updatedAt },
    { lat: 45, lng: 5 },
    `${id}-wp`,
  );

describe('IndexedDbRepository', () => {
  it('saves, gets, lists newest first and deletes', async () => {
    const repo = newRepo();
    await repo.save(mission('a', '2026-01-01T00:00:00Z'));
    await repo.save(mission('b', '2026-02-01T00:00:00Z'));
    expect((await repo.get('a'))?.waypoints).toHaveLength(1);
    expect((await repo.list()).map((m) => m.id)).toEqual(['b', 'a']);
    await repo.delete('a');
    expect(await repo.get('a')).toBeUndefined();
  });

  it('round-trips the whole library through a JSON backup', async () => {
    const source = newRepo();
    await source.save(mission('a', '2026-01-01T00:00:00Z'));
    await source.save(mission('b', '2026-02-01T00:00:00Z'));
    const blob = await source.exportAll();

    const target = newRepo();
    await target.save(mission('c', '2026-03-01T00:00:00Z'));
    await target.importAll(blob);
    expect((await target.list()).map((m) => m.id)).toEqual(['c', 'b', 'a']);
    expect(await target.get('a')).toEqual(await source.get('a'));
  });

  it('rejects a file that is not a backup', async () => {
    const repo = newRepo();
    await expect(repo.importAll(new Blob(['{"foo":1}']))).rejects.toThrow(/Not a Waypoint/);
    await expect(repo.importAll(new Blob(['nope']))).rejects.toThrow(/not valid JSON/);
  });
});
