export type DragonRarity = 'Legendary' | 'Epic' | 'Rare';

export type DragonBreed = 'Champion' | 'Hunter' | 'Sentinel' | 'Warrior';

export type VerificationStatus =
  | 'official-metadata-only'
  | 'community-unverified'
  | 'community-verified'
  | 'officially-confirmed';

export type TroopType = 'Cavalry' | 'Shieldbearers' | 'Archers' | 'Spearmen' | 'Siege';

export type AffinityLevel = 'positive' | 'neutral' | 'negative' | 'unknown';

export type DragonRosterSourceStatus =
  | 'official-website'
  | 'in-game-verified-pending-official-site'
  | 'community-unverified';

export type DragonCollectionState = 'not-collected' | 'not-hatched' | 'hatched';

export type EffectTag =
  | 'BURN'
  | 'BLEED'
  | 'BLEED_PAYOFF'
  | 'PANIC_PAYOFF'
  | 'VULNERABLE_PAYOFF'
  | 'RESISTANCE_PAYOFF'
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
  | 'TACTICAL_DAMAGE_UP'
  | 'TACTICAL_DAMAGE_DOWN'
  | 'TACTICAL_DAMAGE_RECEIVED_UP'
  | 'RECOVERY'
  | 'RECOVERY_RECEIVED_UP'
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
  | 'INTELLIGENCE_UP'
  | 'FIRE_DAMAGE_UP'
  | 'FIRE_DAMAGE_DEALT_DOWN'
  | 'PHYSICAL_DAMAGE_DEALT_DOWN'
  | 'VANGUARD_REQUIRED'
  | 'LEFT_FLANK_TARGET'
  | 'RIGHT_FLANK_TARGET'
  | 'BUFF_SELF'
  | 'BUFF_ALLIES'
  | 'ENEMY_DEBUFF'
  | 'PHYSICAL_DAMAGE_UP'
  | 'PHYSICAL_DAMAGE_RECEIVED_UP'
  | 'PHYSICAL_DAMAGE_RECEIVED_DOWN'
  | 'TACTICAL_DAMAGE_RECEIVED_DOWN'
  | 'FIRE_DAMAGE_RECEIVED_UP'
  | 'EXCLUDES_BASIC_ATTACKS'
  | 'OTHER_ALLIES_TARGET'
  | 'DAMAGE_DEALT_UP'
  | 'STRENGTH_UP'
  | 'FIRST_STRIKE'
  | 'DOUBLE_STRIKE'
  | 'CLEANSE_POSITIVE'
  | 'FIRE_DAMAGE'
  | 'PHYSICAL_DAMAGE'
  | 'RECOVERY_RECEIVED_DOWN'
  | 'DAMAGE_RECEIVED_DOWN'
  | 'DAMAGE_RECEIVED_UP'
  | 'FIRE_DAMAGE_RECEIVED_DOWN'
  | 'FIRE_WARD'
  | 'IMMUNITY'
  | 'SPREADING_BLAZE'
  | 'INFECTIOUS_WRATH'
  | 'STOLEN_FLOCK'
  | 'RALLYING_FLAME'
  | 'PREY'
  | 'VULNERABLE'
  | 'EVADE'
  | 'RESISTANCE'
  | 'PANIC'
  | 'WEAKENED'
  | 'ADVANTAGE'
  | 'TAUNT'
  | 'STAGGER'
  | 'CONFUSION'
  | 'OVERWHELM'
  | 'BULWARK'
  | 'COMMAND_AUGMENTATION'
  | 'CONDITIONAL_STATUS_COPY'
  | 'SLOW'
  | 'CONTROL'
  | 'CLEANSE_NEGATIVE'
  | 'MIRAGE'
  | 'INTELLIGENCE_SCALING'
  | 'STRENGTH_SCALING'
  | 'INITIATIVE_SCALING'
  | 'MOST_TROOPS_TARGET'
  | 'DAMAGE_DEALT_DOWN'
  | 'TROOP_CAPACITY_CONDITION'
  | 'TROOP_TYPE_CONDITION'
  | 'HIGHEST_INTELLIGENCE_TARGET'
  | 'FIRE_DAMAGE_ALLY_TARGET'
  | 'HIGHEST_STRENGTH_TARGET'
  | 'STEADY_EROSION'
  | 'NULLIFY_RECOVERY';

export type AbilityKind = 'command' | 'trait' | 'habit';

export type FormationPosition = 'left-flank' | 'vanguard' | 'right-flank';

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

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface AbilityDefinition {
  id: string;
  dragonId: string;
  kind: AbilityKind;
  name: string;
  abilityClass?: 'active' | 'passive' | 'unknown';
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  positionRequirement: FormationPosition | null;
  rawDescription: string | null;
  verification: FieldVerification;
  evidenceIds: string[];
  tags: EffectTag[];
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
  officialProfileUrl: string | null;
  rosterSourceStatus: DragonRosterSourceStatus;
  firstObservedInGame: string | null;
  gameVersion: string | null;
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
}

export interface OwnedDragon {
  dragonId: string;
  owned: boolean;
  starRank: number | null;
  reignLevel: number | null;
  notes: string;
  habitLevels: Partial<Record<string, HabitLevel>>;
}

export type HabitLevel = 1 | 2 | 3 | 4 | 5;

export interface DragonCollectionProgress {
  state: DragonCollectionState;
  shardsCurrent: number | null;
  shardsRequired: number | null;
}

export interface EvidenceSource {
  id: string;
  type:
    | 'official-page'
    | 'official-patch-note'
    | 'in-game-screenshot'
    | 'community-test'
    | 'manual-combat-log-observation';
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

export interface ManualReviewRecord {
  id: string;
  dragonId: string;
  scope:
    | 'identity'
    | 'command'
    | 'trait'
    | 'habits'
    | 'affinities'
    | 'synergy-normalization'
    | 'combat-log-behavior';
  status: 'confirmed' | 'provisional' | 'needs-follow-up' | 'unreviewed';
  reviewedAt: string;
  reviewedAgainstGameBuild: string;
  reviewer: 'repository-owner';
  notes: string[];
  evidenceIds: string[];
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
