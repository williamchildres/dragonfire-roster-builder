import type { EvidenceSource } from '../models/dragon';

export const evidenceSources: EvidenceSource[] = [
  {
    id: 'official-roster-2026-06-23',
    type: 'official-page',
    title: 'Official public Dragonfire roster page',
    url: 'https://gotdragonfire.com/dragons/',
    capturedAt: '2026-06-23',
    gameVersion: null,
    submittedBy: null,
    verificationStatus: 'official-metadata-only',
  },
  ...(
    [
    ['malachite-main-screen-2026-06-23', 'Malachite main screen'],
    ['malachite-star-progression-2026-06-23', 'Malachite Star progression'],
    ['malachite-sentinels-presence-2026-06-23', "Sentinel's Presence"],
    ['malachite-forests-instinct-2026-06-23', "Forest's Instinct"],
    ['malachite-wise-vigor-2026-06-23', 'Wise Vigor'],
    ['malachite-thunderous-roar-2026-06-23', 'Thunderous Roar'],
    ['malachite-collective-might-2026-06-23', 'Collective Might'],
    ['malachite-lightning-strike-2026-06-23', 'Lightning Strike'],
    ['malachite-wardens-rally-summary-2026-06-23', "Warden's Rally summary"],
    ['malachite-wardens-rally-glossary-2026-06-23', "Warden's Rally glossary"],
    ['army-builder-formation-2026-06-23', 'Army Builder formation'],
    ['shieldbearer-troop-matchup-2026-06-23', 'Shieldbearer troop matchup'],
  ] as const
  ).map(([id, title]) => ({
    id,
    type: 'in-game-screenshot' as const,
    title,
    description:
      'Descriptive evidence label only. Screenshot files are not committed to the public repository.',
    url: null,
    capturedAt: '2026-06-23',
    language: 'English' as const,
    gameVersion: null,
    submittedBy: 'repository owner',
    reviewedManually: true,
    verificationStatus: 'community-verified' as const,
  })),
];
