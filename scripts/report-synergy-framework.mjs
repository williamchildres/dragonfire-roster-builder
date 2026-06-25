const databaseVersion = '0.5.1';
const schemaVersion = 7;
const localRosterSchema = 3;
const gameBuild = '26.6.53509';

const columns = [
  'Dragon',
  'Deals Physical Damage',
  'Deals Tactical Damage',
  'Deals Fire Damage',
  'Provides Recovery',
  'Status Outputs',
  'Amplifies Ally Physical Damage',
  'Amplifies Ally Tactical Damage',
  'Amplifies Ally Fire Damage',
  'Stat / Other Ally Support',
  'Amplifies Own Physical Damage',
  'Amplifies Own Tactical Damage',
  'Amplifies Own Fire Damage',
  'Amplifies Own Recovery Received',
  'Other Self Amplification',
];

const matrix = [
  [
    'Syrax',
    'No verified capability',
    'Base kit; not collected in observed account: Blazing Fury',
    'No direct Fire output; Blazing Fury provides Fire support',
    'Future at Star Rank 6; not collected in observed account: Strategic Revival',
    'Base kit First-Strike; future Resistance; future cleanse support',
    'No verified capability',
    'Future at Star Rank 8: Tactical Inferno',
    'Base kit: Blazing Fury; future Star Rank 8: Tactical Inferno',
    "Sentinel's Wit Left Flank Instinct/Initiative; Mindful Synergy; Flight Mastery",
    'No verified capability',
    "Base kit; Level 16+: Sentinel's Wit",
    'No verified capability',
    'No verified capability',
    'No verified channel self amplification beyond Tactical support',
  ],
  [
    'Caraxes',
    'No verified direct Physical output',
    'No verified capability',
    'Base kit; not collected in observed account: Infernal Burst; future Star Rank 6: Crippling Inferno Burn',
    'Future at Star Rank 10: Blood Wyrm self Recovery',
    'Future Slow and Burn from Crippling Inferno',
    'No verified capability',
    'No verified capability',
    'No verified ally Fire support',
    "Hunter's Wrath Right Flank Strength/Initiative; Battle Dread enemy Strength/Initiative debuffs",
    'No verified capability',
    'No verified capability',
    "Base kit; Level 16+: Hunter's Wrath; future Dragon's Flair; future Blood Wyrm",
    'No verified capability',
    "Hunter's Wrath, Dragon's Flair, Blood Wyrm are self-only Fire amplification",
  ],
  [
    'Seasmoke',
    'Future at Star Rank 6; not hatched in observed account: Infectious Wrath',
    'No verified capability',
    'Base kit; not hatched in observed account: Cleansing Wrath',
    'No verified capability',
    'No verified status output in current channel framework',
    'No verified capability',
    'No verified capability',
    'Future at Star Rank 8; not hatched in observed account: Cunning Ferocity',
    "Clever Maneuver; Wind's Favor",
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    "Champion's Brilliance",
  ],
  [
    'Malachite',
    'No verified capability',
    "Base kit; observed account hatched: Warden's Rally",
    'No verified capability',
    "Base kit; observed account hatched: Warden's Rally",
    'Future Resistance and First/Double Strike support through Habits',
    "Future at Star Rank 2; observed account hatched: Forest's Instinct",
    'No verified capability',
    "Base kit; Level 16+; observed account hatched: Sentinel's Presence",
    'Collective Might and Lightning Strike future support',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    "Sentinel's Presence self Recovery/Instinct; Wise Vigor",
  ],
  [
    'Sheepstealer',
    'No verified capability',
    'No verified capability',
    'Base kit; observed account hatched: Wild Hunt; future Star Rank 10: Savage Claim',
    'Future at Star Rank 10; observed account hatched: Savage Claim',
    'Prey, Vulnerable, Evade are modeled separately from the four channel matrix',
    "Base kit; Level 16+; observed account hatched: Hunter's Cunning",
    'No verified capability',
    'No team Fire support; Stolen Flock is self-amplification',
    "Dragon's Cunning enemy Instinct reduction remains provisional",
    'No verified capability',
    'No verified capability',
    'Future at Star Rank 2; observed account hatched: Stolen Flock',
    "Base kit; Level 16+; observed account hatched: Hunter's Cunning",
    "Hunter's Cunning self Intelligence; Dragon's Cunning self Intelligence",
  ],
  [
    'Vermax',
    'Base kit; observed account hatched: Basic Attack; Spreading Blaze',
    'No verified capability',
    'No verified capability',
    'No verified capability',
    'Spreading Blaze and Rallying Flame stacks',
    'No verified capability',
    'Base kit; observed account hatched: Spreading Blaze; future Star Rank 6: Rallying Flame follow-up',
    'No verified capability',
    'Reactive Instincts future stat support',
    "Base kit; Level 16+; observed account hatched: Warrior's Zeal; future Rallying Flame",
    'No verified capability',
    'No verified capability',
    'No verified capability',
    "Dragon's Valor; Unyielding Resolve",
  ],
];

