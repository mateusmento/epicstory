<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/design-system";
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group";
import { useAuth } from "@/domain/auth";
import { useChannels } from "@/domain/channels";
import { CalendarEventApi } from "@/domain/calendar";
import { useWorkspace } from "@/domain/workspace";
import { useMeetingSocket } from "@/domain/channels/composables/meeting-socket";
import { getLocalTimeZone, parseDate, toCalendarDate, today as todayFn } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import {
  addDays,
  endOfWeek as dateFnsEndOfWeek,
  startOfWeek as dateFnsStartOfWeek,
  eachDayOfInterval,
  endOfDay,
  format,
  getHours,
  isSameMonth,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { CalendarEventDto } from "@/domain/calendar/api/calendar-event.api";

type ViewType = "month" | "week" | "day";

const { user } = useAuth();
const { workspace, members, fetchWorkspaceMembers } = useWorkspace();
const { channels, fetchChannels } = useChannels();

const calendarEventApi = useDependency(CalendarEventApi);
const route = useRoute();
const router = useRouter();
const meetingSocket = useMeetingSocket();

const today = () => todayFn(getLocalTimeZone());

const currentView = ref<ViewType>("month");
const currentDate = ref<DateValue>(today());
const events = ref<CalendarEventDto[]>([]);
const showEventDialog = ref(false);
const editingEvent = ref<CalendarEventDto | null>(null);
const eventTitle = ref("");
const eventDescription = ref("");
const eventDateTime = ref<DateValue>(today());
const eventTime = ref("09:00");
const eventEndTime = ref("10:00");

type ItemType = "event" | "meeting";
const itemType = ref<ItemType>("event");
const meetingChannelId = ref<number | null>(null);
const meetingIsPublic = ref(true);
const meetingNotifyMinutesBefore = ref(1);
const meetingParticipantIds = ref<number[]>([]);
type RecurrenceFrequency = "once" | "daily" | "weekly";
const meetingRecurrenceFrequency = ref<RecurrenceFrequency>("weekly");
const meetingRecurrenceInterval = ref(1);
const meetingRecurrenceByWeekday = ref<number[]>([new Date().getDay()]);

type EventRecurrenceFrequency = "once" | "daily" | "weekly";
const eventRecurrenceFrequency = ref<EventRecurrenceFrequency>("once");
const eventRecurrenceInterval = ref(1);
const eventRecurrenceByWeekday = ref<number[]>([new Date().getDay()]);

const isCreating = ref(false);
const isLoading = ref(false);
const isResizing = ref(false);
const resizingEvent = ref<CalendarEventDto | null>(null);
const resizeType = ref<"start" | "end" | null>(null);
const resizeStartY = ref(0);
const resizeStartTime = ref(0);

const HOUR_SLOT_PX = 64; // Must match h-16 in template
const PX_PER_MINUTE = HOUR_SLOT_PX / 60;

const WEEK_STARTS_ON = 1 as const; // Monday (Google Calendar style)
const MONTH_GRID_DAYS = 42; // Always render 6 weeks for a stable month grid
const MAX_EVENTS_PER_DAY_CELL = 4;

// Compute date range for fetching events
const dateRange = computed(() => {
  const dateValue = currentDate.value;
  const date = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
  let start: Date;
  let end: Date;

  if (currentView.value === "month") {
    const monthStart = dateFnsStartOfWeek(startOfMonth(date), { weekStartsOn: WEEK_STARTS_ON });
    start = monthStart;
    end = addDays(monthStart, MONTH_GRID_DAYS - 1);
  } else if (currentView.value === "week") {
    start = dateFnsStartOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
    end = dateFnsEndOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  } else {
    start = startOfDay(date);
    end = endOfDay(date);
  }

  return { start, end };
});

const activeMonthAnchor = computed(() => {
  return new Date(currentDate.value.year, currentDate.value.month - 1, 1);
});

const monthGridDays = computed(() => {
  return eachDayOfInterval({
    start: dateRange.value.start,
    end: dateRange.value.end,
  });
});

const monthWeekdayLabels = computed(() => {
  const base = dateFnsStartOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => format(addDays(base, i), "EEE"));
});

function toggleParticipant(userId: number, enabled: boolean) {
  const set = new Set(meetingParticipantIds.value);
  if (enabled) set.add(userId);
  else set.delete(userId);
  meetingParticipantIds.value = Array.from(set.values());
}

function toggleWeekday(day: number, enabled: boolean) {
  const set = new Set(meetingRecurrenceByWeekday.value);
  if (enabled) set.add(day);
  else set.delete(day);
  meetingRecurrenceByWeekday.value = Array.from(set.values()).sort((a, b) => a - b);
}

function toggleEventWeekday(day: number, enabled: boolean) {
  const set = new Set(eventRecurrenceByWeekday.value);
  if (enabled) set.add(day);
  else set.delete(day);
  eventRecurrenceByWeekday.value = Array.from(set.values()).sort((a, b) => a - b);
}

const eventsByDayKey = computed(() => {
  const map = new Map<string, CalendarEventDto[]>();
  for (const ev of events.value) {
    const key = format(new Date(ev.startsAt), "yyyy-MM-dd");
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }

  for (const [key, list] of map.entries()) {
    list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    map.set(key, list);
  }

  return map;
});

function getEventsForDayCell(date: Date) {
  const key = format(date, "yyyy-MM-dd");
  return eventsByDayKey.value.get(key) ?? [];
}

function getPreviewEventsForDayCell(date: Date) {
  return getEventsForDayCell(date).slice(0, MAX_EVENTS_PER_DAY_CELL);
}

