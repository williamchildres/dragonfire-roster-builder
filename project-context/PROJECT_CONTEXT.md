# Dragonfire Lab Project Context

## Goal

Dragonfire Roster Lab records verified dragon roster data, combat mechanics, synergy capabilities, evidence state, and manual reviews without inventing unavailable data.

## Architecture

- Typed dragon records are stored in src/data/dragons.ts.
- Evidence, manual reviews, observations, statuses, and stat definitions are separate source modules.
- Capability derivation is computed from structured AbilityEffect records in effectCapabilities.ts.
- Formation analysis uses structured SynergyTrace records and does not produce an arbitrary numerical score.
- Formation normalization preserves defensive scope, target-selection groups, visible-card requirement ownership, source ability identity, interaction scope, pure normal unmet summaries, and debug/export trace retention.

## Versions

- Database: 0.5.4
- Data schema: 9
- Local roster schema: 3
- Game build: 26.6.53509
- Context export: 1

## Normal Requirement Summary

Normal Formation Analysis unmet requirements are concise UI summaries rather than raw trace dumps. Visible interaction cards own their own blockers, global unmet requirements show selected Trait placement failures and concrete unowned-card progression blockers, preview and formation switches do not reuse prior results, and debug/export data keeps the suppressed raw requirements.

## Populated Dragons

- Malachite
- Seasmoke
- Sheepstealer
- Vermax
- Syrax
- Caraxes

All other known dragons remain metadata-only unless their typed source records contain verified combat data.

## Confirmed Rules

- Formation is Left Flank - Vanguard - Right Flank.
- Plain Ally/Allies may include the caster when targeting permits.
- Other Ally/Other Allies excludes the caster.
- Spatial rules prevent a caster from being adjacent to itself.
- Self-amplification does not create teammate synergy.
- Ally support may create outgoing amplification.
- Recipient-side amplification may create incoming amplification.
- Enemy debuffs are separate from ally support.
- No arbitrary numerical synergy score is generated.
- Defensive damage scope preserves all, physical, tactical, and fire Damage Received subtypes.
- Troop thresholds are structured conditions, not target counts.
- Highest-stat and one-adjacent effects target one recipient or one grouped candidate set.
- Internal same-dragon traces are preserved for debug/export but are not cross-dragon normal synergy.
- Max-rank preview does not override a known failed Dragon Level requirement.

## Synergy Framework

The framework derives output capabilities, modifier capabilities, status outputs, periodic damage, and dependencies from structured ability effects. Current trace families are outgoing-effect-amplification, incoming-effect-amplification, status-condition-enablement, stat-scaling-support, enemy-mitigation-reduction, periodic-damage-amplification, and defensive-ally-support.

## Unresolved Mechanics

- caraxes-battle-dread-and-mass-enfeeble-raw-text-table-discrepancies-retained: Battle Dread and Mass Enfeeble raw text/table discrepancies retained.
- caraxes-battle-dread-raw-text-table-discrepancy-retained: Raw text/table discrepancy retained.
- caraxes-blood-wyrm-duration-and-accumulation-semantics: Blood Wyrm duration and accumulation semantics.
- caraxes-blood-wyrm-exact-below-50-equality-behavior-remains-unconfirmed: Exact below 50% equality behavior remains unconfirmed.
- caraxes-blood-wyrm-fire-damage-increase-duration-and-accumulation-semantics-are-not-stated: Fire Damage increase duration and accumulation semantics are not stated.
- caraxes-mass-enfeeble-raw-text-table-discrepancy-retained: Raw text/table discrepancy retained.
- global-enemy-formation-adjacency: Enemy-formation adjacency is not confirmed.
- global-exact-damage-recovery-formulas: Exact damage, Recovery, and stacking formulas remain unknown.
- global-numerical-score-policy: No numerical synergy score is generated until formulas are verified.
- global-stack-refresh-expiration: Stack refresh and expiration behavior remains unresolved.
- global-threshold-boundaries: Exact threshold boundary behavior such as exactly 50% remains unconfirmed.
- malachite-canonical-base-stats-remain-unknown: Canonical base stats remain unknown.
- malachite-collective-might-exact-enhanced-by-strength-formula: Exact enhanced-by-Strength formula.
- malachite-exact-enhanced-by-instinct-formula: Exact enhanced-by-Instinct formula.
- malachite-exact-enhanced-by-strength-formula: Exact enhanced-by-Strength formula.
- malachite-lightning-strike-exact-enhanced-by-instinct-formula: Exact enhanced-by-Instinct formula.
- malachite-wardens-rally-exact-level-and-instinct-scaling-formulas: Exact Level and Instinct scaling formulas.
- seasmoke-infectious-wrath-augmentation-presentation-requires-follow-up-review: Infectious Wrath augmentation presentation requires follow-up review.
- seasmoke-loyal-bond-exactly-50-troop-capacity-boundary: Exactly 50% Troop Capacity boundary.
- seasmoke-loyal-bond-resistance-stacking-refresh-and-multiple-source-combination: Resistance stacking, refresh, and multiple-source combination.

## Review Plan

Current review phase: Normal unmet requirement summary retest and project-context regeneration.

Planned next phase:

- full formation-output review
- UI/tag redesign
- then additional dragons

Additional dragon-data work should happen after the formation-output review and UI/tag redesign.
