/**
 * Punch label — the two kinds of attendance events in the append-only punch log
 * (ADR-055). A shift's session is derived from an ordered stream of these.
 */
export enum PunchLabel {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
}
