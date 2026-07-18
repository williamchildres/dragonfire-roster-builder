import { Check, Circle, LockKeyhole, X, type LucideIcon } from 'lucide-react';
import type { FormationSignalChip } from './formationCardPresentation';

export type FormationSignalStateMarker = 'active' | 'available' | 'progression-locked' | 'inactive';

export function formationSignalStateMarker(chip: FormationSignalChip): {
  Icon: LucideIcon;
  marker: FormationSignalStateMarker;
} {
  if (chip.state === 'supported' || chip.state === 'used' || chip.state === 'satisfied') {
    return { Icon: Check, marker: 'active' };
  }
  if (chip.state === 'available') {
    return { Icon: Circle, marker: 'available' };
  }
  if (chip.inactiveCause === 'star-rank' || chip.inactiveCause === 'dragon-level') {
    return { Icon: LockKeyhole, marker: 'progression-locked' };
  }
  return { Icon: X, marker: 'inactive' };
}
