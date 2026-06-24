# Update Process

Use this process to keep roster data traceable.

## Adding A Newly Discovered Dragon

1. Add a new record to `src/data/dragons.ts`.
2. Set unknown combat fields to null, empty arrays, or `unknown`.
3. Add evidence in `src/data/evidence.ts`.
4. Update `databaseMetadata`.
5. Add or update data-integrity tests.

## Changing Rarity Or Breed

1. Record the previous value in the change notes or future history structure.
2. Add the source evidence.
3. Update the active dragon record.
4. Run the data-integrity tests.

## Adding Commands, Habits, Affinities, Stats, Or Tags

1. Add only sourced values.
2. Attach `sourceIds`.
3. Set `dataStatus` to the appropriate verification level.
4. Update synergy rules only when the tags and behavior are verified.
5. Add tests for any new engine behavior.

## Recording Balance Changes

1. Preserve the superseded value in documentation or a future historical data file.
2. Add a source with capture date and game version if known.
3. Update active data only after the source is reviewed.

## Official Roster Check

Run `npm run check:roster` to compare the local roster with the ordinary public roster page. The parser intentionally never overwrites local data. Website structure may change, so selector maintenance may be required.
