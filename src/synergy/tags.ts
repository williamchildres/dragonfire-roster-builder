export const SYNERGY_TAGS = [
  'status:panic',
  'status:first-strike',
  'damage:fire',
  'effect:recovery',
] as const;

export type SynergyTag = (typeof SYNERGY_TAGS)[number];

export const SYNERGY_TAG_LABELS: Record<SynergyTag, string> = {
  'status:panic': 'Panic',
  'status:first-strike': 'First-Strike',
  'damage:fire': 'Fire Damage',
  'effect:recovery': 'Recovery',
};

export function isSynergyTag(value: string): value is SynergyTag {
  return (SYNERGY_TAGS as readonly string[]).includes(value);
}
