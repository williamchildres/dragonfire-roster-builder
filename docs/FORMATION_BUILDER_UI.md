# Formation Builder UI

Version 0.5.5 adds an inline presentation layer for Formation Builder cards. The trace engine remains authoritative; the UI maps existing normal traces onto the selected Left Flank, Vanguard, and Right Flank dragons.

## Enhanced Cards

Each selected position card shows the position heading, selector, movement controls, Trait status, affinity strip, Receives, Provides, and overflow controls. The Vanguard card keeps restrained visual emphasis.

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

## Affinities

Each dragon card shows favorable and unfavorable troop affinities using existing dragon affinity data. Chips include `+` or `-`, player-facing troop names, and accessible labels. The team affinity strip summarizes covered, weak/missing, and vulnerable troop types with contributing dragon names in tooltips and accessible labels.

## Limits And Overflow

Receives and Provides show up to three prioritized interactions by default. Priority is Active, Conditional, Progression unknown, Max-rank preview, then Blocked. Overflow buttons expose `aria-expanded`, show all items, and can collapse back to the compact view.

## Relationship Highlighting

Hovering, focusing, or tapping an interaction sets a shared relationship id. The provider card, recipient card, and matching item use the same highlight path. The information is still readable without hover.

## Summary And Technical Details

The normal Formation Summary contains dragons, rarity distribution, breed distribution, compact affinity coverage, interaction counts, warnings, and data confidence. Raw uppercase effect tags are moved to Show analysis details.

The lower Formation Analysis panel now summarizes team-level interaction groups, formation blockers, unresolved conditions, and the availability of technical details. Show analysis details preserves full trace cards, requirements, confidence, evidence, internal interactions, raw tags, and raw affinity coverage.

## Responsive And Accessibility Behavior

Desktop uses equal-width cards in one row where space permits. Tablet and mobile stack without horizontal scrolling while preserving Left Flank, Vanguard, Right Flank order. Movement controls remain keyboard-accessible buttons. Affinity chips and interaction states do not rely on color alone, and interactive card items use visible focus and button semantics.
