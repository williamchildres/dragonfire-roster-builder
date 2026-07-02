export const SYNERGY_TAGS = [
  'status:panic',
  'status:first-strike',
  'damage:fire',
  'effect:recovery',
] as const;

export type SynergyTag = (typeof SYNERGY_TAGS)[number];

export function isSynergyTag(value: string): value is SynergyTag {
  return (SYNERGY_TAGS as readonly string[]).includes(value);
}
