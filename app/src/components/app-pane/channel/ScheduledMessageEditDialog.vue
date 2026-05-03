<script lang="ts" setup>
import RichTextContentEditable from "@/components/rich-text/RichTextContentEditable.vue";
import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from "@/design-system";
import type { User } from "@/domain/auth";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import type { IScheduledMessage } from "@/domain/channels/types/scheduled-message.type";
import ScheduleMessageCustomDialog from "@/components/channel/message-schedule/ScheduleMessageCustomDialog.vue";
import {
  formatScheduleSummary,
  type ResolvedSchedule,
} from "@/components/channel/message-schedule/schedule-builders";
import { normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import { format } from "date-fns";
import {
  Bold,
  Braces,
  Code,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  Table2,
  TextQuote,
} from "lucide-vue-next";
import type { Editor } from "@tiptap/core";
import type { Ref } from "vue";
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    channelId: number;
    scheduled: IScheduledMessage;
    mentionables?: User[];
  }>(),
  { mentionables: () => [] },
);

const emit = defineEmits<{
  "update:open": [v: boolean];
  saved: [];
}>();

const { user: authUser } = useAuth();
const channelApi = useDependency(ChannelApi);
const scheduleDialogOpen = ref(false);
const scheduleOverride = ref<ResolvedSchedule | null>(null);

const scheduleEditorSurfaceRef = ref<InstanceType<typeof RichTextContentEditable> | null>(null);

const editor = computed(() => {
  const exposed = scheduleEditorSurfaceRef.value?.editor as Ref<Editor | undefined> | undefined;
  return exposed?.value ?? null;
});

const meId = computed(() => authUser.value?.id);

const seedDocument = computed(() =>
  props.open ? normalizeTiptapDoc(props.scheduled.content) : null,
);

watch(
  () => props.open,
  (op) => {
    if (op) scheduleOverride.value = null;
  },
);

const displaySchedule = computed(() => {
  if (scheduleOverride.value) return formatScheduleSummary(scheduleOverride.value);
  const m = props.scheduled;
  return `${format(new Date(m.dueAt), "PPp")} · ${m.recurrence.frequency}`;
});

function onSchedulePicked(s: ResolvedSchedule) {
  scheduleOverride.value = s;
  scheduleDialogOpen.value = false;
}

function close() {
  emit("update:open", false);
}

function toggleLink() {
  if (!editor.value) return;
  const prev = editor.value.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", prev ?? "https://");
  if (!url) {
    editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.value.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

async function save() {
  if (!editor.value) return;
  const doc = normalizeTiptapDoc(editor.value.getJSON());
  const plain = tiptapToPlainText(doc, { stripFormatting: true });
  if (!plain.trim()) return;
  const sch = scheduleOverride.value;
  await channelApi.patchScheduledMessage(props.channelId, props.scheduled.id, {
    content: doc,
    ...(sch ? { dueAt: sch.dueAt.toISOString(), recurrence: sch.recurrence } : {}),
  });
  emit("saved");
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Edit scheduled message</DialogTitle>
      </DialogHeader>
      <p class="text-xs text-muted-foreground">
        Schedule: {{ displaySchedule }} ·
        <Button type="button" variant="link" class="h-auto p-0 text-xs" @click="scheduleDialogOpen = true"
          >Change</Button
        >
      </p>
      <div class="flex:col border rounded-md overflow-hidden min-h-0 max-h-72">
        <ScrollArea class="min-h-0 max-h-48">
          <RichTextContentEditable
            v-if="open"
            ref="scheduleEditorSurfaceRef"
            variant="channel"
            placeholder="Message…"
            :mentionables="mentionables ?? []"
            :me-id="meId"
            :document="seedDocument"
            :sync-document="true"
            class="p-2"
          />
        </ScrollArea>
        <div class="flex:row flex-wrap items-center gap-0.5 border-t p-1 text-secondary-foreground">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleBold().run()"
          >
            <Bold class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleItalic().run()"
          >
            <Italic class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleStrike().run()"
          >
            <Strikethrough class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleBlockquote().run()"
          >
            <TextQuote class="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" class="h-6" />
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleCode().run()"
          >
            <Braces class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleBulletList().run()"
          >
            <List class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleOrderedList().run()"
          >
            <ListOrdered class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleTaskList().run()"
          >
            <ListChecks class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
          >
            <Table2 class="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="editor?.chain().focus().toggleCodeBlock().run()"
          >
            <Code class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" class="h-8 w-8" @click="toggleLink()">
            <Link2 class="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div class="flex:row justify-end gap-2">
        <Button type="button" variant="outline" @click="close">Cancel</Button>
        <Button type="button" @click="save()">Save</Button>
      </div>
    </DialogContent>
  </Dialog>
  <ScheduleMessageCustomDialog v-model:open="scheduleDialogOpen" @confirm="onSchedulePicked" />
</template>