function getOverflowCountForDayCell(date: Date) {
  return Math.max(0, getEventsForDayCell(date).length - MAX_EVENTS_PER_DAY_CELL);
}

// Fetch events when date range changes
watch(
  [currentView, currentDate],
  async () => {
    if (user.value) {
      await fetchEvents();
    }
  },
  { immediate: false },
);

onMounted(async () => {
  if (user.value) {
    await fetchEvents();
  }
  if (workspace.value?.id) {
    fetchChannels();
    fetchWorkspaceMembers();
  }
  const scheduleCid = route.query.scheduleChannelId;
  if (scheduleCid != null && scheduleCid !== "") {
    const raw = Array.isArray(scheduleCid) ? scheduleCid[0] : scheduleCid;
    const id = Number(raw);
    if (!Number.isNaN(id)) {
      itemType.value = "meeting";
      openCreateDialog();
      meetingChannelId.value = id;
    }
    const { scheduleChannelId: _sc, ...restQuery } = route.query;
    router.replace({ path: route.path, query: restQuery });
  }
  document.addEventListener("mousemove", handleResizeMove);
  document.addEventListener("mouseup", handleResizeEnd);
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
});

async function fetchEvents() {
  if (!user.value) return;
  isLoading.value = true;
  try {
    if (!workspace.value?.id) {
      events.value = [];
      return;
    }
    const fetched = await calendarEventApi.findCalendarEvents({
      workspaceId: workspace.value.id,
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
    });

    events.value = fetched;
  } catch (error) {
    console.error("Failed to fetch events:", error);
  } finally {
    isLoading.value = false;
  }
}

// Get events that start at a specific hour (for rendering)
function getEventsStartingAtHour(date: Date, hour: number): CalendarEventDto[] {
  return events.value.filter((event) => {
    const eventDate = new Date(event.startsAt);
    const eventHour = getHours(eventDate);
    return isSameDay(eventDate, date) && eventHour === hour;
  });
}

// Get event end time (from payload or calculate default 1 hour duration)
function getEventEndTime(event: CalendarEventDto): Date {
  const startTime = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  if (!Number.isNaN(endsAt.getTime())) return endsAt;
  // Fallback (shouldn't happen): default to 1 hour if endsAt is missing/invalid.
  return new Date(startTime.getTime() + 60 * 60 * 1000);
}

// Calculate event top offset in pixels (for sub-hour positioning)
function getEventTopOffset(event: CalendarEventDto): number {
  const startTime = new Date(event.startsAt);
  const minutes = startTime.getMinutes();
  return minutes * PX_PER_MINUTE;
}

function getEventDurationMinutes(event: CalendarEventDto): number {
  const startTime = new Date(event.startsAt);
  const endTime = getEventEndTime(event);
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = durationMs / (60 * 1000);
  if (!Number.isFinite(minutes)) return 60;
  return Math.max(1, minutes);
}

function getEventHeightPx(event: CalendarEventDto, minPx: number) {
  return Math.max(minPx, getEventDurationMinutes(event) * PX_PER_MINUTE);
}

function getEventLayoutMode(event: CalendarEventDto) {
  // Use natural (non-clamped) height so we can render short events compactly.
  const h = getEventDurationMinutes(event) * PX_PER_MINUTE;
  if (h < 22) return "tiny" as const;
  if (h < 40) return "small" as const;
  return "normal" as const;
}

const formattedDate = computed(() => {
  if (!eventDateTime.value) return "No date selected";
  const dateStr = eventDateTime.value.toString();
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  return format(date, "EEEE, MMMM d, yyyy");
});

// Navigation functions
function goToToday() {
  currentDate.value = today();
}

function goToPrevious() {
  const date = currentDate.value.toDate(getLocalTimeZone());
  if (currentView.value === "month") {
    const prevMonth = new Date(date);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    currentDate.value = toCalendarDate(parseDate(format(prevMonth, "yyyy-MM-dd")));
  } else if (currentView.value === "week") {
    const prevWeek = addDays(date, -7);
    currentDate.value = toCalendarDate(parseDate(format(prevWeek, "yyyy-MM-dd")));
  } else {
    const prevDay = addDays(date, -1);
    currentDate.value = toCalendarDate(parseDate(format(prevDay, "yyyy-MM-dd")));
  }
}

function goToNext() {
  const date = currentDate.value.toDate(getLocalTimeZone());
  if (currentView.value === "month") {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    currentDate.value = toCalendarDate(parseDate(format(nextMonth, "yyyy-MM-dd")));
  } else if (currentView.value === "week") {
    const nextWeek = addDays(date, 7);
    currentDate.value = toCalendarDate(parseDate(format(nextWeek, "yyyy-MM-dd")));
  } else {
    const nextDay = addDays(date, 1);
    currentDate.value = toCalendarDate(parseDate(format(nextDay, "yyyy-MM-dd")));
  }
}

function handleTimeSlotClick(date: Date, hour: number, event?: MouseEvent) {
  const dateValue = toCalendarDate(parseDate(format(date, "yyyy-MM-dd")));
  eventDateTime.value = dateValue;

  // Calculate exact time based on click position within the hour slot
  let minutes = 0;
  if (event) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const hourHeight = rect.height; // Should be 64px (h-16)
    const clickPercentage = Math.max(0, Math.min(1, clickY / hourHeight));
    minutes = Math.round(clickPercentage * 60);
    // Round to nearest 15 minutes for better UX
    minutes = Math.round(minutes / 15) * 15;
  }

  const startHours = hour;
  const startMinutes = minutes;
  eventTime.value = `${startHours.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}`;

  // Set end time to 1 hour after start time
  let endHours = startHours;
  let endMinutes = startMinutes + 60;
  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes = endMinutes % 60;
  }
  if (endHours >= 24) {
    endHours = 23;
    endMinutes = 59;
  }
  const endTimeStr = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  const startTimeStr = `${startHours.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}`;

  openCreateDialog(dateValue, startTimeStr, endTimeStr);
}

