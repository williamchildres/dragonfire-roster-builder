import { createHash } from 'node:crypto';

import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type {
  DragonSynergyProfile,
  PositionClaim,
  SignalConfidence,
  SynergySignal,
} from '../synergy/types';

export const FORMATION_RELIABILITY_AUDIT_CONTRACT = 'formation-reliability-audit-v2' as const;
export const PROPOSED_FORMATION_RELIABILITY_CONTRACT =
  'formation-signal-reliability-v2-proposal' as const;

export type ReliabilityClassification =
  | 'guaranteed'
  | 'conditional-deterministic'
  | 'known-single-opportunity-chance'
  | 'known-repeated-opportunity-chance'
  | 'known-chance-with-unresolved-opportunity-count'
  | 'probability-present-exact-value-unresolved'
  | 'probability-unknown'
  | 'mixed-guaranteed-and-chance-based-ability'
  | 'not-applicable-to-activation-reliability';

export type ReliabilityIndependence =
  'confirmed' | 'reasonable-model-assumption' | 'unknown' | 'contradicted' | 'not-applicable';

export type OpportunityPresence =
  'guaranteed-at-least-one' | 'conditional' | 'unknown' | 'not-applicable';

export type ReliabilityRollScope =
  | 'single-shared-roll'
  | 'separate-per-target'
  | 'separate-per-effect'
  | 'separate-per-target-and-effect'
  | 'separate-stat-checks'
  | 'unresolved'
  | 'not-applicable';

export interface ReliabilityProbability {
  kind: 'none' | 'fixed' | 'habit-level' | 'round-and-habit' | 'multiple' | 'unknown';
  fixed?: number;
  byHabitLevel?: [number, number, number, number, number];
  variants?: Array<{
    label: string;
    fixed?: number;
    byHabitLevel?: [number, number, number, number, number];
  }>;
  note?: string;
}

export interface ReliabilityOpportunityCount {
  kind:
    | 'exact'
    | 'scheduled-maximum'
    | 'battle-length-dependent'
    | 'ability-activation-dependent'
    | 'condition-count-dependent'
    | 'unresolved'
    | 'not-applicable';
  value?: number;
  schedule?: number[];
  note?: string;
}

interface ChanceSpec {
  probability: ReliabilityProbability;
  rollTiming: string;
  rollScope: ReliabilityRollScope;
  opportunityCount: ReliabilityOpportunityCount;
  targetCount: number | null;
  separatePerTarget: boolean | null;
  separatePerEffect: boolean | null;
  durationRounds: number | null;
  independence: ReliabilityIndependence;
  unresolvedQuestions: string[];
  componentSuffix: string;
  sourceAbilityOverride?: string;
  classification?: ReliabilityClassification;
}

interface MixedSpec {
  componentSuffixes: string[];
  note: string;
  unresolvedQuestions: string[];
}

export interface FormationReliabilityAuditSignal {
  dragonId: string;
  dragonName: string;
  signalId: string;
  signalCategory: 'output' | 'support' | 'benefitsFrom';
  tags: string[];
  sourceAbilityId: string;
  sourceAbilityName: string;
  abilityKind: string;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  habitLevelDependent: boolean;
  currentCuratedDescription: string;
  currentConfidence: SignalConfidence;
  currentRelationshipTypesOrValuesAffected: string[];
  reliabilityComponentIds: string[];
  classification: ReliabilityClassification;
  probability: ReliabilityProbability;
  opportunityPresence: OpportunityPresence;
  rollTiming: string;
  rollScope: ReliabilityRollScope;
  opportunityCount: ReliabilityOpportunityCount;
  targetCount: number | null;
  separatePerTarget: boolean | null;
  separatePerEffect: boolean | null;
  durationRounds: number | null;
  independence: ReliabilityIndependence;
  canonicalEvidence: {
    abilityRawDescription: string | null;
    verificationStatus: string;
    verificationSource: string;
    evidenceIds: string[];
  };
  unresolvedQuestions: string[];
  coverageStatus: 'covered';
}

export interface FormationReliabilityAuditPositionClaim {
  dragonId: string;
  dragonName: string;
  claimId: string;
  sourceAbilityId: string;
  sourceAbilityName: string;
  requiredPosition: string;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  classification: 'not-applicable-to-activation-reliability';
  rationale: string;
}

export interface FormationReliabilityAuditReport {
  auditContract: typeof FORMATION_RELIABILITY_AUDIT_CONTRACT;
  proposedContract: typeof PROPOSED_FORMATION_RELIABILITY_CONTRACT;
  source: {
    researchBaselineRelease: '0.20.3';
    researchBaselineSha: '010555fd8f79268a60a805e2ed296a8d6cc322fc';
    profileFile: 'src/synergy/profiles.ts';
    canonicalAbilityFiles: ['src/data/dragons.ts', 'src/data/sunfyreTairax.ts'];
  };
  totals: {
    dragons: number;
    curatedSignals: number;
    scoringSignals: number;
    explicitlyNonScoringSignals: number;
    positionClaims: number;
    guaranteedSignals: number;
    conditionalDeterministicSignals: number;
    chanceBearingSignals: number;
    mixedSignals: number;
    signalsWithExplicitProbability: number;
    signalsWithHabitLevelProbabilityProgression: number;
    signalsWithKnownOpportunityCount: number;
    signalsWithKnownRollScope: number;
    signalsWithConfirmedSeparatePerTargetChecks: number;
    signalsWithUnresolvedOpportunityCount: number;
    signalsWithUnresolvedIndependence: number;
    signalsWithUnknownProbability: number;
    signalsWithCompleteSupportedProbabilityOpportunityScopeAndIndependence: number;
    signalsMissingProposedReliabilityCoverage: number;
    signalsWithGuaranteedAtLeastOneOpportunity: number;
    signalsWithConditionalOpportunityPresence: number;
    signalsWithUnknownOpportunityPresence: number;
    signalsWithNotApplicableOpportunityPresence: number;
  };
  missingProposedReliabilitySignalIds: string[];
  classificationCounts: Record<ReliabilityClassification, number>;
  breakdownByDragon: Array<{
    dragonId: string;
    dragonName: string;
    scoringSignals: number;
    chanceBearingSignals: number;
    mixedSignals: number;
    conditionalDeterministicSignals: number;
    unknownProbabilitySignals: number;
  }>;
  breakdownBySignalCategory: Array<{
    signalCategory: 'output' | 'support' | 'benefitsFrom';
    scoringSignals: number;
    chanceBearingSignals: number;
    mixedSignals: number;
  }>;
  positionClaims: FormationReliabilityAuditPositionClaim[];
  signals: FormationReliabilityAuditSignal[];
  deterministicHash: string;
}

const fixed = (value: number, note?: string): ReliabilityProbability => ({
  kind: 'fixed',
  fixed: value,
  ...(note ? { note } : {}),
});

const habit = (
  values: [number, number, number, number, number],
  note?: string,
): ReliabilityProbability => ({
  kind: 'habit-level',
  byHabitLevel: values,
  ...(note ? { note } : {}),
});

const scheduled = (schedule: number[], note?: string): ReliabilityOpportunityCount => ({
  kind: 'scheduled-maximum',
  value: schedule.length,
  schedule,
  note:
    note ??
    'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
});

const eachRound = (note?: string): ReliabilityOpportunityCount => ({
  kind: 'battle-length-dependent',
  note: note ?? 'One check is described each round; actual battle length is unresolved.',
});

const afterBasicAttack = (): ReliabilityOpportunityCount => ({
  kind: 'ability-activation-dependent',
  note: 'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
});

const chanceBySignalId = new Map<string, ChanceSpec>();

function registerChance(signalIds: string[], spec: ChanceSpec): void {
  for (const signalId of signalIds) {
    if (chanceBySignalId.has(signalId)) {
      throw new Error(`Duplicate reliability chance specification for ${signalId}.`);
    }
    chanceBySignalId.set(signalId, spec);
  }
}

registerChance(['sunfyre-golden-wrath-burn'], {
  probability: fixed(0.5),
  rollTiming: 'Rounds 1, 4, 7, and 10 after the below-50% Troop Capacity branch applies.',
  rollScope: 'separate-per-target',
  opportunityCount: scheduled([1, 4, 7, 10]),
  targetCount: 2,
  separatePerTarget: true,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether checks for different targets or different scheduled rounds are statistically independent.',
    'Whether the second target is valid on every below-50% activation.',
  ],
  componentSuffix: 'burn',
});

