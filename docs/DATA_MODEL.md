# Data Model

Dragonfire Roster Lab separates public roster metadata from user-owned roster state.

## Production Dragon Records

Seeded dragon records live in `src/data/dragons.ts`. Launch records contain only public identity metadata:

- `id`, `slug`, `name`
- `rarity`
- `breed`
- `officialProfileUrl`
- `isNew`
- `dataStatus`
- `lastVerified`

Unknown combat fields remain empty or null:

- `command: null`
- `habits: []`
- all affinity values are `unknown`
- all stat values are `null`
- `tags: []`

This prevents rarity, breed, or visual presentation from being mistaken for verified combat capability.

## User Roster State

User state is stored separately in localStorage under a versioned payload. It contains:

- `dragonId`
- `owned`
- `starRank`
- `reignLevel`
- personal `notes`

The local format is versioned with `schemaVersion: 1` so future migrations can preserve user data.

## Evidence Sources

Evidence records live in `src/data/evidence.ts` and can represent official pages, official patch notes, in-game screenshots, or community tests. Future combat data should reference evidence source IDs rather than appearing without provenance.

## Extension Points

Historical values are not exposed in the UI yet. When data changes, record the source, date, and superseded value in documentation or a future history file before replacing active data.