function handleEventClick(event: CalendarEventDto) {
  if (event.type === "meeting") {
    const calendarEventId = event.id;
    router.push({
      name: "meeting-lobby",
      params: { workspaceId: workspace.value.id, calendarEventId },
      query: { occurrenceAt: new Date(event.startsAt).toISOString() },
    });
    return;
  }
  editingEvent.value = event;
  const eventDate = new Date(event.startsAt);
  eventDateTime.value = toCalendarDate(parseDate(format(eventDate, "yyyy-MM-dd")));
  eventTime.value = format(eventDate, "HH:mm");
  eventEndTime.value = format(getEventEndTime(event), "HH:mm");
  eventTitle.value = event.title || "";
  eventDescription.value = event.description || "";
  itemType.value = "event";

  const rec = event.recurrence ?? (event.payload as any)?.recurrence;
  if (rec?.frequency === "daily") {
    eventRecurrenceFrequency.value = "daily";
    eventRecurrenceInterval.value = Math.max(1, Number(rec.interval ?? 1));
  } else if (rec?.frequency === "weekly") {
    eventRecurrenceFrequency.value = "weekly";
    eventRecurrenceInterval.value = Math.max(1, Number(rec.interval ?? 1));
    eventRecurrenceByWeekday.value =
      Array.isArray(rec.byWeekday) && rec.byWeekday.length ? rec.byWeekday : [eventDate.getDay()];
  } else {
    eventRecurrenceFrequency.value = "once";
    eventRecurrenceInterval.value = 1;
    eventRecurrenceByWeekday.value = [eventDate.getDay()];
  }

  showEventDialog.value = true;
}

function openEditMeetingFromCalendar(event: CalendarEventDto) {
  editingEvent.value = event;
  itemType.value = "meeting";

  const eventDate = new Date(event.startsAt);
  eventDateTime.value = toCalendarDate(parseDate(format(eventDate, "yyyy-MM-dd")));
  eventTime.value = format(eventDate, "HH:mm");
  eventEndTime.value = format(getEventEndTime(event), "HH:mm");

  eventTitle.value = event.title || "";
  eventDescription.value = event.description || "";

  meetingChannelId.value = ((event.payload as any)?.channelId ?? null) as any;
  meetingIsPublic.value = Boolean(event.isPublic ?? true);
  meetingNotifyMinutesBefore.value = Number(event.notifyMinutesBefore ?? 1);

  const rec = event.recurrence ?? (event.payload as any)?.recurrence;
  if (rec?.frequency === "once") {
    meetingRecurrenceFrequency.value = "once";
    meetingRecurrenceInterval.value = 1;
    meetingRecurrenceByWeekday.value = [eventDate.getDay()];
  } else if (rec?.frequency === "daily") {
    meetingRecurrenceFrequency.value = "daily";
    meetingRecurrenceInterval.value = Math.max(1, Number(rec.interval ?? 1));
  } else if (rec?.frequency === "weekly") {
    meetingRecurrenceFrequency.value = "weekly";
    meetingRecurrenceInterval.value = Math.max(1, Number(rec.interval ?? 1));
    meetingRecurrenceByWeekday.value =
      Array.isArray(rec.byWeekday) && rec.byWeekday.length ? rec.byWeekday : [eventDate.getDay()];
  } else {
    meetingRecurrenceFrequency.value = "weekly";
    meetingRecurrenceInterval.value = 1;
    meetingRecurrenceByWeekday.value = [eventDate.getDay()];
  }

  showEventDialog.value = true;
}

function openCreateDialog(date?: DateValue, startTime?: string, endTime?: string) {
  editingEvent.value = null;
  eventTitle.value = "";
  eventDescription.value = "";
  eventTime.value = startTime || "09:00";
  eventEndTime.value = endTime || "10:00";
  itemType.value = "event";
  eventRecurrenceFrequency.value = "once";
  eventRecurrenceInterval.value = 1;
  eventRecurrenceByWeekday.value = [new Date().getDay()];
  meetingChannelId.value = null;
  meetingIsPublic.value = true;
  meetingNotifyMinutesBefore.value = 1;
  meetingParticipantIds.value = [];
  meetingRecurrenceFrequency.value = "weekly";
  meetingRecurrenceInterval.value = 1;
  meetingRecurrenceByWeekday.value = [new Date().getDay()];
  if (date) {
    eventDateTime.value = date;
  }
  showEventDialog.value = true;
}