registerChance(['tairax-burning-ward-burn'], {
  probability: fixed(0.5),
  rollTiming: 'Rounds 2, 5, and 8 after the direct Fire attack.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([2, 5, 8]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether checks on different scheduled rounds are statistically independent.',
  ],
  componentSuffix: 'burn',
});

registerChance(['tairax-burning-ward-stagger'], {
  probability: {
    kind: 'round-and-habit',
    fixed: 0.25,
    byHabitLevel: [0.375, 0.4, 0.425, 0.4625, 0.5],
    note: 'Base command is 25%; unlocked Gleamstrike replaces the odd-round chance using its active Habit Level.',
  },
  rollTiming: 'Odd-numbered rounds.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([1, 3, 5, 7, 9]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether checks on different odd-numbered rounds are statistically independent.',
  ],
  componentSuffix: 'stagger',
});

registerChance(['tairax-gift-of-fire-resistance', 'tairax-gift-of-fire-burn-payoff'], {
  probability: habit([0.175, 0.21, 0.245, 0.2975, 0.35]),
  rollTiming: 'Start of each round, once for each Enemy afflicted with Burn.',
  rollScope: 'unresolved',
  opportunityCount: {
    kind: 'condition-count-dependent',
    note: 'Opportunities depend on battle length and the number of Burn-afflicted Enemies each round.',
  },
  targetCount: 1,
  separatePerTarget: null,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether separate Burn-conditioned checks are independent.',
    'How target selection behaves when no Ally lacks Resistance.',
  ],
  componentSuffix: 'burn-conditioned-resistance',
});

registerChance(['syrax-blazing-fury-first-strike', 'syrax-blazing-fury-fire-support'], {
  probability: fixed(0.2),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Battle length and temporal independence are unresolved.',
    'Fire Damage support and First-Strike share one activation and must not be double-discounted.',
  ],
  componentSuffix: 'fire-and-first-strike',
});

registerChance(['syrax-strategic-revival-resistance'], {
  probability: habit([0.4, 0.52, 0.64, 0.8, 1]),
  rollTiming: 'Rounds 2, 5, and 8 after guaranteed Recovery is applied.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([2, 5, 8]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether Resistance checks across scheduled rounds are independent.'],
  componentSuffix: 'resistance',
});

registerChance(['vhagar-fiery-bonds-taunt'], {
  probability: {
    kind: 'multiple',
    variants: [
      { label: 'ordinary target', fixed: 0.25 },
      { label: 'Burn-afflicted target', fixed: 0.5 },
    ],
  },
  rollTiming: 'Each round.',
  rollScope: 'unresolved',
  opportunityCount: eachRound(),
  targetCount: 3,
  separatePerTarget: null,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether Taunt uses one group roll or separate rolls per target.',
    'Battle length and temporal independence are unresolved.',
  ],
  componentSuffix: 'taunt',
});

registerChance(['vhagar-skyward-titan-physical'], {
  probability: fixed(
    0.3,
    'Underlying per-round Bulwark-stack chance; the scoring signal activates only after the third successful stack.',
  ),
  rollTiming: 'Each round until the third Bulwark stack is gained.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(
    'Actual opportunities depend on battle length and the five-stack cap.',
  ),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: null,
  independence: 'unknown',
  unresolvedQuestions: [
    'The exact probability of reaching the third stack cannot be calculated without battle length and temporal independence.',
  ],
  componentSuffix: 'third-stack-physical',
  classification: 'probability-present-exact-value-unresolved',
});

registerChance(
  [
    'caraxes-crippling-inferno-slow',
    'caraxes-crippling-inferno-burn',
    'caraxes-crippling-inferno-fire',
  ],
  {
    probability: habit([0.1, 0.12, 0.14, 0.17, 0.2]),
    rollTiming: 'Each round.',
    rollScope: 'separate-per-target-and-effect',
    opportunityCount: eachRound(),
    targetCount: 3,
    separatePerTarget: true,
    separatePerEffect: true,
    durationRounds: 2,
    independence: 'unknown',
    unresolvedQuestions: [
      'Wording confirms separate checks, but statistical independence across targets, effects, and rounds is not stated.',
      'Actual valid-target count and battle length are unresolved.',
    ],
    componentSuffix: 'slow-or-burn',
  },
);

registerChance(['seasmoke-loyal-bond-resistance'], {
  probability: habit([0.1, 0.13, 0.16, 0.2, 0.25]),
  rollTiming: 'Each round for the below-50% Troop Capacity Resistance clause.',
  rollScope: 'unresolved',
  opportunityCount: eachRound(),
  targetCount: 2,
  separatePerTarget: null,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether Resistance uses one group roll or separate rolls for the two targets.',
    'Whether the separate Advantage and Resistance clauses share a roll.',
  ],
  componentSuffix: 'resistance',
});

registerChance(['crimson-bloodscale-terror-stun'], {
  probability: {
    kind: 'round-and-habit',
    fixed: 0.2,
    byHabitLevel: [0.4, 0.52, 0.64, 0.8, 1],
    note: 'At 10 Stars Vermin’s Bane replaces only the Round 1 chance; later odd rounds remain 20%.',
  },
  rollTiming: 'Odd-numbered rounds; the Habit Level value applies only on Round 1 at 10 Stars.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([1, 3, 5, 7, 9]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether Stun checks on separate odd-numbered rounds are independent.'],
  componentSuffix: 'stun',
});

registerChance(['crimson-bloodscale-fury-taunt-payoff'], {
  probability: {
    kind: 'multiple',
    variants: [
      { label: 'ordinary target', byHabitLevel: [0.175, 0.21, 0.245, 0.2975, 0.35] },
      { label: 'Taunted target', byHabitLevel: [0.35, 0.42, 0.49, 0.595, 0.7] },
    ],
  },
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'taunt-conditioned-weakened',
});

registerChance(['kalspire-tactical-strike-bleed'], {
  probability: fixed(0.3),
  rollTiming: 'After each Basic Attack.',
  rollScope: 'separate-per-target',
  opportunityCount: afterBasicAttack(),
  targetCount: 2,
  separatePerTarget: true,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Basic Attack count is unresolved.',
    'Wording confirms separate checks but not statistical independence.',
  ],
  componentSuffix: 'bleed',
});

registerChance(['kalspire-tactical-assault-panic'], {
  probability: habit([0.15, 0.18, 0.21, 0.255, 0.3]),
  rollTiming: 'After each Basic Attack at 6+ Stars.',
  rollScope: 'separate-per-target',
  opportunityCount: afterBasicAttack(),
  targetCount: 2,
  separatePerTarget: true,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Basic Attack count is unresolved.',
    'Wording confirms separate checks but not statistical independence.',
  ],
  componentSuffix: 'panic',
});

registerChance(['malachite-forests-instinct-physical'], {
  probability: fixed(0.35),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 2,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'physical-support',
});

registerChance(['malachite-thunderous-roar-damage'], {
  probability: habit([0.1, 0.12, 0.14, 0.17, 0.2]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 2,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'advantage',
});

registerChance(['malachite-lightning-strike-first-strike', 'malachite-lightning-strike-strength'], {
  probability: habit([0.4, 0.52, 0.64, 0.8, 1]),
  rollTiming: 'Start of Round 1.',
  rollScope: 'single-shared-roll',
  opportunityCount: { kind: 'exact', value: 1 },
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 3,
  independence: 'not-applicable',
  unresolvedQuestions: [
    'First-Strike, Double-Strike, and Strength share one roll and must not receive duplicate relationship credit.',
  ],
  componentSuffix: 'shared-first-strike-double-strike-strength',
});

registerChance(['venator-desperate-ambush-overwhelm'], {
  probability: habit([0.12, 0.156, 0.192, 0.24, 0.3]),
  rollTiming: 'Each round while Venator is strictly below 50% Troop Capacity.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound('Opportunities also depend on the below-50% condition.'),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Battle length, condition duration, and temporal independence are unresolved.',
  ],
  componentSuffix: 'overwhelm',
});

registerChance(['daemoros-shadowflame-burn'], {
  probability: fixed(0.2),
  rollTiming: 'Odd-numbered rounds after the direct Physical attack.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([1, 3, 5, 7, 9]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether Burn checks on separate odd-numbered rounds are independent.'],
  componentSuffix: 'burn',
});

