export const SCHEDULING_SCHEMA = 'scheduling';

export const ScheduledJobTypes = {
  calendar_event_reminder: 'calendar_event_reminder',
  meeting_reminder: 'meeting_reminder',
  meeting_start: 'meeting_start',
  due_issue_reminder: 'due_issue_reminder',
  scheduled_message: 'scheduled_message',
} as const;
