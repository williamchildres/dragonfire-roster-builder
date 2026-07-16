import type { GlossaryEntry } from '../models/dragon';

export interface StatusGlossaryEntry extends GlossaryEntry {
  id: string;
  verification: 'verified' | 'partially-verified' | 'unresolved';
}

export const statusGlossary: StatusGlossaryEntry[] = [
  {
    id: 'advantage',
    term: 'Advantage',
    definition: 'Increases Damage Dealt. Magnitude may vary by ability.',
    verification: 'partially-verified',
  },
  {
    id: 'resistance',
    term: 'Resistance',
    definition: 'Reduces Damage Received. Magnitude and duration are supplied by the source ability.',
    verification: 'verified',
  },
  {
    id: 'first-strike',
    term: 'First-Strike',
    definition:
      'Target acts before all other combatants each round. Caraxes Infernal Burst separately verifies a First-Strike conditional damage multiplier.',
    verification: 'verified',
  },
  {
    id: 'slow',
    term: 'Slow',
    definition: 'Target attacks after all other combatants each round.',
    verification: 'verified',
  },
  {
    id: 'burn',
    term: 'Burn',
    definition: 'Deals Fire Damage each round. Verified Burn damage scales with attacker Intelligence and is mitigated by target Initiative.',
    verification: 'verified',
  },
  {
    id: 'control',
    term: 'Control',
    definition: 'Control is a status category that includes Stun, Stagger, Overwhelm, and Confusion.',
    verification: 'verified',
  },
  {
    id: 'double-strike',
    term: 'Double-Strike',
    definition: 'Target gains a second Basic Attack each round.',
    verification: 'verified',
  },
  {
    id: 'infectious-wrath',
    term: 'Infectious Wrath',
    definition:
      'Reduces Recovery Received per stack. Maximum three stacks. Exact per-stack value depends on Seasmoke Habit Level.',
    verification: 'verified',
  },
  {
    id: 'panic',
    term: 'Panic',
    definition: 'Deals periodic Tactical Damage each round. Kalspire verifies +20% Damage Rate and two-round duration for its Panic source.',
    verification: 'partially-verified',
  },
  {
    id: 'bleed',
    term: 'Bleed',
    definition: 'Deals periodic Physical Damage each round. Kalspire verifies +20% Damage Rate and two-round duration for its Bleed source.',
    verification: 'partially-verified',
  },
  {
    id: 'stun',
    term: 'Stun',
    definition: 'Prevents the target from activating Commands, activating Habits, and launching Basic Attacks on its turn.',
    verification: 'verified',
  },
  {
    id: 'taunt',
    term: 'Taunt',
    definition: 'Forces the target to launch its Basic Attack against the dragon that applied Taunt.',
    verification: 'verified',
  },
  {
    id: 'stagger',
    term: 'Stagger',
    definition: 'Control status that prevents Attack Modifier Commands and Basic Attacks on the target turn. It does not automatically block all Commands or Habits.',
    verification: 'verified',
  },
  {
    id: 'confusion',
    term: 'Confusion',
    definition: 'Control status: affected Command, Habit, and Basic Attack actions have a 50% chance to mistake allies and enemies.',
    verification: 'verified',
  },
  {
    id: 'overwhelm',
    term: 'Overwhelm',
    definition: 'Prevents Active Commands and Habits. It does not prevent Basic Attacks.',
    verification: 'verified',
  },
  {
    id: 'steady-erosion',
    term: 'Steady Erosion',
    definition:
      'Solstryker applies one stack each round to all enemies, up to 10 stacks. Each stack reduces Strength until end of combat; exact enhancement and removal behavior remain unresolved.',
    verification: 'verified',
  },
  {
    id: 'nullify-recovery',
    term: 'Nullify Recovery',
    definition:
      "Prevents the affected target from receiving Recovery. Jagadrix applies it to self after Second Wind's immediate Recovery resolves.",
    verification: 'verified',
  },
  {
    id: 'bulwark',
    term: 'Bulwark',
    definition: 'Stack status. Vhagar verifies a maximum of five stacks that last until end of combat, with per-stack Strength increase and Physical/Tactical Damage Received reduction.',
    verification: 'verified',
  },
  {
    id: 'prey',
    term: 'Prey',
    definition: "Wild Hunt's mark reduces Recovery Received by 30% for three rounds.",
    verification: 'verified',
  },
  {
    id: 'vulnerable',
    term: 'Vulnerable',
    definition: 'Increases Damage Received.',
    verification: 'verified',
  },
  {
    id: 'mirage',
    term: 'Mirage',
    definition:
      'Stack status used by Tashix. Each stack increases Tashix Fire Damage Dealt by 2.5%. Maximum 10 stacks.',
    verification: 'verified',
  },
  {
    id: 'evade',
    term: 'Evade',
    definition: 'Gives each incoming damage instance a chance to be ignored.',
    verification: 'verified',
  },
  {
    id: 'stolen-flock',
    term: 'Stolen Flock',
    definition:
      'Increases Sheepstealer Fire Damage Dealt per stack. Maximum 10 stacks. Value depends on Habit Level.',
    verification: 'verified',
  },
  {
    id: 'rallying-flame',
    term: 'Rallying Flame',
    definition: 'Increases Vermax Physical Damage Dealt by 5% per stack. Maximum four stacks.',
    verification: 'verified',
  },
  {
    id: 'spreading-blaze',
    term: 'Spreading Blaze',
    definition: 'Increases Tactical Damage Dealt by 2.5% per stack. Maximum 10 stacks.',
    verification: 'verified',
  },
  {
    id: 'weakened',
    term: 'Weakened',
    definition:
      'Reduces Damage Dealt. Crimson and Vhagar verify a 20% value for their Weakened sources.',
    verification: 'verified',
  },
  {
    id: 'positive-effect',
    term: 'Positive Effect',
    definition: 'A beneficial effect that may be removed by Cleanse Positive.',
    verification: 'partially-verified',
  },
  {
    id: 'negative-effect',
    term: 'Negative Effect',
    definition: 'A harmful effect that may be removed by cleanse mechanics. Control effects can also be negative effects depending on the effect.',
    verification: 'partially-verified',
  },
  {
    id: 'cleanse-positive',
    term: 'Cleanse Positive',
    definition: 'Removes one Positive effect from an enemy.',
    verification: 'verified',
  },
  {
    id: 'recovery',
    term: 'Recovery',
    definition: 'Restores troops to the target. Recovery may scale with Level or attributes by ability.',
    verification: 'partially-verified',
  },
];
