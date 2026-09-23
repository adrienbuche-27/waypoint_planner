import { IndexedDbRepository } from '../../storage/IndexedDbRepository';
import { createMissionStore } from './missionStore';

export const useMissionStore = createMissionStore(new IndexedDbRepository());