registerChance(['daemoros-instill-fear-panic'], {
  probability: habit([0.25, 0.3, 0.35, 0.425, 0.5]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'panic',
});

registerChance(['daemoros-shroud-of-shadows-confusion'], {
  probability: habit([0.15, 0.18, 0.21, 0.255, 0.3]),
  rollTiming: 'Odd-numbered rounds.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([1, 3, 5, 7, 9]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether Confusion checks on separate odd-numbered rounds are independent.',
  ],
  componentSuffix: 'confusion',
});

registerChance(['feskar-unyielding-grasp-stagger'], {
  probability: habit([0.1, 0.13, 0.16, 0.2, 0.25]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 3,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'stagger',
});

registerChance(['rhysarion-inspiring-melody-resistance', 'rhysarion-inspiring-melody-initiative'], {
  probability: habit([0.2, 0.26, 0.32, 0.4, 0.5]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 3,
  independence: 'unknown',
  unresolvedQuestions: [
    'Initiative and Resistance share one activation and must not be double-discounted.',
    'Battle length and temporal independence are unresolved.',
  ],
  componentSuffix: 'shared-initiative-resistance',
});

registerChance(['shadowsong-blazing-conductor-burn'], {
  probability: {
    kind: 'multiple',
    variants: [
      { label: 'first added target', byHabitLevel: [0.4, 0.52, 0.64, 0.8, 1] },
      { label: 'second distinct added target', byHabitLevel: [0.2, 0.26, 0.32, 0.4, 0.5] },
    ],
  },
  rollTiming: 'Rounds 2, 5, and 8, once for each of two added attacks.',
  rollScope: 'separate-per-target',
  opportunityCount: scheduled(
    [2, 5, 8],
    'Three scheduled activations contain two explicitly independent Burn attempts each.',
  ),
  targetCount: 2,
  separatePerTarget: true,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Attacks are explicitly independent within one round; independence across scheduled rounds is not stated.',
    'The current single signal spans two probability components and should reference both or be split.',
  ],
  componentSuffix: 'two-burn-attempts',
});

registerChance(
  ['shadowsong-scorched-earth-vulnerable', 'shadowsong-scorched-earth-vulnerable-status'],
  {
    probability: {
      kind: 'multiple',
      variants: [
        { label: 'ordinary target', byHabitLevel: [0.1, 0.12, 0.14, 0.17, 0.2] },
        { label: 'Panic-afflicted target', byHabitLevel: [0.2, 0.24, 0.28, 0.34, 0.4] },
      ],
    },
    rollTiming: 'Each round.',
    rollScope: 'unresolved',
    opportunityCount: eachRound(),
    targetCount: 2,
    separatePerTarget: null,
    separatePerEffect: false,
    durationRounds: 2,
    independence: 'unknown',
    unresolvedQuestions: [
      'Whether Vulnerable uses one shared group roll or separate target rolls.',
      'Battle length and temporal independence are unresolved.',
    ],
    componentSuffix: 'vulnerable',
  },
);

registerChance(['vaeldra-lure-taunt'], {
  probability: fixed(0.25),
  rollTiming: 'Each round.',
  rollScope: 'unresolved',
  opportunityCount: eachRound(),
  targetCount: 3,
  separatePerTarget: null,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether Taunt uses one group roll or separate target rolls.',
    'Battle length and temporal independence are unresolved.',
  ],
  componentSuffix: 'taunt',
});

registerChance(['vaeldra-sirens-call-stagger'], {
  probability: habit([0.4, 0.52, 0.64, 0.8, 1]),
  rollTiming: 'Start of rounds 1, 2, and 3; Stagger replaces Taunt for already-Taunted targets.',
  rollScope: 'unresolved',
  opportunityCount: scheduled([1, 2, 3]),
  targetCount: 3,
  separatePerTarget: null,
  separatePerEffect: true,
  durationRounds: 1,
  independence: 'unknown',
  unresolvedQuestions: [
    'Activation-roll scope across targets is unresolved.',
    'Whether checks on separate rounds are independent.',
  ],
  componentSuffix: 'taunt-to-stagger',
});

registerChance(['vaeldra-tempting-distraction-vulnerability'], {
  probability: {
    kind: 'multiple',
    note: 'This deterministic follow-on requires a successful Taunt from one of multiple chance-bearing Vaeldra sources.',
  },
  rollTiming: 'Whenever Vaeldra successfully afflicts an Enemy with Taunt.',
  rollScope: 'unresolved',
  opportunityCount: {
    kind: 'condition-count-dependent',
    note: 'Composite opportunity count depends on successful Lure and Siren’s Call Taunts.',
  },
  targetCount: 1,
  separatePerTarget: null,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'The composite probability across Lure and Siren’s Call cannot be quantified without shared-event identity and independence facts.',
  ],
  componentSuffix: 'successful-taunt-follow-on',
  classification: 'probability-present-exact-value-unresolved',
});

registerChance(['vermax-spreading-blaze-tactical'], {
  probability: fixed(0.2),
  rollTiming: 'After each Basic Attack, repeated once when any Enemy deals Fire Damage.',
  rollScope: 'single-shared-roll',
  opportunityCount: {
    kind: 'ability-activation-dependent',
    note: 'Opportunities depend on Basic Attacks plus a conditional repeat triggered by any Enemy Fire Damage.',
  },
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: null,
  independence: 'unknown',
  unresolvedQuestions: [
    'Basic Attack count, Fire-trigger count, and temporal independence are unresolved.',
  ],
  componentSuffix: 'spreading-blaze-stack',
});

registerChance(['vermax-rallying-flame-tactical'], {
  probability: habit([0.5, 0.6, 0.7, 0.85, 1]),
  rollTiming: 'Start of combat, repeated for each Enemy that deals Fire Damage.',
  rollScope: 'single-shared-roll',
  opportunityCount: {
    kind: 'condition-count-dependent',
    note: 'One base opportunity plus one for each qualifying Enemy; qualifying count is formation-dependent.',
  },
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: null,
  independence: 'unknown',
  unresolvedQuestions: [
    'Number of qualifying Enemies and independence among repeated checks are unresolved.',
    'The allied Spreading Blaze sequence is separate from Vermax’s self Rallying Flame sequence.',
  ],
  componentSuffix: 'allied-spreading-blaze',
});

registerChance(['velar-whirlwind-advantage-damage'], {
  probability: fixed(0.2),
  rollTiming: 'Rounds 2, 4, 6, and 8.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([2, 4, 6, 8]),
  targetCount: 2,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether checks on separate scheduled rounds are statistically independent.',
    'Which two other Allies are selected when more than two are valid is implicit in a three-dragon formation but not a general combat rule.',
  ],
  componentSuffix: 'advantage',
});

registerChance(['velar-gales-of-power-first-strike', 'velar-gales-of-power-slow'], {
  probability: habit([0.12, 0.144, 0.168, 0.204, 0.24]),
  rollTiming: 'Rounds 2, 4, 6, and 8.',
  rollScope: 'separate-per-target-and-effect',
  opportunityCount: scheduled([2, 4, 6, 8]),
  targetCount: 3,
  separatePerTarget: true,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Wording confirms separate checks per target and effect, but not statistical independence.',
    'Actual valid-target count and whether battle reaches all four rounds are unresolved.',
  ],
  componentSuffix: 'first-strike-or-slow',
});

registerChance(['zivern-silent-shade-tactical-vulnerability'], {
  probability: fixed(0.4),
  rollTiming: 'Rounds 1, 4, 6, and 9.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([1, 4, 6, 9]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
  componentSuffix: 'tactical-vulnerability',
});

registerChance(['zivern-fearsome-reach-panic'], {
  probability: habit([0.3, 0.36, 0.42, 0.51, 0.6]),
  rollTiming: 'Odd-numbered rounds.',
  rollScope: 'unresolved',
  opportunityCount: scheduled([1, 3, 5, 7, 9]),
  targetCount: 3,
  separatePerTarget: null,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether Fearsome Reach uses one group roll or separate target rolls.',
    'Whether checks on separate odd-numbered rounds are independent.',
  ],
  componentSuffix: 'panic',
});

registerChance(['zivern-cloak-of-terror-overwhelm', 'zivern-cloak-of-terror-vulnerable-payoff'], {
  probability: {
    kind: 'multiple',
    variants: [
      { label: 'ordinary target', byHabitLevel: [0.1, 0.13, 0.16, 0.2, 0.25] },
      { label: 'Vulnerable target', byHabitLevel: [0.2, 0.26, 0.32, 0.4, 0.5] },
    ],
  },
  rollTiming: 'Odd-numbered rounds.',
  rollScope: 'unresolved',
  opportunityCount: scheduled([1, 3, 5, 7, 9]),
  targetCount: 2,
  separatePerTarget: null,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Whether Cloak of Terror uses one group roll or separate target rolls.',
    'Whether checks on separate odd-numbered rounds are independent.',
  ],
  componentSuffix: 'overwhelm',
});

