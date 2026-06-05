import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { useChannels } from "@/domain/channels";
import { useMeetingSocket } from "@/domain/meetings";
import { useWorkspace } from "@/domain/workspace";
import { CalendarEventApi } from "@epicstory/api-client";
import type { ICalendarEvent, IChannel, IUser } from "@epicstory/contracts";
import { format, startOfDay } from "date-fns";
import { computed, reactive } from "vue";
import { getEventEndTime } from "../calendar-event-layout";
import {
  buildRecurrencePayload,
  parseRecurrenceFromEvent,
  toggleWeekdayInList,
  type RecurrenceFrequency,
} from "../calendar-recurrence";
import { type CalendarItemType } from "../constants";
import { normalizeScheduleDay, todayInLocalTz } from "../schedule-date";
import type { ScheduleEvents } from "./use-schedule-events";

export type CalendarItemForm = {
  showEventDialog: boolean;
  editingEvent: ICalendarEvent | null;
  eventTitle: string;
  eventDescription: string;
  eventDateTime: Date;
  eventTime: string;
  eventEndTime: string;
  itemType: CalendarItemType;
  meetingChannelId: number | null;
  meetingIsPublic: boolean;
  meetingNotifyMinutesBefore: number;
  meetingParticipantUsers: IUser[];
  meetingRecurrenceFrequency: RecurrenceFrequency;
  meetingRecurrenceInterval: number;
  meetingRecurrenceByWeekday: number[];
  eventRecurrenceFrequency: RecurrenceFrequency;
  eventRecurrenceInterval: number;
  eventRecurrenceByWeekday: number[];
  isCreating: boolean;
};

function createDefaultForm(): CalendarItemForm {
  return {
    showEventDialog: false,
    editingEvent: null,
    eventTitle: "",
    eventDescription: "",
    eventDateTime: todayInLocalTz(),
    eventTime: "09:00",
    eventEndTime: "10:00",
    itemType: "event",
    meetingChannelId: null,
    meetingIsPublic: true,
    meetingNotifyMinutesBefore: 1,
    meetingParticipantUsers: [],
    meetingRecurrenceFrequency: "weekly",
    meetingRecurrenceInterval: 1,
    meetingRecurrenceByWeekday: [new Date().getDay()],
    eventRecurrenceFrequency: "once",
    eventRecurrenceInterval: 1,
    eventRecurrenceByWeekday: [new Date().getDay()],
    isCreating: false,
  };
}

