export const SYNERGY_TAGS = [
  'status:panic',
  'status:first-strike',
  'status:burn',
  'status:slow',
  'status:taunt',
  'status:control',
  'status:stun',
  'status:stagger',
  'status:overwhelm',
  'status:confusion',
  'damage:physical',
  'damage:tactical',
  'damage:fire',
  'effect:recovery',
  'stat:strength',
  'stat:instinct',
  'stat:intelligence',
  'stat:initiative',
] as const;

export type SynergyTag = (typeof SYNERGY_TAGS)[number];

export const SYNERGY_TAG_LABELS: Record<SynergyTag, string> = {
  'status:panic': 'Panic',
  'status:first-strike': 'First-Strike',
  'status:burn': 'Burn',
  'status:slow': 'Slow',
  'status:taunt': 'Taunt',
  'status:control': 'Control',
  'status:stun': 'Stun',
  'status:stagger': 'Stagger',
  'status:overwhelm': 'Overwhelm',
  'status:confusion': 'Confusion',
  'damage:physical': 'Physical Damage',
  'damage:tactical': 'Tactical Damage',
  'damage:fire': 'Fire Damage',
  'effect:recovery': 'Recovery',
  'stat:strength': 'Strength',
  'stat:instinct': 'Instinct',
  'stat:intelligence': 'Intelligence',
  'stat:initiative': 'Initiative',
};

export const CONTROL_ALIAS_TAGS = [
  'status:stun',
  'status:stagger',
  'status:overwhelm',
  'status:confusion',
] as const satisfies readonly SynergyTag[];

export function isSynergyTag(value: string): value is SynergyTag {
  return (SYNERGY_TAGS as readonly string[]).includes(value);
}
