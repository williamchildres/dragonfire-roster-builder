# Data Model

Dragonfire Roster Lab separates public roster metadata, verified combat facts, account-specific observations, and user-owned roster state.

## Dragon Records

Seeded dragon records live in `src/data/dragons.ts`. Most dragons contain official identity metadata only. Unknown combat fields remain null, empty arrays, or `unknown`.

Malachite is the first partial exception: its command, trait, Habits, and some affinities are screenshot verified. Canonical base stats remain unknown.

## Abilities

Commands, Traits, and Habits share `AbilityDefinition`.

- `kind` distinguishes `command`, `trait`, and `habit`.
- `schedules` supports multiple independent timings and multiple effect groups in the same round.
- `rawDescription` preserves verified wording.
- `effects` stores targets, target scopes, magnitudes, durations, scaling notes, exclusions, and ranked values.
- `verification` is field-level.
- `unresolvedQuestions` records mechanics that must not be guessed.

Warden's Rally demonstrates the model: round 9 has both Tactical Damage and Recovery schedules.

## Formation

Formation positions are Left Flank, Vanguard, and Right Flank. Shared formation links preserve positions.

The exact `within adjacency` graph is unresolved. Current analysis may display adjacency requirements, but it does not invalidate formations solely from an unverified adjacency assumption.

## User Roster State

User state is stored separately in localStorage under schema version 2. It contains:

- `dragonId`
- `owned`
- `starRank` from 1 through 10, nullable when unknown
- `reignLevel`
- `habitLevels`, where `null` means not recorded, `0` means no Habit upgrades, and `1-5` are upgraded levels
- personal `notes`

Schema 1 data migrates by preserving ownership, Star Rank, Reign Level, notes, and legacy team selections.

## Stat Definitions And Observations

Canonical stat definitions describe visible stats without inventing formulas.

Observation snapshots are account-specific and marked `canonical: false`. They can vary with Dragon Level, Star Rank, Stronghold upgrades, faction bonuses, alliance bonuses, and other modifiers. Observation values must not drive generic comparisons or synergy scores.

## Affinity Versus Matchups

Dragon troop affinity is stored on the dragon. Troop-type matchup rules live separately. The Shieldbearer matchup screenshot is not attached to Malachite.

## Evidence Sources

Evidence records live in `src/data/evidence.ts`. Screenshot evidence records may use descriptive labels without committing image files or copied artwork to the public repository.

## Extension Points

Historical values are not exposed in the UI yet. When data changes, record the source, date, and superseded value in documentation or a future history file before replacing active data.
