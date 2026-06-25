# Dragonfire Roster Lab

Dragonfire Roster Lab is an unofficial community roster manager and formation-synergy builder for players of Game of Thrones: Dragonfire. It is built as a static React site for GitHub Pages and stores personal roster data locally in the browser.

Screenshot placeholder: add a production screenshot after the first GitHub Pages deployment.

## Current Features

- 30 known in-game dragons: 28 public official-site entries plus Sheepstealer and Vermax as in-game verified pending official-site entries
- Search, rarity filters, breed filters, ownership filters, status filters, and sorting
- Local roster tracking for ownership, Star Rank 1-10, Reign Level, Habit Levels 0-5, and personal notes
- Versioned localStorage persistence with schema migration
- JSON roster export and runtime-validated import
- Three-position Formation Builder for Left Flank, Vanguard, and Right Flank
- Confirmed linear formation adjacency: Left Flank and Right Flank each touch Vanguard, but not each other
- Shareable formation URL hash that preserves positions
- Synergy engine with structured trace output, audit export, and no unsupported numerical scores
- Production debug view for active, inactive, potential, blocked, and unknown formation interactions, including provider-to-recipient amplification traces
- Generic effect-capability framework for Physical Damage, Tactical Damage, Fire Damage, and Recovery matching
- Damage capability matrix and `npm run report:synergy` review report for the currently populated combat datasets
- Partially verified combat datasets for Syrax, Caraxes, Malachite, Seasmoke, Sheepstealer, and Vermax
- Manual-review records for the current screenshot-normalized datasets
- Collection state and shard tracking for not-collected, not-hatched, and hatched dragons
- Status glossary entries for screenshot-verified status effects such as First-Strike, Slow, Burn, Control, Prey, Spreading Blaze, Stolen Flock, Rallying Flame, Advantage, Resistance, and Weakened
- Canonical stat definitions separated from account-specific observations
- Dragon troop affinity separated from troop-type matchup rules
- GitHub Actions CI and GitHub Pages deployment workflows

## Data Limitations

Most dragons still contain official public identity metadata only. Syrax, Caraxes, Malachite, Seasmoke, Sheepstealer, and Vermax have partial screenshot-verified combat datasets reviewed against game build `26.6.53509`. Sheepstealer and Vermax are recorded as in-game verified pending official-site dragons, so their official profile URLs are intentionally null until they appear on the public roster page. Canonical base stats, exact scaling formulas, enemy-formation adjacency, stack expiration behavior, and several source details are not guessed. Unknown values display as `Not yet verified`.

Star Rank is 1-10. Habit Level is separate: `null` means not recorded, `0` means explicitly recorded with no Habit upgrades, and `1-5` are upgraded Habit levels.

Commands, Traits, and Habits use a multi-schedule ability model. The model supports repeated attempts, once-if-any and once-per-match repeats, command augmentations, stack limits, conditional multipliers, field-level verification, and unresolved mechanics.

Warden's Rally has Tactical Damage on rounds 2, 4, 7, and 9, and Recovery on rounds 3, 6, and 9, so round 9 contains both schedules. Vermax's Spreading Blaze is modeled as an after-Basic-Attack trigger and Sheepstealer's Stolen Flock keeps PvE-only behavior separate from generic formation analysis.

The friendly formation is linear: Left Flank - Vanguard - Right Flank. Left Flank is adjacent only to Vanguard, Right Flank is adjacent only to Vanguard, and Vanguard is adjacent to both flanks. Manual combat-log observation confirms Malachite's Warden's Rally Recovery can include Malachite, so exact "3 Allies" effects in the three-dragon friendly formation are normalized as all three friendly dragons including the caster. "Other Allies" still excludes the caster.

Manual ability-text review confirms that "Other Ally" and "Other Allies" exclude the caster, while plain "Ally" and "Allies" allow the caster to be selected when otherwise eligible. Spatial targeting still applies: a caster is not adjacent to itself.

Unqualified Damage Dealt modifiers apply to all qualifying damage sources unless the ability text explicitly restricts or excludes a source. Vermax Warrior's Zeal is combat-log confirmed to affect Vermax Basic Attack Physical Damage. Malachite Forest's Instinct remains non-basic because its wording explicitly excludes Basic Attacks.

Formation analysis can now trace provider-to-recipient amplification. For example, Malachite's Warden's Rally provides Recovery to Sheepstealer, and Sheepstealer's Hunter's Cunning increases Recovery Received while Sheepstealer is Level 16+ and deployed in Vanguard. This is a positional tradeoff, not a formation error: Malachite can provide Recovery from a flank while Sentinel's Presence is inactive outside Vanguard.

