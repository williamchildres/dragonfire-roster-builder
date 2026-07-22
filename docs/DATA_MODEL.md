# Data Model

Dragonfire Roster Lab stores curated source data for display and simple formation recommendations. It does not store a combat execution model.

## Dragon Records

A dragon record contains identity, roster-source status, verification metadata, optional official URL, affinities, optional account observations, and three ability groups:

- `command`
- `trait`
- `habits`

Metadata-only dragons have no Command, Trait, or Habit records and remain neutral in the Formation Builder until curated.

## Ability Definition

Canonical abilities use this minimal descriptive shape:

```ts
interface AbilityDefinition {
  id: string;
  dragonId: string;
  kind: 'command' | 'trait' | 'habit';
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
```

Raw descriptions preserve the verified player-facing wording, including natural references to rounds, chances, durations, target wording, and percentages. Those words are not parsed into battle execution structures.

## Removed Execution Model

The source data intentionally does not contain schedules, trigger rolls, attempts, repeat modes, target-priority selectors, target groups, per-target checks, battle contexts, effect branches, periodic tick structures, stack transitions, structured damage/recovery/stat modifier objects, ranked execution values, command-augmentation execution records, capability dependencies, traces, expected interactions, or unresolved-mechanics exports.

## Simple Synergy Data

Formation recommendations come from `src/synergy`:

- `profiles.ts` records curated high-level outputs, supports, benefits, and position claims.
- `profileAudit.ts` gives every detailed ability exactly one disposition.
- `evaluateFormation.ts` applies progression, adjacency, hard recipient positions, position conflicts, missing enablers, future unlocks, and duplicate aggregation.

Exact timing, rolls, target overlap, stacks, and damage simulation are not modeled.

## Persistence

The local roster schema remains separate from source data. Schema `5` stores a simplified roster state: `owned` means Owned / Hatched, with Star Rank, Dragon Level, sparse Habit Levels, notes, and saved formations preserved. `habitLevels` contains only canonical habits whose `unlockStarRank` and `minimumDragonLevel` requirements are both satisfied, and every stored value is an integer from 1 through 5. Locked habits have no property. When progression relocks a habit its value is deleted; a later unlock starts again at Level 1.

Local and import schemas 1 through 4 remain readable. During deterministic migration, an unlocked legacy value from 1 through 5 is preserved, while unlocked null, zero, missing, or invalid values become Level 1 because the game guarantees Level 1 immediately on unlock. Locked and unknown legacy habit IDs are discarded. Older roster data that includes collection state or shard progress is also normalized into the simplified ownership flag. Source-data schema changes must not clear or invalidate local storage unless the persisted roster shape changes.

Schema-5 exports serialize the same sparse representation and never emit null or zero Habit Levels. Schema-5 imports reject explicitly supplied Habit Level values outside 1 through 5. Legacy schema imports may contain null or zero and normalize immediately to the schema-5 runtime invariant. Unknown future schema versions are rejected.

Estimated Power is derived at runtime from rarity, Star Rank, and Dragon Level. It is not part of canonical dragon records, `OwnedDragon`, local/import JSON, cloud roster rows, or Supabase migrations. Observation provenance is maintained in the standalone Estimated Power dataset and does not add dragons to the canonical database.
