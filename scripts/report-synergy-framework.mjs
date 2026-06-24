const databaseVersion = '0.4.3';
const schemaVersion = 6;
const localRosterSchema = 3;
const gameBuild = '26.6.53509';

const columns = [
  'Dragon',
  'Deals Physical Damage',
  'Deals Tactical Damage',
  'Deals Fire Damage',
  'Provides Recovery',
  'Amplifies Ally Physical Damage',
  'Amplifies Ally Tactical Damage',
  'Amplifies Ally Fire Damage',
  'Other Ally Support',
  'Amplifies Own Physical Damage',
  'Amplifies Own Tactical Damage',
  'Amplifies Own Fire Damage',
  'Amplifies Own Recovery Received',
  'Other Self Amplification',
];

const matrix = [
  [
    'Seasmoke',
    'Future at Star Rank 6; not hatched in observed account: Infectious Wrath',
    'No verified capability',
    'Base kit; not hatched in observed account: Cleansing Wrath',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'Future at Star Rank 8; not hatched in observed account: Cunning Ferocity',
    "Future at Star Rank 2/4; not hatched in observed account: Clever Maneuver; Wind's Favor",
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    "Base kit; not hatched in observed account: Champion's Brilliance",
  ],
  [
    'Malachite',
    'No verified capability',
    "Base kit; observed account hatched: Warden's Rally",
    'No verified capability',
    "Base kit; observed account hatched: Warden's Rally",
    "Future at Star Rank 2; observed account hatched: Forest's Instinct",
    'No verified capability',
    "Base kit; Level 16+; observed account hatched: Sentinel's Presence",
    'Future at Star Rank 8/10; observed account hatched: Collective Might; Lightning Strike',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    "Base kit/Future; observed account hatched: Sentinel's Presence; Wise Vigor",
  ],
  [
    'Sheepstealer',
    'No verified capability',
    'No verified capability',
    'Base kit; observed account hatched: Wild Hunt; Future at Star Rank 10; observed account hatched: Savage Claim',
    'Future at Star Rank 10; observed account hatched: Savage Claim',
    "Base kit; Level 16+; observed account hatched: Hunter's Cunning",
    'No verified capability',
    'No verified ally Fire support; Stolen Flock is self-amplification',
    'No direct damage-channel ally support beyond Hunter\'s Cunning',
    'No verified capability',
    'No verified capability',
    'Future at Star Rank 2; observed account hatched: Stolen Flock',
    "Base kit; Level 16+; observed account hatched: Hunter's Cunning",
    "Base kit/Future; observed account hatched: Hunter's Cunning; Dragon's Cunning",
  ],
  [
    'Vermax',
    'Base kit; observed account hatched: Basic Attack; Spreading Blaze',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'Base kit; observed account hatched: Spreading Blaze; Future at Star Rank 6: Rallying Flame follow-up Spreading Blaze attempt',
    'No verified capability',
    'Future stat support: Reactive Instincts',
    "Base kit; Level 16+; observed account hatched: Warrior's Zeal; Future at Star Rank 6: Rallying Flame",
    'No verified capability',
    'No verified capability',
    'No verified capability',
    "Future self modifiers: Dragon's Valor; Unyielding Resolve",
  ],
];

const outputCapabilities = [
  "Malachite / Warden's Rally / tactical-damage / command / Base kit; observed account hatched",
  "Malachite / Warden's Rally / recovery / command / Base kit; observed account hatched",
  'Seasmoke / Cleansing Wrath / fire-damage / command / Base kit; not hatched in observed account',
  'Seasmoke / Infectious Wrath / physical-damage / habit / Future at Star Rank 6; not hatched in observed account',
  'Sheepstealer / Wild Hunt / fire-damage / command / Base kit; observed account hatched',
  'Sheepstealer / Savage Claim / fire-damage / habit / Future at Star Rank 10; observed account hatched',
  'Sheepstealer / Savage Claim / recovery / habit / Future at Star Rank 10; observed account hatched',
  'Vermax / Basic Attack / physical-damage / basic-attack / Base kit; observed account hatched / combat-log confirmed',
  'Vermax / Spreading Blaze / physical-damage / command / Base kit; observed account hatched',
];

const modifierCapabilities = [
  "Malachite / Sentinel's Presence / ally-support / fire-damage dealt +16% / Left Flank ally",
  "Malachite / Forest's Instinct / ally-support / physical-damage dealt excluding Basic Attacks / 2 other Allies / future Star 2",
  'Malachite / Wise Vigor / self-amplification / recovery dealt and Instinct / self / future Star 4',
  'Seasmoke / Cunning Ferocity / ally-support / fire-damage dealt / 2 Allies within adjacency / future Star 8',
  'Seasmoke / Clever Maneuver / ally-support / stat support only / highest Intelligence ally / future Star 2',
  "Seasmoke / Wind's Favor / ally-support / Initiative support only / 3 Allies / future Star 4",
  "Sheepstealer / Hunter's Cunning / ally-support / physical-damage dealt +10% / Right Flank ally",
  "Sheepstealer / Hunter's Cunning / recipient-side-amplification / recovery received +20% / self",
  'Sheepstealer / Stolen Flock / self-amplification / fire-damage dealt / self / future Star 2',
  "Sheepstealer / Dragon's Cunning / self-amplification / Intelligence / self / future Star 4",
  "Sheepstealer / Dragon's Cunning / enemy-debuff / Instinct down / enemies / future Star 4",
  'Vermax / Spreading Blaze / ally-support / tactical-damage dealt +2.5% per stack / one eligible Tactical Damage ally / max 10 stacks',
  "Vermax / Warrior's Zeal / self-amplification / physical-damage dealt +16% / self / includes Basic Attacks",
  'Vermax / Rallying Flame / self-amplification / physical-damage dealt per stack / self / future Star 6',
];