Phase 3.7 adds a reusable capability framework instead of relying on one-off dragon pair checks. Dragons expose every verified output channel they can produce and every channel modifier they can provide. Outgoing amplification matches a support modifier, such as Fire Damage Dealt, to recipient outputs in the same channel. Incoming amplification matches an ally-targeted output, such as Recovery, to a recipient-side modifier, such as Recovery Received. Mixed-damage dragons are not reduced to a single tag; primary damage is only a human-readable summary.

The framework honors source scope, position requirements, unlock state, user progression, and preview mode. Unqualified damage modifiers apply to all qualifying sources, while explicit exclusions such as "excluding Basic Attacks" block Basic Attack matches. Locked capabilities can appear as future or potential in preview analysis but are not active for the user's current roster.

Phase 3.7.1 separates modifier roles. A dragon may amplify its own damage without supporting teammates. Self amplification such as Stolen Flock, Warrior's Zeal, Rallying Flame, and Wise Vigor is shown in capability review but cannot create cross-dragon support traces. Ally support, recipient-side amplification, and enemy debuffs are separate roles. Capability availability is also labeled by context: canonical kit, observed account state, and visitor roster state.

Phase 3.8 adds Syrax and Caraxes combat records and expands the framework with status output capabilities, capability dependencies, and periodic damage definitions. The matcher can now explain status-condition enablement, such as Syrax First-Strike enabling Caraxes Infernal Burst's First-Strike multiplier, stat-scaling support, enemy mitigation reduction, and periodic damage amplification for Burn. These traces remain explanatory and do not produce numerical synergy scores.

Phase 3.8.1 reconciles normal Formation Analysis, debug traces, audit exports, and the framework report around the same trace generator. Normal analysis distinguishes eligibility from activation: a dragon can be an eligible target for a support effect while actual execution remains chance-based, target-selection-dependent, locked, or timing-dependent. Targeting facts such as Warden's Rally including Malachite are not displayed as standalone synergies unless another dragon meaningfully modifies or benefits from that effect.

Threshold wording is interpreted literally: "above 50%" means `> 50`, and "below 50%" means `< 50`. Exactly 50% matches neither wording until combat logs confirm otherwise.

Observation snapshots are account-specific and non-canonical. They may be affected by Dragon Level, Star Rank, Stronghold upgrades, faction bonuses, alliance bonuses, and other modifiers.

## Local Development

```bash
npm install
npm run dev
```

## Build, Lint, And Test

```bash
npm run lint
npm run test
npm run build
npm run preview
npm run report:synergy
```

`npm run report:synergy` prints the revised capability matrix, availability context, modifier roles, generated cross-dragon synergies, excluded self modifiers, integrity checks, and unresolved framework assumptions. It is read-only and does not modify source files or localStorage.

## Official Roster Check

```bash
npm run check:roster
```

The checker fetches the ordinary public roster page with a clear User-Agent, compares names, rarity, and breed, and reports differences. Pending in-game dragons are reported separately and are not treated as official-site removals or extras. It never edits local data.

## GitHub Pages Deployment

The Vite base path is relative, so compiled assets work under a project URL such as:

`https://williamchildres.github.io/dragonfire-roster-builder/`

After pushing to GitHub, enable Pages:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

The `Deploy GitHub Pages` workflow builds the app and deploys the `dist` artifact without committing generated files.

## Data Contributions

See:

- `docs/DATA_MODEL.md`
- `docs/CONTRIBUTING_DATA.md`
- `docs/UPDATE_PROCESS.md`
- `docs/COMBAT_LOG_VALIDATION.md`
- `docs/SYNERGY_AUDIT.md`
- `docs/SYNERGY_CAPABILITY_FRAMEWORK.md`

Combat data requires source evidence, field-level verification, and manual-review state when available. Screenshot evidence may be described without committing screenshots or copied game artwork to the public repository. Do not submit credentials, private information, private APIs, extracted assets, or unsourced guesses.

## License

Source code is licensed under the MIT License. This license does not grant rights to third-party game names, trademarks, logos, or assets.

## Trademark Disclaimer

Dragonfire Roster Lab is an unofficial community project and is not affiliated with or endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones: Dragonfire. Game names and related trademarks belong to their respective owners.

## Project Status

Version `0.5.1` fixes Formation Builder trace presentation for Phase 3.8 interactions. Data schema is `7`; local roster schema remains `3`.

## Planned Next Steps

1. Validate unresolved mechanics with archived combat-log examples.
2. Add sourced combat datasets for the remaining official-site dragons.
3. Add historical data records for balance changes and superseded values.