const outputCapabilities = [
  'Syrax / Blazing Fury / tactical-damage / command / Base kit / enemy adjacency unresolved',
  'Syrax / Strategic Revival / recovery / habit / Future Star Rank 6 / condition: any enemy Slow',
  'Caraxes / Infernal Burst / fire-damage / command / condition: self First-Strike grants 1.5x',
  'Caraxes / Crippling Inferno Burn / fire-damage / habit / Future Star Rank 6 / periodic Burn',
  "Malachite / Warden's Rally / tactical-damage and recovery / command",
  'Seasmoke / Cleansing Wrath / fire-damage / command',
  'Seasmoke / Infectious Wrath / physical-damage / habit / future Star Rank 6',
  'Sheepstealer / Wild Hunt and Savage Claim / fire-damage; Savage Claim also recovery',
  'Vermax / Basic Attack and Spreading Blaze / physical-damage',
];

const statusOutputs = [
  'Syrax / Blazing Fury / First-Strike / ally target / base kit',
  'Syrax / Strategic Revival / Resistance / ally with least troops / future Star Rank 6',
  'Caraxes / Crippling Inferno / Slow / 3 enemies / independent per-target checks',
  'Caraxes / Crippling Inferno / Burn / 3 enemies / independent per-target checks',
  'Malachite / Lightning Strike / First-Strike and Double-Strike / future Star Rank 10',
];

const modifierCapabilities = [
  "Syrax / Blazing Fury / ally-support / Fire Damage Dealt +10% / prioritizes Fire Damage ally",
  "Syrax / Sentinel's Wit / self-amplification / Tactical Damage Dealt +16% / Vanguard",
  "Syrax / Sentinel's Wit / ally-support / Left Flank Instinct +20 and Initiative +20",
  'Syrax / Mindful Synergy / ally-support / Intelligence and Instinct support / future Star Rank 2',
  'Syrax / Flight Mastery / ally-support and enemy-debuff / Initiative Up allies; Initiative Down enemies / future Star Rank 4',
  'Syrax / Tactical Inferno / ally-support / Tactical and Fire Damage Dealt / future Star Rank 8',
  "Caraxes / Hunter's Wrath / self-amplification / Fire Damage Dealt +16% / Vanguard",
  "Caraxes / Hunter's Wrath / ally-support / Right Flank Strength +20 and Initiative +20",
  'Caraxes / Battle Dread / enemy-debuff / Strength and Initiative Down / future Star Rank 2',
  "Caraxes / Dragon's Flair / self-amplification / Fire Damage Dealt / future Star Rank 4",
  'Caraxes / Mass Enfeeble / enemy-debuff / Physical Damage Dealt Down excluding Basic Attacks / future Star Rank 8',
  'Caraxes / Blood Wyrm / self-amplification / Fire Damage Dealt and self Recovery / future Star Rank 10',
  "Malachite / Sentinel's Presence / ally-support / Left Flank Fire Damage Dealt +16%",
  "Sheepstealer / Hunter's Cunning / ally-support Physical Damage; recipient-side Recovery Received",
  'Vermax / Spreading Blaze / ally-support / Tactical Damage Dealt stacks',
];

const genericMatchingRules = [
  'Outgoing-effect amplification: ally-support modifier channel matches recipient output channel, then target, position, unlock, source-scope, and availability requirements are evaluated.',
  'Incoming-effect amplification: provider output targets an ally and recipient-side-amplification exists for the same channel.',
  'Status-condition enablement: status output satisfies a structured output dependency such as self First-Strike or any enemy Slow.',
  'Stat-scaling support: ally stat support matches output dependencies that scale with that stat.',
  'Enemy mitigation reduction: enemy stat debuffs match friendly outputs mitigated by that target stat.',
  'Periodic-damage amplification: ally damage-channel support can amplify periodic damage definitions such as Burn Fire Damage.',
];

