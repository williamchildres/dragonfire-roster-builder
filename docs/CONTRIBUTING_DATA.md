# Contributing Data

Community data contributions must be sourced and safe.

## Accepted Source Types

- Official public pages
- Official public patch notes
- In-game screenshots that do not reveal private account information
- Reproducible community tests

## Do Not Submit

- Game account credentials
- Private API tokens
- Datamined client files
- Extracted copyrighted game assets
- Unsourced guesses
- Exploit reports

## Submission Checklist

For Commands, Traits, Habits, affinities, stats, effect tags, observations, or matchup rules, include:

- Dragon name and ID, when applicable
- Field being changed
- Old value, if any
- New value
- Evidence source
- Capture date
- Game version, if known
- Whether the old value should be marked superseded

## Ability Data

Identify whether the data is a Command, Trait, or Habit. Preserve exact wording, then add structured schedules and effects. Use multiple schedules when an ability has multiple independent timings.

Use repeated-attempt fields for independent rolls, repeat fields for once-if-any or once-per-match behavior, stack fields for maximum stack and duration data, and conditional multipliers only when the multiplier itself is verified. If only a Level 1 multiplied value is visible, record that value as directly verified and mark later derived values as calculated.

For Habit data, record unlock Star Rank separately from Habit Level. Habit Level must be null or 0-5.

For Command augmentations granted by Habits, keep the base Command intact and attach the added schedules or effects through `augmentations`.

## Effect Capabilities

When adding or reviewing combat kits, identify every verified output channel and modifier channel separately. Current channels are Physical Damage, Tactical Damage, Fire Damage, and Recovery. A dragon can have multiple output capabilities in one channel and can have mixed damage channels.

For output capabilities, record the source kind, target side, target count, target scope, unlock requirements, whether the effect is conditional, and evidence IDs. For modifier capabilities, record the role, channel, dealt or received direction, source scope, target selector, value, unit, unlock requirements, and whether it is chance-based or selection-dependent.

Use `self-amplification` for effects that only modify the originating dragon, `ally-support` for support targeting friendly dragons, `recipient-side-amplification` for effects such as Recovery Received, and `enemy-debuff` for effects applied to enemies. A self-buff does not constitute formation synergy for teammates.

Do not infer a single "main damage type" and use it for matching. Primary damage summaries are display-only. Generic synergy analysis must match support effects to actual capabilities.

Source-scope wording matters. Unqualified Damage Dealt modifiers apply to all qualifying sources in that damage channel. Explicit exclusions such as "excluding Basic Attacks" prevent Basic Attack matches. Unknown Basic Attack damage types should remain unmodeled until verified.

Do not derive authoritative capabilities from tags alone. Tags can help with browsing and search, but a structured effect or explicitly reviewed capability record is required.

For schema 7+ submissions, also record capability dependencies when the wording supports them:

- Scaling stats, such as Fire Damage increased by Intelligence or Recovery enhanced by Initiative
- Mitigation stats, such as Fire Damage being reduced by target Initiative
- Status requirements, such as self First-Strike or any enemy Slow
- Previous-round events and repeat-per-matching-enemy behavior

Status effects should be modeled separately from damage channels. First-Strike, Slow, Burn, Resistance, Control, and similar mechanics should have glossary coverage when their meaning is known. If a status deals periodic damage, such as Burn dealing Fire Damage each round, add a periodic damage definition rather than relying on tags alone.

## Formation Data

Record position requirements such as Vanguard, Left Flank, Right Flank, same lane, or within adjacency. Friendly three-dragon adjacency is confirmed as Left Flank - Vanguard - Right Flank, with no direct adjacency between the two flanks. Enemy-formation adjacency remains unverified and must be documented separately.

Exact "3 Allies" friendly targeting is normalized as all three friendly dragons including the caster. Do not apply that rule to "other Allies", smaller target counts, singular "Ally", or target-priority wording unless a source verifies it.

## Stats And Observations

Canonical formulas are unknown unless directly sourced. Account-specific observations must include Dragon Level, Star Rank, capture date, and whether modifier context is known. Mark such records as non-canonical.

## Affinity And Matchups

Dragon affinity and troop-type matchup rules are separate systems. Do not infer a full matchup matrix from one screenshot.

## Pending Official-Site Dragons

If a dragon is verified in-game but is not yet on the official public roster page, set `rosterSourceStatus` to `in-game-verified-pending-official-site`, keep `officialProfileUrl` null, and add screenshot evidence. The official roster checker will report when the dragon later appears publicly.

## Screenshot Policy

Screenshot records may use descriptive source labels, language, capture date, submitter, and manual-review status. Do not commit screenshots, copied game artwork, logos, or private account details unless the repository owner explicitly approves a public asset policy.

Current screenshot evidence should include the reviewed game build when known. For the current Syrax, Caraxes, Malachite, Seasmoke, Sheepstealer, Vermax, Army Builder, ability, trait, habit, command, and troop-matchup observations, the reviewed game build is `26.6.53509`.

Unknown values should stay unknown until evidence is reviewed.
