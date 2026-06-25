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
    definition: 'Deals periodic Tactical Damage each round. Kalspire verifies +20% Damage Rate and two-round duration for its Panic source.',
    verification: 'partially-verified',
    unresolvedQuestions: ['Periodic status first-tick, refresh, stacking, and overlapping-source behavior are not yet verified.'],
  },
  {
    id: 'bleed',
    term: 'Bleed',
    definition: 'Deals periodic Physical Damage each round. Kalspire verifies +20% Damage Rate and two-round duration for its Bleed source.',
    verification: 'partially-verified',
    unresolvedQuestions: ['Periodic status first-tick, refresh, stacking, and overlapping-source behavior are not yet verified.'],
  },
  {
    id: 'stun',
    term: 'Stun',
    definition: 'Prevents the target from activating Commands, activating Habits, and launching Basic Attacks on its turn.',
    verification: 'verified',
    unresolvedQuestions: ['Exact action-denial ordering within a round is not simulated.'],
  },
  {
    id: 'taunt',
    term: 'Taunt',
    definition: 'Forces the target to launch its Basic Attack against the dragon that applied Taunt.',
    verification: 'verified',
    unresolvedQuestions: ['Taunt retargeting order relative to other targeting effects is not yet combat-log verified.'],
  },
  {
    id: 'overwhelm',
    term: 'Overwhelm',
    definition: 'Prevents Active Commands and Habits. It does not prevent Basic Attacks.',
    verification: 'verified',
    unresolvedQuestions: ['Exact action-denial ordering within a round is not simulated.'],
  },
  {
    id: 'bulwark',
    term: 'Bulwark',
    definition: 'Stack status. Vhagar verifies a maximum of five stacks that last until end of combat, with per-stack Strength increase and Physical/Tactical Damage Received reduction.',
    verification: 'verified',
    unresolvedQuestions: ['Bulwark stack acquisition timing and third-stack trigger ordering remain unresolved.'],
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
      'Reduces Damage Dealt. Crimson and Vhagar verify a 20% value for their Weakened sources.',
    verification: 'verified',
    unresolvedQuestions: ['Stacking and refresh behavior are not yet verified.'],
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
