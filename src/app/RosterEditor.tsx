import { ArrowLeft, BookOpen, LockKeyhole, Save, Trash2 } from 'lucide-react';
import type { AccountSession } from '../cloud/types';
import type { RosterSyncStatus } from '../hooks/useRosterSync';
import type { Dragon, OwnedDragon } from '../models/dragon';
import { isHabitUnlocked } from '../services/habitLevels';
import { MAX_NOTES_LENGTH } from '../services/rosterStorage';
import { RosterDragonEmblem } from './RosterList';
import { lockedHabitRequirement } from './rosterHabitRequirements';

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
  const unlockedHabits = dragon.habits.filter((habit) => isHabitUnlocked(habit, rosterEntry));

  return (
    <aside className="roster-editor-pane" aria-labelledby="roster-editor-title" ref={editorRef} tabIndex={-1}>
      <button type="button" className="text-button roster-editor-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" /> Back to roster
      </button>

      <header className="roster-editor-header">
        <RosterDragonEmblem dragon={dragon} />
        <div className="roster-editor-identity">
          <h3 id="roster-editor-title">{dragon.name}</h3>
          <p>{dragon.rarity} · {dragon.breed}</p>
        </div>
        <button type="button" className="secondary-button roster-details-action" onClick={() => onOpenDetails(dragon)}>
          <BookOpen size={16} aria-hidden="true" /> Dragon details
        </button>
      </header>

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
            <p>{unlockedHabits.length} of {dragon.habits.length} habits unlocked</p>
          </div>
          <div className="roster-habit-list">
            {dragon.habits.map((habit) => {
              const unlocked = isHabitUnlocked(habit, rosterEntry);
              return unlocked ? (
                <label className="roster-habit-row is-unlocked" key={habit.id}>
                  <span className="roster-habit-name">{habit.name}</span>
                  <span className="roster-habit-level-control">
                    <span>Level</span>
                    <select
                      aria-label={habit.name}
                      value={rosterEntry.habitLevels[habit.id] ?? 1}
                      onChange={(event) => onUpdateRoster(dragon.id, {
                        habitLevels: {
                          ...rosterEntry.habitLevels,
                          [habit.id]: Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                        },
                      })}
                    >
                      {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </span>
                </label>
              ) : (
                <div className="roster-habit-row is-locked" key={habit.id} aria-label={`${habit.name}, locked. ${lockedHabitRequirement(habit, rosterEntry)}`}>
                  <span className="roster-habit-name">{habit.name}</span>
                  <span className="roster-habit-lock-state"><LockKeyhole size={16} aria-hidden="true" /><strong>Locked</strong></span>
                  <span className="roster-habit-requirement">{lockedHabitRequirement(habit, rosterEntry)}</span>
                </div>
              );
            })}
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
        <Save size={15} aria-hidden="true" /> <span>{autosaveMessage(session, syncStatus)}</span>
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
