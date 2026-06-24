# Data Model

Dragonfire Roster Lab separates public roster metadata, verified combat facts, account-specific observations, and user-owned roster state.

## Dragon Records

Seeded dragon records live in `src/data/dragons.ts`. Most dragons contain official identity metadata only. Unknown combat fields remain null, empty arrays, or `unknown`.

Malachite, Seasmoke, Sheepstealer, and Vermax are partial exceptions: their Commands, Traits, Habits, and some affinities are screenshot verified. Canonical base stats remain unknown.

`rosterSourceStatus` distinguishes:

- `official-website`: appears on the ordinary public roster page and has an official profile URL.
- `in-game-verified-pending-official-site`: verified from in-game screenshots but not yet listed on the public roster page; `officialProfileUrl` must be null.
- `community-unverified`: submitted but not reviewed.

## Abilities

Commands, Traits, and Habits share `AbilityDefinition`.

- `kind` distinguishes `command`, `trait`, and `habit`.
- `schedules` supports multiple independent timings and multiple effect groups in the same round.
- `rawDescription` preserves verified wording.
- `effects` stores targets, target scopes, magnitudes, durations, scaling notes, exclusions, and ranked values.
- `attempts` stores repeated independent rolls such as Seasmoke's three 20% Cleanse attempts.
- `repeat` stores once-if-any or once-per-match behavior such as Vermax's Fire-enemy repeats.
- `augmentations` stores Habit-granted Command additions such as Infectious Wrath and Savage Claim.
- `conditions`, `targetPriority`, `stack`, `conditionalMultipliers`, and `sourceScope` preserve screenshot mechanics without collapsing them into prose.
- `verification` is field-level.
- `unresolvedQuestions` records mechanics that must not be guessed.

Warden's Rally demonstrates the model: round 9 has both Tactical Damage and Recovery schedules.

## Formation

Formation positions are Left Flank, Vanguard, and Right Flank. Shared formation links preserve positions.

Friendly formation adjacency is confirmed as a linear graph:

- Left Flank is adjacent only to Vanguard.
- Vanguard is adjacent to Left Flank and Right Flank.
- Right Flank is adjacent only to Vanguard.
- Left Flank and Right Flank are not adjacent to one another.

Enemy-formation adjacency remains separate and must not be inferred from the friendly graph.

Exact "3 Allies" effects in the three-dragon friendly formation target all three friendly dragons and include the caster. This is supported by manual combat-log observation of Warden's Rally Recovery applying to Malachite. Do not generalize that rule to "1 Ally", "2 Allies", "other Allies", "an Ally", or target-priority wording.

Threshold wording is stored with literal operators. For example, "above 50%" means greater than 50 and "below 50%" means less than 50. Exactly 50% is not covered by either phrase until combat-log validation confirms boundary behavior.

## Synergy Traces

Formation analysis returns structured `SynergyTrace` records rather than only display text. Each trace records source and recipient dragons, source and recipient abilities, status, confidence, requirements, matched facts, effects, conflicts, assumptions, unresolved questions, raw evidence IDs, and manual-review context.

Statuses include active, potential, inactive, blocked, unknown, and not-applicable. Locked Habits and future progression are potential when previewed, not active for the user's current roster. Numerical synergy scores remain null unless enough verified data exists for all selected dragons.

## User Roster State

User state is stored separately in localStorage under schema version 3. It contains:

- `dragonId`
- `owned`
- `collection`, with `not-collected`, `not-hatched`, or `hatched` plus nullable shard counts
- `starRank` from 1 through 10, nullable when unknown
- `reignLevel`
- `habitLevels`, where `null` means not recorded, `0` means no Habit upgrades, and `1-5` are upgraded levels
- personal `notes`

Schema 1 and 2 data migrates by preserving ownership, Star Rank, Reign Level, notes, Habit Levels when present, and legacy team or formation selections. Existing owned dragons migrate to collection state `hatched`; unowned legacy records migrate to `not-collected`.

## Stat Definitions And Observations

Canonical stat definitions describe visible stats without inventing formulas.

Observation snapshots are account-specific and marked `canonical: false`. They can vary with Dragon Level, Star Rank, Stronghold upgrades, faction bonuses, alliance bonuses, and other modifiers. Observation values must not drive generic comparisons or synergy scores.

Observation stamina can exceed the displayed maximum in screenshots. Store the value exactly as observed and do not normalize it into a formula.

## Affinity Versus Matchups

Dragon troop affinity is stored on the dragon. Troop-type matchup rules live separately. The Shieldbearer matchup screenshot is not attached to Malachite.

## Evidence Sources

Evidence records live in `src/data/evidence.ts`. Screenshot evidence records may use descriptive labels without committing image files or copied artwork to the public repository.

Current screenshot-normalized evidence and observations are documented against game build `26.6.53509`. Manual-review records live in `src/data/manualReviews.ts` and record scope, review status, reviewer, review date, game build, notes, and evidence IDs.

Status glossary records live in `src/data/statusGlossary.ts`. They describe known status wording and unresolved semantics without assigning those statuses to dragons unless a sourced ability does so.

## Extension Points

Historical values are not exposed in the UI yet. When data changes, record the source, date, and superseded value in documentation or a future history file before replacing active data.
