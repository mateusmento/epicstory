export type ScheduleViewType = "month" | "week" | "day";

export const SCHEDULE_DEFAULT_VIEW: ScheduleViewType = "month";

export const SCHEDULE_VIEW_QUERY_KEY = "view";

/** Deep-link intent: open create-meeting dialog with this channel pre-selected. */
export const SCHEDULE_CHANNEL_ID_QUERY_KEY = "scheduleChannelId";
