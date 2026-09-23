# Waypoint Planner — working rules

Full spec: `SPEC.md`. Work milestone by milestone; don't start one before the previous one's
acceptance criteria pass (M1 and M2 field checks are confirmed by the user).

- Before implementing anything involving WPML, read the files in `reference/`. If a needed field
  or enum isn't there, ask; never invent it. If `reference/` has no `.kmz`, stop and ask.
- `src/domain/` and `src/wpml/` are pure TS (no DOM, no React) and covered by tests. Add a test for
  every bug fixed there.
- Units: metres, degrees, m/s, WGS84 `{ lat, lng }` (KML writes `lng,lat`).
- All persistence goes through `MissionRepository`.
- Hardware/firmware values (limits, camera specs, enums) live in `src/config/` with a cited source
  or `// TODO verify`.
- No backend, auth or analytics in v1.
- Ambiguous design choice → propose 2 options with trade-offs and let the user choose.
- Before declaring work done: `npm run lint && npm test && npm run build`.
