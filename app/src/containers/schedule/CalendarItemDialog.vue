<script lang="ts" setup>
import { UserAvatar } from "@/presentationals/user";
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group";
import { SCHEDULE_DIALOG_KEY } from "@/domain/schedule";
import { inject } from "vue";
import RecurrenceFields from "./RecurrenceFields.vue";

const dialog = inject(SCHEDULE_DIALOG_KEY);
if (!dialog) {
  throw new Error("CalendarItemDialog requires SCHEDULE_DIALOG_KEY");
}

const { form, formattedDate, channelList, currentUser } = dialog;
</script>

<template>
  <Dialog :open="form.showEventDialog" @update:open="dialog.handleDialogOpenChange">
    <DialogContent class="!p-0 sm:max-w-[560px]">
      <div class="rounded-lg bg-card !p-0">
        <DialogHeader class="px-3 pt-3 pb-1">
          <DialogTitle class="text-sm font-medium text-muted-foreground">
            {{
              form.editingEvent
                ? form.itemType === "meeting"
                  ? "Edit meeting"
                  : "Edit event"
                : form.itemType === "meeting"
                  ? "New meeting"
                  : "New event"
            }}
          </DialogTitle>
        </DialogHeader>

        <form class="px-3 pb-3" @submit.prevent="dialog.saveEvent">
          <div class="mt-1 flex items-center justify-between gap-2">
            <div class="text-[11px] text-muted-foreground">Type</div>
            <ToggleGroup v-model="form.itemType" type="single" :disabled="Boolean(form.editingEvent)">
              <ToggleGroupItem value="event">Event</ToggleGroupItem>
              <ToggleGroupItem value="meeting">Meeting</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <label for="event-title" class="sr-only">Title</label>
          <input
            id="event-title"
            v-model="form.eventTitle"
            class="w-full text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Event title"
            autofocus
            required
          />

          <label for="event-description" class="sr-only">Description</label>
          <textarea
            id="event-description"
            v-model="form.eventDescription"
            rows="3"
            class="mt-1.5 w-full resize-none text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Add description…"
          />

          <div v-if="form.itemType === 'event'" class="mt-2.5 rounded-md border bg-muted p-2.5">
            <RecurrenceFields
              v-model:frequency="form.eventRecurrenceFrequency"
              v-model:interval="form.eventRecurrenceInterval"
              v-model:by-weekday="form.eventRecurrenceByWeekday"
              @toggle-weekday="dialog.toggleEventWeekday"
            />
          </div>

          <div v-if="form.itemType === 'meeting'" class="mt-2.5 rounded-md border bg-muted p-2.5">
            <p v-if="form.editingEvent" class="mb-2 text-xs text-muted-foreground">
              Channel and participant list are set when the meeting was created; other fields below can be
              updated.
            </p>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs text-muted-foreground">
                Channel (optional)
                <select
                  v-model.number="form.meetingChannelId"
                  class="mt-1 w-full h-8 rounded-md border bg-background px-2 text-sm"
                  :disabled="Boolean(form.editingEvent)"
                >
                  <option :value="null">No channel</option>
                  <option v-for="c in channelList" :key="c.id" :value="c.id">
                    {{ c.name || `Channel ${c.id}` }}
                  </option>
                </select>
              </label>

              <label class="text-xs text-muted-foreground">
                Notify (minutes before)
                <input
                  v-model.number="form.meetingNotifyMinutesBefore"
                  type="number"
                  min="0"
                  class="mt-1 w-full h-8 rounded-md border bg-background px-2 text-sm outline-none"
                />
              </label>
            </div>

            <div class="mt-2 flex items-center justify-between">
              <label class="flex items-center gap-2 text-xs text-muted-foreground">
                <input v-model="form.meetingIsPublic" type="checkbox" class="h-4 w-4" />
                Public (workspace members with link can join)
              </label>
            </div>

            <RecurrenceFields
              v-model:frequency="form.meetingRecurrenceFrequency"
              v-model:interval="form.meetingRecurrenceInterval"
              v-model:by-weekday="form.meetingRecurrenceByWeekday"
              @toggle-weekday="dialog.toggleMeetingWeekday"
            />

            <div v-if="!form.meetingChannelId" class="mt-2 space-y-2">
              <div class="text-xs text-muted-foreground">Participants (notified)</div>
              <ul
                v-if="form.meetingParticipantUsers.length"
                class="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-md border bg-background p-2"
              >
                <li
                  v-for="p in form.meetingParticipantUsers"
                  :key="p.id"
                  class="flex items-center gap-2 text-sm"
                >
                  <UserAvatar :name="p.name" :picture="p.picture" size="sm" />
                  <div class="min-w-0 flex-1">
                    <div class="font-medium leading-tight truncate">{{ p.name }}</div>
                    <div v-if="p.email" class="text-xs text-muted-foreground leading-tight truncate">
                      {{ p.email }}
                    </div>
                  </div>
                  <Button
                    v-if="!form.editingEvent"
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Remove"
                    @click="dialog.removeMeetingParticipant(p.id)"
                  >
                    <Icon name="io-close" class="h-4 w-4" />
                  </Button>
                </li>
              </ul>
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
            <div v-else class="mt-2 text-xs text-muted-foreground">
              Participants are derived from channel members.
            </div>
          </div>

          <div class="mt-2.5 flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <div class="text-[11px] text-muted-foreground truncate">{{ formattedDate }}</div>
            </div>
            <div class="flex items-center gap-2">
              <label for="time" class="sr-only">Start time</label>
              <input
                id="time"
                v-model="form.eventTime"
                type="time"
                class="h-8 rounded-md border bg-background px-2 text-sm outline-none"
                required
              />
              <label for="endTime" class="sr-only">End time</label>
              <input
                id="endTime"
                v-model="form.eventEndTime"
                type="time"
                class="h-8 rounded-md border bg-background px-2 text-sm outline-none"
                required
              />
            </div>
          </div>

          <div class="mt-3 flex items-center justify-end gap-2 border-t pt-2.5">
            <Button
              v-if="form.editingEvent"
              type="button"
              variant="destructive"
              size="sm"
              class="mr-auto"
              :disabled="form.isCreating"
              @click="dialog.removeEvent"
            >
              Remove
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="form.isCreating"
              @click="dialog.closeDialog"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" :disabled="form.isCreating || !form.eventTitle.trim()">
              {{ form.isCreating ? "Saving…" : form.editingEvent ? "Update" : "Create" }}
            </Button>
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