export function useCalendarItemDialog(
  eventsApi: Pick<ScheduleEvents, "refresh">,
  options?: { clearDraft?: () => void },
) {
  const { user } = useAuth();
  const { workspace, members, fetchWorkspaceMembers } = useWorkspace();
  const { channels, fetchChannels } = useChannels();
  const calendarEventApi = useDependency(CalendarEventApi);
  const meetingSocket = useMeetingSocket();

  const form = reactive<CalendarItemForm>(createDefaultForm());

  const formattedDate = computed(() => format(form.eventDateTime, "EEEE, MMMM d, yyyy"));

  const channelList = computed((): IChannel[] => channels.value ?? []);
  const currentUser = computed(() => user.value);

  function ensureDialogDataLoaded() {
    if (workspace.value?.id) {
      fetchChannels();
      fetchWorkspaceMembers();
    }
  }

  function toggleMeetingWeekday(day: number, enabled: boolean) {
    form.meetingRecurrenceByWeekday = toggleWeekdayInList(form.meetingRecurrenceByWeekday, day, enabled);
  }

  function toggleEventWeekday(day: number, enabled: boolean) {
    form.eventRecurrenceByWeekday = toggleWeekdayInList(form.eventRecurrenceByWeekday, day, enabled);
  }

  function resetFormDefaults() {
    const defaults = createDefaultForm();
    form.eventTitle = defaults.eventTitle;
    form.eventDescription = defaults.eventDescription;
    form.eventTime = defaults.eventTime;
    form.eventEndTime = defaults.eventEndTime;
    form.itemType = defaults.itemType;
    form.eventRecurrenceFrequency = defaults.eventRecurrenceFrequency;
    form.eventRecurrenceInterval = defaults.eventRecurrenceInterval;
    form.eventRecurrenceByWeekday = defaults.eventRecurrenceByWeekday;
    form.meetingChannelId = defaults.meetingChannelId;
    form.meetingIsPublic = defaults.meetingIsPublic;
    form.meetingNotifyMinutesBefore = defaults.meetingNotifyMinutesBefore;
    form.meetingParticipantUsers = defaults.meetingParticipantUsers;
    form.meetingRecurrenceFrequency = defaults.meetingRecurrenceFrequency;
    form.meetingRecurrenceInterval = defaults.meetingRecurrenceInterval;
    form.meetingRecurrenceByWeekday = defaults.meetingRecurrenceByWeekday;
  }

  function openCreateDialog(
    date?: Date,
    startTime?: string,
    endTime?: string,
    dialogOptions?: { keepDraft?: boolean },
  ) {
    if (!dialogOptions?.keepDraft) {
      options?.clearDraft?.();
    }
    ensureDialogDataLoaded();
    form.editingEvent = null;
    resetFormDefaults();
    form.eventTime = startTime || "09:00";
    form.eventEndTime = endTime || "10:00";
    if (date) form.eventDateTime = normalizeScheduleDay(date);
    form.showEventDialog = true;
  }

  function openCreateMeetingWithChannel(channelId: number) {
    ensureDialogDataLoaded();
    options?.clearDraft?.();
    form.editingEvent = null;
    resetFormDefaults();
    form.itemType = "meeting";
    form.meetingChannelId = channelId;
    form.showEventDialog = true;
  }

  function populateCommonFields(event: ICalendarEvent) {
    const eventDate = new Date(event.startsAt);
    form.eventDateTime = startOfDay(eventDate);
    form.eventTime = format(eventDate, "HH:mm");
    form.eventEndTime = format(getEventEndTime(event), "HH:mm");
    form.eventTitle = event.title || "";
    form.eventDescription = event.description || "";
  }

  function openEditCalendarDialog(event: ICalendarEvent) {
    options?.clearDraft?.();
    ensureDialogDataLoaded();
    if (event.type === "meeting") {
      openEditMeetingFromCalendar(event);
      return;
    }
    form.editingEvent = event;
    populateCommonFields(event);
    form.itemType = "event";
    const parsed = parseRecurrenceFromEvent(event, new Date(event.startsAt), "once");
    form.eventRecurrenceFrequency = parsed.frequency;
    form.eventRecurrenceInterval = parsed.interval;
    form.eventRecurrenceByWeekday = parsed.byWeekday;
    form.showEventDialog = true;
  }

  function openEditMeetingFromCalendar(event: ICalendarEvent) {
    form.editingEvent = event;
    form.itemType = "meeting";
    populateCommonFields(event);
    form.meetingChannelId = (event.payload as { channelId?: number })?.channelId ?? null;
    form.meetingIsPublic = Boolean(event.isPublic ?? true);
    form.meetingNotifyMinutesBefore = Number(event.notifyMinutesBefore ?? 1);
    form.meetingParticipantUsers = (event.participants ?? [])
      .map((p) => members.value.find((m) => m.user.id === p.id)?.user)
      .filter((u): u is IUser => u != null);
    const parsed = parseRecurrenceFromEvent(event, new Date(event.startsAt), "weekly");
    form.meetingRecurrenceFrequency = parsed.frequency;
    form.meetingRecurrenceInterval = parsed.interval;
    form.meetingRecurrenceByWeekday = parsed.byWeekday;
    form.showEventDialog = true;
  }

  function handleTimeSlotClick(date: Date, hour: number, mouseEvent?: MouseEvent) {
    form.eventDateTime = normalizeScheduleDay(date);

    let minutes = 0;
    if (mouseEvent) {
      const target = mouseEvent.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const clickY = mouseEvent.clientY - rect.top;
      const clickPercentage = Math.max(0, Math.min(1, clickY / rect.height));
      minutes = Math.round(clickPercentage * 60);
      minutes = Math.round(minutes / 15) * 15;
    }

    const startHours = hour;
    const startMinutes = minutes;
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
    const startTimeStr = `${startHours.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}`;
    const endTimeStr = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
    openCreateDialog(form.eventDateTime, startTimeStr, endTimeStr);
  }

  function closeDialog() {
    if (!form.showEventDialog) {
      options?.clearDraft?.();
      return;
    }
    form.showEventDialog = false;
    form.editingEvent = null;
    resetFormDefaults();
    options?.clearDraft?.();
  }

  /** Sync Radix Dialog close (overlay, Escape) with form reset and draft cleanup. */
  function handleDialogOpenChange(open: boolean) {
    if (open) {
      form.showEventDialog = true;
      return;
    }
    closeDialog();
  }

  async function saveEvent() {
    if (!user.value || !form.eventTitle.trim() || !workspace.value?.id) {
      return;
    }

    form.isCreating = true;
    try {
      const datePart = startOfDay(form.eventDateTime);
      const [hours, minutes] = form.eventTime.split(":").map(Number);
      const startsAt = new Date(datePart);
      startsAt.setHours(hours, minutes, 0, 0);

      if (form.itemType === "meeting") {
        const [endHours, endMinutes] = form.eventEndTime.split(":").map(Number);
        const endsAt = new Date(datePart);
        endsAt.setHours(endHours, endMinutes, 0, 0);
        const channelId = form.meetingChannelId ?? undefined;
        const recurrence = buildRecurrencePayload(
          form.meetingRecurrenceFrequency,
          form.meetingRecurrenceInterval,
          form.meetingRecurrenceByWeekday,
          startsAt,
        );
        if (form.editingEvent) {
          await calendarEventApi.updateCalendarEvent({
            id: form.editingEvent.id,
            type: "meeting",
            title: form.eventTitle.trim(),
            description: form.eventDescription?.trim() || "",
            startsAt,
            endsAt,
            isPublic: form.meetingIsPublic,
            notifyMinutesBefore: form.meetingNotifyMinutesBefore,
            recurrence,
          });
        } else {
          await calendarEventApi.createCalendarEvent({
            workspaceId: workspace.value.id,
            channelId,
            type: "meeting",
            title: form.eventTitle.trim(),
            description: form.eventDescription?.trim() || "",
            startsAt,
            endsAt,
            isPublic: form.meetingIsPublic,
            notifyMinutesBefore: form.meetingNotifyMinutesBefore,
            recurrence,
            participantIds: channelId ? undefined : form.meetingParticipantUsers.map((u) => u.id),
          });
        }
        meetingSocket.emitSubscribeMeetings(workspace.value.id);
      } else {
        const [endHours, endMinutes] = form.eventEndTime.split(":").map(Number);
        const endsAt = new Date(datePart);
        endsAt.setHours(endHours, endMinutes, 0, 0);
        const recurrence = buildRecurrencePayload(
          form.eventRecurrenceFrequency,
          form.eventRecurrenceInterval,
          form.eventRecurrenceByWeekday,
          startsAt,
        );

        if (form.editingEvent) {
          await calendarEventApi.updateCalendarEvent({
            id: form.editingEvent.id,
            type: "event",
            title: form.eventTitle.trim(),
            description: form.eventDescription?.trim() || "",
            startsAt,
            endsAt,
            recurrence,
          });
        } else {
          await calendarEventApi.createCalendarEvent({
            workspaceId: workspace.value.id,
            type: "event",
            title: form.eventTitle.trim(),
            description: form.eventDescription?.trim() || "",
            startsAt,
            endsAt,
            recurrence,
          });
        }
      }

      await eventsApi.refresh();
      closeDialog();
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      form.isCreating = false;
    }
  }

  async function removeEvent() {
    if (!form.editingEvent) return;
    await calendarEventApi.removeCalendarEvent(form.editingEvent.id);
    closeDialog();
    await eventsApi.refresh();
  }

  async function removeCalendarItem(event: ICalendarEvent) {
    await calendarEventApi.removeCalendarEvent(event.id);
    await eventsApi.refresh();
  }

  function removeMeetingParticipant(userId: number) {
    if (form.editingEvent) return;
    form.meetingParticipantUsers = form.meetingParticipantUsers.filter((p) => p.id !== userId);
  }

  return {
    form,
    formattedDate,
    channelList,
    currentUser,
    toggleMeetingWeekday,
    toggleEventWeekday,
    openCreateDialog,
    openCreateMeetingWithChannel,
    openEditCalendarDialog,
    handleTimeSlotClick,
    closeDialog,
    handleDialogOpenChange,
    saveEvent,
    removeEvent,
    removeCalendarItem,
    removeMeetingParticipant,
    ensureDialogDataLoaded,
  };
}

export type CalendarItemDialogController = ReturnType<typeof useCalendarItemDialog>;