registerChance(['antares-relentless-pursuit-vulnerable'], {
  probability: fixed(0.2),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'vulnerable',
});

registerChance(['arulix-hypnotic-helix-overwhelm', 'arulix-hypnotic-helix-stagger'], {
  probability: habit([0.125, 0.15, 0.175, 0.213, 0.25]),
  rollTiming: 'Overwhelm on rounds 1, 3, 6, 8; Stagger on rounds 2, 4, 7, 9.',
  rollScope: 'separate-per-effect',
  opportunityCount: scheduled(
    [1, 3, 6, 8],
    'Each signal has four explicit scheduled checks; the two effects use disjoint round schedules.',
  ),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
  componentSuffix: 'overwhelm-or-stagger',
});

registerChance(['arrax-sudden-strike-weakened', 'arrax-sudden-strike-bleed-payoff'], {
  probability: {
    kind: 'multiple',
    variants: [
      { label: 'ordinary target', fixed: 0.25 },
      { label: 'Bleeding target', fixed: 0.5 },
    ],
  },
  rollTiming: 'Rounds 2, 4, 6, and 8.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([2, 4, 6, 8]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: null,
  independence: 'unknown',
  unresolvedQuestions: [
    'Canonical text does not state Weakened duration.',
    'Whether checks on separate scheduled rounds are independent.',
  ],
  componentSuffix: 'weakened',
});

registerChance(['solstryker-oppressive-onslaught-overwhelm'], {
  probability: habit([0.1, 0.12, 0.14, 0.17, 0.2]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'overwhelm',
});

registerChance(['shimmer-unbreakable-loyalty-stats'], {
  probability: fixed(0.3),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Strength and Initiative share one roll and target.',
    'Battle length, tie-breaking, and temporal independence are unresolved.',
  ],
  componentSuffix: 'strength-and-initiative',
});

registerChance(['shimmer-sneak-attack-first-strike', 'shimmer-sneak-attack-physical'], {
  probability: habit([0.14, 0.182, 0.224, 0.28, 0.35]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Physical support and First-Strike share one roll and target.',
    'Battle length, tie-breaking, and temporal independence are unresolved.',
  ],
  componentSuffix: 'physical-and-first-strike',
});

registerChance(['jagadrix-whispering-sabotage-weakened'], {
  probability: habit([0.25, 0.3, 0.35, 0.425, 0.5]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'weakened',
});

registerChance(['jagadrix-cunning-whispers-initiative-payoff'], {
  probability: fixed(0.3),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'The stat-support payoff applies to chance-based enemy reductions, not Jagadrix’s guaranteed Fire attack.',
    'Battle length and temporal independence are unresolved.',
  ],
  componentSuffix: 'enemy-stat-reductions',
});

registerChance(
  [
    'bevlorin-bountiful-gifts-strength',
    'bevlorin-bountiful-gifts-intelligence',
    'bevlorin-bountiful-gifts-instinct',
    'bevlorin-bountiful-gifts-initiative',
  ],
  {
    probability: fixed(0.2),
    rollTiming: 'Each round.',
    rollScope: 'separate-stat-checks',
    opportunityCount: eachRound(),
    targetCount: 1,
    separatePerTarget: null,
    separatePerEffect: true,
    durationRounds: 2,
    independence: 'unknown',
    unresolvedQuestions: [
      'Each stat-target pair has its own check, but statistical independence is not stated.',
      'Tied highest-stat targets produce no current relationship and tie resolution is intentionally unresolved.',
    ],
    componentSuffix: 'independent-stat-buff',
  },
);

registerChance(['shadowrend-eclipse-fervor-panic', 'shadowrend-eclipse-fervor-tactical'], {
  probability: fixed(0.25),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Panic and its recurring Tactical Damage are one underlying activation.',
    'Battle length and temporal independence are unresolved.',
  ],
  componentSuffix: 'panic-and-recurring-tactical',
});

registerChance(['shadowrend-fueled-by-darkness-advantage'], {
  probability: {
    kind: 'multiple',
    variants: [
      { label: 'ordinary rounds', byHabitLevel: [0.1, 0.12, 0.14, 0.17, 0.2] },
      { label: 'Midnight Aura rounds 7–10', byHabitLevel: [0.2, 0.24, 0.28, 0.34, 0.4] },
    ],
  },
  rollTiming: 'Each round, with doubled chance during rounds 7–10.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 2,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Battle length, temporal independence, and two-of-three recipient selection are unresolved.',
  ],
  componentSuffix: 'advantage',
});

registerChance(['thunderstrike-barbed-lash-bleed'], {
  probability: habit([0.25, 0.3, 0.35, 0.425, 0.5]),
  rollTiming: 'Even-numbered rounds after the direct Physical strike.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([2, 4, 6, 8, 10]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether Bleed checks on separate even-numbered rounds are independent.'],
  componentSuffix: 'bleed',
});

registerChance(
  ['thunderstrike-staggering-assault-stagger', 'thunderstrike-staggering-assault-advantage-payoff'],
  {
    probability: habit([0.1, 0.13, 0.16, 0.2, 0.25]),
    rollTiming: 'Each round.',
    rollScope: 'single-shared-roll',
    opportunityCount: eachRound(),
    targetCount: 1,
    separatePerTarget: false,
    separatePerEffect: false,
    durationRounds: 1,
    independence: 'unknown',
    unresolvedQuestions: [
      'Advantage changes duration to two rounds but does not change activation chance.',
      'Battle length and temporal independence are unresolved.',
    ],
    componentSuffix: 'stagger',
  },
);

registerChance(['vesper-eventide-strike-slow'], {
  probability: fixed(0.2),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: true,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
  componentSuffix: 'slow',
});

registerChance(['vesper-saviors-waltz-resistance'], {
  probability: habit([0.125, 0.15, 0.175, 0.2125, 0.25]),
  rollTiming: 'Each round.',
  rollScope: 'single-shared-roll',
  opportunityCount: eachRound(),
  targetCount: 2,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: [
    'Vesper and one adjacent other Ally share one activation.',
    'Battle length, temporal independence, and Vanguard recipient priority are unresolved.',
  ],
  componentSuffix: 'shared-resistance',
});

registerChance(['vesper-midnight-onslaught-confusion'], {
  probability: habit([0.24, 0.312, 0.384, 0.48, 0.6]),
  rollTiming: 'Start of rounds 6, 7, 8, 9, and 10.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([6, 7, 8, 9, 10]),
  targetCount: 1,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 2,
  independence: 'unknown',
  unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
  componentSuffix: 'confusion',
});

registerChance(['dawnseeker-first-light-first-strike'], {
  probability: habit([0.2, 0.26, 0.32, 0.4, 0.5]),
  rollTiming: 'Start of rounds 1, 2, and 3.',
  rollScope: 'single-shared-roll',
  opportunityCount: scheduled([1, 2, 3]),
  targetCount: 2,
  separatePerTarget: false,
  separatePerEffect: false,
  durationRounds: 1,
  independence: 'unknown',
  unresolvedQuestions: [
    'Both other Allies share one activation.',
    'Whether checks on separate scheduled rounds are independent.',
  ],
  componentSuffix: 'shared-first-strike',
});

const mixedBySignalId = new Map<string, MixedSpec>([
  [
    'shadowsong-panic-payoff',
    {
      componentSuffixes: ['panic-damage-payoff', 'panic-vulnerable-chance-payoff'],
      note: 'One signal combines a deterministic damage multiplier with a doubled chance for Scorched Earth.',
      unresolvedQuestions: [
        'The signal must be split or explicitly reference both components before one reliability factor can be applied.',
      ],
    },
  ],
  [
    'shimmer-unbreakable-loyalty-instinct-payoff',
    {
      componentSuffixes: [
        'chance-command-buffs',
        'scheduled-tactical-damage',
        'scheduled-recovery',
      ],
      note: 'One Instinct payoff summarizes chance-based Command buffs plus guaranteed scheduled Tactical Damage and Recovery.',
      unresolvedQuestions: [
        'Whole-signal discounting would incorrectly reduce the guaranteed Tactical Damage and Recovery paths.',
      ],
    },
  ],
  [
    'zivern-battle-mastery-intelligence-payoff',
    {
      componentSuffixes: ['deterministic-battle-mastery', 'chance-fearsome-reach'],
      note: 'One Intelligence payoff spans deterministic Battle Mastery and chance-based Fearsome Reach.',
      unresolvedQuestions: [
        'The deterministic and chance-backed relationships need separate component references.',
      ],
    },
  ],
]);