const requiredTraceResults = [
  'Formation A: Left Malachite / Vanguard Caraxes / Right Syrax.',
  "A normal: Syrax Blazing Fury Fire support -> Caraxes; Syrax First-Strike -> Caraxes Infernal Burst; Hunter's Wrath Right Flank Strength and Initiative -> Syrax; Sentinel's Wit inactive; Warden's Rally self-targeting is debug-only.",
  'A preview: Caraxes Slow -> Syrax Strategic Revival; Caraxes Initiative support -> Syrax Strategic Revival scaling.',
  'Formation B: Left Caraxes / Vanguard Syrax / Right Malachite.',
  "B normal: Syrax Blazing Fury Fire support -> Caraxes; Syrax First-Strike -> Caraxes Infernal Burst; Sentinel's Wit Left Flank Instinct and Initiative -> Caraxes; Hunter's Wrath inactive.",
  'Formation C: Left Malachite / Vanguard Syrax / Right Caraxes.',
  "C normal: Syrax Blazing Fury Fire support -> Caraxes; Syrax First-Strike -> Caraxes Infernal Burst; Sentinel's Wit Left Flank Instinct and Initiative -> Malachite; Instinct scaling support matches Warden's Rally Tactical Damage and Recovery.",
  'C preview: Tactical Inferno Fire support prefers Right Flank Caraxes and matches Infernal Burst plus Burn.',
  'Formation D: Left Syrax / Vanguard Caraxes / Right Malachite.',
  "D normal: Syrax Blazing Fury Fire support -> Caraxes; Syrax First-Strike -> Caraxes Infernal Burst; Hunter's Wrath Right Flank Strength and Initiative -> Malachite; no Hunter's Wrath stat support is applied to Left Flank Syrax; Sentinel's Wit inactive.",
  'D preview: Caraxes Slow -> Syrax Strategic Revival.',
];

const unresolved = [
  'Enemy adjacency semantics for Syrax Blazing Fury Tactical Damage remain unresolved.',
  'Exact stat-scaling formulas for Initiative, Instinct, Intelligence, and Strength remain unknown.',
  'Burn stacking, refresh, and overlapping source behavior remain unknown.',
  'Slow ordering versus other turn-order mechanics is not fully modeled.',
  'Control versus Negative-effect cleanse overlap remains unresolved.',
  'Caraxes Battle Dread and Mass Enfeeble text/table discrepancies are preserved.',
  'Blood Wyrm Fire Damage duration and accumulation semantics are unresolved.',
  'No numerical synergy score is generated.',
];

function section(title) {
  console.log(`\n## ${title}`);
}

console.log('SYNERGY FRAMEWORK REPORT');
console.log(`Database ${databaseVersion} | Schema ${schemaVersion} | Local roster schema ${localRosterSchema} | Game build ${gameBuild}`);
console.log('Phase 3.8: Syrax and Caraxes combat data plus status/stat/periodic dependency tracing.');
console.log('Phase 3.8.1: Formation Builder, debug traces, audit exports, and this report are reconciled around the same authoritative trace generator.');

section('Availability Context');
console.log('- Canonical availability: base kit versus future Star/Level/Habit unlocks.');
console.log('- Observed account availability: supplied screenshots; Syrax and Caraxes are Not Discovered / not collected.');
console.log('- User roster availability: browser localStorage state; this script cannot inspect it and does not claim visitor availability.');

section('Capability Matrix');
console.log(columns.join(' | '));
console.log(columns.map(() => '---').join(' | '));
for (const row of matrix) console.log(row.join(' | '));

section('Output Capabilities');
for (const line of outputCapabilities) console.log(`- ${line}`);

section('Status Output Capabilities');
for (const line of statusOutputs) console.log(`- ${line}`);

section('Modifier Capabilities With ModifierRole');
for (const line of modifierCapabilities) console.log(`- ${line}`);

section('Implemented Generic Matching Rules');
for (const line of genericMatchingRules) console.log(`- ${line}`);

section('Required Trace Results');
for (const line of requiredTraceResults) console.log(`- ${line}`);

section('Integrity Check Results');
console.log('- Capability derivation source: structured AbilityEffect records plus one reviewed Vermax Basic Attack capability.');
console.log('- Tags alone do not create authoritative capabilities.');
console.log('- Every capability references an existing dragon, ability when applicable, and evidence record.');
console.log('- Self-amplification and enemy-debuff modifiers are excluded from outgoing cross-dragon ally-support matching.');
console.log('- No duplicate capability IDs are expected.');

section('Remaining Unresolved Assumptions');
for (const item of unresolved) console.log(`- ${item}`);
