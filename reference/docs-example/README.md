# Not a golden reference

`waypoints_name.kmz.zip` is DJI's generic WPML example from the developer documentation
(Matrice 30 enums `droneEnumValue 67` / `payloadEnumValue 52`, placeholder coordinates,
explanatory comments). It was **not** written by DJI Fly for the Air 3S.

Use it only to read the general WPML structure. Never take enum values, the namespace
version or default fields from it; those must come from a real DJI Fly file in `reference/`.
