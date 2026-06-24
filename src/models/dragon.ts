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
  | 'REARGUARD'
  | 'TACTICAL_DAMAGE'
  | 'RECOVERY'
  | 'SAME_LANE_TARGET'
  | 'ANY_LANE_TARGET'
  | 'ADJACENT_TARGET'
  | 'ENHANCED_BY_INSTINCT'
  | 'ENHANCED_BY_STRENGTH'
  | 'SCALES_WITH_LEVEL'
  | 'SPECIFIC_ROUNDS'
  | 'MULTI_SCHEDULE_COMMAND'
  | 'RECOVERY_DEALT_UP'
  | 'INSTINCT_UP'
  | 'FIRE_DAMAGE_UP'
  | 'VANGUARD_REQUIRED'
  | 'LEFT_FLANK_TARGET'
  | 'BUFF_SELF'
  | 'BUFF_ALLIES'
  | 'PHYSICAL_DAMAGE_UP'
  | 'TACTICAL_DAMAGE_RECEIVED_DOWN'
  | 'EXCLUDES_BASIC_ATTACKS'
  | 'OTHER_ALLIES_TARGET'
  | 'DAMAGE_DEALT_UP'
  | 'STRENGTH_UP'
  | 'FIRST_STRIKE'
  | 'DOUBLE_STRIKE';

export type AbilityKind = 'command' | 'trait' | 'habit';

export type TriggerTiming =
  | 'passive'
  | 'start-of-combat'
  | 'each-round'
  | 'start-of-round'
  | 'specific-rounds';

export type FormationPosition = 'left-flank' | 'vanguard' | 'right-flank';

export type TargetScope =
  | 'self'
  | 'same-lane'
  | 'any-lane'
  | 'within-adjacency'
  | 'left-flank'
  | 'unknown';

export type FieldVerificationStatus =
  | 'unknown'
  | 'officially-confirmed'
  | 'screenshot-verified'
  | 'partially-screenshot-verified'
  | 'community-unverified'
  | 'community-verified';

export interface FieldVerification {
  status: FieldVerificationStatus;
  source: string;
  capturedAt: string | null;
  gameVersion: string | null;
  reviewedManually: boolean;
}

export interface RankedValue {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  value: number;
  unit: 'percent' | 'flat' | 'power';
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface AbilityEffect {
  id: string;
  type: string;
  target: string;
  targetScope: TargetScope;
  magnitude: number | null;
  unit: 'percent' | 'flat' | 'rate' | 'rounds' | 'unknown';
  durationRounds: number | null;
  duration: string | null;
  scaling: string[];
  excludes: string[];
  notes: string[];
  rankedValues: RankedValue[];
}

export interface AbilitySchedule {
  id: string;
  timing: TriggerTiming;
  rounds: number[];
  triggerChanceFixed: number | null;
  triggerChanceByHabitLevel: RankedValue[];
  effects: AbilityEffect[];
}

export interface AbilityDefinition {
  id: string;
  dragonId: string;
  kind: AbilityKind;
  name: string;
  abilityClass: 'active' | 'passive' | 'unknown';
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  rawDescription: string | null;
  schedules: AbilitySchedule[];
  powerByHabitLevel: RankedValue[];
  glossaryEntries: GlossaryEntry[];
  tags: EffectTag[];
  verification: FieldVerification;
  evidenceIds: string[];
  unresolvedQuestions: string[];
  positionRequirement: FormationPosition | null;
}

export interface DragonStats {
  strength: number | null;
  intelligence: number | null;
  instinct: number | null;
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
  command: AbilityDefinition | null;
  trait: AbilityDefinition | null;
  habits: AbilityDefinition[];
  affinities: Record<TroopType, AffinityLevel>;
  stats: DragonStats;
  tags: EffectTag[];
  fieldVerification: Partial<Record<string, FieldVerification>>;
  unresolvedQuestions: string[];
}

export interface OwnedDragon {
  dragonId: string;
  owned: boolean;
  starRank: number | null;
  reignLevel: number | null;
  notes: string;
  habitLevels: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | null>;
}

export interface EvidenceSource {
  id: string;
  type: 'official-page' | 'official-patch-note' | 'in-game-screenshot' | 'community-test';
  title: string;
  description?: string;
  url: string | null;
  capturedAt: string | null;
  language?: 'English';
  gameVersion: string | null;
  submittedBy: string | null;
  reviewedManually?: boolean;
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

export const FORMATION_POSITIONS: FormationPosition[] = [
  'left-flank',
  'vanguard',
  'right-flank',
];
