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
  'status:vulnerable',
  'status:weakened',
  'status:bleed',
  'status:resistance',
  'status:advantage',
  'damage:physical',
  'damage:tactical',
  'damage:fire',
  'damage:any',
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
  'status:vulnerable': 'Vulnerable',
  'status:weakened': 'Weakened',
  'status:bleed': 'Bleed',
  'status:resistance': 'Resistance',
  'status:advantage': 'Advantage',
  'damage:physical': 'Physical Damage',
  'damage:tactical': 'Tactical Damage',
  'damage:fire': 'Fire Damage',
  'damage:any': 'Damage Dealt',
  'effect:recovery': 'Recovery',
  'stat:strength': 'Strength',
  'stat:instinct': 'Instinct',
  'stat:intelligence': 'Intelligence',
  'stat:initiative': 'Initiative',
};

export const CONTROL_ALIAS_TAGS = [
  'status:slow',
  'status:stun',
  'status:stagger',
  'status:overwhelm',
  'status:confusion',
] as const satisfies readonly SynergyTag[];

const CATEGORY_ROLLUPS: Partial<Record<SynergyTag, readonly SynergyTag[]>> = Object.fromEntries(
  CONTROL_ALIAS_TAGS.map((tag) => [tag, ['status:control'] as const]),
);

const BROAD_CATEGORY_TAGS = ['status:control'] as const satisfies readonly SynergyTag[];

export function categoryTagsFor(tag: SynergyTag): SynergyTag[] {
  return [...(CATEGORY_ROLLUPS[tag] ?? [])];
}

export function tagSatisfies(providerTag: SynergyTag, beneficiaryTag: SynergyTag): boolean {
  return providerTag === beneficiaryTag || categoryTagsFor(providerTag).includes(beneficiaryTag);
}

export function specificTagsFrom(tags: readonly SynergyTag[]): SynergyTag[] {
  const uniqueTags = uniqueSynergyTags(tags);
  const hasSpecificControlAlias = uniqueTags.some((tag) =>
    CONTROL_ALIAS_TAGS.includes(tag as (typeof CONTROL_ALIAS_TAGS)[number]),
  );

  return uniqueTags.filter(
    (tag) => !(tag === 'status:control' && hasSpecificControlAlias),
  );
}

export function categoryTagsFrom(tags: readonly SynergyTag[]): SynergyTag[] {
  const uniqueTags = uniqueSynergyTags(tags);
  return uniqueSynergyTags([
    ...uniqueTags.filter((tag) => BROAD_CATEGORY_TAGS.includes(tag as (typeof BROAD_CATEGORY_TAGS)[number])),
    ...uniqueTags.flatMap((tag) => categoryTagsFor(tag)),
  ]);
}

export function displayTagsFrom(tags: readonly SynergyTag[]): SynergyTag[] {
  return uniqueSynergyTags([...specificTagsFrom(tags), ...categoryTagsFrom(tags)]);
}

export function isSynergyTag(value: string): value is SynergyTag {
  return (SYNERGY_TAGS as readonly string[]).includes(value);
}

function uniqueSynergyTags(tags: readonly SynergyTag[]): SynergyTag[] {
  return [...new Set(tags)];
}
