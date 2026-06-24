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
- Shareable formation URL hash that preserves positions
- Synergy engine with tested synthetic fixtures and no unsupported scores
- Partially verified combat datasets for Malachite, Seasmoke, Sheepstealer, and Vermax
- Collection state and shard tracking for not-collected, not-hatched, and hatched dragons
- Status glossary entries for screenshot-verified status effects such as Prey, Spreading Blaze, Stolen Flock, Rallying Flame, Advantage, Resistance, and Weakened
- Canonical stat definitions separated from account-specific observations
- Dragon troop affinity separated from troop-type matchup rules
- GitHub Actions CI and GitHub Pages deployment workflows

## Data Limitations

Most dragons still contain official public identity metadata only. Malachite, Seasmoke, Sheepstealer, and Vermax have partial screenshot-verified combat datasets. Sheepstealer and Vermax are recorded as in-game verified pending official-site dragons, so their official profile URLs are intentionally null until they appear on the public roster page. Canonical base stats, exact scaling formulas, and the exact within-adjacency graph are not guessed. Unknown values display as `Not yet verified`.

Star Rank is 1-10. Habit Level is separate: `null` means not recorded, `0` means explicitly recorded with no Habit upgrades, and `1-5` are upgraded Habit levels.

Commands, Traits, and Habits use a multi-schedule ability model. The model supports repeated attempts, once-if-any and once-per-match repeats, command augmentations, stack limits, conditional multipliers, field-level verification, and unresolved mechanics.

Warden's Rally has Tactical Damage on rounds 2, 4, 7, and 9, and Recovery on rounds 3, 6, and 9, so round 9 contains both schedules. Vermax's Spreading Blaze is modeled as an after-Basic-Attack trigger and Sheepstealer's Stolen Flock keeps PvE-only behavior separate from generic formation analysis.

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
```

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

Combat data requires source evidence and field-level verification. Screenshot evidence may be described without committing screenshots or copied game artwork to the public repository. Do not submit credentials, private information, private APIs, extracted assets, or unsourced guesses.

## License

Source code is licensed under the MIT License. This license does not grant rights to third-party game names, trademarks, logos, or assets.

## Trademark Disclaimer

Dragonfire Roster Lab is an unofficial community project and is not affiliated with or endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones: Dragonfire. Game names and related trademarks belong to their respective owners.

## Project Status

Version `0.3.0` adds Seasmoke, Sheepstealer, and Vermax combat data, schema 3 collection tracking, pending official-site source status, and richer conditional ability modeling.

## Planned Next Steps

1. Confirm the exact within-adjacency graph and ambiguous target-inclusion rules.
2. Add sourced combat datasets for the remaining official-site dragons.
3. Add historical data records for balance changes and superseded values.
