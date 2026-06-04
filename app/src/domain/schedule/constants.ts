export const SCHEDULE_WEEK_STARTS_ON = 1 as const; // Monday
export const SCHEDULE_MONTH_GRID_DAYS = 42;
export const SCHEDULE_MAX_EVENTS_PER_DAY_CELL = 4;

export const SCHEDULE_HOUR_SLOT_HEIGHT_CLASS = "h-16";
export const SCHEDULE_HOUR_SLOT_PX = 64; // must match Tailwind SCHEDULE_HOUR_SLOT_HEIGHT_CLASS
export const SCHEDULE_PX_PER_MINUTE = SCHEDULE_HOUR_SLOT_PX / 60; // must match Tailwind h-16 minus m-1 vertical margins

export type ScheduleViewType = "month" | "week" | "day";

export const SCHEDULE_DEFAULT_VIEW: ScheduleViewType = "month";

export const SCHEDULE_VIEW_QUERY_KEY = "view";

/** Deep-link intent: open create-meeting dialog with this channel pre-selected. */
export const SCHEDULE_CHANNEL_ID_QUERY_KEY = "scheduleChannelId";

export type CalendarItemType = "event" | "meeting";

export const SCHEDULE_HOURS = Array.from({ length: 24 }, (_, i) => i);

/** In-memory draft shown while drag-creating; never sent to the API. */
export const SCHEDULE_DRAFT_EVENT_ID = "__schedule-draft__";
