# Formation Builder UI

Version 0.5.6 refines the card layout and spacing added in 0.5.5. It is a presentation-only update; the trace engine, verified mechanics, card-analysis mapping, data schema, local roster schema, and game build remain unchanged.

Version 0.5.5 adds an inline presentation layer for Formation Builder cards. The trace engine remains authoritative; the UI maps existing normal traces onto the selected Left Flank, Vanguard, and Right Flank dragons.

## Enhanced Cards

Each selected position card shows the position heading, selector, movement controls, Trait status, affinity strip, Receives, Provides, and overflow controls. The Vanguard card keeps restrained visual emphasis.

On desktop, the Formation Builder uses three equal-width columns with stretched outer card shells so Left Flank, Vanguard, and Right Flank align at their top and bottom edges. The card internals stay in normal document flow: heading, selector, movement controls, Trait, affinities, Receives, then Provides. Equal height comes from the row/card structure and bounded interaction regions, not from inserting large flexible gaps above controls.

Movement controls use the same grid in every position card: two move actions and a full-width clear action. This keeps the upper control area consistent even when labels differ by position.

Receives contains normal cross-dragon interactions where the card dragon is the recipient. Provides contains normal interactions where the card dragon is the source, including enemy-facing team benefits. Internal same-dragon traces remain excluded from Receives and Provides.

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

Expanded Receives and Provides render all available items inside bounded scrollable section bodies instead of allowing one card to grow without a practical limit. Each section keeps its header and count visible, empty sections keep a compact structural minimum, and `View N more` / `Show fewer` preserves the correct overflow count and `aria-controls` relationship.

Compact interaction items show state, relationship, ability name, one short benefit line, and target/candidate warnings where applicable. The full trace explanation remains available through accessible text and Show analysis details.

## Relationship Highlighting

Hovering, focusing, or tapping an interaction sets a shared relationship id. The provider card, recipient card, and matching item use the same highlight path. The information is still readable without hover.

## Summary And Technical Details

The normal Formation Summary contains dragons, rarity distribution, breed distribution, compact affinity coverage, interaction counts, warnings, and data confidence. Raw uppercase effect tags are moved to Show analysis details.

The lower Formation Analysis panel now summarizes team-level interaction groups, formation blockers, unresolved conditions, and the availability of technical details. Show analysis details preserves full trace cards, requirements, confidence, evidence, internal interactions, raw tags, and raw affinity coverage.

## Responsive And Accessibility Behavior

Desktop uses equal-width, equal-height cards in one row where space permits. Tablet and mobile stack without horizontal scrolling while preserving Left Flank, Vanguard, Right Flank order. Stacked cards use natural height rather than forced desktop row height. Movement controls remain keyboard-accessible labeled buttons. Affinity chips and interaction states do not rely on color alone, compact or clamped interaction text keeps full accessible detail, and expanded scroll regions are keyboard reachable without trapping focus.

## Visual Validation Cases

Use these manual cases when reviewing presentation changes:

- Preview OFF: Left Sheepstealer, Vanguard Caraxes, Right Syrax.
- Preview ON collapsed: Left Sheepstealer, Vanguard Caraxes, Right Syrax.
- Preview ON expanded: expand Sheepstealer Receives, Caraxes Receives, and Syrax Provides.
- Low content: select a formation with few or no interactions and verify empty sections retain structure.
- Formation 1 Preview ON: Left Malachite, Vanguard Sheepstealer, Right Vermax.
