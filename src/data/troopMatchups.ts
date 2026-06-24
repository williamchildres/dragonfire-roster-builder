import type { FieldVerification } from '../models/dragon';
import type { TroopMatchupRule } from '../models/stats';
import { databaseMetadata } from './databaseMetadata';

const screenshotVerification: FieldVerification = {
  status: 'screenshot-verified',
  source: 'Army Builder screenshot',
  capturedAt: '2026-06-23',
  gameVersion: databaseMetadata.currentDocumentedGameBuild,
  reviewedManually: true,
};

export const troopMatchupRules: TroopMatchupRule[] = [
  {
    attacker: 'Shieldbearers',
    defender: 'Archers',
    damageModifierPercent: 7,
    verification: screenshotVerification,
    evidenceIds: ['shieldbearer-troop-matchup-2026-06-23'],
  },
  {
    attacker: 'Shieldbearers',
    defender: 'Siege',
    damageModifierPercent: 7,
    verification: screenshotVerification,
    evidenceIds: ['shieldbearer-troop-matchup-2026-06-23'],
  },
  {
    attacker: 'Shieldbearers',
    defender: 'Cavalry',
    damageModifierPercent: -7,
    verification: screenshotVerification,
    evidenceIds: ['shieldbearer-troop-matchup-2026-06-23'],
  },
];
