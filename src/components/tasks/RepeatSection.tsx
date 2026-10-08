import { Segmented, inputClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { addDays, parseISODate } from '@/lib/dates'
import type { ISODate, RecurrenceFrequency } from '@/types'
import type { RepeatDraft, RepeatMode } from './repeat-draft'

const INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const labelClass = 'mb-1.5 block text-sm text-muted'

/** The Repeat controls: kept small, shown only as far as the chosen option needs. */
export function RepeatSection({
  value,
  onChange,
  today,
  existing = false,
}: {
  value: RepeatDraft
  onChange: (next: RepeatDraft) => void
  today: ISODate
  /** Editing a series that already exists: its start is history, so it is shown, not edited. */
  existing?: boolean
}) {
  const set = (patch: Partial<RepeatDraft>) => onChange({ ...value, ...patch })
  const frequency: RecurrenceFrequency | null =
    value.mode === 'none' ? null : value.mode === 'custom' ? value.unit : value.mode
  const starts: 'today' | 'date' = value.startsOn === today ? 'today' : 'date'

  const toggleDay = (d: number) => {
    const has = value.daysOfWeek.includes(d)
    if (has && value.daysOfWeek.length === 1) return // at least one day stays selected
    set({ daysOfWeek: has ? value.daysOfWeek.filter((x) => x !== d) : [...value.daysOfWeek, d].sort() })
  }

  return (
    <div className="space-y-4">
      <div>
        <span className={labelClass}>Repeat</span>
        <Segmented<RepeatMode>
          label="Repeat"
          value={value.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: 'none', label: 'Does not repeat' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
      </div>

      {value.mode === 'custom' ? (
        <div className="flex items-center gap-2 text-base">
          <span className="text-muted">Every</span>
          <input
            type="number"
            min={1}
            max={99}
            aria-label="Repeat every"
            className={cn(inputClass, 'w-20')}
            value={value.interval}
            onChange={(e) => set({ interval: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
          />
          <select
            aria-label="Repeat unit"
            className={cn(inputClass, 'w-auto')}
            value={value.unit}
            onChange={(e) => set({ unit: e.target.value as RecurrenceFrequency })}
          >
            <option value="daily">days</option>
            <option value="weekly">weeks</option>
            <option value="monthly">months</option>
          </select>
        </div>
      ) : null}

      {frequency === 'weekly' ? (
        <div>
          <span className={labelClass}>On</span>
          <div role="group" aria-label="Days of the week" className="flex gap-1.5">
            {INITIALS.map((initial, d) => {
              const on = value.daysOfWeek.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={NAMES[d]}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'size-9 rounded-full border text-sm transition-colors',
                    on
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-line bg-surface text-muted hover:border-[var(--line-strong)] hover:text-ink',
                  )}
                >
                  {initial}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {frequency === 'monthly' ? (
        <div>
          <label className={labelClass} htmlFor="repeat-day-of-month">
            On day
          </label>
          <select
            id="repeat-day-of-month"
            className={cn(inputClass, 'w-24')}
            value={value.dayOfMonth}
            onChange={(e) => set({ dayOfMonth: Number(e.target.value) })}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {value.dayOfMonth > 28 ? (
            <p className="mt-1.5 text-sm text-muted">In shorter months it happens on the last day.</p>
          ) : null}
        </div>
      ) : null}

      {value.mode !== 'none' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>{existing ? 'Started' : 'Starts'}</span>
            {existing ? (
              <p className="flex h-10 items-center text-base">
                {parseISODate(value.startsOn).toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            ) : (
              <>
                <Segmented<'today' | 'date'>
                  label="Starts"
                  value={starts}
                  onChange={(v) => set({ startsOn: v === 'today' ? today : addDays(today, 1) })}
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: 'date', label: 'Pick a day' },
                  ]}
                />
                {starts === 'date' ? (
                  <input
                    type="date"
                    aria-label="Start date"
                    min={today}
                    className={cn(inputClass, 'mt-2 w-auto')}
                    value={value.startsOn}
                    onChange={(e) => e.target.value && set({ startsOn: e.target.value })}
                  />
                ) : null}
              </>
            )}
          </div>
          <div>
            <span className={labelClass}>Ends</span>
            <Segmented<'never' | 'date'>
              label="Ends"
              value={value.endsOn ? 'date' : 'never'}
              onChange={(v) => set({ endsOn: v === 'never' ? null : addDays(value.startsOn, 30) })}
              options={[
                { value: 'never', label: 'Never' },
                { value: 'date', label: 'On a date' },
              ]}
            />
            {value.endsOn ? (
              <input
                type="date"
                aria-label="End date"
                min={value.startsOn}
                className={cn(inputClass, 'mt-2 w-auto')}
                value={value.endsOn}
                onChange={(e) => set({ endsOn: e.target.value || null })}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