async function saveEvent() {
  if (!user.value || !eventDateTime.value || !eventTitle.value.trim()) {
    return;
  }

  isCreating.value = true;
  try {
    const dateStr = eventDateTime.value.toString();
    const datePart = parse(dateStr, "yyyy-MM-dd", new Date());
    const [hours, minutes] = eventTime.value.split(":").map(Number);

    const startsAt = new Date(datePart);
    startsAt.setHours(hours, minutes, 0, 0);

    if (itemType.value === "meeting") {
      const [endHours, endMinutes] = eventEndTime.value.split(":").map(Number);
      const endsAt = new Date(datePart);
      endsAt.setHours(endHours, endMinutes, 0, 0);

      const channelId = meetingChannelId.value ?? undefined;
      const recurrence =
        meetingRecurrenceFrequency.value === "once"
          ? { frequency: "once" as const }
          : meetingRecurrenceFrequency.value === "daily"
            ? {
                frequency: "daily" as const,
                interval: Math.max(1, meetingRecurrenceInterval.value),
              }
            : {
                frequency: "weekly" as const,
                interval: Math.max(1, meetingRecurrenceInterval.value),
                byWeekday: meetingRecurrenceByWeekday.value.length
                  ? meetingRecurrenceByWeekday.value
                  : [new Date(startsAt).getDay()],
              };

      const payload = { type: "calendar_event" };

      if (editingEvent.value) {
        await calendarEventApi.updateCalendarEvent({
          id: editingEvent.value.id,
          type: "meeting",
          title: eventTitle.value.trim(),
          description: eventDescription.value?.trim() || "",
          payload,
          startsAt,
          endsAt,
          recurrence,
        });
      } else {
        await calendarEventApi.createCalendarEvent({
          workspaceId: workspace.value.id,
          channelId,
          type: "meeting",
          title: eventTitle.value.trim(),
          description: eventDescription.value?.trim() || "",
          payload,
          startsAt,
          endsAt,
          isPublic: meetingIsPublic.value,
          notifyMinutesBefore: meetingNotifyMinutesBefore.value,
          recurrence,
          participantIds: channelId ? undefined : meetingParticipantIds.value,
        });
      }

      // Refresh server-side room membership so reminder/start websocket events can reach this user immediately.
      meetingSocket.emitSubscribeMeetings(workspace.value.id);
    } else if (editingEvent.value) {
      const recurrence =
        eventRecurrenceFrequency.value === "once"
          ? { frequency: "once" as const }
          : eventRecurrenceFrequency.value === "daily"
            ? { frequency: "daily" as const, interval: Math.max(1, eventRecurrenceInterval.value) }
            : {
                frequency: "weekly" as const,
                interval: Math.max(1, eventRecurrenceInterval.value),
                byWeekday: eventRecurrenceByWeekday.value.length
                  ? eventRecurrenceByWeekday.value
                  : [new Date(startsAt).getDay()],
              };
      const [endHours, endMinutes] = eventEndTime.value.split(":").map(Number);
      const endsAt = new Date(datePart);
      endsAt.setHours(endHours, endMinutes, 0, 0);
      await calendarEventApi.updateCalendarEvent({
        id: editingEvent.value.id,
        type: "event",
        title: eventTitle.value.trim(),
        description: eventDescription.value?.trim() || "",
        payload: { type: "calendar_event" },
        startsAt,
        endsAt,
        recurrence,
      });
    } else {
      const recurrence =
        eventRecurrenceFrequency.value === "once"
          ? { frequency: "once" as const }
          : eventRecurrenceFrequency.value === "daily"
            ? { frequency: "daily" as const, interval: Math.max(1, eventRecurrenceInterval.value) }
            : {
                frequency: "weekly" as const,
                interval: Math.max(1, eventRecurrenceInterval.value),
                byWeekday: eventRecurrenceByWeekday.value.length
                  ? eventRecurrenceByWeekday.value
                  : [new Date(startsAt).getDay()],
              };
      const [endHours, endMinutes] = eventEndTime.value.split(":").map(Number);
      const endsAt = new Date(datePart);
      endsAt.setHours(endHours, endMinutes, 0, 0);
      await calendarEventApi.createCalendarEvent({
        workspaceId: workspace.value.id,
        type: "event",
        title: eventTitle.value.trim(),
        description: eventDescription.value?.trim() || "",
        payload: { type: "calendar_event" },
        startsAt,
        endsAt,
        recurrence,
      });
    }

    closeDialog();
    await fetchEvents();
  } catch (error) {
    console.error("Failed to save event:", error);
  } finally {
    isCreating.value = false;
  }
}

async function removeEvent() {
  if (!editingEvent.value) return;
  await calendarEventApi.removeCalendarEvent(editingEvent.value.id);
  closeDialog();
  await fetchEvents();
}

async function removeCalendarItem(event: CalendarEventDto) {
  await calendarEventApi.removeCalendarEvent(event.id);
  await fetchEvents();
}

function closeDialog() {
  showEventDialog.value = false;
  editingEvent.value = null;
  eventTitle.value = "";
  eventDescription.value = "";
  eventTime.value = "09:00";
  eventEndTime.value = "10:00";
  itemType.value = "event";
  eventRecurrenceFrequency.value = "once";
  eventRecurrenceInterval.value = 1;
  eventRecurrenceByWeekday.value = [new Date().getDay()];
}

// Resize handlers
function handleResizeStart(event: CalendarEventDto, type: "start" | "end", mouseEvent: MouseEvent) {
  if (event.type === "meeting") return;
  if (event.occurrenceId !== event.id) return; // recurring occurrence: series-only, no per-occurrence edits
  mouseEvent.preventDefault();
  mouseEvent.stopPropagation();
  isResizing.value = true;
  resizingEvent.value = event;
  resizeType.value = type;
  resizeStartY.value = mouseEvent.clientY;
  resizeStartTime.value =
    type === "start" ? new Date(event.startsAt).getTime() : getEventEndTime(event).getTime();
}

function handleResizeMove(mouseEvent: MouseEvent) {
  if (!isResizing.value || !resizingEvent.value || !resizeType.value) return;

  const deltaY = mouseEvent.clientY - resizeStartY.value;
  const hourHeight = 64; // h-16 = 64px
  const minutesDelta = Math.round((deltaY / hourHeight) * 60);
  // Round to nearest 15 minutes
  const roundedMinutes = Math.round(minutesDelta / 15) * 15;

  const newTime = new Date(resizeStartTime.value + roundedMinutes * 60 * 1000);

  // Update the event in real-time (optimistic update)
  const eventIndex = events.value.findIndex((e) => e.id === resizingEvent.value!.id);
  if (eventIndex !== -1) {
    const updatedEvent = { ...events.value[eventIndex] };
    if (resizeType.value === "start") {
      updatedEvent.startsAt = newTime.toISOString();
    } else {
      updatedEvent.endsAt = newTime.toISOString();
    }
    events.value[eventIndex] = updatedEvent;
  }
}

