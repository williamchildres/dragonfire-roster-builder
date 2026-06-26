# Data Model

Dragonfire Roster Lab separates public roster metadata, verified combat facts, account-specific observations, and user-owned roster state.

## Dragon Records

Seeded dragon records live in `src/data/dragons.ts`. Most dragons contain official identity metadata only. Unknown combat fields remain null, empty arrays, or `unknown`.

Syrax, Caraxes, Malachite, Seasmoke, Sheepstealer, and Vermax are partial exceptions: their Commands, Traits, Habits, and some affinities are screenshot verified. Canonical base stats remain unknown.

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
- `casterEligibility` normalizes whether wording includes, excludes, or conditionally allows the caster.
- `effectOptions` stores schema 11 effect alternatives. Use `mode: one-of` for mutually exclusive choices with an unknown selector, and `mode: conditional-branch` when each target follows exactly one condition-driven branch. Capability derivation may expand conditional branches, but must not flatten one-of options into simultaneous modifiers.
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

Repeated manual ability-text review confirms a broader wording rule: "Other Ally" and "Other Allies" exclude the caster, while plain "Ally" and "Allies" allow the caster to be selected when otherwise eligible. This language rule does not override spatial requirements. A caster is not adjacent to itself, so an effect targeting Allies within adjacency cannot select the caster solely because the word "other" is absent.

Unqualified Damage Dealt modifiers apply to all qualifying damage sources unless the text explicitly restricts or excludes a source. Explicit restrictions include "excluding Basic Attacks", "from Basic Attacks", "from Commands", "from Habits", or "from Commands and Habits". Vermax Warrior's Zeal is combat-log confirmed to include Basic Attack Physical Damage. Malachite Forest's Instinct remains non-basic because the wording explicitly excludes Basic Attacks.

Threshold wording is stored with literal operators. For example, "above 50%" means greater than 50 and "below 50%" means less than 50. Exactly 50% is not covered by either phrase until combat-log validation confirms boundary behavior.

## Synergy Traces

Formation analysis returns structured `SynergyTrace` records rather than only display text. Each trace records source and recipient dragons, source and recipient abilities, status, confidence, requirements, matched facts, effects, conflicts, assumptions, unresolved questions, raw evidence IDs, and manual-review context. Recipient-amplification traces additionally record provider effect type, recipient modifier type, modifier value, combat-log confirmation state, and whether the exact final result is known.

Provider-to-recipient amplification is modeled without producing a score. A Recovery provider can interact with a recipient's Recovery Received modifier; the trace explains the greater benefit while leaving the exact troop-restoration amount unknown until the full Recovery formula is verified.

## Effect Capabilities

Data schema 9 stores normalized effect capabilities with explicit modifier role, availability context, output dependencies, status outputs, periodic damage definitions, direct defensive ally support, defensive damage scope, structured target-selection metadata, threshold-condition export data, grouped modifier IDs, and interaction scope. `OutputCapability` records what a dragon can produce, such as Physical Damage, Tactical Damage, Fire Damage, or Recovery. `ModifierCapability` records channel modifiers, such as Physical Damage Dealt Up, Recovery Received Up, or Damage Received Down. Defensive modifiers use `damageScope` values of `all`, `physical`, `tactical`, or `fire`, so Forest's Instinct is Tactical Damage Received support and Trial by Flame is Fire Damage Received support rather than generic all-damage reduction. `StatusOutputCapability` records statuses such as First-Strike, Slow, Burn, and Resistance. `PeriodicDamageDefinition` records periodic effects such as Burn ticking as Fire Damage. A dragon may have several capabilities in the same channel; do not collapse a mixed kit into one damage tag.

`ModifierRole` separates self amplification, ally support, recipient-side amplification, and enemy debuffs. Outgoing cross-dragon amplification only uses `ally-support` modifiers. Self amplification is visible in review, but it must not support another dragon. Incoming amplification uses `recipient-side-amplification` modifiers. Enemy debuffs are reserved for a future debuff-exploitation framework.

