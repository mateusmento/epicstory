<script lang="ts" setup>
import { UserAvatar } from "@/presentationals/user";
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  ScrollArea,
  Separator,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { SCHEDULE_DIALOG_KEY } from "@/domain/schedule";
import {
  addMinutesToTime,
  DURATION_PRESETS_MINUTES,
  durationMinutesBetween,
  formatDurationLabel,
  formatTimeDisplay,
  isDurationPreset,
} from "@/lib/schedule";
import { RecurrenceFields, TimeSlotMenu } from "@/presentationals/schedule";
import { ChevronDown } from "lucide-vue-next";
import type { AcceptableValue } from "reka-ui";
import { computed, inject } from "vue";

const dialog = inject(SCHEDULE_DIALOG_KEY);
if (!dialog) {
  throw new Error("CalendarItemDialog requires SCHEDULE_DIALOG_KEY");
}

const { form, formattedDate, channelList, currentUser } = dialog;

const {
  handleDialogOpenChange,
  saveEvent,
  toggleEventWeekday,
  toggleMeetingWeekday,
  removeMeetingParticipant,
  removeEvent,
  requestClose,
} = dialog;

const NOTIFY_PRESETS = [
  { minutes: 0, label: "At start" },
  { minutes: 5, label: "5 min before" },
  { minutes: 10, label: "10 min before" },
  { minutes: 15, label: "15 min before" },
  { minutes: 30, label: "30 min before" },
] as const;

const dialogTitle = computed(() => {
  if (form.editingEvent) {
    return form.itemType === "meeting" ? "Edit meeting" : "Edit event";
  }
  return form.itemType === "meeting" ? "New meeting" : "New event";
});

const durationMinutes = computed(() => durationMinutesBetween(form.eventTime, form.eventEndTime));

const matchedDurationPreset = computed(() => {
  const d = durationMinutes.value;
  if (d == null || !isDurationPreset(d)) return null;
  return d;
});

const showCustomEnd = computed(() => matchedDurationPreset.value == null);

const timeRangeSummary = computed(
  () => `${formatTimeDisplay(form.eventTime)} – ${formatTimeDisplay(form.eventEndTime)}`,
);

const durationToggleValue = computed(() =>
  matchedDurationPreset.value != null ? String(matchedDurationPreset.value) : undefined,
);

const channelTriggerLabel = computed(() => {
  if (form.meetingChannelId == null) return "No channel";
  const c = channelList.value.find((ch) => ch.id === form.meetingChannelId);
  return c?.name || `Channel ${form.meetingChannelId}`;
});

const notifyOptions = computed(() => {
  const mins = form.meetingNotifyMinutesBefore;
  if (NOTIFY_PRESETS.some((p) => p.minutes === mins)) {
    return [...NOTIFY_PRESETS];
  }
  return [...NOTIFY_PRESETS, { minutes: mins, label: `${mins} min before` }].sort(
    (a, b) => a.minutes - b.minutes,
  );
});

const notifyTriggerLabel = computed(() => {
  const preset = notifyOptions.value.find((p) => p.minutes === form.meetingNotifyMinutesBefore);
  if (preset) return preset.label;
  return `${form.meetingNotifyMinutesBefore} min before`;
});

const channelMenuValue = computed(() =>
  form.meetingChannelId == null ? "none" : String(form.meetingChannelId),
);

function setStartTime(time: string) {
  const prev = durationMinutes.value ?? 60;
  form.eventTime = time;
  form.eventEndTime = addMinutesToTime(time, prev);
}

function setEndTime(time: string) {
  form.eventEndTime = time;
}

function setDurationPreset(minutes: number) {
  const next = addMinutesToTime(form.eventTime, minutes);
  if (next === form.eventEndTime) return;
  form.eventEndTime = next;
}

function onDurationToggle(v: string | string[] | undefined) {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return;
  setDurationPreset(n);
}

