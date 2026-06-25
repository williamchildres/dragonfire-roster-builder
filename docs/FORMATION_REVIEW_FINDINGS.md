# Formation Review Findings

## Scope

This document records the consolidated Formation Analysis repair for the original Phase 3.8.1 cases plus Batch 1 and Batch 2 manual review findings. Manual retest status for Batch 1 and Batch 2 is pending after merge.

## Implemented Corrections

- Selected-formation invariant: friendly trace sources, recipients, matched outputs, status providers, stat providers, and recipient-side amplifiers must be one of the three selected formation dragons.
- Requirement precedence: hard battlefield failures dominate unknown or previewed progression.
- Defensive support: direct teammate Damage Received reduction is modeled as `damage-received` plus `defensive-ally-support`.
- Champion's Brilliance: Seasmoke in Vanguard supports only the Right Flank ally with Damage Received -8%.
- Trace aggregation: duplicate parent traces and duplicate requirement rows are collapsed by stable identity.
- Ability/output aggregation: repeated ability names are displayed with effect context, such as `Warden's Rally: Tactical Damage and Recovery`.
- Single-target selection: count-1 effects with multiple eligible recipients are grouped as target-selection interactions.
- Periodic output presentation: Burn remains a Fire output with periodic debug metadata and is not a second normal buff.
- Normal warning cleanup: PvE-only Stolen Flock context is kept out of prominent normal formation warnings.
- Empty sections: empty trace lists display `None identified`.
- Resistance correction: Resistance has a verified general meaning, reducing Damage Received; stacking, refresh, multiple-source combination, and final formula remain unresolved.

## Batch 1

Formation 1: Left Malachite / Vanguard Sheepstealer / Right Vermax.
Expected highlights: Hunter's Cunning Physical support to Vermax, Warden's Rally Recovery to Sheepstealer Recovery Received amplification, Spreading Blaze Tactical support to Malachite, Lightning Strike blocked by flank-to-flank non-adjacency, no normal Stolen Flock PvE warning, no duplicate Recovery traces or blockers.

Formation 2: Left Seasmoke / Vanguard Malachite / Right Sheepstealer.
Expected highlights: Sentinel's Presence supports Seasmoke Cleansing Wrath Fire Damage, no Fire support to Right Flank Sheepstealer, Champion's Brilliance inactive, Hunter's Cunning inactive.

Formation 3: Left Malachite / Vanguard Vermax / Right Seasmoke.
Expected highlights: Warrior's Zeal Instinct and Initiative support to Malachite, Warden's Rally grouped as Tactical Damage and Recovery, Spreading Blaze supports Malachite Tactical Damage, Lightning Strike preview blocked only by Habit unlock when adjacency is valid.

Formation 4: Left Malachite / Vanguard Seasmoke / Right Sheepstealer.
Expected highlights: Champion's Brilliance defensive support to Right Flank Sheepstealer only, Cunning Ferocity preview Fire support to Sheepstealer outputs, Malachite rejected from Fire support because it lacks verified Fire output, no normal Stolen Flock PvE warning.

## Batch 2

Formation 5: Left Caraxes / Vanguard Seasmoke / Right Sheepstealer.
Expected highlights: Champion's Brilliance defensive support to Sheepstealer, Hunter's Wrath and Hunter's Cunning inactive outside Vanguard, Cunning Ferocity preview Fire support to both adjacent flanks, Burn appears once under Fire support with periodic metadata.

Formation 6: Left Malachite / Vanguard Syrax / Right Sheepstealer.
Expected highlights: Sentinel's Wit supports Malachite Instinct and Initiative, Warden's Rally grouped as Tactical Damage and Recovery, Blazing Fury identifies Sheepstealer as an eligible Fire recipient, Hunter's Cunning inactive outside Vanguard.