const guaranteedSignalIds = new Set([
  'antares-blazing-onslaught-fire-vulnerability',
  'antares-blazing-onslaught-non-basic-physical-vulnerability',
  'antares-hunters-wrath-right-stats',
  'antares-relentless-pursuit-fire',
  'arrax-turn-the-line-physical',
  'arrax-warriors-resilience-left-tactical',
  'arulix-battle-cunning-instinct-payoff',
  'bevlorin-champions-vigor-right-damage',
  'bevlorin-natures-reckoning-fire',
  'bevlorin-natures-reckoning-intelligence-payoff',
  'bevlorin-natures-reckoning-physical',
  'bevlorin-natures-reckoning-strength-payoff',
  'bevlorin-renewal-recovery',
  'caraxes-hunters-wrath-right-stats',
  'caraxes-infernal-burst-fire',
  'crimson-bloodscale-terror-fire',
  'crimson-hunters-cunning-right-physical',
  'daemoros-shadowflame-physical',
  'daemoros-warriors-zeal-left-stats',
  'dawnseeker-first-light-stats',
  'dawnseeker-initiative-payoff',
  'dawnseeker-instinct-payoff',
  'dawnseeker-radiant-wings-recovery',
  'dawnseeker-radiant-wings-tactical',
  'dawnseeker-sentinels-presence-left-fire',
  'dawnseeker-tactical-inferno-fire',
  'dawnseeker-tactical-inferno-tactical',
  'dawnseeker-tactical-payoff',
  'dawnseeker-winds-favor-initiative',
  'feskar-calculated-assault-tactical',
  'feskar-insightful-allies-instinct',
  'jagadrix-cunning-whispers-fire',
  'jagadrix-cunning-whispers-intelligence-payoff',
  'jagadrix-echoes-of-deceit-fire',
  'jagadrix-hunters-wrath-right-stats',
  'malachite-collective-might-strength',
  'malachite-sentinels-presence-left-fire',
  'malachite-wardens-rally-recovery',
  'malachite-wardens-rally-tactical',
  'nyrena-fire-payoff',
  'nyrena-initiative-payoff',
  'nyrena-instinct-payoff',
  'nyrena-intelligence-payoff',
  'nyrena-mindful-synergy-stats',
  'nyrena-tactical-payoff',
  'nyrena-undermine-fire',
  'nyrena-undermine-tactical',
  'rhysarion-champions-vigor-right-damage',
  'rhysarion-dawnsong-fire',
  'rhysarion-dawnsong-physical',
  'rhysarion-ebbing-fury-recovery',
  'rhysarion-echoing-melody-recovery',
  'seasmoke-cleansing-wrath-fire',
  'seasmoke-clever-maneuver-stats',
  'seasmoke-cunning-ferocity-fire-intelligence',
  'seasmoke-infectious-wrath-physical',
  'seasmoke-winds-favor-initiative',
  'shadowrend-eclipse-fervor-physical',
  'shadowrend-event-horizon-physical',
  'shadowrend-event-horizon-tactical',
  'shadowrend-initiative-payoff',
  'shadowrend-instinct-payoff',
  'shadowrend-midnight-aura-instinct',
  'shadowrend-midnight-aura-strength',
  'shadowrend-midnight-mastery-physical',
  'shadowrend-midnight-mastery-tactical',
  'shadowrend-strength-payoff',
  'shadowrend-warriors-zeal-left-stats',
  'shadowsong-blazing-onslaught-vulnerability',
  'shadowsong-breath-of-fire-fire',
  'shadowsong-hunters-wrath-right-stats',
  'sheepstealer-hunters-cunning-recovery-payoff',
  'sheepstealer-hunters-cunning-right-physical',
  'sheepstealer-wild-hunt-fire',
  'shimmer-crushing-force-physical',
  'shimmer-crushing-force-tactical',
  'shimmer-loyal-shield-recovery',
  'shimmer-loyal-shield-resistance-payoff',
  'shimmer-sentinels-presence-left-fire',
  'shimmer-unbreakable-loyalty-tactical',
  'solstryker-tactical-onslaught-instinct-payoff',
  'solstryker-tactical-onslaught-strength-payoff',
  'sunfyre-golden-wrath-tactical',
  'sunfyre-radiant-majesty-damage',
  'sunfyre-sentinels-wit-left-stats',
  'syrax-blazing-fury-tactical',
  'syrax-flight-mastery-initiative',
  'syrax-mindful-synergy-stats',
  'syrax-sentinels-wit-left-stats',
  'syrax-strategic-revival-recovery',
  'syrax-tactical-inferno-damage-support',
  'tairax-burning-ward-fire',
  'tairax-hunters-wrath-right-stats',
  'tashix-battle-guile-fire',
  'tashix-dragons-cunning-initiative-payoff',
  'tashix-dragons-cunning-physical',
  'tashix-hunters-cunning-recovery-payoff',
  'tashix-hunters-cunning-right-physical',
  'tashix-shimmering-mirage-fire',
  'tessarion-blazing-leader-fire',
  'tessarion-clever-maneuver-stats',
  'tessarion-cobalt-flame-fire',
  'tessarion-cobalt-flame-physical',
  'thunderstrike-armor-break-physical',
  'thunderstrike-strength-payoff',
  'thunderstrike-warriors-zeal-left-stats',
  'vaeldra-infernal-force-damage',
  'vaeldra-lure-physical',
  'vaeldra-warriors-resilience-left-tactical',
  'velar-breath-of-renewal-recovery',
  'velar-fierce-unity-initiative-payoff',
  'velar-fierce-unity-stats',
  'velar-sentinels-wit-left-stats',
  'velar-strategic-leader-tactical',
  'velar-whirlwind-tactical',
  'venator-armor-break-physical',
  'venator-warriors-zeal-left-stats',
  'vermax-reactive-instincts-stats',
  'vermax-spreading-blaze-physical',
  'vermax-warriors-zeal-left-stats',
  'vesper-eventide-strike-tactical',
  'vesper-insightful-allies-instinct',
  'vesper-instinct-payoff',
  'vesper-sentinels-wit-left-stats',
  'vesper-strategic-leader-tactical',
  'vesper-tactical-payoff',
  'vhagar-battle-leader-physical',
  'vhagar-blazing-onslaught-vulnerability',
  'vhagar-fiery-bonds-physical',
  'vhagar-warriors-resilience-left-tactical',
  'zivern-battle-mastery-physical',
  'zivern-sentinels-wit-left-stats',
  'zivern-silent-shade-tactical',
]);

const conditionalDeterministicSignalIds = new Set([
  'sunfyre-golden-wrath-fire',
  'sunfyre-adaptive-glory-damage',
  'tairax-gleamstrike-fire',
  'tairax-sunder-damage',
  'tairax-sunder-control-payoff',
  'syrax-strategic-revival-slow-payoff',
  'caraxes-infernal-burst-first-strike-payoff',
  'vhagar-fiery-bonds-burn-payoff',
  'seasmoke-infectious-wrath-panic-payoff',
  'crimson-unlikely-hero-vulnerability',
  'kalspire-tactical-strike-tactical',
  'kalspire-tactical-assault-physical',
  'venator-feral-strike-physical',
  'venator-feral-precision-physical',
  'feskar-emerald-inferno-fire',
  'feskar-emerald-inferno-burn-payoff',
  'rhysarion-dawnsong-control-payoff',
  'sheepstealer-savage-claim-recovery',
  'antares-fiery-precision-slow-payoff',
  'arulix-gleaming-spiral-tactical',
  'arulix-gleaming-spiral-physical',
  'arrax-sudden-strike-physical',
  'solstryker-tactical-onslaught-physical',
  'solstryker-tactical-onslaught-tactical',
  'solstryker-tactical-onslaught-vulnerable-payoff',
  'jagadrix-echoes-of-deceit-panic-payoff',
  'thunderstrike-tail-whip-physical',
  'thunderstrike-barbed-lash-physical',
  'nyrena-deepen-the-breach-fire',
]);

