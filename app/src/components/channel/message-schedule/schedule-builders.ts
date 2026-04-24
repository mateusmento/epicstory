import type { IScheduledMessageRecurrence } from "@/domain/channels/types/scheduled-message.type";
import {
  addDays,
  addHours,
  addMinutes,
  addSeconds,
  format,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from "date-fns";

export type SchedulePresetId =
  | "in10s"
  | "in1m"
  | "in2h"
  | "tomorrow9"
  | "in2days9"
  | "nextMonday9"
  | "nextWeek9";

export type ResolvedSchedule = {
  dueAt: Date;
  recurrence: IScheduledMessageRecurrence;
  /** For UI */
  label: string;
};

function atNineAm(d: Date): Date {
  return setSeconds(setMinutes(setHours(d, 9), 0), 0);
}

/**
 * "Next week 9 AM": same weekday, 7 days from today at 09:00 (browser-local).
 */
export function resolveSchedulePreset(preset: SchedulePresetId): ResolvedSchedule {
  const now = new Date();
  switch (preset) {
    case "in10s": {
      const dueAt = addSeconds(now, 10);
      return {
        dueAt,
        recurrence: { frequency: "once" },
        label: "In 10 seconds",
      };
    }
    case "in1m": {
      const dueAt = addMinutes(now, 1);
      return {
        dueAt,
        recurrence: { frequency: "once" },
        label: "In 1 minute",
      };
    }
    case "in2h": {
      const dueAt = addHours(now, 2);
      return {
        dueAt,
        recurrence: { frequency: "once" },
        label: "In 2 hours",
      };
    }
    case "tomorrow9": {
      const dueAt = atNineAm(addDays(startOfDay(now), 1));
      return {
        dueAt,
        recurrence: { frequency: "once" },
        label: "Tomorrow 9:00 AM",
      };
    }
    case "in2days9": {
      const dueAt = atNineAm(addDays(startOfDay(now), 2));
      return {
        dueAt,
        recurrence: { frequency: "once" },
        label: "In 2 days 9:00 AM",
      };
    }
    case "nextMonday9": {
      const d = startOfDay(now);
      const day = d.getDay();
      let add = (8 - day) % 7;
      if (add === 0) add = 7;
      const dueAt = atNineAm(addDays(d, add));
      return {
        dueAt,
        recurrence: { frequency: "once" },
        label: "Next Monday 9:00 AM",
      };
    }
    case "nextWeek9": {
      const d = atNineAm(addDays(startOfDay(now), 7));
      return {
        dueAt: d,
        recurrence: { frequency: "once" },
        label: "Next week 9:00 AM",
      };
    }
  }
}

export function formatScheduleSummary(s: ResolvedSchedule): string {
  if (s.recurrence.frequency === "once") {
    return `${format(s.dueAt, "EEE, MMM d · p")} · once`;
  }
  if (s.recurrence.frequency === "daily") {
    const n =
      s.recurrence.interval && s.recurrence.interval > 1
        ? `Every ${s.recurrence.interval} days`
        : "Every day";
    return `${n} at ${s.recurrence.timeOfDay}`;
  }
  const w = s.recurrence.weekdays?.length ? s.recurrence.weekdays.map(dayLabel).join(", ") : "Weekly";
  return `${w} at ${s.recurrence.timeOfDay}`;
}

function dayLabel(dow: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow] ?? String(dow);
}

export function clearSchedule() {
  // hook for future side effects; MessageWriter clears `activeSchedule` directly
}