Formation 7: Left Syrax / Vanguard Vermax / Right Caraxes.
Expected highlights: Warrior's Zeal supports Syrax Instinct and Initiative, Syrax Instinct supports Blazing Fury Tactical scaling, Spreading Blaze supports Syrax Tactical Damage, Blazing Fury supports Caraxes Fire Damage, First-Strike supports Infernal Burst, no Sheepstealer traces anywhere.

Formation 8: Left Sheepstealer / Vanguard Caraxes / Right Syrax.
Expected highlights: Hunter's Wrath supports Right Flank Syrax Strength and Initiative, Sheepstealer receives no Hunter's Wrath support, Sentinel's Wit and Hunter's Cunning inactive outside Vanguard, Blazing Fury groups Caraxes and Sheepstealer as competing Fire recipients, First-Strike supports Caraxes Infernal Burst.

## Manual Retest Status

Batch 1 and Batch 2 cases are exported with `reviewStatus: pending`. They must not be marked confirmed until normal mode, preview mode, debug JSON, and the synergy report are manually retested against the merged build.
## Formation Normalization Follow-Up

Manual retesting of Formations 1-8 left presentation and normalization defects rather than new dragon-data gaps. Version 0.5.3 addresses them by aggregating multi-effect direct stat support, preserving defensive damage subtype, representing Trial by Flame thresholds as strict below conditions, resolving Reactive Instincts as highest Instinct one-target support, grouping Lightning Strike adjacent candidates, distinguishing Spreading Blaze from Rallying Flame, attributing provider and recipient-output blockers, excluding internal same-dragon interactions from normal cross-dragon sections, and using canonical dragon display names.

Champion's Brilliance remains inactive in Formations 4 and 5 because observed Seasmoke is Level 1 and the trait requires Level 16. Its Vanguard position and Right Flank targeting can pass while the Level requirement fails; max-rank Habit preview does not change Dragon Level.

## Normal Requirement Summary Follow-Up

Version 0.5.4 narrows normal Unmet requirements to a pure current-analysis summary. The section is rebuilt fresh for each formation and preview mode, includes only selected-dragon standalone blockers, applies hard Trait placement precedence before progression, dedupes by semantic identity, and suppresses blockers already owned by visible active or potential cards. Raw/debug trace requirements, including suppressed Habit unlocks and recipient-output blockers, remain exported for audit.

Expected Batch 1 and Batch 2 normal summaries are now recorded in generated formation review case notes for current and preview modes. Review status remains `pending` until normal mode, preview mode, debug JSON, and `npm run report:synergy` are manually verified after this repair.

## Formation Card Presentation Follow-Up

Version 0.5.5 adds a UI-only presentation layer over the same normal traces. Formation cards now show dragon-specific Receives, Provides, Trait status, favorable and unfavorable affinities, candidate-target wording, current versus max-rank preview state, and overflow counts. The lower Formation Analysis is now a team-level summary plus blockers, unresolved conditions, and hidden technical details.

The engine trace mechanics and expected interactions are unchanged. `npm run report:synergy` now includes a Formation Card Presentation Review for Formations 1-8 in current and preview modes.

Version 0.5.6 completes the Formation Builder card polish. Cards now include compact Command panels for the selected dragon's own Command, compact Trait panels, bounded Receives and Provides sections, inline state badges, purpose-built summaries, and per-item Details disclosures. Command panels do not count as synergies. Cross-dragon interactions remain in Receives and Provides, with the benefiting card identifying the source dragon and affected Command where relevant.

Manual review confirms that Sentinel's Presence identifies Cleansing Wrath Fire Damage, Warden's Rally Recovery support remains separate from Sheepstealer's Hunter's Cunning Recovery Received amplification, and recipient-side modifiers stay owned by the recipient dragon. Hunter's Cunning does not appear as a Malachite-provided benefit. Active, conditional, blocked, and progression-unknown states are evaluated separately, Formation Builder uses current roster Reign Level/progression data, `View more` and `Show fewer` reveal and restore the correct bounded sections, and Warden's Rally, Cleansing Wrath, and Wild Hunt Command summaries preserve separate schedules and targets. Full technical traces remain available through Show analysis details and generated context.