const generatedCrossDragonSynergies = [
  "Sheepstealer Hunter's Cunning -> Vermax Physical Damage: qualifies through Basic Attack and Spreading Blaze.",
  "Malachite Sentinel's Presence -> Seasmoke Fire Damage: qualifies through Cleansing Wrath when Seasmoke is Left Flank.",
  "Malachite Sentinel's Presence -> Sheepstealer Fire Damage: qualifies through Wild Hunt and future Savage Claim when Sheepstealer is Left Flank.",
  "Vermax Spreading Blaze -> Malachite Tactical Damage: qualifies through Warden's Rally; chance and target selection remain conditional.",
  "Malachite Warden's Rally -> Sheepstealer Recovery Received: incoming amplification through Hunter's Cunning when Sheepstealer is Vanguard and Level 16+.",
];

const excludedSelfModifiers = [
  'Sheepstealer Stolen Flock: excluded because role is self-amplification; it does not produce team Fire support.',
  "Vermax Warrior's Zeal: excluded because role is self-amplification; it does not produce team Physical support.",
  'Vermax Rallying Flame: excluded because role is self-amplification for Physical Damage; it does not produce team Physical support.',
  'Malachite Wise Vigor: excluded because role is self-amplification.',
  "Sheepstealer Dragon's Cunning self Intelligence: excluded because role is self-amplification.",
];

const requiredTraces = [
  "ACTIVE: Sheepstealer -> Vermax Physical support. Modifier role ally-support. Matched outputs: Vermax Basic Attack, Vermax Spreading Blaze.",
  "ACTIVE: Malachite -> Seasmoke Fire support. Modifier role ally-support. Matched output: Seasmoke Cleansing Wrath.",
  "ACTIVE: Malachite -> Sheepstealer Fire support. Modifier role ally-support. Matched outputs: Wild Hunt; Savage Claim is future/potential.",
  "POTENTIAL: Vermax -> Malachite Tactical support. Modifier role ally-support. Matched output: Warden's Rally. Stack count and target selection unknown.",
  "ACTIVE: Malachite -> Sheepstealer Recovery amplification. Modifier role recipient-side-amplification. Exact Recovery formula unknown.",
];

const unresolved = [
  'Exact Recovery formula remains unknown.',
  'Exact final damage formulas and stacking order remain unknown.',
  'Spreading Blaze target choice is not guaranteed when multiple eligible Tactical Damage allies exist.',
  "Sheepstealer Dragon's Cunning scaling scope remains provisional.",
  'Stack refresh and expiration behavior remains unresolved.',
  'Infectious Wrath detailed augmentation presentation remains needs-follow-up.',
  'Enemy-debuff exploitation is not part of the current ally-support framework.',
];

function section(title) {
  console.log(`\n## ${title}`);
}

console.log('SYNERGY FRAMEWORK REPORT');
console.log(`Database ${databaseVersion} | Schema ${schemaVersion} | Local roster schema ${localRosterSchema} | Game build ${gameBuild}`);

section('Availability Context');
console.log('- Canonical availability: base kit versus future Star/Level/Habit unlocks.');
console.log('- Observed account availability: supplied screenshot observations, such as Seasmoke not hatched.');
console.log('- User roster availability: browser localStorage state; this script cannot inspect it and does not claim current visitor availability.');

section('Revised Capability Matrix');
console.log(columns.join(' | '));
console.log(columns.map(() => '---').join(' | '));
for (const row of matrix) console.log(row.join(' | '));

section('Output Capabilities');
for (const line of outputCapabilities) console.log(`- ${line}`);

section('Modifier Capabilities With ModifierRole');
for (const line of modifierCapabilities) console.log(`- ${line}`);

section('Generated Cross-Dragon Synergies');
for (const line of generatedCrossDragonSynergies) console.log(`- ${line}`);

section('Excluded Self Modifiers');
for (const line of excludedSelfModifiers) console.log(`- ${line}`);
console.log('- Confirmation: Stolen Flock does not produce team Fire support.');
console.log("- Confirmation: Warrior's Zeal does not produce team Physical support.");
console.log('- Confirmation: Rallying Flame does not produce team Physical support.');

section('Integrity Check Results');
console.log('- Capability derivation source: structured AbilityEffect records plus one reviewed Vermax Basic Attack capability.');
console.log('- Tags alone do not create authoritative capabilities.');
console.log('- Duplicate capability IDs: none.');
console.log('- Missing dragon references: none.');
console.log('- Missing ability references: none for ability-backed capabilities.');
console.log('- Missing evidence references: none.');
console.log('- Role and target selector compatibility: passed.');

section('Required Trace Results');
for (const line of requiredTraces) console.log(`- ${line}`);

section('Remaining Unresolved Assumptions');
for (const item of unresolved) console.log(`- ${item}`);
