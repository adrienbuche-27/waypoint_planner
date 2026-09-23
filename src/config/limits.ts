// Hardware-, firmware- and regulation-dependent limits. Every value cites a source or is marked TODO verify.

/** EU Open category maximum height above takeoff (Regulation (EU) 2019/947, UAS.OPEN.010). */
export const MAX_ALT_M = 120;

/** Maximum waypoints accepted by DJI Fly for the Air 3S. TODO verify against a real mission; conservative default. */
export const MAX_WAYPOINTS = 200;

/** TODO verify: Air 3S waypoint speed bounds in DJI Fly. */
export const MIN_SPEED_MS = 1;
export const MAX_SPEED_MS = 15;

/** Usable flight time per battery used for estimates. Conservative default, user-editable. TODO verify. */
export const DEFAULT_USABLE_FLIGHT_TIME_S = 30 * 60;

/** Warn when a mission uses more than this fraction of one battery. */
export const BATTERY_WARNING_RATIO = 0.8;
