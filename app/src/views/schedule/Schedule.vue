<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button, Field, Form } from "@/design-system";
import { Calendar } from "@/design-system/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/design-system/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { ScheduledEventApi, type ScheduledEvent } from "@/domain/scheduled-events";
import {
  getLocalTimeZone,
  today as todayFn,
  type DateValue,
  toCalendarDate,
  parseDate,
} from "@internationalized/date";
import {
  format,
  parse,
  startOfDay,
  endOfDay,
  addDays,
  isSameDay,
  eachDayOfInterval,
  startOfWeek as dateFnsStartOfWeek,
  endOfWeek as dateFnsEndOfWeek,
  startOfMonth,
  endOfMonth,
  getHours,
} from "date-fns";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

type ViewType = "month" | "week" | "day";

const { user } = useAuth();
const scheduledEventApi = useDependency(ScheduledEventApi);

const today = () => todayFn(getLocalTimeZone());

const currentView = ref<ViewType>("month");
const currentDate = ref<DateValue>(today());
const events = ref<ScheduledEvent[]>([]);
const showEventDialog = ref(false);
const editingEvent = ref<ScheduledEvent | null>(null);
const eventTitle = ref("");
const eventDescription = ref("");
const eventDateTime = ref<DateValue>(today());
const eventTime = ref("09:00");
const eventEndTime = ref("10:00");

const isCreating = ref(false);
const isLoading = ref(false);
const isResizing = ref(false);
const resizingEvent = ref<ScheduledEvent | null>(null);
const resizeType = ref<"start" | "end" | null>(null);
const resizeStartY = ref(0);
const resizeStartTime = ref(0);

