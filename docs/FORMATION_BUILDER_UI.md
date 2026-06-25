# Formation Builder UI

Version 0.5.6 refines the card layout and spacing added in 0.5.5. It is a presentation-only update; the trace engine, verified mechanics, card-analysis mapping, data schema, local roster schema, and game build remain unchanged.

Version 0.5.5 adds an inline presentation layer for Formation Builder cards. The trace engine remains authoritative; the UI maps existing normal traces onto the selected Left Flank, Vanguard, and Right Flank dragons.

## Enhanced Cards

Each selected position card shows the position heading, selector, movement controls, Command panel, Trait status, affinity strip, Receives, Provides, and overflow controls. The Vanguard card keeps restrained visual emphasis.

On desktop, the Formation Builder uses three equal-width columns with stretched outer card shells so Left Flank, Vanguard, and Right Flank align at their top and bottom edges. The card internals stay in normal document flow: heading, selector, movement controls, Command, Trait, affinities, Receives, then Provides. Equal height comes from the row/card structure and bounded interaction regions, not from inserting large flexible gaps above controls.

Movement controls use the same grid in every position card: two move actions and a full-width clear action. This keeps the upper control area consistent even when labels differ by position.

Receives contains normal cross-dragon interactions where the card dragon is the recipient. Provides contains normal interactions where the card dragon is the source, including enemy-facing team benefits. Internal same-dragon traces remain excluded from Receives and Provides.

Command panels describe the selected dragon's own Command. They use structured schedule summaries and do not inherit active, conditional, blocked, or progression-unknown state from other dragons. A Command panel is not a formation synergy and never changes Receives, Provides, or team interaction counts.

The current Command summaries preserve independent schedules and targets:

- Malachite - Warden's Rally: rounds 2, 4, 7, and 9 Tactical Damage to one same-lane enemy; rounds 3, 6, and 9 Recovery to three allies.
- Seasmoke - Cleansing Wrath: each-round cleanse attempts; rounds 3, 6, and 9 Fire Damage to one enemy.
- Sheepstealer - Wild Hunt: Prey application when no enemy has Prey; rounds 1, 4, 7, and 10 Fire Damage to one enemy.

## Interaction States

- Active: current requirements are satisfied.
- Conditional: current-mode chance, timing, targeting, or unresolved conditions apply.
- Max-rank preview: preview mode exposes a future locked interaction.
- Progression unknown: Level, Star Rank, Habit Level, or collection state is unknown.
- Blocked: placement or progression fails.

Every state has an icon, text label, tooltip text, and non-color visual treatment.

## Target Candidates

Single-target grouped traces render one Provides item on the source card. Each eligible selected recipient gets a Receives candidate item labeled as not guaranteed. Candidate cards never imply simultaneous or guaranteed selection.

Multi-target traces stay direct Receives/Provides entries and do not use candidate wording.

## Trait Status

Trait status is summarized on the owning card. Vanguard placement can be active, placement-valid with unknown progression, or inactive because Level/Star/Habit progression fails. Flank dragons with Vanguard-only Traits show inactive placement. Full requirement details remain in technical analysis.

Trait panels use shared padding, badge placement, and a modest minimum height so cards do not collapse unevenly when Trait text is short.

## Affinities

Each dragon card shows favorable and unfavorable troop affinities using existing dragon affinity data. Chips include `+` or `-`, player-facing troop names, and accessible labels. The team affinity strip summarizes covered, weak/missing, and vulnerable troop types with contributing dragon names in tooltips and accessible labels.

Affinity panels use a two-row label-and-chip grid. `None verified` aligns with chip rows, chips wrap inside the card, and the Formation Affinity Coverage strip uses matching spacing and alignment.

## Limits And Overflow

Receives and Provides show up to three prioritized interactions by default. Priority is Active, Conditional, Progression unknown, Max-rank preview, then Blocked. Overflow buttons expose `aria-expanded`, show all items, and can collapse back to the compact view.

Expanded Receives and Provides render all available items inside bounded scrollable section bodies instead of allowing one card to grow without a practical limit. Each section keeps its header and count visible, empty sections keep a compact structural minimum, and `View N more` / `Show fewer` preserves the correct overflow count, reveals more visible content than the collapsed three-item view, restores the original compact view when collapsed, and keeps the `aria-controls` relationship.

