<script lang="ts" setup>
import ScheduleMessageCustomDialog from "@/presentationals/messages/ScheduleMessageCustomDialog.vue";
import { formatScheduleSummary, type ResolvedSchedule } from "@/presentationals/messages/schedule-builders";
import MessageComposerPollSection from "@/presentationals/messages/MessageComposerPollSection.vue";
import RichTextComposer from "@/presentationals/rich-text/RichTextComposer.vue";
import { useDependency } from "@/core/dependency-injection";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from "@/design-system";
import type { IUser as IUser } from "@epicstory/contracts";
import { useAuth } from "@/domain/auth";
import { ChannelApi } from "@epicstory/api-client";
import type { IScheduledMessage } from "@epicstory/contracts";
import type { MessagePollBody } from "@epicstory/contracts";
import { docContainsImageNodes, normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor } from "@tiptap/core";
import { format } from "date-fns";
import {
  Bold,
  Braces,
  ChartBar,
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
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    channelId: number;
    scheduled: IScheduledMessage;
    mentionables?: IUser[];
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
const meId = computed(() => authUser.value?.id);
const editor = ref<Editor | null>(null);
const composerPollBody = ref<MessagePollBody | null>(null);

function normalizedComposerPoll(b: MessagePollBody | null): MessagePollBody | undefined {
  if (!b) return undefined;
  const question = b.question.trim();
  const options = b.options
    .map((o) => ({ id: o.id, label: o.label.trim() }))
    .filter((o) => o.label.length > 0);
  if (question.length === 0 || options.length < 2) return undefined;
  return { question, options };
}

function setComposerPollBody(v: MessagePollBody | null) {
  composerPollBody.value = v;
}

function toggleComposerPoll() {
  if (composerPollBody.value != null) {
    composerPollBody.value = null;
  } else {
    composerPollBody.value = {
      question: "",
      options: [
        { id: crypto.randomUUID(), label: "" },
        { id: crypto.randomUUID(), label: "" },
      ],
    };
  }
}

const displaySchedule = computed(() => {
  if (scheduleOverride.value) return formatScheduleSummary(scheduleOverride.value);
  const m = props.scheduled;
  return `${format(new Date(m.dueAt), "PPp")} · ${m.recurrence.frequency}`;
});

watch(
  () => [props.open, props.scheduled] as const,
  ([op]) => {
    if (!op || !editor.value) return;
    scheduleOverride.value = null;
    const doc = normalizeTiptapDoc(props.scheduled.content);
    editor.value.commands.setContent(doc);
    composerPollBody.value = props.scheduled.poll
      ? {
          question: props.scheduled.poll.question,
          options: props.scheduled.poll.options.map((o) => ({ ...o })),
        }
      : null;
  },
  { immediate: true },
);

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
  const plain = tiptapToPlainText(doc, { stripFormatting: true }).trim();
  const pollPayload = normalizedComposerPoll(composerPollBody.value);
  const pollIncomplete = composerPollBody.value != null && pollPayload === undefined;
  if (pollIncomplete) return;
  if (!plain && !docContainsImageNodes(doc) && !pollPayload) return;

  let pollField: MessagePollBody | null | undefined = undefined;
  if (composerPollBody.value === null) {
    pollField = props.scheduled.poll ? null : undefined;
  } else {
    pollField = pollPayload;
  }

  const sch = scheduleOverride.value;
  await channelApi.patchScheduledMessage(props.channelId, props.scheduled.id, {
    content: doc,
    ...(pollField !== undefined ? { poll: pollField } : {}),
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
          <div class="p-2">
            <RichTextComposer
              placeholder="Message…"
              :mentionables="props.mentionables"
              :me-id="meId"
              @update:editor="editor = $event"
            />
            <MessageComposerPollSection
              :model-value="composerPollBody"
              @update:model-value="setComposerPollBody"
            />
          </div>
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
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Poll"
            aria-label="Poll"
            :class="composerPollBody ? 'bg-secondary' : ''"
            @click="toggleComposerPoll()"
          >
            <ChartBar class="w-4 h-4" />
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
