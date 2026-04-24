<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, ScrollArea } from "@/design-system";
import { useAuth } from "@/domain/auth";
import type { User } from "@/domain/auth";
import type { IScheduledMessage } from "@/domain/channels/types/scheduled-message.type";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import { format, formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-vue-next";
import { onMounted, ref, watch } from "vue";
import ScheduledMessageEditDialog from "./ScheduledMessageEditDialog.vue";

const props = defineProps<{
  channelId?: number;
  members?: User[];
}>();

const { user } = useAuth();
const channelApi = useDependency(ChannelApi);
const list = ref<IScheduledMessage[]>([]);
const loadError = ref<string | null>(null);
const editing = ref<IScheduledMessage | null>(null);
const editOpen = ref(false);

async function load() {
  if (props.channelId == null) return;
  loadError.value = null;
  try {
    list.value = await channelApi.getScheduledMessages(props.channelId);
  } catch (e: any) {
    loadError.value = e?.message ?? "Failed to load";
  }
}

onMounted(() => {
  void load();
});

watch(
  () => props.channelId,
  () => {
    void load();
  },
);

function openEdit(m: IScheduledMessage) {
  editing.value = m;
  editOpen.value = true;
}

async function onEditSaved() {
  editOpen.value = false;
  editing.value = null;
  await load();
}

async function remove(m: IScheduledMessage) {
  if (props.channelId == null) return;
  if (m.senderId !== user?.id) return;
  if (!window.confirm("Delete this scheduled message?")) return;
  try {
    await channelApi.deleteScheduledMessage(props.channelId, m.id);
    await load();
  } catch {
    // ignore
  }
}

function scheduleLabel(m: IScheduledMessage) {
  if (m.recurrence.frequency === "once") {
    return format(new Date(m.dueAt), "PPp");
  }
  if (m.recurrence.frequency === "daily") {
    const n = m.recurrence.interval && m.recurrence.interval > 1 ? `${m.recurrence.interval}d` : "daily";
    return `Every ${n} at ${m.recurrence.timeOfDay?.slice(0, 5) ?? ""}`;
  }
  return `Weekly at ${m.recurrence.timeOfDay?.slice(0, 5) ?? ""}`;
}

function previewText(m: IScheduledMessage) {
  const t = m.content?.trim() ?? "";
  return t.length > 100 ? `${t.slice(0, 100)}…` : t;
}
</script>

<template>
  <div v-if="channelId == null" class="p-xl text-sm text-muted-foreground">
    Select a channel to see schedules.
  </div>
  <div v-else class="flex:col min-h-0 flex-1">
    <p v-if="loadError" class="p-3 text-sm text-destructive">{{ loadError }}</p>
    <ScrollArea class="h-full max-h-[min(60vh,480px)]">
      <ul class="flex:col gap-1 p-2">
        <li
          v-for="m in list"
          :key="m.id"
          class="flex:row items-start gap-2 rounded-md border border-zinc-200/80 p-2 text-left text-sm"
        >
          <div class="min-w-0 flex-1">
            <p class="line-clamp-2 whitespace-pre-wrap text-foreground/90">{{ previewText(m) }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ scheduleLabel(m) }}</p>
            <p class="text-[0.65rem] text-muted-foreground/80">
              {{ formatDistanceToNow(new Date(m.dueAt), { addSuffix: true }) }}
            </p>
          </div>
          <Menu v-if="m.senderId === user?.id" type="dropdown-menu">
            <MenuTrigger as-child>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="h-8 w-8 shrink-0"
                aria-label="Open menu"
                >⋮</Button
              >
            </MenuTrigger>
            <MenuContent align="end" class="font-dmSans">
              <MenuItem @click="openEdit(m)">
                <Pencil class="size-4 text-muted-foreground" />
                <span>Edit</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" @click="remove(m)">
                <Trash2 class="size-4" />
                <span>Delete</span>
              </MenuItem>
            </MenuContent>
          </Menu>
        </li>
        <li v-if="!list.length && !loadError" class="p-4 text-center text-xs text-muted-foreground">
          No scheduled messages
        </li>
      </ul>
    </ScrollArea>
    <ScheduledMessageEditDialog
      v-if="editing"
      v-model:open="editOpen"
      :channel-id="channelId"
      :mentionables="members ?? []"
      :scheduled="editing"
      @saved="onEditSaved"
    />
  </div>
</template>