Compact interaction items show relationship, compact inline state badge, ability/effect title, one or more short benefit lines, and target/candidate warnings where applicable. State badges use only their content width and never reserve a large status column. Summaries are generated from structured trace fields rather than the opening words of verbose explanations, so stat values, target uncertainty, and key mechanics remain visible.

Cross-dragon cards identify the source dragon and the benefiting dragon. The benefiting card's Receives section names the source and the affected Command when that is the meaningful output. For example, Sentinel's Presence support on Seasmoke identifies Cleansing Wrath Fire Damage instead of a generic Fire Damage line.

Recipient-side modifiers remain owned by the recipient dragon. Warden's Rally Recovery support remains a Malachite-provided interaction, while Sheepstealer's Hunter's Cunning Recovery Received amplification is shown as an active or unavailable modifier line on Sheepstealer's Receives item. Hunter's Cunning is not counted as a Malachite-provided benefit, and Warden's Rally is not colored blocked because Hunter's Cunning fails Sheepstealer's Vanguard requirement.

Active, conditional, blocked, and progression-unknown states are evaluated independently for the source support and any recipient-side modifier notes. Formation Builder analysis reads the current local roster Reign Level, Star Rank, collection state, and Habit Levels when recalculating card state, so roster progression edits refresh existing formations without rebuilding the selected slots.

Each interaction item includes a Details disclosure. Details exposes the full player-facing explanation, effect details, target-selection behavior, current or preview state, blockers or unknown requirements, and confidence. Show analysis details still preserves raw technical trace cards and evidence, but it is not required just to understand one card item.

When one provider ability creates multiple meaningful effects for the same recipient, the card presentation may aggregate those child traces into one item. For example, Syrax's Blazing Fury can show Fire Damage candidacy and Caraxes First-Strike support together while preserving both child trace IDs for technical analysis. If aggregation would blur distinct purposes, the visible title includes the purpose, such as `Flight Mastery - Enemy mitigation reduction`.

Redundant blocked Trait interactions are suppressed from Receives and Provides when the source card's Trait panel and lower Formation Blockers already explain the hard placement failure. The blocked traces remain available in technical analysis and generated exports.

## Relationship Highlighting

Hovering, focusing, or tapping an interaction sets a shared relationship id. The provider card, recipient card, and matching item use the same highlight path. The information is still readable without hover.

## Summary And Technical Details

The normal Formation Summary contains dragons, rarity distribution, breed distribution, compact affinity coverage, interaction counts, warnings, and data confidence. Raw uppercase effect tags are moved to Show analysis details.

The lower Formation Analysis panel now summarizes team-level interaction groups, formation blockers, unresolved conditions, and the availability of technical details. Show analysis details preserves full trace cards, requirements, confidence, evidence, internal interactions, raw tags, and raw affinity coverage.

Full technical/debug traces remain available for audit and project-context export, including child traces and recipient-side modifier traces that are merged into normal player-facing cards. Normal cards prioritize clarity without deleting or rewriting trace mechanics.

## Responsive And Accessibility Behavior

Desktop uses equal-width, equal-height cards in one row where space permits. Tablet and mobile stack without horizontal scrolling while preserving Left Flank, Vanguard, Right Flank order. Stacked cards use natural height rather than forced desktop row height. Movement controls remain keyboard-accessible labeled buttons. Affinity chips and interaction states do not rely on color alone, Details controls are keyboard reachable with `aria-expanded` and `aria-controls`, and expanded scroll regions are keyboard reachable without trapping focus.

## Visual Validation Cases

Use these manual cases when reviewing presentation changes:

- Preview OFF: Left Sheepstealer, Vanguard Caraxes, Right Syrax.
- Preview ON collapsed: Left Sheepstealer, Vanguard Caraxes, Right Syrax.
- Preview ON expanded: expand Sheepstealer Receives, Caraxes Receives, and Syrax Provides.
- Low content: select a formation with few or no interactions and verify empty sections retain structure.
- Formation 1 Preview ON: Left Malachite, Vanguard Sheepstealer, Right Vermax.
- Warden active modifier: Left Malachite, Vanguard Sheepstealer, Right Caraxes.
- Warden blocked modifier: Left Malachite, Vanguard Caraxes, Right Sheepstealer.
- Command summaries: inspect Malachite, Seasmoke, and Sheepstealer Command panels.

Final review status: these visual/manual review cases pass for the completed Formation Builder card polish.