const guaranteedAtLeastOneOpportunitySignalIds = new Set([
  'antares-relentless-pursuit-vulnerable',
  'arulix-hypnotic-helix-overwhelm',
  'caraxes-crippling-inferno-burn',
  'caraxes-crippling-inferno-fire',
  'caraxes-crippling-inferno-slow',
  'crimson-bloodscale-fury-taunt-payoff',
  'crimson-bloodscale-terror-stun',
  'daemoros-instill-fear-panic',
  'daemoros-shadowflame-burn',
  'daemoros-shroud-of-shadows-confusion',
  'dawnseeker-first-light-first-strike',
  'feskar-unyielding-grasp-stagger',
  'jagadrix-cunning-whispers-initiative-payoff',
  'jagadrix-whispering-sabotage-weakened',
  'malachite-forests-instinct-physical',
  'malachite-lightning-strike-first-strike',
  'malachite-lightning-strike-strength',
  'malachite-thunderous-roar-damage',
  'rhysarion-inspiring-melody-initiative',
  'rhysarion-inspiring-melody-resistance',
  'shadowrend-eclipse-fervor-panic',
  'shadowrend-eclipse-fervor-tactical',
  'shadowrend-fueled-by-darkness-advantage',
  'shadowsong-scorched-earth-vulnerable',
  'shadowsong-scorched-earth-vulnerable-status',
  'shimmer-sneak-attack-first-strike',
  'shimmer-sneak-attack-physical',
  'shimmer-unbreakable-loyalty-stats',
  'solstryker-oppressive-onslaught-overwhelm',
  'syrax-blazing-fury-fire-support',
  'syrax-blazing-fury-first-strike',
  'tairax-burning-ward-stagger',
  'thunderstrike-staggering-assault-advantage-payoff',
  'thunderstrike-staggering-assault-stagger',
  'vaeldra-lure-taunt',
  'vesper-eventide-strike-slow',
  'vesper-saviors-waltz-resistance',
  'vhagar-fiery-bonds-taunt',
  'zivern-cloak-of-terror-overwhelm',
  'zivern-cloak-of-terror-vulnerable-payoff',
  'zivern-fearsome-reach-panic',
  'zivern-silent-shade-tactical-vulnerability',
]);

const conditionalOpportunitySignalIds = new Set([
  'arrax-sudden-strike-bleed-payoff',
  'arrax-sudden-strike-weakened',
  'arulix-hypnotic-helix-stagger',
  'bevlorin-bountiful-gifts-initiative',
  'bevlorin-bountiful-gifts-instinct',
  'bevlorin-bountiful-gifts-intelligence',
  'bevlorin-bountiful-gifts-strength',
  'kalspire-tactical-assault-panic',
  'kalspire-tactical-strike-bleed',
  'seasmoke-loyal-bond-resistance',
  'shadowsong-blazing-conductor-burn',
  'sunfyre-golden-wrath-burn',
  'syrax-strategic-revival-resistance',
  'tairax-burning-ward-burn',
  'tairax-gift-of-fire-burn-payoff',
  'tairax-gift-of-fire-resistance',
  'thunderstrike-barbed-lash-bleed',
  'vaeldra-sirens-call-stagger',
  'vaeldra-tempting-distraction-vulnerability',
  'velar-gales-of-power-first-strike',
  'velar-gales-of-power-slow',
  'velar-whirlwind-advantage-damage',
  'venator-desperate-ambush-overwhelm',
  'vermax-rallying-flame-tactical',
  'vermax-spreading-blaze-tactical',
  'vesper-midnight-onslaught-confusion',
  'vhagar-skyward-titan-physical',
]);

const unknownOpportunitySignalIds = new Set([
  'shadowsong-panic-payoff',
  'shimmer-unbreakable-loyalty-instinct-payoff',
  'zivern-battle-mastery-intelligence-payoff',
]);

const genericConditionalQuestions = [
  'Activation is deterministic once the documented battle-state or action condition is satisfied.',
  'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
];

export type ExplicitReliabilityFamily =
  'guaranteed' | 'conditional-deterministic' | 'chance-bearing' | 'mixed-guaranteed/chance';

export function getExplicitScoringReliabilityClassifications(): ReadonlyMap<
  string,
  ExplicitReliabilityFamily
> {
  const classifications = new Map<string, ExplicitReliabilityFamily>();
  const add = (signalIds: Iterable<string>, family: ExplicitReliabilityFamily): void => {
    for (const signalId of signalIds) {
      if (classifications.has(signalId)) {
        throw new Error(`Duplicate explicit reliability classification for ${signalId}.`);
      }
      classifications.set(signalId, family);
    }
  };

  add(guaranteedSignalIds, 'guaranteed');
  add(conditionalDeterministicSignalIds, 'conditional-deterministic');
  add(chanceBySignalId.keys(), 'chance-bearing');
  add(mixedBySignalId.keys(), 'mixed-guaranteed/chance');
  return classifications;
}

export function getMissingExplicitReliabilityClassificationIds(
  scoringSignalIds: Iterable<string>,
  classifications: ReadonlyMap<
    string,
    ExplicitReliabilityFamily
  > = getExplicitScoringReliabilityClassifications(),
): string[] {
  return [...new Set(scoringSignalIds)]
    .filter((signalId) => !classifications.has(signalId))
    .sort((left, right) => left.localeCompare(right));
}

export function assertExplicitReliabilityClassificationCoverage(
  scoringSignalIds: Iterable<string>,
  classifications: ReadonlyMap<
    string,
    ExplicitReliabilityFamily
  > = getExplicitScoringReliabilityClassifications(),
): void {
  const missingSignalIds = getMissingExplicitReliabilityClassificationIds(
    scoringSignalIds,
    classifications,
  );
  if (missingSignalIds.length > 0) {
    throw new Error(
      `Scoring signals missing explicit reliability classification: ${missingSignalIds.join(', ')}.`,
    );
  }
}

