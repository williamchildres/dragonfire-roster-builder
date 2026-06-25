# Update Process

Use this process to keep roster data traceable.

## Adding A Newly Discovered Dragon

1. Add a new record to `src/data/dragons.ts`.
2. Set unknown combat fields to null, empty arrays, or `unknown`.
3. Set `rosterSourceStatus` to `official-website` only when the public roster page exists; otherwise use `in-game-verified-pending-official-site` and keep `officialProfileUrl` null.
4. Add evidence in `src/data/evidence.ts`.
5. Update `databaseMetadata`.
6. Add or update data-integrity tests.

## Changing Rarity Or Breed

1. Record the previous value in the change notes or future history structure.
2. Add the source evidence.
3. Update the active dragon record.
4. Run the data-integrity tests.

## Adding Commands, Traits, Habits, Affinities, Stats, Or Tags

1. Add only sourced values.
2. Preserve raw wording.
3. Attach evidence IDs and field-level verification.
4. Model multiple schedules when timings differ.
5. Use repeated attempts, repeat modes, stack configuration, conditions, target priorities, command augmentations, and source scopes when the screenshot supports them.
6. Keep Habit unlock Star Rank separate from Habit Level progression.
7. Store unresolved target inclusion, exact scaling formulas, enemy-formation assumptions, source-scope ambiguity, and stack-duration behavior as unresolved questions.
8. Set `dataStatus` to the appropriate verification level.
9. Update synergy rules only when the tags and behavior are verified.
10. Add tests for any new engine behavior.

## Normalizing Targeting And Source Scope

1. Treat "Other Ally" and "Other Allies" as excluding the caster.
2. Treat plain "Ally" and "Allies" as allowing caster eligibility when other targeting rules permit it.
3. Do not let caster eligibility override spatial rules; a caster is not adjacent to itself.
4. Treat unqualified Damage Dealt modifiers as applying to all qualifying damage sources unless wording explicitly restricts or excludes a source.
5. Preserve explicit restrictions such as "excluding Basic Attacks", "from Basic Attacks", "from Commands", "from Habits", or "from Commands and Habits".
6. Do not infer a Basic Attack damage type when that attack's type is unknown.

## Adding Observation Snapshots

1. Store observations outside the canonical dragon record.
2. Mark `canonical: false`.
3. Record Dragon Level, Star Rank, capture date, game version if known, and modifier context.
4. Do not use observation values for generic comparisons or synergy scores.

## Adding Troop Matchup Rules

1. Store matchup rules separately from dragon affinity.
2. Add only the verified attacker and defender rows.
3. Do not infer the complete matrix from one screenshot.

## Recording Balance Changes

1. Preserve the superseded value in documentation or a future historical data file.
2. Add a source with capture date and game version if known.
3. Update active data only after the source is reviewed.

## Manual Reviews

1. Add or update `ManualReviewRecord` entries in `src/data/manualReviews.ts`.
2. Record the scope being reviewed, status, review date, reviewer, reviewed game build, notes, and evidence IDs.
3. Use `confirmed` only when the data matches manual review.
4. Use `provisional` when a brief review found no mismatch but detailed combat-log validation is still missing.
5. Use `needs-follow-up` when wording, icons, or presentation require another pass.
6. Do not block unrelated verified interactions solely because a separate mechanic needs follow-up.

## Synergy Audits

Use the Formation Builder debug view to inspect trace reasoning and export audit JSON. Audit exports include database version, game build, ordered formation positions, user progression context, and structured traces. Use these exports to compare website reasoning against future combat logs; do not persist generated audit matrices in localStorage.

## Capability Framework Updates

1. Add output capabilities only when a sourced ability or combat-log observation verifies the produced channel.
2. Add modifier capabilities only when the target, direction, channel, source scope, value, and unlock requirements can be represented without guessing.
3. Assign one modifier role: self amplification, ally support, recipient-side amplification, or enemy debuff.
4. Keep self amplification out of outgoing cross-dragon support matching. A dragon may deal or amplify a damage type without supporting that damage type for teammates.
5. Keep every verified output channel for mixed-damage dragons. Do not replace capability matching with a single primary damage tag.
6. Set source scope from explicit wording when present. If wording is unqualified Damage Dealt, use all qualifying sources in the same channel; if wording excludes Basic Attacks, use non-basic attacks.
7. Model position selectors before declaring a match active. Left Flank, Vanguard, Right Flank, self, any lane, adjacency, and eligible-ally selectors must be explicit.
8. Record canonical, observed-account, and user-roster availability separately. The report script must not claim browser localStorage availability.
9. Do not derive authoritative capabilities from effect tags alone. Structured effects or reviewed explicit capabilities are required.
10. Update `docs/SYNERGY_CAPABILITY_FRAMEWORK.md`, `npm run report:synergy`, and tests whenever a capability shape or matching rule changes.
11. For schema 7+ data, add output dependencies for verified scaling, mitigation, conditional status requirements, and repeated conditions.
12. Add `StatusOutputCapability` and `PeriodicDamageDefinition` coverage when an ability applies statuses such as First-Strike, Slow, Burn, or Resistance. Periodic statuses such as Burn should identify their damage channel, scaling stat, mitigation stat, duration, and evidence.
13. For schema 8+ data, model direct defensive teammate support with the `damage-received` channel and `defensive-ally-support` trace kind when the ability directly reduces Damage Received for an ally.
14. Enforce selected-formation boundaries before presenting, exporting, reporting, or validating traces. Do not generate all-roster traces and hide them only in the UI.
15. Keep hard battlefield requirements above progression requirements. Preview mode may unlock future progression but must not override failed position, adjacency, target, source-scope, caster-exclusion, or selected-formation requirements.
16. When a target selector has count 1 and multiple selected recipients qualify, present a target-selection group rather than simultaneous recipient support.
17. Keep periodic damage in the damage channel's normal interaction and as debug metadata; do not show it as a second normal buff.

## Official Roster Check

Run `npm run check:roster` to compare official-site local records with the ordinary public roster page. Pending in-game dragons are ignored for removal/addition checks and reported separately if they appear publicly. The parser intentionally never overwrites local data. Website structure may change, so selector maintenance may be required.

## Versioning

For data releases, update `databaseVersion`, `schemaVersion` when the data shape changes, package version, changelog, and tests together. Version 0.5.2 uses database version `0.5.2`, data schema `8`, current documented game build `26.6.53509`, and local roster schema `3`.
