# Dragonfire Roster Lab

Dragonfire Roster Lab is an unofficial community roster manager and team-synergy builder for players of Game of Thrones: Dragonfire. It is built as a static React site for GitHub Pages and stores personal roster data locally in the browser.

Screenshot placeholder: add a production screenshot after the first GitHub Pages deployment.

## Current Features

- All 28 launch-seeded dragons with public identity metadata
- Search, rarity filters, breed filters, ownership filters, status filters, and sorting
- Local roster tracking for ownership, Star Rank, Reign Level, and personal notes
- Versioned localStorage persistence
- JSON roster export and runtime-validated import
- Three-slot team builder with duplicate prevention
- Shareable team URL hash
- Synergy engine with tested synthetic fixtures
- Dedicated data-status view explaining unknown combat fields
- GitHub Actions CI and GitHub Pages deployment workflows

## Data Limitations

The first database contains official public identity metadata only. Commands, Habits, combat stats, affinities, trigger percentages, and effect tags are not guessed. Unknown values display as `Not yet verified`.

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

The checker fetches the ordinary public roster page with a clear User-Agent, compares names, rarity, and breed, and reports differences. It never edits local data.

## GitHub Pages Deployment

The Vite base path is relative, so compiled assets work under a project URL such as:

`https://USERNAME.github.io/dragonfire-roster-builder/`

After pushing to GitHub, enable Pages:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

The `Deploy GitHub Pages` workflow builds the app and deploys the `dist` artifact without committing generated files.

## Data Contributions

See:

- `docs/DATA_MODEL.md`
- `docs/CONTRIBUTING_DATA.md`
- `docs/UPDATE_PROCESS.md`

Combat data requires source evidence. Do not submit credentials, private information, private APIs, extracted assets, or unsourced guesses.

## License

Source code is licensed under the MIT License. This license does not grant rights to third-party game names, trademarks, logos, or assets.

## Trademark Disclaimer

Dragonfire Roster Lab is an unofficial community project and is not affiliated with or endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones: Dragonfire. Game names and related trademarks belong to their respective owners.

## Project Status

Version `0.1.0` is a production-quality first pass for static hosting and local roster planning.

## Planned Next Steps

1. Add a sourced community submission workflow for verified combat data.
2. Expand the synergy rules as verified Commands, Habits, affinities, and tags become available.
3. Add visual regression checks for common mobile and desktop breakpoints.
