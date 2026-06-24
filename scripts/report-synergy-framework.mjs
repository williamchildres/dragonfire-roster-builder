const databaseVersion = '0.4.2';
const schemaVersion = 5;
const gameBuild = '26.6.53509';

const matrix = [
  ['Seasmoke', 'Future: Infectious Wrath', 'No verified capability', 'Current: Cleansing Wrath', 'No verified capability', 'No verified capability', 'No verified capability', 'Future: Cunning Ferocity', 'No verified capability'],
  ['Malachite', 'No verified capability', "Current: Warden's Rally", 'No verified capability', "Current: Warden's Rally", "Future: Forest's Instinct", 'No verified capability', "Current: Sentinel's Presence", 'No verified capability'],
  ['Sheepstealer', 'No verified capability', 'No verified capability', 'Current: Wild Hunt; Future: Savage Claim', 'Future: Savage Claim', "Current: Hunter's Cunning", 'No verified capability', 'Future: Stolen Flock', "Current: Hunter's Cunning"],
  ['Vermax', 'Current: Basic Attack; Current: Spreading Blaze', 'No verified capability', 'No verified capability', 'No verified capability', "Current: Warrior's Zeal", 'Current conditional: Spreading Blaze', 'No verified capability', 'No verified capability'],
];

const columns = [
  'Dragon',
  'Deals Physical Damage',
  'Deals Tactical Damage',
  'Deals Fire Damage',
  'Provides Recovery',
  'Buffs Physical Damage Dealt',
  'Buffs Tactical Damage Dealt',
  'Buffs Fire Damage Dealt',
  'Buffs Recovery Received',
];

const outputCapabilities = [
  "Malachite / Warden's Rally / tactical-damage / command / current",
  "Malachite / Warden's Rally / recovery / command / current",
  'Seasmoke / Cleansing Wrath / fire-damage / command / current',
  'Seasmoke / Infectious Wrath / physical-damage / habit / future',
  'Sheepstealer / Wild Hunt / fire-damage / command / current',
  'Sheepstealer / Savage Claim / fire-damage / habit / future',
  'Sheepstealer / Savage Claim / recovery / habit / future',
  'Vermax / Basic Attack / physical-damage / basic-attack / current / combat-log confirmed',
  'Vermax / Spreading Blaze / physical-damage / command / current',
];

const modifierCapabilities = [
  "Malachite / Sentinel's Presence / fire-damage dealt +16% / Left Flank ally / requires Malachite Vanguard",
  "Malachite / Forest's Instinct / physical-damage dealt / non-basic-attacks / future Habit",
  'Seasmoke / Cunning Ferocity / fire-damage dealt / within adjacency / future Habit',
  "Sheepstealer / Hunter's Cunning / physical-damage dealt +10% / Right Flank ally / requires Sheepstealer Vanguard and Level 16+",
  "Sheepstealer / Hunter's Cunning / recovery received +20% / self / requires Sheepstealer Vanguard and Level 16+",
  'Vermax / Spreading Blaze / tactical-damage dealt +2.5% per stack / one eligible Tactical Damage ally / maximum 10 stacks / chance and selection dependent',
  "Vermax / Warrior's Zeal / physical-damage dealt +16% / self / all qualifying Physical Damage sources",
];