// Compute date range for fetching events
const dateRange = computed(() => {
  const dateValue = currentDate.value;
  const date = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
  let start: Date;
  let end: Date;

  if (currentView.value === "month") {
    start = startOfMonth(date);
    end = endOfMonth(date);
  } else if (currentView.value === "week") {
    start = dateFnsStartOfWeek(date, { weekStartsOn: 1 });
    end = dateFnsEndOfWeek(date, { weekStartsOn: 1 });
  } else {
    start = startOfDay(date);
    end = endOfDay(date);
  }

  return { start, end };
});

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
    const fetched = await scheduledEventApi.getScheduledEvents({
      userId: user.value.id,
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

// Get events for a specific date
function getEventsForDate(date: Date): ScheduledEvent[] {
  return events.value.filter((event) => {
    const eventDate = new Date(event.dueAt);
    return isSameDay(eventDate, date);
  });
}

// Get events that start at a specific hour (for rendering)
function getEventsStartingAtHour(date: Date, hour: number): ScheduledEvent[] {
  return events.value.filter((event) => {
    const eventDate = new Date(event.dueAt);
    const eventHour = getHours(eventDate);
    return isSameDay(eventDate, date) && eventHour === hour;
  });
}

// Get event end time (from payload or calculate default 1 hour duration)
function getEventEndTime(event: ScheduledEvent): Date {
  const startTime = new Date(event.dueAt);
  if (event.payload.endTime) {
    const [hours, minutes] = event.payload.endTime.split(":").map(Number);
    const endTime = new Date(startTime);
    endTime.setHours(hours, minutes, 0, 0);
    return endTime;
  }
  // Default to 1 hour if no end time specified
  return new Date(startTime.getTime() + 60 * 60 * 1000);
}

// Calculate event height in hours
function getEventDurationHours(event: ScheduledEvent): number {
  const startTime = new Date(event.dueAt);
  const endTime = getEventEndTime(event);
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.max(1, Math.ceil(durationMs / (60 * 60 * 1000)));
}

// Calculate event top offset in pixels (for sub-hour positioning)
function getEventTopOffset(event: ScheduledEvent): number {
  const startTime = new Date(event.dueAt);
  const minutes = startTime.getMinutes();
  // Each hour is 64px (h-16 = 4rem = 64px), so each minute is 64/60 = 1.067px
  return (minutes / 60) * 64;
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

function handleDateSelect(date: DateValue | undefined) {
  if (!date) return;
  currentDate.value = date;
  if (currentView.value === "day") {
    eventDateTime.value = date;
    openCreateDialog(date);
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

function handleEventClick(event: ScheduledEvent) {
  editingEvent.value = event;
  const eventDate = new Date(event.dueAt);
  eventDateTime.value = toCalendarDate(parseDate(format(eventDate, "yyyy-MM-dd")));
  eventTime.value = format(eventDate, "HH:mm");
  eventEndTime.value = event.payload.endTime || format(getEventEndTime(event), "HH:mm");
  eventTitle.value = event.payload.title || "";
  eventDescription.value = event.payload.description || "";
  showEventDialog.value = true;
}

function openCreateDialog(date?: DateValue, startTime?: string, endTime?: string) {
  editingEvent.value = null;
  eventTitle.value = "";
  eventDescription.value = "";
  eventTime.value = startTime || "09:00";
  eventEndTime.value = endTime || "10:00";
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

    const dueAt = new Date(datePart);
    dueAt.setHours(hours, minutes, 0, 0);

    if (editingEvent.value) {
      await scheduledEventApi.updateScheduledEvent({
        id: editingEvent.value.id,
        userId: user.value.id,
        payload: {
          title: eventTitle.value,
          description: eventDescription.value,
          endTime: eventEndTime.value,
        },
        dueAt: dueAt,
      });
    } else {
      await scheduledEventApi.createScheduledEvent({
        userId: user.value.id,
        payload: {
          title: eventTitle.value,
          description: eventDescription.value,
          endTime: eventEndTime.value, // Store end time in payload
        },
        dueAt: dueAt,
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

function closeDialog() {
  showEventDialog.value = false;
  editingEvent.value = null;
  eventTitle.value = "";
  eventDescription.value = "";
  eventTime.value = "09:00";
  eventEndTime.value = "10:00";
}

// Resize handlers
function handleResizeStart(event: ScheduledEvent, type: "start" | "end", mouseEvent: MouseEvent) {
  mouseEvent.preventDefault();
  mouseEvent.stopPropagation();
  isResizing.value = true;
  resizingEvent.value = event;
  resizeType.value = type;
  resizeStartY.value = mouseEvent.clientY;
  resizeStartTime.value =
    type === "start" ? new Date(event.dueAt).getTime() : getEventEndTime(event).getTime();
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
      updatedEvent.dueAt = newTime.toISOString();
    } else {
      updatedEvent.payload = {
        ...updatedEvent.payload,
        endTime: format(newTime, "HH:mm"),
      };
    }
    events.value[eventIndex] = updatedEvent;
  }
}

async function handleResizeEnd() {
  if (!isResizing.value || !resizingEvent.value || !resizeType.value || !user.value) {
    return;
  }

  const event = resizingEvent.value;
  const eventDate = new Date(event.dueAt);
  const endTime = event.payload.endTime || format(getEventEndTime(event), "HH:mm");

  try {
    if (resizeType.value === "start") {
      await scheduledEventApi.updateScheduledEvent({
        id: event.id,
        userId: user.value.id,
        dueAt: eventDate,
      });
    } else {
      await scheduledEventApi.updateScheduledEvent({
        id: event.id,
        userId: user.value.id,
        payload: {
          ...event.payload,
          endTime: endTime,
        },
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
  const weekStart = dateFnsStartOfWeek(date, { weekStartsOn: 1 });
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
  <div class="flex:col h-full w-full bg-background">
    <!-- Header -->
    <div class="flex:row-md flex:center-y p-4 border-b bg-white">
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
      <div v-if="currentView === 'month'" class="h-full p-6">
        <div class="bg-white rounded-lg border shadow-sm p-6">
          <Calendar
            :model-value="currentDate as DateValue"
            @update:model-value="handleDateSelect"
            class="w-full"
          />
        </div>
        <!-- Events list for month view -->
        <div class="mt-6 space-y-4">
          <div
            v-for="day in eachDayOfInterval({
              start: dateRange.start,
              end: dateRange.end,
            })"
            :key="day.toISOString()"
            class="bg-white rounded-lg border p-4"
          >
            <div class="font-semibold text-foreground mb-2">
              {{ format(day, "EEEE, MMMM d") }}
            </div>
            <div class="space-y-2">
              <div
                v-for="event in getEventsForDate(day)"
                :key="event.id"
                @click="handleEventClick(event)"
                class="p-2 rounded bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <div class="text-sm font-medium text-blue-900">
                  {{ format(new Date(event.dueAt), "HH:mm") }} - {{ event.payload.title }}
                </div>
                <div v-if="event.payload.description" class="text-xs text-blue-700 mt-1">
                  {{ event.payload.description }}
                </div>
              </div>
              <div v-if="getEventsForDate(day).length === 0" class="text-sm text-secondary-foreground italic">
                No events
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
              <div
                v-for="event in getEventsStartingAtHour(day, hour)"
                :key="event.id"
                @click.stop="handleEventClick(event)"
                class="absolute left-0 right-0 p-1 m-1 rounded bg-blue-500 text-white text-xs cursor-pointer hover:bg-blue-600 z-20"
                :style="{
                  top: `${getEventTopOffset(event)}px`,
                  height: `${getEventDurationHours(event) * 64 - getEventTopOffset(event) - 8}px`,
                  minHeight: '20px',
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
                <div class="font-medium truncate mt-1">{{ event.payload.title }}</div>
                <div v-if="event.payload.description" class="text-xs opacity-90 truncate">
                  {{ event.payload.description }}
                </div>
                <div class="text-xs opacity-75 mt-0.5">
                  {{ format(new Date(event.dueAt), "HH:mm") }} - {{ format(getEventEndTime(event), "HH:mm") }}
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
              <div
                v-for="event in getEventsStartingAtHour(
                  new Date(currentDate.year, currentDate.month - 1, currentDate.day),
                  hour,
                )"
                :key="event.id"
                @click.stop="handleEventClick(event)"
                class="absolute left-0 right-0 p-2 m-1 rounded bg-blue-500 text-white cursor-pointer hover:bg-blue-600 z-20"
                :style="{
                  top: `${getEventTopOffset(event)}px`,
                  height: `${getEventDurationHours(event) * 64 - getEventTopOffset(event) - 8}px`,
                  minHeight: '40px',
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
                <div class="font-medium truncate mt-2">{{ event.payload.title }}</div>
                <div v-if="event.payload.description" class="text-sm opacity-90 mt-1 line-clamp-2">
                  {{ event.payload.description }}
                </div>
                <div class="text-xs opacity-75 mt-1">
                  {{ format(new Date(event.dueAt), "HH:mm") }} - {{ format(getEventEndTime(event), "HH:mm") }}
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Dialog -->
    <Dialog v-model:open="showEventDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingEvent ? "Edit Event" : "Create Event" }}</DialogTitle>
        </DialogHeader>
        <Form @submit="saveEvent" class="flex:col-lg mt-4">
          <div class="flex:col-md">
            <label class="text-sm font-medium text-foreground">Date</label>
            <div class="text-sm text-secondary-foreground">
              {{ formattedDate }}
            </div>
          </div>

          <div class="flex:row-md gap-4">
            <div class="flex:col-md flex-1">
              <label for="time" class="text-sm font-medium text-foreground">Start Time</label>
              <input
                id="time"
                v-model="eventTime"
                type="time"
                class="px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
            <div class="flex:col-md flex-1">
              <label for="endTime" class="text-sm font-medium text-foreground">End Time</label>
              <input
                id="endTime"
                v-model="eventEndTime"
                type="time"
                class="px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
          </div>

          <div class="flex:col-md">
            <label for="title" class="text-sm font-medium text-foreground">Title *</label>
            <Field id="title" v-model="eventTitle" name="title" placeholder="Event title" required />
          </div>

          <div class="flex:col-md">
            <label for="description" class="text-sm font-medium text-foreground">Description</label>
            <textarea
              id="description"
              v-model="eventDescription"
              placeholder="Event description (optional)"
              class="px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y"
            />
          </div>

          <div class="flex:row-md justify-end mt-4">
            <Button type="button" variant="outline" @click="closeDialog" :disabled="isCreating">
              Cancel
            </Button>
            <Button type="submit" :disabled="isCreating || !eventTitle.trim()">
              {{ isCreating ? "Saving..." : editingEvent ? "Update" : "Create" }}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  </div>
</template>
