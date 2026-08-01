# Saved Formation Library 0.23.0 audit

- Contract identity: `fnv1a64:1e1f6e4c02946489`
- Format: `dragonfire-lab-saved-formations`
- Schema: `1`
- Browser key: `dragonfire-roster-lab:saved-formations`
- Maximum records: `50`
- Maximum trimmed name length: `80`
- Semantic order: yes
- Persisted derived rating, reliability, power, optimizer score, rank, or hash: no

Run `pnpm run audit:saved-formations`. Focused tests cover parsing, record isolation, normalization, CRUD, evaluation, progression comparison, import/export, cloud mapping, repository calls, synchronization states, UI flows, and migration/RLS text.

The audit identity is separate from Formation Rating, reliability, Estimated Power, and optimizer identities.
