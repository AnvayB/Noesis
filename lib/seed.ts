/**
 * The personal seed for the Mindscape: the one input that changes a whole
 * map. It is the person, not the day. Set MINDSCAPE_SEED to make a
 * different map from the same history; otherwise the app's name is used and
 * the map is stable across installs of the same data.
 */
export function getMindscapeSeed(): string {
  return process.env.MINDSCAPE_SEED?.trim() || "noesis";
}