export function runFormationReliabilityAudit(): FormationReliabilityAuditReport {
  const abilities = abilityMap();
  const classifications = getExplicitScoringReliabilityClassifications();
  const scoringSignalIds = simpleSynergyProfiles.flatMap((profile) =>
    [...profile.outputs, ...profile.supports, ...profile.benefitsFrom]
      .filter((signal) => signal.nonScoring !== true)
      .map((signal) => signal.id),
  );
  const missingProposedReliabilitySignalIds = getMissingExplicitReliabilityClassificationIds(
    scoringSignalIds,
    classifications,
  );
  assertExplicitReliabilityClassificationCoverage(scoringSignalIds, classifications);
  validateOpportunityPresenceRegistry();
  const signals = simpleSynergyProfiles
    .flatMap((profile) => auditProfileSignals(profile, abilities, classifications))
    .sort((left, right) => left.signalId.localeCompare(right.signalId));
  const scoringSignals = signals.filter(
    (signal) => signal.classification !== 'not-applicable-to-activation-reliability',
  );
  const positionClaims = simpleSynergyProfiles
    .flatMap((profile) => profile.positionClaims.map((claim) => auditPositionClaim(profile, claim)))
    .sort((left, right) => left.claimId.localeCompare(right.claimId));
  validateCoverage(signals, scoringSignals);

  const classificationCounts = Object.fromEntries(
    reliabilityClassifications.map((classification) => [
      classification,
      signals.filter((signal) => signal.classification === classification).length,
    ]),
  ) as Record<ReliabilityClassification, number>;
  const chanceBearing = scoringSignals.filter(isChanceBearing);
  const reportWithoutHash = {
    auditContract: FORMATION_RELIABILITY_AUDIT_CONTRACT,
    proposedContract: PROPOSED_FORMATION_RELIABILITY_CONTRACT,
    source: {
      researchBaselineRelease: '0.20.3' as const,
      researchBaselineSha: '010555fd8f79268a60a805e2ed296a8d6cc322fc' as const,
      profileFile: 'src/synergy/profiles.ts' as const,
      canonicalAbilityFiles: ['src/data/dragons.ts', 'src/data/sunfyreTairax.ts'] as [
        'src/data/dragons.ts',
        'src/data/sunfyreTairax.ts',
      ],
    },
    totals: {
      dragons: simpleSynergyProfiles.length,
      curatedSignals: signals.length,
      scoringSignals: scoringSignals.length,
      explicitlyNonScoringSignals: signals.length - scoringSignals.length,
      positionClaims: positionClaims.length,
      guaranteedSignals: classificationCounts.guaranteed,
      conditionalDeterministicSignals: classificationCounts['conditional-deterministic'],
      chanceBearingSignals: chanceBearing.length,
      mixedSignals: classificationCounts['mixed-guaranteed-and-chance-based-ability'],
      signalsWithExplicitProbability: chanceBearing.filter(hasExplicitProbability).length,
      signalsWithHabitLevelProbabilityProgression:
        chanceBearing.filter(hasHabitLevelProbability).length,
      signalsWithKnownOpportunityCount: chanceBearing.filter(
        (signal) => signal.opportunityCount.kind === 'exact',
      ).length,
      signalsWithKnownRollScope: chanceBearing.filter(
        (signal) => signal.rollScope !== 'unresolved' && signal.rollScope !== 'not-applicable',
      ).length,
      signalsWithConfirmedSeparatePerTargetChecks: chanceBearing.filter(
        (signal) => signal.separatePerTarget === true,
      ).length,
      signalsWithUnresolvedOpportunityCount: chanceBearing.filter(
        (signal) =>
          signal.opportunityCount.kind !== 'exact' &&
          signal.opportunityCount.kind !== 'not-applicable',
      ).length,
      signalsWithUnresolvedIndependence: chanceBearing.filter(
        (signal) => signal.independence === 'unknown',
      ).length,
      signalsWithUnknownProbability: chanceBearing.filter(
        (signal) => signal.probability.kind === 'unknown',
      ).length,
      signalsWithCompleteSupportedProbabilityOpportunityScopeAndIndependence: chanceBearing.filter(
        hasCompleteSupportedReliability,
      ).length,
      signalsMissingProposedReliabilityCoverage: missingProposedReliabilitySignalIds.length,
      signalsWithGuaranteedAtLeastOneOpportunity: scoringSignals.filter(
        (signal) => signal.opportunityPresence === 'guaranteed-at-least-one',
      ).length,
      signalsWithConditionalOpportunityPresence: scoringSignals.filter(
        (signal) => signal.opportunityPresence === 'conditional',
      ).length,
      signalsWithUnknownOpportunityPresence: scoringSignals.filter(
        (signal) => signal.opportunityPresence === 'unknown',
      ).length,
      signalsWithNotApplicableOpportunityPresence: scoringSignals.filter(
        (signal) => signal.opportunityPresence === 'not-applicable',
      ).length,
    },
    missingProposedReliabilitySignalIds,
    classificationCounts,
    breakdownByDragon: simpleSynergyProfiles
      .map((profile) => {
        const rows = scoringSignals.filter((signal) => signal.dragonId === profile.dragonId);
        return {
          dragonId: profile.dragonId,
          dragonName: profile.dragonName,
          scoringSignals: rows.length,
          chanceBearingSignals: rows.filter(isChanceBearing).length,
          mixedSignals: rows.filter(
            (signal) => signal.classification === 'mixed-guaranteed-and-chance-based-ability',
          ).length,
          conditionalDeterministicSignals: rows.filter(
            (signal) => signal.classification === 'conditional-deterministic',
          ).length,
          unknownProbabilitySignals: rows.filter((signal) => signal.probability.kind === 'unknown')
            .length,
        };
      })
      .sort((left, right) => left.dragonId.localeCompare(right.dragonId)),
    breakdownBySignalCategory: (['output', 'support', 'benefitsFrom'] as const).map(
      (signalCategory) => {
        const rows = scoringSignals.filter((signal) => signal.signalCategory === signalCategory);
        return {
          signalCategory,
          scoringSignals: rows.length,
          chanceBearingSignals: rows.filter(isChanceBearing).length,
          mixedSignals: rows.filter(
            (signal) => signal.classification === 'mixed-guaranteed-and-chance-based-ability',
          ).length,
        };
      },
    ),
    positionClaims,
    signals,
  };
  return {
    ...reportWithoutHash,
    deterministicHash: createHash('sha256').update(JSON.stringify(reportWithoutHash)).digest('hex'),
  };
}

const reliabilityClassifications: ReliabilityClassification[] = [
  'guaranteed',
  'conditional-deterministic',
  'known-single-opportunity-chance',
  'known-repeated-opportunity-chance',
  'known-chance-with-unresolved-opportunity-count',
  'probability-present-exact-value-unresolved',
  'probability-unknown',
  'mixed-guaranteed-and-chance-based-ability',
  'not-applicable-to-activation-reliability',
];

function abilityMap(): Map<string, AbilityDefinition> {
  return new Map(
    dragons.flatMap((dragon) => {
      const abilities: Array<AbilityDefinition | null> = [
        dragon.command,
        dragon.trait,
        ...dragon.habits,
      ];
      return abilities
        .filter((ability): ability is AbilityDefinition => Boolean(ability))
        .map((ability) => [ability.id, ability] as const);
    }),
  );
}

function auditProfileSignals(
  profile: DragonSynergyProfile,
  abilities: Map<string, AbilityDefinition>,
  classifications: ReadonlyMap<string, ExplicitReliabilityFamily>,
): FormationReliabilityAuditSignal[] {
  return [
    ...profile.outputs.map((signal) =>
      auditSignal(profile, 'output', signal, abilities, classifications),
    ),
    ...profile.supports.map((signal) =>
      auditSignal(profile, 'support', signal, abilities, classifications),
    ),
    ...profile.benefitsFrom.map((signal) =>
      auditSignal(profile, 'benefitsFrom', signal, abilities, classifications),
    ),
  ];
}

function auditSignal(
  profile: DragonSynergyProfile,
  signalCategory: FormationReliabilityAuditSignal['signalCategory'],
  signal: SynergySignal,
  abilities: Map<string, AbilityDefinition>,
  classifications: ReadonlyMap<string, ExplicitReliabilityFamily>,
): FormationReliabilityAuditSignal {
  const ability = abilities.get(signal.abilityId);
  if (!ability) {
    throw new Error(`Reliability audit could not find canonical ability ${signal.abilityId}.`);
  }
  const chance = chanceBySignalId.get(signal.id);
  const mixed = mixedBySignalId.get(signal.id);
  const nonScoring = signal.nonScoring === true;
  const explicitFamily = classifications.get(signal.id);
  if (!nonScoring && !explicitFamily) {
    throw new Error(`Scoring signal ${signal.id} has no explicit reliability classification.`);
  }
  const conditional = explicitFamily === 'conditional-deterministic';
  const classification = nonScoring
    ? 'not-applicable-to-activation-reliability'
    : explicitFamily === 'mixed-guaranteed/chance'
      ? 'mixed-guaranteed-and-chance-based-ability'
      : explicitFamily === 'chance-bearing' && chance
        ? (chance.classification ?? chanceClassification(chance.opportunityCount))
        : explicitFamily === 'conditional-deterministic'
          ? 'conditional-deterministic'
          : explicitFamily === 'guaranteed'
            ? 'guaranteed'
            : (() => {
                throw new Error(
                  `Explicit reliability classification for ${signal.id} has no matching registry data.`,
                );
              })();
  const componentIds = mixed
    ? mixed.componentSuffixes.map((suffix) => `${ability.id}:${suffix}`)
    : [`${chance?.sourceAbilityOverride ?? ability.id}:${chance?.componentSuffix ?? signal.id}`];
  const noProbability: ReliabilityProbability = { kind: 'none' };
  return {
    dragonId: profile.dragonId,
    dragonName: profile.dragonName,
    signalId: signal.id,
    signalCategory,
    tags: [...new Set([signal.tag, ...(signal.tags ?? [])])].sort(),
    sourceAbilityId: ability.id,
    sourceAbilityName: ability.name,
    abilityKind: ability.kind,
    unlockStarRank: signal.unlock?.minimumStarRank ?? ability.unlockStarRank,
    minimumDragonLevel: signal.unlock?.minimumDragonLevel ?? ability.minimumDragonLevel,
    habitLevelDependent: chance
      ? hasHabitLevelProbabilityValue(chance.probability)
      : ability.kind === 'habit',
    currentCuratedDescription: signal.description,
    currentConfidence: signal.confidence,
    currentRelationshipTypesOrValuesAffected: relationshipEffects(signalCategory, signal),
    reliabilityComponentIds: componentIds,
    classification,
    probability:
      chance?.probability ?? (mixed ? { kind: 'multiple', note: mixed.note } : noProbability),
    opportunityPresence:
      nonScoring ||
      explicitFamily === 'guaranteed' ||
      explicitFamily === 'conditional-deterministic'
        ? 'not-applicable'
        : opportunityPresenceForSignal(signal.id),
    rollTiming:
      chance?.rollTiming ??
      (conditional
        ? 'Documented condition or trigger.'
        : 'Deterministic once unlocked and position-valid.'),
    rollScope: chance?.rollScope ?? 'not-applicable',
    opportunityCount:
      chance?.opportunityCount ??
      ({
        kind: 'not-applicable',
      } satisfies ReliabilityOpportunityCount),
    targetCount: chance?.targetCount ?? null,
    separatePerTarget: chance?.separatePerTarget ?? null,
    separatePerEffect: chance?.separatePerEffect ?? null,
    durationRounds: chance?.durationRounds ?? null,
    independence: chance?.independence ?? 'not-applicable',
    canonicalEvidence: {
      abilityRawDescription: ability.rawDescription,
      verificationStatus: ability.verification.status,
      verificationSource: ability.verification.source,
      evidenceIds: [...ability.evidenceIds].sort(),
    },
    unresolvedQuestions: mixed
      ? mixed.unresolvedQuestions
      : chance
        ? chance.unresolvedQuestions
        : conditional
          ? genericConditionalQuestions
          : [],
    coverageStatus: 'covered',
  };
}

