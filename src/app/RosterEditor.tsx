import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import type { AccountSession } from '../cloud/types';
import type { RosterSyncStatus } from '../hooks/useRosterSync';
import type { Dragon, OwnedDragon } from '../models/dragon';
import { MAX_NOTES_LENGTH } from '../services/rosterStorage';
import { recordedHabitCount } from './rosterWorkspaceState';
import { RosterDragonEmblem } from './RosterList';

export function RosterEditor({
  dragon,
  rosterEntry,
  session,
  syncStatus,
  onBack,
  onOpenDetails,
  onRemove,
  onUpdateRoster,
  editorRef,
}: {
  dragon: Dragon;
  rosterEntry: OwnedDragon;
  session: AccountSession | null;
  syncStatus: RosterSyncStatus;
  onBack: () => void;
  onOpenDetails: (dragon: Dragon) => void;
  onRemove: () => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
  editorRef: React.RefObject<HTMLElement | null>;
}) {
  const recordedHabits = recordedHabitCount(dragon, rosterEntry);

  return (
    <aside className="roster-editor-pane" aria-labelledby="roster-editor-title" ref={editorRef} tabIndex={-1}>
      <button type="button" className="text-button roster-editor-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" /> Back to roster
      </button>

      <header className="roster-editor-header">
        <RosterDragonEmblem dragon={dragon} />
        <div>
          <p className="eyebrow">Selected dragon</p>
          <h3 id="roster-editor-title">{dragon.name}</h3>
          <p>{dragon.rarity} · {dragon.breed}</p>
        </div>
      </header>

      <button type="button" className="secondary-button roster-details-action" onClick={() => onOpenDetails(dragon)}>
        View full details <ExternalLink size={16} aria-hidden="true" />
      </button>

      <form className="roster-editor-form" onSubmit={(event) => event.preventDefault()}>
        <section aria-labelledby="roster-progression-title">
          <div className="roster-editor-section-heading">
            <h4 id="roster-progression-title">Progression</h4>
          </div>
          <div className="roster-editor-primary-fields">
            <label>
              Star Rank
              <select
                value={rosterEntry.starRank ?? ''}
                onChange={(event) => onUpdateRoster(dragon.id, { starRank: event.target.value === '' ? null : Number(event.target.value) })}
              >
                <option value="">Unknown / not recorded</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => <option key={rank} value={rank}>{rank}</option>)}
              </select>
            </label>
            <label>
              Dragon Level
              <input
                min={0}
                step={1}
                type="number"
                inputMode="numeric"
                value={rosterEntry.reignLevel ?? ''}
                placeholder="Unknown / not recorded"
                onChange={(event) => onUpdateRoster(dragon.id, {
                  reignLevel: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10)),
                })}
              />
            </label>
          </div>
        </section>

        <section aria-labelledby="roster-habits-title">
          <div className="roster-editor-section-heading">
            <h4 id="roster-habits-title">Habit Levels</h4>
            <p>{recordedHabits} of {dragon.habits.length} Habit Levels recorded</p>
          </div>
          <div className="roster-habit-fields">
            {dragon.habits.map((habit) => (
              <label key={habit.id}>
                {habit.name}
                <select
                  value={rosterEntry.habitLevels[habit.id] ?? ''}
                  onChange={(event) => onUpdateRoster(dragon.id, {
                    habitLevels: {
                      ...rosterEntry.habitLevels,
                      [habit.id]: event.target.value === '' ? null : Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5,
                    },
                  })}
                >
                  <option value="">Unknown / not recorded</option>
                  {[0, 1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="roster-notes-title">
          <div className="roster-editor-section-heading">
            <h4 id="roster-notes-title">Notes</h4>
          </div>
          <label>
            Personal notes for {dragon.name}
            <textarea
              rows={5}
              maxLength={MAX_NOTES_LENGTH}
              value={rosterEntry.notes}
              onChange={(event) => onUpdateRoster(dragon.id, { notes: event.target.value })}
              placeholder="Formation ideas, progression plans, or reminders"
            />
          </label>
        </section>
      </form>

      <p className="roster-autosave-note" role="note">
        {autosaveMessage(session, syncStatus)}
      </p>

      <section className="roster-editor-danger" aria-labelledby="roster-remove-title">
        <h4 id="roster-remove-title">Roster ownership</h4>
        <p>Progression and notes stay available if you add this dragon again.</p>
        <button type="button" className="danger-button" onClick={onRemove}>
          <Trash2 size={17} aria-hidden="true" /> Remove from roster
        </button>
      </section>
    </aside>
  );
}

function autosaveMessage(session: AccountSession | null, syncStatus: RosterSyncStatus): string {
  if (!session) return 'Changes save automatically in this browser.';
  if (syncStatus === 'syncing' || syncStatus === 'synced') {
    return 'Changes save automatically in this browser and synchronize to your account.';
  }
  return 'Changes save automatically in this browser. Account synchronization follows the status shown above.';
}
