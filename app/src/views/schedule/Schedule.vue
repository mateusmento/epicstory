<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button, Field, Form } from "@/design-system";
import { Calendar } from "@/design-system/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/design-system/ui/dialog";
import { useAuth } from "@/domain/auth";
import { ScheduledEventApi } from "@/domain/scheduled-events";
import { getLocalTimeZone, today as todayFn, type DateValue } from "@internationalized/date";
import { format, parse } from "date-fns";
import { ref, computed } from "vue";

const { user } = useAuth();
const scheduledEventApi = useDependency(ScheduledEventApi);

const today = () => todayFn(getLocalTimeZone());

const selectedDate = ref<DateValue>(today());
const showEventDialog = ref(false);
const eventTitle = ref("");
const eventDescription = ref("");
const eventDateTime = ref<DateValue>(today());
const eventTime = ref("09:00");

const isCreating = ref(false);

const formattedDate = computed(() => {
  if (!eventDateTime.value) return "No date selected";
  const dateStr = eventDateTime.value.toString();
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  return format(date, "EEEE, MMMM d, yyyy");
});

function handleDateSelect(date: DateValue | undefined) {
  date = date ?? today();
  selectedDate.value = date;
  if (date) {
    eventDateTime.value = date;
    showEventDialog.value = true;
  }
}

async function createEvent() {
  if (!user.value || !eventDateTime.value || !eventTitle.value.trim()) {
    return;
  }

  isCreating.value = true;
  try {
    // Combine date and time using date-fns
    const dateStr = eventDateTime.value.toString();
    const datePart = parse(dateStr, "yyyy-MM-dd", new Date());
    const [hours, minutes] = eventTime.value.split(":").map(Number);

    const dueAt = new Date(datePart);
    dueAt.setHours(hours, minutes, 0, 0);

    await scheduledEventApi.createScheduledEvent({
      userId: user.value.id,
      payload: {
        title: eventTitle.value,
        description: eventDescription.value,
      },
      dueAt: dueAt,
    });

    // Reset form
    eventTitle.value = "";
    eventDescription.value = "";
    eventTime.value = "09:00";
    showEventDialog.value = false;
    selectedDate.value = today();
  } catch (error) {
    console.error("Failed to create scheduled event:", error);
  } finally {
    isCreating.value = false;
  }
}

function closeDialog() {
  showEventDialog.value = false;
  eventTitle.value = "";
  eventDescription.value = "";
  eventTime.value = "09:00";
  selectedDate.value = today();
}
</script>

<template>
  <div class="flex:col-xl m-auto py-8 px-12 w-full h-full max-w-7xl">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-foreground">Schedule</h1>
      <p class="text-sm text-secondary-foreground mt-1">Create and manage your scheduled events</p>
    </div>

    <div class="flex-1 bg-white rounded-lg border shadow-sm p-6">
      <Calendar
        :model-value="selectedDate as DateValue"
        @update:model-value="handleDateSelect"
        class="w-full"
      />
    </div>

    <Dialog v-model:open="showEventDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Scheduled Event</DialogTitle>
        </DialogHeader>
        <Form @submit="createEvent" class="flex:col-lg mt-4">
          <div class="flex:col-md">
            <label class="text-sm font-medium text-foreground">Date</label>
            <div class="text-sm text-secondary-foreground">
              {{ formattedDate }}
            </div>
          </div>

          <div class="flex:col-md">
            <label for="time" class="text-sm font-medium text-foreground">Time</label>
            <input
              id="time"
              v-model="eventTime"
              type="time"
              class="px-3 py-2 border rounded-md text-sm"
              required
            />
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
              {{ isCreating ? "Creating..." : "Create Event" }}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  </div>
</template>
