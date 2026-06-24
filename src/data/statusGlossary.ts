import type { GlossaryEntry } from '../models/dragon';

export interface StatusGlossaryEntry extends GlossaryEntry {
  id: string;
  verification: 'verified' | 'partially-verified' | 'unresolved';
  unresolvedQuestions: string[];
}

export const statusGlossary: StatusGlossaryEntry[] = [
  {
    id: 'advantage',
    term: 'Advantage',
    definition: 'Increases Damage Dealt. Magnitude may vary by ability.',
    verification: 'partially-verified',
    unresolvedQuestions: [],
  },
  {
    id: 'resistance',
    term: 'Resistance',
    definition: 'Reduces Damage Received. Magnitude and duration are supplied by the source ability.',
    verification: 'verified',
    unresolvedQuestions: ['Stacking and refresh behavior are not yet verified.'],
  },
  {
    id: 'first-strike',
    term: 'First-Strike',
    definition:
      'Target acts before all other combatants each round. Caraxes Infernal Burst separately verifies a First-Strike conditional damage multiplier.',
    verification: 'verified',
    unresolvedQuestions: [],
  },
  {
    id: 'slow',
    term: 'Slow',
    definition: 'Target attacks after all other combatants each round.',
    verification: 'verified',
    unresolvedQuestions: ['Whether Slow interacts with every turn-order modifier before Initiative is not yet modeled.'],
  },
  {
    id: 'burn',
    term: 'Burn',
    definition: 'Deals Fire Damage each round. Verified Burn damage scales with attacker Intelligence and is mitigated by target Initiative.',
    verification: 'verified',
    unresolvedQuestions: ['Stacking, refresh, and overlapping Burn-source behavior are not yet verified.'],
  },
  {
    id: 'control',
    term: 'Control',
    definition: 'Control is a status category that includes Stun, Stagger, Overwhelm, and Confusion.',
    verification: 'verified',
    unresolvedQuestions: ['Whether cleansing one Control also consumes one Negative-effect cleanse slot remains unresolved.'],
  },
  {
    id: 'double-strike',
    term: 'Double-Strike',
    definition: 'Target gains a second Basic Attack each round.',
    verification: 'verified',
    unresolvedQuestions: [],
  },
  {
    id: 'infectious-wrath',
    term: 'Infectious Wrath',
    definition:
      'Reduces Recovery Received per stack. Maximum three stacks. Exact per-stack value depends on Seasmoke Habit Level.',
    verification: 'verified',
    unresolvedQuestions: ['Refresh behavior is unknown.'],
  },
  {
    id: 'panic',
    term: 'Panic',
    definition: 'Referenced by Seasmoke as a conditional damage status.',
    verification: 'unresolved',
    unresolvedQuestions: ['Exact status definition is not supplied.'],
  },
  {
    id: 'prey',
    term: 'Prey',
    definition: "Wild Hunt's mark reduces Recovery Received by 30% for three rounds.",
    verification: 'verified',
    unresolvedQuestions: [],
  },
  {
    id: 'vulnerable',
    term: 'Vulnerable',
    definition: 'Increases Damage Received.',
    verification: 'verified',
    unresolvedQuestions: [],
  },
  {
    id: 'evade',
    term: 'Evade',
    definition: 'Gives each incoming damage instance a chance to be ignored.',
    verification: 'verified',
    unresolvedQuestions: [],
  },
  {
    id: 'stolen-flock',
    term: 'Stolen Flock',
    definition:
      'Increases Sheepstealer Fire Damage Dealt per stack. Maximum 10 stacks. Value depends on Habit Level.',
    verification: 'verified',
    unresolvedQuestions: ['Refresh behavior is unknown.'],
  },
  {
    id: 'rallying-flame',
    term: 'Rallying Flame',
    definition: 'Increases Vermax Physical Damage Dealt by 5% per stack. Maximum four stacks.',
    verification: 'verified',
    unresolvedQuestions: ['Refresh behavior is unknown.'],
  },
  {
    id: 'spreading-blaze',
    term: 'Spreading Blaze',
    definition: 'Increases Tactical Damage Dealt by 2.5% per stack. Maximum 10 stacks.',
    verification: 'verified',
    unresolvedQuestions: ['Refresh behavior is unknown.'],
  },
  {
    id: 'weakened',
    term: 'Weakened',
    definition:
      'Referenced by Vermax. Status ID is normalized to weakened; raw text may preserve in-game spelling.',
    verification: 'unresolved',
    unresolvedQuestions: ['Exact status definition is not supplied.'],
  },
  {
    id: 'positive-effect',
    term: 'Positive Effect',
    definition: 'A beneficial effect that may be removed by Cleanse Positive.',
    verification: 'partially-verified',
    unresolvedQuestions: ['Complete positive-effect taxonomy is not yet verified.'],
  },
  {
    id: 'negative-effect',
    term: 'Negative Effect',
    definition: 'A harmful effect that may be removed by cleanse mechanics. Control effects can also be negative effects depending on the effect.',
    verification: 'partially-verified',
    unresolvedQuestions: ['Complete negative-effect taxonomy is not yet verified.', 'Cleanse overlap between Control and Negative Effect is unresolved.'],
  },
  {
    id: 'cleanse-positive',
    term: 'Cleanse Positive',
    definition: 'Removes one Positive effect from an enemy.',
    verification: 'verified',
    unresolvedQuestions: [],
  },
  {
    id: 'recovery',
    term: 'Recovery',
    definition: 'Restores troops to the target. Recovery may scale with Level or attributes by ability.',
    verification: 'partially-verified',
    unresolvedQuestions: ['Exact formulas are not verified.'],
  },
];
