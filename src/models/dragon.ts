export type DragonRarity = 'Legendary' | 'Epic' | 'Rare';

export type DragonBreed = 'Champion' | 'Hunter' | 'Sentinel' | 'Warrior';

export type VerificationStatus =
  | 'official-metadata-only'
  | 'community-unverified'
  | 'community-verified'
  | 'officially-confirmed';

export type TroopType = 'Cavalry' | 'Shieldbearers' | 'Archers' | 'Spearmen' | 'Siege';

export type AffinityLevel = 'positive' | 'neutral' | 'negative' | 'unknown';

export type EffectTag =
  | 'BURN'
  | 'BLEED'
  | 'STUN'
  | 'SILENCE'
  | 'HEAL'
  | 'SHIELD'
  | 'AREA_DAMAGE'
  | 'SINGLE_TARGET_DAMAGE'
  | 'BUFF_STRENGTH'
  | 'BUFF_INTELLIGENCE'
  | 'BUFF_INSTINCTS'
  | 'BUFF_INITIATIVE'
  | 'DEBUFF_STRENGTH'
  | 'DEBUFF_INTELLIGENCE'
  | 'DEBUFF_INSTINCTS'
  | 'DEBUFF_INITIATIVE'
  | 'LOW_HEALTH'
  | 'ON_CRITICAL'
  | 'ON_COMMAND_TRIGGER'
  | 'VANGUARD'
  | 'REARGUARD';

export interface CommandDefinition {
  name: string;
  description: string;
  triggerChance: number | null;
  target: string | null;
  durationRounds: number | null;
  tags: EffectTag[];
  sourceIds: string[];
}

export interface HabitDefinition {
  id: string;
  name: string;
  description: string;
  unlockStarRank: number | null;
  tags: EffectTag[];
  sourceIds: string[];
}

export interface DragonStats {
  strength: number | null;
  intelligence: number | null;
  instincts: number | null;
  initiative: number | null;
}

export interface Dragon {
  id: string;
  slug: string;
  name: string;
  rarity: DragonRarity;
  breed: DragonBreed;
  officialProfileUrl: string;
  isNew: boolean;
  dataStatus: VerificationStatus;
  lastVerified: string;
  notes: string | null;
  command: CommandDefinition | null;
  habits: HabitDefinition[];
  affinities: Record<TroopType, AffinityLevel>;
  stats: DragonStats;
  tags: EffectTag[];
}

export interface OwnedDragon {
  dragonId: string;
  owned: boolean;
  starRank: number | null;
  reignLevel: number | null;
  notes: string;
}

export interface EvidenceSource {
  id: string;
  type: 'official-page' | 'official-patch-note' | 'in-game-screenshot' | 'community-test';
  title: string;
  url: string | null;
  capturedAt: string | null;
  gameVersion: string | null;
  submittedBy: string | null;
  verificationStatus: VerificationStatus;
}

export const RARITIES: DragonRarity[] = ['Legendary', 'Epic', 'Rare'];
export const BREEDS: DragonBreed[] = ['Champion', 'Hunter', 'Sentinel', 'Warrior'];
export const TROOP_TYPES: TroopType[] = [
  'Cavalry',
  'Shieldbearers',
  'Archers',
  'Spearmen',
  'Siege',
];
export const VERIFICATION_STATUSES: VerificationStatus[] = [
  'official-metadata-only',
  'community-unverified',
  'community-verified',
  'officially-confirmed',
];