function auditPositionClaim(
  profile: DragonSynergyProfile,
  claim: PositionClaim,
): FormationReliabilityAuditPositionClaim {
  return {
    dragonId: profile.dragonId,
    dragonName: profile.dragonName,
    claimId: claim.id,
    sourceAbilityId: claim.abilityId,
    sourceAbilityName: claim.abilityName,
    requiredPosition: claim.requiredPosition,
    unlockStarRank: claim.unlock?.minimumStarRank ?? null,
    minimumDragonLevel: claim.unlock?.minimumDragonLevel ?? null,
    classification: 'not-applicable-to-activation-reliability',
    rationale:
      'The claim gates positional eligibility deterministically; it is not a random activation.',
  };
}

function chanceClassification(
  opportunityCount: ReliabilityOpportunityCount,
): ReliabilityClassification {
  if (opportunityCount.kind === 'exact' && opportunityCount.value === 1) {
    return 'known-single-opportunity-chance';
  }
  if (opportunityCount.kind === 'scheduled-maximum') {
    return 'known-repeated-opportunity-chance';
  }
  return 'known-chance-with-unresolved-opportunity-count';
}

function opportunityPresenceForSignal(signalId: string): OpportunityPresence {
  if (guaranteedAtLeastOneOpportunitySignalIds.has(signalId)) {
    return 'guaranteed-at-least-one';
  }
  if (conditionalOpportunitySignalIds.has(signalId)) {
    return 'conditional';
  }
  if (unknownOpportunitySignalIds.has(signalId)) {
    return 'unknown';
  }
  throw new Error(`Chance-bearing signal ${signalId} has no explicit opportunity presence.`);
}

function validateOpportunityPresenceRegistry(): void {
  const chanceBearingSignalIds = new Set([...chanceBySignalId.keys(), ...mixedBySignalId.keys()]);
  const presenceSignalIds = [
    ...guaranteedAtLeastOneOpportunitySignalIds,
    ...conditionalOpportunitySignalIds,
    ...unknownOpportunitySignalIds,
  ];
  const duplicatePresenceIds = presenceSignalIds
    .filter((signalId, index) => presenceSignalIds.indexOf(signalId) !== index)
    .sort((left, right) => left.localeCompare(right));
  const missingPresenceIds = [...chanceBearingSignalIds]
    .filter((signalId) => !presenceSignalIds.includes(signalId))
    .sort((left, right) => left.localeCompare(right));
  const unknownPresenceIds = presenceSignalIds
    .filter((signalId) => !chanceBearingSignalIds.has(signalId))
    .sort((left, right) => left.localeCompare(right));
  if (duplicatePresenceIds.length || missingPresenceIds.length || unknownPresenceIds.length) {
    throw new Error(
      `Invalid opportunity-presence registry: duplicates [${duplicatePresenceIds.join(', ')}]; ` +
        `missing [${missingPresenceIds.join(', ')}]; unknown [${unknownPresenceIds.join(', ')}].`,
    );
  }
}

function relationshipEffects(
  category: FormationReliabilityAuditSignal['signalCategory'],
  signal: SynergySignal,
): string[] {
  if (signal.nonScoring) {
    return ['none (explicitly non-scoring)'];
  }
  if (category === 'support') {
    const stat = [signal.tag, ...(signal.tags ?? [])].some((tag) => tag.startsWith('stat:'));
    return [stat ? 'stat-support base value 5' : 'output-amplification base value 6'];
  }
  if (category === 'benefitsFrom') {
    return [
      signal.tag.startsWith('stat:')
        ? 'stat-support base value 5 as receiving signal'
        : 'conditional-payoff base value 10 as receiving signal',
    ];
  }
  return [
    'conditional-payoff base value 10 as producing signal when a payoff matches',
    'output-amplification base value 6 or stat-support base value 5 as receiving output',
  ];
}

function isChanceBearing(signal: FormationReliabilityAuditSignal): boolean {
  return (
    signal.classification.includes('chance') ||
    signal.classification === 'probability-present-exact-value-unresolved' ||
    signal.classification === 'probability-unknown' ||
    signal.classification === 'mixed-guaranteed-and-chance-based-ability'
  );
}

function hasExplicitProbability(signal: FormationReliabilityAuditSignal): boolean {
  return hasExplicitProbabilityValue(signal.probability);
}

function hasHabitLevelProbability(signal: FormationReliabilityAuditSignal): boolean {
  return hasHabitLevelProbabilityValue(signal.probability);
}

function hasHabitLevelProbabilityValue(probability: ReliabilityProbability): boolean {
  return Boolean(
    probability.byHabitLevel ??
    probability.variants?.some((variant) => variant.byHabitLevel !== undefined),
  );
}

export function isCompleteSupportedReliabilityEvidence(
  signal: Pick<
    FormationReliabilityAuditSignal,
    'probability' | 'opportunityPresence' | 'opportunityCount' | 'rollScope' | 'independence'
  >,
): boolean {
  const opportunityCount = signal.opportunityCount;
  if (
    !hasExplicitProbabilityValue(signal.probability) ||
    signal.opportunityPresence !== 'guaranteed-at-least-one' ||
    opportunityCount.kind !== 'exact' ||
    opportunityCount.value === undefined ||
    opportunityCount.value < 1 ||
    signal.rollScope === 'unresolved' ||
    signal.rollScope === 'not-applicable'
  ) {
    return false;
  }
  return opportunityCount.value === 1
    ? signal.independence === 'not-applicable'
    : signal.independence === 'confirmed';
}

function hasCompleteSupportedReliability(signal: FormationReliabilityAuditSignal): boolean {
  return isCompleteSupportedReliabilityEvidence(signal);
}

function hasExplicitProbabilityValue(probability: ReliabilityProbability): boolean {
  if (probability.kind === 'fixed' || probability.kind === 'habit-level') {
    return true;
  }
  if (probability.kind === 'round-and-habit') {
    return probability.fixed !== undefined || probability.byHabitLevel !== undefined;
  }
  if (probability.kind === 'multiple') {
    return Boolean(
      probability.variants?.some(
        (variant) => variant.fixed !== undefined || variant.byHabitLevel !== undefined,
      ),
    );
  }
  return false;
}

function validateCoverage(
  signals: FormationReliabilityAuditSignal[],
  scoringSignals: FormationReliabilityAuditSignal[],
): void {
  if (simpleSynergyProfiles.length !== 33) {
    throw new Error(`Expected 33 profiles, found ${simpleSynergyProfiles.length}.`);
  }
  if (signals.length !== 239) {
    throw new Error(`Expected 239 curated signals, found ${signals.length}.`);
  }
  if (scoringSignals.length !== 234) {
    throw new Error(`Expected 234 scoring signals, found ${scoringSignals.length}.`);
  }
  const signalIds = new Set(signals.map((signal) => signal.signalId));
  const unknownExplicitClassificationIds = [
    ...getExplicitScoringReliabilityClassifications().keys(),
  ]
    .filter((id) => !signalIds.has(id))
    .sort((left, right) => left.localeCompare(right));
  if (unknownExplicitClassificationIds.length) {
    throw new Error(
      `Reliability inventory references missing signals: ${unknownExplicitClassificationIds.join(', ')}.`,
    );
  }
  if (new Set(signals.map((signal) => signal.signalId)).size !== signals.length) {
    throw new Error('Reliability inventory contains duplicate signal IDs.');
  }
  if (signals.some((signal) => signal.coverageStatus !== 'covered')) {
    throw new Error('Reliability inventory has uncovered signals.');
  }
}