function onItemTypeChange(v: string | string[] | undefined) {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw !== "event" && raw !== "meeting") return;
  if (form.itemType === raw) return;
  form.itemType = raw;
}

function onChannelPick(v: AcceptableValue) {
  if (v == null || v === "") return;
  const s = String(v);
  form.meetingChannelId = s === "none" ? null : Number(s);
}

function onNotifyPick(v: AcceptableValue) {
  if (v == null || v === "") return;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return;
  form.meetingNotifyMinutesBefore = n;
}
</script>

<template>
  <Dialog :open="form.showEventDialog" @update:open="handleDialogOpenChange">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <form class="flex flex-col gap-4" @submit.prevent="saveEvent">
        <ToggleGroup
          v-if="!form.editingEvent"
          type="single"
          class="w-full justify-stretch"
          :model-value="form.itemType"
          @update:model-value="onItemTypeChange"
        >
          <ToggleGroupItem value="event" class="flex-1">Event</ToggleGroupItem>
          <ToggleGroupItem value="meeting" class="flex-1">Meeting</ToggleGroupItem>
        </ToggleGroup>

        <div class="flex flex-col gap-1.5">
          <label for="event-title" class="sr-only">Title</label>
          <input
            id="event-title"
            v-model="form.eventTitle"
            class="w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Event title"
            autofocus
            required
          />
          <label for="event-description" class="sr-only">Description</label>
          <textarea
            id="event-description"
            v-model="form.eventDescription"
            rows="3"
            class="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Add description…"
          />
        </div>

        <div class="flex flex-col gap-2">
          <Label class="text-xs text-muted-foreground">{{ formattedDate }}</Label>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-col gap-1">
              <span class="text-[11px] text-muted-foreground">Starts</span>
              <TimeSlotMenu
                :model-value="form.eventTime"
                label="Start time"
                @update:model-value="setStartTime"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-[11px] text-muted-foreground">Duration</span>
              <ToggleGroup
                type="single"
                size="sm"
                class="flex-wrap"
                :model-value="durationToggleValue"
                @update:model-value="onDurationToggle"
              >
                <ToggleGroupItem
                  v-for="mins in DURATION_PRESETS_MINUTES"
                  :key="mins"
                  :value="String(mins)"
                  class="px-2"
                >
                  {{ formatDurationLabel(mins) }}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div v-if="showCustomEnd" class="flex flex-col gap-1">
              <span class="text-[11px] text-muted-foreground">Ends</span>
              <TimeSlotMenu
                :model-value="form.eventEndTime"
                label="End time"
                @update:model-value="setEndTime"
              />
            </div>
          </div>
          <p class="text-xs text-muted-foreground">{{ timeRangeSummary }}</p>
        </div>

        <RecurrenceFields
          v-if="form.itemType === 'event'"
          v-model:frequency="form.eventRecurrenceFrequency"
          v-model:interval="form.eventRecurrenceInterval"
          v-model:by-weekday="form.eventRecurrenceByWeekday"
          @toggle-weekday="toggleEventWeekday"
        />

        <template v-if="form.itemType === 'meeting'">
          <Separator />
          <div class="flex flex-col gap-3">
            <p v-if="form.editingEvent" class="text-xs text-muted-foreground">
              Channel and participants were set at creation and can’t be changed here.
            </p>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <Label class="text-xs text-muted-foreground">Channel</Label>
                <Menu>
                  <MenuTrigger as-child>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="w-full justify-between gap-1.5 font-normal"
                      :disabled="Boolean(form.editingEvent)"
                    >
                      <span class="truncate">{{ channelTriggerLabel }}</span>
                      <ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                    </Button>
                  </MenuTrigger>
                  <MenuContent align="start" class="max-h-64 min-w-[12rem] overflow-y-auto">
                    <MenuRadioGroup :model-value="channelMenuValue" @update:model-value="onChannelPick">
                      <MenuRadioItem value="none">No channel</MenuRadioItem>
                      <MenuRadioItem v-for="c in channelList" :key="c.id" :value="String(c.id)">
                        {{ c.name || `Channel ${c.id}` }}
                      </MenuRadioItem>
                    </MenuRadioGroup>
                  </MenuContent>
                </Menu>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label class="text-xs text-muted-foreground">Notify</Label>
                <Menu>
                  <MenuTrigger as-child>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="w-full justify-between gap-1.5 font-normal"
                    >
                      <span class="truncate">{{ notifyTriggerLabel }}</span>
                      <ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                    </Button>
                  </MenuTrigger>
                  <MenuContent align="start" class="min-w-[10rem]">
                    <MenuRadioGroup
                      :model-value="String(form.meetingNotifyMinutesBefore)"
                      @update:model-value="onNotifyPick"
                    >
                      <MenuRadioItem v-for="p in notifyOptions" :key="p.minutes" :value="String(p.minutes)">
                        {{ p.label }}
                      </MenuRadioItem>
                    </MenuRadioGroup>
                  </MenuContent>
                </Menu>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Switch
                id="meeting-public"
                :checked="form.meetingIsPublic"
                @update:checked="(v) => (form.meetingIsPublic = v)"
              />
              <Label for="meeting-public" class="text-sm font-normal text-muted-foreground">
                Public — workspace members with the link can join
              </Label>
            </div>

            <RecurrenceFields
              v-model:frequency="form.meetingRecurrenceFrequency"
              v-model:interval="form.meetingRecurrenceInterval"
              v-model:by-weekday="form.meetingRecurrenceByWeekday"
              @toggle-weekday="toggleMeetingWeekday"
            />

            <div v-if="!form.meetingChannelId" class="flex flex-col gap-2">
              <Label class="text-xs text-muted-foreground">Participants (notified)</Label>
              <ScrollArea v-if="form.meetingParticipantUsers.length" class="h-32 rounded-md border">
                <ul class="!flex flex-col gap-1.5 p-2">
                  <li
                    v-for="p in form.meetingParticipantUsers"
                    :key="p.id"
                    class="flex items-center gap-2 text-sm"
                  >
                    <UserAvatar :name="p.name" :picture="p.picture" size="sm" />
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-medium leading-tight">{{ p.name }}</div>
                      <div v-if="p.email" class="truncate text-xs leading-tight text-muted-foreground">
                        {{ p.email }}
                      </div>
                    </div>
                    <Button
                      v-if="!form.editingEvent"
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Remove"
                      @click="removeMeetingParticipant(p.id)"
                    >
                      <Icon name="io-close" class="h-4 w-4" />
                    </Button>
                  </li>
                </ul>
              </ScrollArea>
              <WorkspaceMemberDropdown
                v-model:users="form.meetingParticipantUsers"
                :disabled="Boolean(form.editingEvent)"
                :exclude-user-ids="currentUser ? [currentUser.id] : []"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="w-full sm:w-auto"
                  :disabled="Boolean(form.editingEvent)"
                >
                  <Icon name="bi-people-fill" class="mr-1.5 h-4 w-4" />
                  Add participants
                </Button>
              </WorkspaceMemberDropdown>
            </div>
            <p v-else class="text-xs text-muted-foreground">Participants are derived from channel members.</p>
          </div>
        </template>

        <DialogFooter class="gap-2 sm:justify-between">
          <Button
            v-if="form.editingEvent"
            type="button"
            variant="flat"
            intent="destructive"
            size="sm"
            :disabled="form.isCreating"
            @click="removeEvent"
          >
            Remove
          </Button>
          <div v-else class="hidden sm:block" />
          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="form.isCreating"
              @click="requestClose"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" :disabled="form.isCreating || !form.eventTitle.trim()">
              {{ form.isCreating ? "Saving…" : form.editingEvent ? "Update" : "Create" }}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
