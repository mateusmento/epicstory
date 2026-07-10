/** 15-minute clock slots and duration helpers for calendar item dialogs. */

export const TIME_SLOT_STEP_MINUTES = 15;

export const DURATION_PRESETS_MINUTES = [15, 30, 45, 60, 90, 120] as const;

export type DurationPresetMinutes = (typeof DURATION_PRESETS_MINUTES)[number];

const SLOT_COUNT = (24 * 60) / TIME_SLOT_STEP_MINUTES;

export const TIME_SLOTS: readonly string[] = Object.freeze(
  Array.from({ length: SLOT_COUNT }, (_, i) => {
    const total = i * TIME_SLOT_STEP_MINUTES;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }),
);

export function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const day = 24 * 60;
  const normalized = ((totalMinutes % day) + day) % day;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const base = parseTimeToMinutes(time);
  if (base == null) return time;
  return minutesToTime(base + minutes);
}

/** Same-day duration; null if either time is invalid or end is not after start. */
export function durationMinutesBetween(start: string, end: string): number | null {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s == null || e == null) return null;
  const d = e - s;
  return d > 0 ? d : null;
}

export function isDurationPreset(minutes: number): minutes is DurationPresetMinutes {
  return (DURATION_PRESETS_MINUTES as readonly number[]).includes(minutes);
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours}h`;
}

/** Display "9:00" instead of "09:00". */
export function formatTimeDisplay(hhmm: string): string {
  const mins = parseTimeToMinutes(hhmm);
  if (mins == null) return hhmm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Ensure the selected value appears in the list (odd edit times). */
export function timeSlotsIncluding(selected: string): string[] {
  if (TIME_SLOTS.includes(selected)) return [...TIME_SLOTS];
  const selectedMins = parseTimeToMinutes(selected);
  if (selectedMins == null) return [...TIME_SLOTS];
  const next = [...TIME_SLOTS, selected];
  next.sort((a, b) => (parseTimeToMinutes(a) ?? 0) - (parseTimeToMinutes(b) ?? 0));
  return next;
}