async function handleResizeEnd() {
  if (!isResizing.value || !resizingEvent.value || !resizeType.value || !user.value) {
    return;
  }

  const event = resizingEvent.value;
  if (event.type === "meeting") {
    isResizing.value = false;
    resizingEvent.value = null;
    resizeType.value = null;
    return;
  }
  const eventDate = new Date(event.startsAt);

  try {
    if (resizeType.value === "start") {
      await calendarEventApi.updateCalendarEvent({
        id: event.id,
        startsAt: eventDate,
      });
    } else {
      const endsAt = new Date(event.endsAt);
      await calendarEventApi.updateCalendarEvent({
        id: event.id,
        endsAt,
      });
    }
    await fetchEvents();
  } catch (error) {
    console.error("Failed to update event:", error);
    await fetchEvents(); // Refresh to get correct data
  } finally {
    isResizing.value = false;
    resizingEvent.value = null;
    resizeType.value = null;
  }
}

// Week view helpers
const weekDays = computed(() => {
  const date = currentDate.value.toDate(getLocalTimeZone());
  const weekStart = dateFnsStartOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });
});

const hours = computed(() => {
  return Array.from({ length: 24 }, (_, i) => i);
});

// Day view helpers
const dayHours = computed(() => {
  return hours.value;
});
</script>

