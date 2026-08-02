# Historical audit contracts — 0.23.3

## Formation Rating v2 profile input

Historical Formation Rating v2 uses `src/audit/fixtures/historicalFormationRatingV2Profiles.0.23.2.json`, captured directly from base commit `2832d64c75621ce2fcf57385d716df2f2de52aab` before the 0.23.3 targeting correction.

- Schema version: 1
- Rating contract: `formation-rating-v2`
- Profiles: 33
- Signals: 239
- Deterministic input identity: `sha256:68343cd6bfa67e10f616cf8c3ee109f0d19026058cbf6ffb53776aa6cb758719`
- Protected exhaustive result: `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`

The historical module imports only this snapshot, validates its fixed metadata, and deeply freezes it. It does not import `simpleSynergyProfiles`, clone current profiles, or remove a list of current-only fields. Current Formation Rating v3 continues to consume current production profiles, including `capability-priority-one`.

## Optimizer-v6 approved historical deltas

The immutable optimizer-v5 artifact remains `fnv1a64:e5ac2432442f5cb0`. Optimizer v5 and v6 use different serialization contracts, so their solution/result hashes may differ even when the selected stable key and ascending power/rating vectors are semantically identical. Historical selection drift is therefore detected by the stable solution key plus both vectors; hashes are retained as exact before/after evidence for every approved changed record.

The committed manifest is `src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.3.json`.

- Schema version: 1
- Approved changed executions: exactly 50
- Reason: `syrax-blazing-fury-recipient-correction`
- Allocation modes: 22 Strongest First and 28 Balanced records
- Best Overall entries: 0, because optimizer v5 has no Best Overall baseline
- Manifest identity: `sha256:7630e354700b908f4e3c86379552a2c13b9e6d1034a0fdaa011772cd4eaff69a`

Each manifest entry fixes the fixture ID, allocation mode, formation count, input order, historical/current stable solution keys, historical/current ascending power and rating vectors, historical/current solution and result hashes, and reason code. Audit validation requires the actual semantic delta set to equal the manifest exactly. Missing, unexpected, duplicated, or differently changed records fail; unchanged historical-compatible executions must remain unchanged. Forward/reverse equality, exact reconstruction, and no-duplicate-dragon checks remain independent mandatory gates.
