# Dragonfire Lab Project Context

## Goal

Dragonfire Roster Lab records verified dragon roster data, combat mechanics, synergy capabilities, evidence state, and manual reviews without inventing unavailable data.

## Architecture

- Typed dragon records are stored in src/data/dragons.ts.
- Evidence, manual reviews, observations, statuses, and stat definitions are separate source modules.
- Capability derivation is computed from structured AbilityEffect records in effectCapabilities.ts.
- Formation analysis uses structured SynergyTrace records and does not produce an arbitrary numerical score.
- Formation normalization preserves defensive scope, target-selection groups, visible-card requirement ownership, source ability identity, interaction scope, pure normal unmet summaries, and debug/export trace retention.
- Formation card presentation maps existing normal traces into per-dragon Receives, Provides, Trait status, affinity, candidate, and preview summaries without changing mechanics; layout polish keeps desktop cards equal-height with bounded interaction regions, inline badges, readable summaries, per-item Details, and presentation-only aggregation.

## Versions

- Database: 0.6.2
- Data schema: 12
- Local roster schema: 3
- Game build: 26.6.53509
- Context export: 1

## Normal Requirement Summary

Normal Formation Analysis unmet requirements are concise UI summaries rather than raw trace dumps. Visible interaction cards own their own blockers, global unmet requirements show selected Trait placement failures and concrete unowned-card progression blockers, preview and formation switches do not reuse prior results, and debug/export data keeps the suppressed raw requirements.

## Formation Card Presentation

Formation Builder cards are the primary normal UI for dragon-specific benefits. Receives and Provides derive from normal traces, target-selection groups use candidate wording, per-dragon affinities use existing affinity data, and raw effect tags are hidden from the normal Formation Summary. Desktop cards use equal-height outer columns with bounded interaction regions; mobile cards stack in natural height. Compact items use inline state badges, readable summaries, Details disclosure, same-ability presentation aggregation, and redundant blocked-Trait suppression when Trait status and Formation Blockers already carry the failure. Technical analysis preserves the full trace set.

## Populated Dragons

- Syrax
- Vhagar
- Caraxes
- Seasmoke
- Crimson
- Kalspire
- Malachite
- Venator
- Daemoros
- Vaeldra
- Sheepstealer
- Vermax
- Feskar
- Rhysarion
- Shadowsong

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
- Unlocked Habits with no explicit saved Habit Level, including null or Level 0, resolve to effective Habit Level 1 at runtime without mutating local roster storage.

## Synergy Framework

The framework derives output capabilities, modifier capabilities, status outputs, periodic damage, and dependencies from structured ability effects. Current trace families are outgoing-effect-amplification, incoming-effect-amplification, status-condition-enablement, stat-scaling-support, enemy-mitigation-reduction, enemy-damage-dealt-reduction, enemy-damage-received-increase, periodic-status-damage, periodic-damage-amplification, and defensive-ally-support.

## Unresolved Mechanics

- caraxes-battle-dread-and-mass-enfeeble-raw-text-table-discrepancies-retained: Battle Dread and Mass Enfeeble raw text/table discrepancies retained.
- caraxes-battle-dread-raw-text-table-discrepancy-retained: Raw text/table discrepancy retained.
- caraxes-blood-wyrm-duration-and-accumulation-semantics: Blood Wyrm duration and accumulation semantics.
- caraxes-blood-wyrm-exact-below-50-equality-behavior-remains-unconfirmed: Exact below 50% equality behavior remains unconfirmed.
- caraxes-blood-wyrm-fire-damage-increase-duration-and-accumulation-semantics-are-not-stated: Fire Damage increase duration and accumulation semantics are not stated.
- caraxes-mass-enfeeble-raw-text-table-discrepancy-retained: Raw text/table discrepancy retained.
- crimson-bloodscale-fury-bloodscale-fury-rounded-prose-table-discrepancy: Bloodscale Fury rounded prose/table discrepancy.
- crimson-bloodscale-fury-bloodscale-fury-target-preference-behavior-when-all-targets-are-stunned: Bloodscale Fury target preference behavior when all targets are Stunned.
- crimson-enervate-enervate-prose-table-discrepancy: Enervate prose/table discrepancy.
- crimson-enervate-enervate-target-lane-scope-is-not-stated: Enervate target lane scope is not stated.
- crimson-observed-preview-stats-are-account-specific-not-canonical-base-stats: Observed preview stats are account-specific, not canonical base stats.
- crimson-unlikely-hero-exact-25-and-75-threshold-equality-behavior: Exact 25% and 75% threshold equality behavior.
- crimson-unlikely-hero-unlikely-hero-table-says-damage-dealt-while-full-text-says-damage-received: Unlikely Hero table says Damage Dealt while full text says Damage Received.
- crimson-vermins-bane-exact-intelligence-enhancement-for-vermin-s-bane: Exact Intelligence enhancement for Vermin's Bane.
- daemoros-darkening-fear-exact-strength-enhancement-formula: Exact Strength enhancement formula.
- daemoros-darkening-fear-mutual-stacking-and-refresh-behavior-with-instill-fear: Mutual stacking and refresh behavior with Instill Fear.
- daemoros-darkening-fear-preferred-flank-fallback-and-tie-details: Preferred-flank fallback and tie details.
- daemoros-enemy-adjacency: Enemy adjacency.
- daemoros-instill-fear-exact-strength-enhancement-formula: Exact Strength enhancement formula.
- daemoros-instill-fear-panic-first-tick-and-refresh-behavior: Panic first-tick and refresh behavior.

## Review Plan

Current review phase: Legendary/full-profile formation validation complete; Epic ingestion active with Daemoros and Vaeldra as the first detailed Epic batch after Vermax.

Planned next phase:

- continue Epic dragon ingestion in batches of two after the latest merged context is available
- fetch latest merged main and create a new feature branch before each future Epic implementation batch
- inspect supplied screenshots and extract Commands, Traits, Habits, targeting, timing, progression, glossary entries, and evidence
- compare each mechanic against the current schema and capability framework
- identify unsupported, ambiguous, provisional, or unresolved behavior

Additional dragon-data work should happen after the formation-output review and UI/tag redesign.