Synergy matching uses capabilities rather than dragon names. Outgoing amplification matches an ally-support `dealt` modifier to recipient output capabilities in the same channel. Incoming amplification matches an ally or self output provider to a recipient-side `received` modifier in the same channel. Defensive ally support matches an ally-support `received` modifier such as Damage Received Down directly to the targeted teammate without requiring that teammate to produce any output. Status-condition enablement matches a status output to an output dependency such as self First-Strike or any enemy Slow. Stat-scaling support matches ally stat buffs to outputs that scale with that stat. Enemy mitigation reduction matches enemy stat debuffs to outputs mitigated by that target stat. Periodic damage amplification matches channel support to periodic damage definitions such as Burn Fire Damage. These paths check formation targeting, position requirements, user progression, source scope, evidence confidence, and active versus future availability.

Formation traces are generated inside the selected-formation boundary. A friendly source, recipient, matched output, status provider, stat provider, or recipient-side amplifier must belong to one of the three selected positions before the trace can reach normal presentation, debug JSON, reports, or project-context exports. Hard battlefield requirements take precedence over progression requirements; preview mode cannot revive a failed position or adjacency requirement.

Normal presentation aggregates sibling direct stat effects from the same source ability, recipient, target-selection group, requirement state, and interaction scope. The grouped card can say Instinct and Initiative, while the child stat-scaling traces still connect only the specific stat to outputs that scale with that stat. Debug output keeps every child modifier capability ID.

Target selection distinguishes target count from threshold conditions. Trial by Flame stores strict `target-below-troop-capacity-threshold` conditions for 75%, 50%, and 25%; those values must not be exported as `targetSelector.count`. Highest-stat selectors record `selection: highest-stat` and `selectionStat`, and one adjacent target selectors record `selection: one-eligible-adjacent`. If one recipient can be resolved from available stats, only that recipient receives the direct support trace. Missing values or ties produce a grouped candidate interaction with unresolved tie-breaking.

Trace `interactionScope` separates `cross-dragon`, `internal`, `enemy-side`, and `targeting-fact` interactions. Internal same-dragon amplification remains in debug output and project-context exports, but normal Active and Conditional sections focus on cross-dragon formation interactions and targeting facts.

Progression requirement labels preserve ownership. Provider requirements and recipient-output requirements include the dragon and ability that owns the blocker, so grouped traces can distinguish a locked provider ability from a locked recipient output. Max-rank Habit preview does not change Dragon Level; an observed Level 1 dragon still fails a Level 16 requirement.

`primaryDamageChannel` is descriptive only. It may summarize a reviewed dragon for display, but it must never be used as the matching source when specific output capabilities are available.

Source scopes prevent false matches. `all-qualifying-sources` can match Basic Attacks, Commands, and Habits in the same channel. `non-basic-attacks` can match Commands and Habits but not Basic Attacks. Channel mismatch always blocks a match; Fire Damage support does not apply to Tactical Damage or Physical Damage.

Capability availability has three contexts: canonical availability describes the kit and unlock requirements; observed-account availability records supplied screenshot state such as Seasmoke being not hatched; user-roster availability comes from browser localStorage and is used by the Formation Builder. The report script cannot inspect a visitor's localStorage, so it does not claim user availability.

Formation Builder stores selected formation slots as dragon IDs and resolves current dragon and local roster records when recalculating analysis. Reign Level, Star Rank, collection state, and Habit Levels from the current roster entry must invalidate presentation state; selected cards must not retain stale progression snapshots after a roster edit or reload.

Capabilities are derived from structured `AbilityEffect` records plus one reviewed Vermax Basic Attack capability. Effect tags alone do not create authoritative capabilities. Output dependencies are derived from structured scaling, conditional multipliers, and canonical stat relationships; unsupported tags do not create dependencies.

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