<template>
  <div class="flex:col h-full w-full">
    <!-- Header -->
    <div class="flex:row-md flex:center-y p-4 border-b">
      <div class="flex:row-lg flex:center-y flex-1">
        <h1 class="text-2xl font-semibold text-foreground">Schedule</h1>
        <Button variant="outline" size="sm" @click="goToToday" class="ml-4"> Today </Button>
        <div class="flex:row-md flex:center-y ml-4">
          <Button variant="ghost" size="icon" @click="goToPrevious">
            <Icon name="hi-solid-arrow-sm-left" class="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" @click="goToNext" class="rotate-180">
            <Icon name="hi-solid-arrow-sm-left" class="w-5 h-5" />
          </Button>
        </div>
        <div class="ml-4 text-lg font-medium text-foreground">
          <template v-if="currentView === 'month'">
            {{ format(new Date(currentDate.year, currentDate.month - 1, currentDate.day), "MMMM yyyy") }}
          </template>
          <template v-else-if="currentView === 'week'">
            {{ format(weekDays[0], "MMM d") }} - {{ format(weekDays[6], "MMM d, yyyy") }}
          </template>
          <template v-else>
            {{
              format(new Date(currentDate.year, currentDate.month - 1, currentDate.day), "EEEE, MMMM d, yyyy")
            }}
          </template>
        </div>
      </div>
      <ToggleGroup v-model="currentView" type="single" class="ml-auto">
        <ToggleGroupItem value="month" aria-label="Month view"> Month </ToggleGroupItem>
        <ToggleGroupItem value="week" aria-label="Week view"> Week </ToggleGroupItem>
        <ToggleGroupItem value="day" aria-label="Day view"> Day </ToggleGroupItem>
      </ToggleGroup>
      <Button
        variant="default"
        size="sm"
        class="ml-4"
        @click="() => openCreateDialog(currentDate as DateValue)"
      >
        <Icon name="hi-plus" class="w-4 h-4 mr-2" />
        Create
      </Button>
    </div>

    <!-- Calendar Content -->
    <div class="flex-1 overflow-auto">
      <!-- Month View -->
      <div v-if="currentView === 'month'" class="h-full">
        <div class="bg-white h-full min-h-[560px] flex flex-col overflow-hidden">
          <!-- Weekday header -->
          <div class="grid grid-cols-7 border-b bg-white sticky top-0 z-10">
            <div
              v-for="label in monthWeekdayLabels"
              :key="label"
              class="px-3 py-2 text-xs font-medium text-secondary-foreground border-r last:border-r-0"
            >
              {{ label }}
            </div>
          </div>

          <!-- Days grid -->
          <div class="grid grid-cols-7 grid-rows-6 flex-1 min-h-0">
            <div
              v-for="day in monthGridDays"
              :key="day.toISOString()"
              class="border-r border-b last:border-r-0 min-h-0"
              :class="{
                'bg-gray-50 text-muted-foreground': !isSameMonth(day, activeMonthAnchor),
              }"
              @click="() => openCreateDialog(toCalendarDate(parseDate(format(day, 'yyyy-MM-dd'))))"
            >
              <div class="h-full w-full p-2 flex flex-col min-h-0 hover:bg-gray-50/60 transition-colors">
                <div class="flex items-start justify-between gap-2">
                  <div
                    class="text-xs font-medium w-7 h-7 grid place-items-center rounded-full select-none"
                    :class="{
                      'bg-blue-600 text-white': isSameDay(day, new Date()),
                    }"
                  >
                    {{ format(day, "d") }}
                  </div>
                </div>

                <div class="mt-1 flex-1 min-h-0 overflow-hidden space-y-1">
                  <Menu
                    v-for="event in getPreviewEventsForDayCell(day)"
                    :key="event.occurrenceId"
                    type="context-menu"
                  >
                    <MenuTrigger as-child>
                      <div
                        @click.stop="handleEventClick(event)"
                        class="px-2 py-1 rounded bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                        title="Open event"
                      >
                        <div class="text-[11px] font-medium text-blue-900 truncate">
                          {{ format(new Date(event.startsAt), "HH:mm") }} {{ event.title }}
                        </div>
                      </div>
                    </MenuTrigger>
                    <MenuContent class="w-40" disabled-portal>
                      <template v-if="event.type === 'meeting'">
                        <MenuItem v-if="event.payload?.meetingId" @click="handleEventClick(event)"
                          >Open lobby</MenuItem
                        >
                        <MenuItem v-else @click="openEditMeetingFromCalendar(event)">Edit</MenuItem>
                        <MenuItem variant="destructive" @click="removeCalendarItem(event)">
                          Cancel series
                        </MenuItem>
                      </template>
                      <template v-else>
                        <MenuItem @click="handleEventClick(event)">Edit</MenuItem>
                        <MenuItem variant="destructive" @click="removeCalendarItem(event)">Remove</MenuItem>
                      </template>
                    </MenuContent>
                  </Menu>

                  <div
                    v-if="getOverflowCountForDayCell(day) > 0"
                    class="text-[11px] text-secondary-foreground select-none"
                  >
                    +{{ getOverflowCountForDayCell(day) }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Week View -->
      <div v-if="currentView === 'week'" class="h-full overflow-auto">
        <div class="flex border-b bg-white sticky top-0 z-10">
          <div class="w-16 border-r"></div>
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            class="flex-1 border-r p-2 text-center"
            :class="{
              'bg-blue-50': isSameDay(day, new Date()),
            }"
          >
            <div class="text-xs text-secondary-foreground">
              {{ format(day, "EEE") }}
            </div>
            <div class="text-lg font-semibold">
              {{ format(day, "d") }}
            </div>
          </div>
        </div>
        <div class="flex">
          <div class="w-16 border-r bg-white">
            <div
              v-for="hour in hours"
              :key="hour"
              class="h-16 border-b p-1 text-xs text-secondary-foreground"
            >
              {{ hour.toString().padStart(2, "0") }}:00
            </div>
          </div>
          <div v-for="day in weekDays" :key="day.toISOString()" class="flex-1 border-r">
            <div
              v-for="hour in hours"
              :key="hour"
              class="h-16 border-b cursor-pointer hover:bg-gray-50 transition-colors relative"
              @click="(e) => handleTimeSlotClick(day, hour, e)"
            >
              <Menu
                v-for="event in getEventsStartingAtHour(day, hour)"
                :key="event.occurrenceId"
                type="context-menu"
              >
                <MenuTrigger as-child>
                  <div
                    @click.stop="handleEventClick(event)"
                    class="absolute left-0 right-0 p-1 m-1 rounded bg-blue-500 text-white text-xs cursor-pointer hover:bg-blue-600 z-20 overflow-hidden flex flex-col leading-tight"
                    :style="{
                      top: `${getEventTopOffset(event)}px`,
                      height: `${getEventHeightPx(event, 18)}px`,
                    }"
                  >
                    <!-- Top resize handle -->
                    <div
                      @mousedown.stop="(e) => handleResizeStart(event, 'start', e)"
                      class="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 rounded-t"
                      :class="{
                        'bg-blue-400': isResizing && resizingEvent?.id === event.id && resizeType === 'start',
                      }"
                    ></div>
                    <div class="min-h-0 flex flex-col gap-0.5">
                      <div class="flex items-center gap-1 min-w-0">
                        <span
                          v-if="getEventLayoutMode(event) !== 'normal'"
                          class="shrink-0 text-[10px] opacity-90"
                        >
                          {{ format(new Date(event.startsAt), "HH:mm") }}
                        </span>
                        <div class="font-medium truncate min-w-0">
                          {{ event.title }}
                        </div>
                      </div>
                      <div
                        v-if="getEventLayoutMode(event) === 'normal' && event.description"
                        class="text-[10px] opacity-90 truncate"
                      >
                        {{ event.description }}
                      </div>
                      <div v-if="getEventLayoutMode(event) === 'normal'" class="text-[10px] opacity-75">
                        {{ format(new Date(event.startsAt), "HH:mm") }} -
                        {{ format(getEventEndTime(event), "HH:mm") }}
                      </div>
                    </div>
                    <!-- Bottom resize handle -->
                    <div
                      @mousedown.stop="(e) => handleResizeStart(event, 'end', e)"
                      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 rounded-b"
                      :class="{
                        'bg-blue-400': isResizing && resizingEvent?.id === event.id && resizeType === 'end',
                      }"
                    ></div>
                  </div>
                </MenuTrigger>
                <MenuContent class="w-40" disabled-portal>
                  <template v-if="event.type === 'meeting'">
                    <MenuItem v-if="event.payload?.meetingId" @click="handleEventClick(event)"
                      >Open lobby</MenuItem
                    >
                    <MenuItem v-else @click="openEditMeetingFromCalendar(event)">Edit</MenuItem>
                    <MenuItem variant="destructive" @click="removeCalendarItem(event)">
                      Cancel series
                    </MenuItem>
                  </template>
                  <template v-else>
                    <MenuItem @click="handleEventClick(event)">Edit</MenuItem>
                    <MenuItem variant="destructive" @click="removeCalendarItem(event)">Remove</MenuItem>
                  </template>
                </MenuContent>
              </Menu>
            </div>
          </div>
        </div>
      </div>

      <!-- Day View -->
      <div v-if="currentView === 'day'" class="h-full overflow-auto">
        <div class="flex border-b bg-white sticky top-0 z-10 p-4">
          <div class="w-16"></div>
          <div class="flex-1">
            <div class="text-2xl font-semibold">
              {{
                format(
                  new Date(currentDate.year, currentDate.month - 1, currentDate.day),
                  "EEEE, MMMM d, yyyy",
                )
              }}
            </div>
          </div>
        </div>
        <div class="flex">
          <div class="w-16 border-r bg-white">
            <div
              v-for="hour in dayHours"
              :key="hour"
              class="h-16 border-b p-1 text-xs text-secondary-foreground"
            >
              {{ hour.toString().padStart(2, "0") }}:00
            </div>
          </div>
          <div class="flex-1">
            <div
              v-for="hour in dayHours"
              :key="hour"
              class="h-16 border-b cursor-pointer hover:bg-gray-50 transition-colors relative"
              @click="
                (e) =>
                  handleTimeSlotClick(
                    new Date(currentDate.year, currentDate.month - 1, currentDate.day),
                    hour,
                    e,
                  )
              "
            >
              <Menu
                v-for="event in getEventsStartingAtHour(
                  new Date(currentDate.year, currentDate.month - 1, currentDate.day),
                  hour,
                )"
                :key="event.occurrenceId"
                type="context-menu"
              >
                <MenuTrigger as-child>
                  <div
                    @click.stop="handleEventClick(event)"
                    class="absolute left-0 right-0 p-2 m-1 rounded bg-blue-500 text-white cursor-pointer hover:bg-blue-600 z-20 overflow-hidden flex flex-col leading-tight"
                    :style="{
                      top: `${getEventTopOffset(event)}px`,
                      height: `${getEventHeightPx(event, 24)}px`,
                    }"
                  >
                    <!-- Top resize handle -->
                    <div
                      @mousedown.stop="(e) => handleResizeStart(event, 'start', e)"
                      class="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 rounded-t"
                      :class="{
                        'bg-blue-400': isResizing && resizingEvent?.id === event.id && resizeType === 'start',
                      }"
                    ></div>
                    <div class="min-h-0 flex flex-col gap-1">
                      <div class="flex items-center gap-1 min-w-0">
                        <span
                          v-if="getEventLayoutMode(event) !== 'normal'"
                          class="shrink-0 text-[10px] opacity-90"
                        >
                          {{ format(new Date(event.startsAt), "HH:mm") }}
                        </span>
                        <div class="font-medium truncate min-w-0">
                          {{ event.title }}
                        </div>
                      </div>
                      <div
                        v-if="getEventLayoutMode(event) === 'normal' && event.description"
                        class="text-[11px] opacity-90 line-clamp-2"
                      >
                        {{ event.description }}
                      </div>
                      <div v-if="getEventLayoutMode(event) === 'normal'" class="text-[10px] opacity-75">
                        {{ format(new Date(event.startsAt), "HH:mm") }} -
                        {{ format(getEventEndTime(event), "HH:mm") }}
                      </div>
                    </div>
                    <!-- Bottom resize handle -->
                    <div
                      @mousedown.stop="(e) => handleResizeStart(event, 'end', e)"
                      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 rounded-b"
                      :class="{
                        'bg-blue-400': isResizing && resizingEvent?.id === event.id && resizeType === 'end',
                      }"
                    ></div>
                  </div>
                </MenuTrigger>
                <MenuContent class="w-40" disabled-portal>
                  <template v-if="event.type === 'meeting'">
                    <MenuItem v-if="event.payload?.meetingId" @click="handleEventClick(event)"
                      >Open lobby</MenuItem
                    >
                    <MenuItem v-else @click="openEditMeetingFromCalendar(event)">Edit</MenuItem>
                    <MenuItem variant="destructive" @click="removeCalendarItem(event)">
                      Cancel series
                    </MenuItem>
                  </template>
                  <template v-else>
                    <MenuItem @click="handleEventClick(event)">Edit</MenuItem>
                    <MenuItem variant="destructive" @click="removeCalendarItem(event)">Remove</MenuItem>
                  </template>
                </MenuContent>
              </Menu>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Dialog -->
    <Dialog v-model:open="showEventDialog">
      <DialogContent class="!p-0 sm:max-w-[560px]">
        <div class="rounded-lg bg-white !p-0">
          <DialogHeader class="px-3 pt-3 pb-1">
            <DialogTitle class="text-sm font-medium text-muted-foreground">
              {{
                editingEvent
                  ? itemType === "meeting"
                    ? "Edit meeting"
                    : "Edit event"
                  : itemType === "meeting"
                    ? "New meeting"
                    : "New event"
              }}
            </DialogTitle>
          </DialogHeader>

          <form class="px-3 pb-3" @submit.prevent="saveEvent">
            <!-- Type -->
            <div class="mt-1 flex items-center justify-between gap-2">
              <div class="text-[11px] text-muted-foreground">Type</div>
              <ToggleGroup v-model="itemType" type="single" :disabled="Boolean(editingEvent)">
                <ToggleGroupItem value="event">Event</ToggleGroupItem>
                <ToggleGroupItem value="meeting">Meeting</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <!-- Title / Description (blended, no borders) -->
            <label for="event-title" class="sr-only">Title</label>
            <input
              id="event-title"
              v-model="eventTitle"
              class="w-full text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none"
              placeholder="Event title"
              autofocus
              required
            />

            <label for="event-description" class="sr-only">Description</label>
            <textarea
              id="event-description"
              v-model="eventDescription"
              rows="3"
              class="mt-1.5 w-full resize-none text-sm text-foreground placeholder:text-muted-foreground outline-none"
              placeholder="Add description…"
            />

            <!-- Event recurrence -->
            <div v-if="itemType === 'event'" class="mt-2.5 rounded-md border bg-zinc-50 p-2.5">
              <div class="mt-0.5 grid grid-cols-2 gap-2">
                <label class="text-xs text-muted-foreground">
                  Recurrence
                  <select
                    v-model="eventRecurrenceFrequency"
                    class="mt-1 w-full h-8 rounded-md border bg-white px-2 text-sm"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                <label class="text-xs text-muted-foreground">
                  Interval
                  <input
                    v-model.number="eventRecurrenceInterval"
                    type="number"
                    min="1"
                    class="mt-1 w-full h-8 rounded-md border bg-white px-2 text-sm outline-none"
                    :disabled="eventRecurrenceFrequency === 'once'"
                  />
                </label>
              </div>

              <div v-if="eventRecurrenceFrequency === 'weekly'" class="mt-2">
                <div class="text-xs text-muted-foreground mb-1">Weekdays</div>
                <div class="grid grid-cols-7 gap-1">
                  <label
                    v-for="(lbl, idx) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                    :key="idx"
                    class="flex items-center justify-center gap-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      :checked="eventRecurrenceByWeekday.includes(idx)"
                      @change="toggleEventWeekday(idx, ($event.target as HTMLInputElement).checked)"
                    />
                    <span>{{ lbl }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Meeting settings -->
            <div
              v-if="itemType === 'meeting' && !editingEvent"
              class="mt-2.5 rounded-md border bg-zinc-50 p-2.5"
            >
              <div class="grid grid-cols-2 gap-2">
                <label class="text-xs text-muted-foreground">
                  Channel (optional)
                  <select
                    v-model.number="meetingChannelId"
                    class="mt-1 w-full h-8 rounded-md border bg-white px-2 text-sm"
                  >
                    <option :value="null">No channel</option>
                    <option v-for="c in channels" :key="c.id" :value="c.id">
                      {{ c.name || `Channel ${c.id}` }}
                    </option>
                  </select>
                </label>

                <label class="text-xs text-muted-foreground">
                  Notify (minutes before)
                  <input
                    v-model.number="meetingNotifyMinutesBefore"
                    type="number"
                    min="0"
                    class="mt-1 w-full h-8 rounded-md border bg-white px-2 text-sm outline-none"
                  />
                </label>
              </div>

              <div class="mt-2 flex items-center justify-between">
                <label class="flex items-center gap-2 text-xs text-muted-foreground">
                  <input v-model="meetingIsPublic" type="checkbox" class="h-4 w-4" />
                  Public (workspace members with link can join)
                </label>
              </div>

              <div class="mt-2 grid grid-cols-2 gap-2">
                <label class="text-xs text-muted-foreground">
                  Recurrence
                  <select
                    v-model="meetingRecurrenceFrequency"
                    class="mt-1 w-full h-8 rounded-md border bg-white px-2 text-sm"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                <label class="text-xs text-muted-foreground">
                  Interval
                  <input
                    v-model.number="meetingRecurrenceInterval"
                    type="number"
                    min="1"
                    class="mt-1 w-full h-8 rounded-md border bg-white px-2 text-sm outline-none"
                    :disabled="meetingRecurrenceFrequency === 'once'"
                  />
                </label>
              </div>

              <div v-if="meetingRecurrenceFrequency === 'weekly'" class="mt-2">
                <div class="text-xs text-muted-foreground mb-1">Weekdays</div>
                <div class="grid grid-cols-7 gap-1">
                  <label
                    v-for="(lbl, idx) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                    :key="idx"
                    class="flex items-center justify-center gap-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      :checked="meetingRecurrenceByWeekday.includes(idx)"
                      @change="toggleWeekday(idx, ($event.target as HTMLInputElement).checked)"
                    />
                    <span>{{ lbl }}</span>
                  </label>
                </div>
              </div>

              <div v-if="!meetingChannelId" class="mt-2">
                <div class="text-xs text-muted-foreground mb-1">Participants (notified)</div>
                <div class="max-h-40 overflow-auto rounded-md border bg-white p-2">
                  <label v-for="m in members" :key="m.user.id" class="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      :checked="meetingParticipantIds.includes(m.user.id)"
                      @change="toggleParticipant(m.user.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="truncate">{{ m.user.name }}</span>
                    <span class="ml-auto text-xs text-muted-foreground truncate">{{ m.user.email }}</span>
                  </label>
                </div>
              </div>
              <div v-else class="mt-2 text-xs text-muted-foreground">
                Participants are derived from channel members.
              </div>
            </div>

            <!-- Date + Start + End (same line) -->
            <div class="mt-2.5 flex items-center gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-[11px] text-muted-foreground truncate">{{ formattedDate }}</div>
              </div>

              <div class="flex items-center gap-2">
                <label for="time" class="sr-only">Start time</label>
                <input
                  id="time"
                  v-model="eventTime"
                  type="time"
                  class="h-8 rounded-md border bg-white px-2 text-sm outline-none"
                  required
                />

                <label for="endTime" class="sr-only">End time</label>
                <input
                  id="endTime"
                  v-model="eventEndTime"
                  type="time"
                  class="h-8 rounded-md border bg-white px-2 text-sm outline-none"
                  required
                />
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-3 flex items-center justify-end gap-2 border-t pt-2.5">
              <Button
                v-if="editingEvent"
                type="button"
                variant="destructive"
                size="sm"
                class="mr-auto"
                @click="removeEvent"
                :disabled="isCreating"
              >
                Remove
              </Button>
              <Button type="button" variant="outline" size="sm" @click="closeDialog" :disabled="isCreating">
                Cancel
              </Button>
              <Button type="submit" size="sm" :disabled="isCreating || !eventTitle.trim()">
                {{ isCreating ? "Saving…" : editingEvent ? "Update" : "Create" }}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