const formations = [
  { name: 'Formation A', positions: 'Left Flank Malachite | Vanguard Sheepstealer | Right Flank Vermax', traces: [
    "ACTIVE incoming amplification: Malachite Warden's Rally Recovery -> Sheepstealer Hunter's Cunning Recovery Received +20%. Exact Recovery formula unknown.",
    "ACTIVE outgoing amplification: Sheepstealer Hunter's Cunning Physical Damage -> Vermax. Qualifying outputs: Basic Attack, Spreading Blaze.",
    "INACTIVE placement trace: Malachite Sentinel's Presence inactive because Malachite is not Vanguard.",
  ] },
  { name: 'Formation B', positions: 'Left Flank Sheepstealer | Vanguard Malachite | Right Flank Vermax', traces: [
    "ACTIVE outgoing amplification: Malachite Sentinel's Presence Fire Damage -> Sheepstealer. Qualifying outputs: Wild Hunt; Savage Claim is future/potential.",
    "INACTIVE placement trace: Sheepstealer Hunter's Cunning inactive because Sheepstealer is not Vanguard.",
    'NO ACTIVE MATCH: Sheepstealer Physical Damage support does not apply to Vermax because Sheepstealer is not Vanguard.',
  ] },
  { name: 'Formation C', positions: 'Left Flank Malachite | Vanguard Vermax | Right Flank Seasmoke', traces: [
    "POTENTIAL outgoing amplification: Vermax Spreading Blaze Tactical Damage stacks -> Malachite Warden's Rally Tactical Damage.",
    "ACTIVE trait trace: Vermax Warrior's Zeal applies Instinct and Initiative to Left Flank Malachite.",
    'CONDITIONAL: Spreading Blaze trigger and target selection are not guaranteed.',
  ] },
  { name: 'Formation D', positions: 'Left Flank Seasmoke | Vanguard Malachite | Right Flank Sheepstealer', traces: [
    "ACTIVE outgoing amplification: Malachite Sentinel's Presence Fire Damage -> Seasmoke. Qualifying output: Cleansing Wrath.",
    'INACTIVE/NO MATCH: Malachite Fire support does not apply to Sheepstealer in Right Flank.',
    'QUALIFYING OUTPUT: Seasmoke Cleansing Wrath Fire Damage.',
  ] },
];

const unresolved = [
  'Exact Recovery formula remains unknown.',
  'Exact final damage formulas and stacking order remain unknown.',
  'Spreading Blaze target choice is not guaranteed when multiple eligible Tactical Damage allies exist.',
  "Sheepstealer Dragon's Cunning scaling scope remains provisional.",
  'Stack refresh and expiration behavior remains unresolved.',
  'Infectious Wrath detailed augmentation presentation remains needs-follow-up.',
];

function section(title) {
  console.log(`\n## ${title}`);
}

console.log('SYNERGY FRAMEWORK REPORT');
console.log(`Database ${databaseVersion} | Schema ${schemaVersion} | Game build ${gameBuild}`);

section('Capability Matrix');
console.log(columns.join(' | '));
console.log(columns.map(() => '---').join(' | '));
for (const row of matrix) {
  console.log(row.join(' | '));
}

section('Output Capabilities');
for (const line of outputCapabilities) console.log(`- ${line}`);

section('Modifier Capabilities');
for (const line of modifierCapabilities) console.log(`- ${line}`);

section('Generated Amplification Rules');
console.log('- outgoing-effect-amplification: dealt modifier + recipient output capability in same channel + compatible source scope + satisfied targeting/position/unlock requirements.');
console.log('- incoming-effect-amplification: ally/self output provider + recipient received modifier in same channel + provider targeting includes recipient + recipient modifier requirements.');

section('Required Formation Traces');
for (const formation of formations) {
  console.log(`\n${formation.name}: ${formation.positions}`);
  for (const trace of formation.traces) console.log(`- ${trace}`);
}

section('Inactive And Potential Reasons');
console.log('- Locked Habit capabilities are future/potential, not active for the current roster.');
console.log('- Position-targeted support is inactive when provider or recipient position requirements are not met.');
console.log('- Chance/selection-dependent modifiers such as Spreading Blaze are potential even when capability eligibility is active.');

section('Duplicate Or Overlapping Capability Warnings');
console.log('- None currently detected by review; multiple outputs in the same channel are retained and aggregated by recipient.');

section('Capabilities With Missing Source Scope');
console.log('- None for current reviewed outgoing damage modifiers.');

section('Capabilities With Missing Position Semantics');
console.log('- None for current reviewed position-dependent support effects.');

section('Remaining Unresolved Assumptions');
for (const item of unresolved) console.log(`- ${item}`);
