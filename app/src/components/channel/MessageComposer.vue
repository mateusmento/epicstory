<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { startRecording } from "@/core/screen-recording";
import { useWebSockets } from "@/core/websockets";
import { Icon } from "@/design-system/icons";
import {
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Separator,
} from "@/design-system";
import type { User } from "@/domain/auth";
import {
  CHANNEL_TYPING_PULSE_MS,
  clearChannelDraft,
  loadChannelDraft,
  composerQuoteRef,
  saveChannelDraft,
  type IMessage,
  type IReply,
  type IScheduledMessageRecurrence,
} from "@/domain/channels";
import { ChannelApi, type UploadedAttachment } from "@/domain/channels/services/channel.service";
import ChannelAttachmentStrip from "./ChannelAttachmentStrip.vue";
import {
  messageBodyPlainText,
  normalizeTiptapDoc,
  stripImageNodesFromDoc,
  tiptapToPlainText,
  type RichTextDocument,
} from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { debounce } from "lodash";
import {
  Bold,
  Braces,
  Code,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Paperclip,
  Strikethrough,
  Table2,
  TextQuote,
  ChevronDown,
  CalendarIcon,
} from "lucide-vue-next";
import type { Ref } from "vue";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import RichTextContentEditable from "@/components/rich-text/RichTextContentEditable.vue";
import {
  formatScheduleSummary,
  type ResolvedSchedule,
  resolveSchedulePreset,
} from "./message-schedule/schedule-builders";
import ScheduleMessageCustomDialog from "./message-schedule/ScheduleMessageCustomDialog.vue";

const props = withDefaults(
  defineProps<{
    mentionables?: User[];
    meId?: number;
    /** When set with workspaceId, enables typing signals + channel draft persistence */
    channelId?: number;
    workspaceId?: number;
    placeholder?: string;
    editingMessage?: { id: number; content: RichTextDocument } | null;
    quotedMessage?: (IMessage | IReply) | null;
  }>(),
  {
    editingMessage: null,
    quotedMessage: null,
  },
);

const { websocket } = useWebSockets();
const channelApi = useDependency(ChannelApi);

const suppressTypingSignals = ref(true);
const isEmittingTyping = ref(false);
const pulseTimer = ref<ReturnType<typeof setInterval> | null>(null);

function clearTypingPulse() {
  if (pulseTimer.value) {
    clearInterval(pulseTimer.value);
    pulseTimer.value = null;
  }
}

function emitTypingPulse() {
  if (props.channelId == null || props.workspaceId == null) return;
  websocket?.emit("channel-typing-pulse", {
    channelId: props.channelId,
    workspaceId: props.workspaceId,
  });
}

function emitTypingStop() {
  if (!isEmittingTyping.value) return;
  if (props.channelId == null || props.workspaceId == null) return;
  websocket?.emit("channel-typing-stop", {
    channelId: props.channelId,
    workspaceId: props.workspaceId,
  });
  isEmittingTyping.value = false;
}

function emitTypingStopForChannel(channelId: number, workspaceId: number) {
  websocket?.emit("channel-typing-stop", { channelId, workspaceId });
}

const emit = defineEmits<{
  (
    e: "send-message",
    value: {
      content: RichTextDocument;
      quotedMessageId?: number;
      quotedReplyId?: number;
      attachmentIds?: number[];
    },
  ): void;
  (
    e: "send-scheduled-message",
    value: {
      content: RichTextDocument;
      quotedMessageId?: number;
      dueAt: string;
      recurrence: IScheduledMessageRecurrence;
    },
  ): void;
  (e: "submit-edit", value: { messageId: number; content: RichTextDocument }): void;
  (e: "clear-quote"): void;
  (e: "cancel-edit"): void;
}>();

const composerPlaceholder = computed(() =>
  props.editingMessage ? "Edit message…" : (props.placeholder ?? "Send a message…"),
);

const quotedExcerpt = computed(() => {
  if (!props.quotedMessage) return "";
  const raw =
    props.quotedMessage.displayContent ??
    messageBodyPlainText({ content: props.quotedMessage.content });
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 160 ? `${t.slice(0, 160)}…` : t;
});

/** Staged uploads (linked on send, not embedded in TipTap JSON). */
const pendingAttachments = ref<UploadedAttachment[]>([]);
const stagingFileInputRef = ref<HTMLInputElement | null>(null);

function collectFilesFromClipboard(event: ClipboardEvent): File[] {
  const out: File[] = [];
  const seen = new Set<string>();
  const add = (f: File | null) => {
    if (!f || f.size === 0) return;
    const key = `${f.name}:${f.size}:${f.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };
  const cd = event.clipboardData;
  if (!cd) return out;
  if (cd.files?.length) {
    for (const f of Array.from(cd.files)) add(f);
  }
  const items = cd.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      add(it.getAsFile());
    }
  }
  return out;
}

async function uploadStagingFiles(fileList: File[]) {
  if (!fileList.length || props.channelId == null) return;
  const channelId = props.channelId;
  const next = [...pendingAttachments.value];
  for (const file of fileList) {
    try {
      const a = await channelApi.uploadAttachment(channelId, file);
      next.push(a);
    } catch {
      /* keep composing */
    }
  }
  pendingAttachments.value = next;
}

const composerSurfaceRef = ref<InstanceType<typeof RichTextContentEditable> | null>(null);

const composerEditorProps = computed(() => ({
  handleKeyDown: (_: unknown, event: KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      onSendMessage();
      return true;
    }
    return false;
  },
  handlePaste: (_view: unknown, event: ClipboardEvent) => {
    const files = collectFilesFromClipboard(event);
    if (files.length === 0 || props.channelId == null) return false;
    event.preventDefault();
    uploadStagingFiles(files).catch(() => {
      /* upload failed */
    });
    return true;
  },
}));

const editor = computed(() => {
  const exposed = composerSurfaceRef.value?.editor as Ref<Editor | undefined> | undefined;
  return exposed?.value ?? null;
});

const customScheduleOpen = ref(false);
const activeSchedule = ref<ResolvedSchedule | null>(null);

const scheduleSummary = computed(() =>
  activeSchedule.value ? formatScheduleSummary(activeSchedule.value) : "",
);

function applyPreset(preset: Parameters<typeof resolveSchedulePreset>[0]) {
  activeSchedule.value = resolveSchedulePreset(preset);
}

function onCustomScheduleConfirm(s: ResolvedSchedule) {
  activeSchedule.value = s;
  customScheduleOpen.value = false;
}

function openCustomScheduleDialog() {
  customScheduleOpen.value = true;
}

function clearActiveSchedule() {
  activeSchedule.value = null;
}

function focusComposerEnd() {
  const ed = editor.value;
  if (ed) ed.chain().focus("end").run();
}

/** Return focus to the composer when the (non-modal) custom schedule layer closes. */
watch(customScheduleOpen, (open) => {
  if (open) return;
  nextTick().then(() => {
    focusComposerEnd();
  });
});

const saveDraftDebounced = debounce((ed: Editor) => {
  if (props.workspaceId == null || props.channelId == null) return;
  if (props.editingMessage) return;
  const doc = normalizeTiptapDoc(ed.getJSON());
  const plain = tiptapToPlainText(doc, { stripFormatting: true }).trim();
  if (!plain) {
    clearChannelDraft(props.workspaceId, props.channelId);
    return;
  }
  saveChannelDraft(props.workspaceId, props.channelId, doc as Record<string, unknown>);
}, 400);

function maybeStartTypingPulse(ed: Editor) {
  if (suppressTypingSignals.value) return;
  if (props.channelId == null || props.workspaceId == null) return;

  const plain = tiptapToPlainText(normalizeTiptapDoc(ed.getJSON()), {
    stripFormatting: true,
  }).trim();
  if (!plain) {
    clearTypingPulse();
    emitTypingStop();
    return;
  }
  if (!ed.isFocused) {
    clearTypingPulse();
    emitTypingStop();
    return;
  }

  if (!isEmittingTyping.value) {
    isEmittingTyping.value = true;
    emitTypingPulse();
    clearTypingPulse();
    pulseTimer.value = setInterval(() => {
      const inner = editor.value;
      if (!inner?.isFocused) {
        clearTypingPulse();
        emitTypingStop();
        return;
      }
      const p = tiptapToPlainText(normalizeTiptapDoc(inner.getJSON()), {
        stripFormatting: true,
      }).trim();
      if (!p) {
        clearTypingPulse();
        emitTypingStop();
        return;
      }
      emitTypingPulse();
    }, CHANNEL_TYPING_PULSE_MS);
  }
}

const scheduleAttachmentHint = computed(() =>
  activeSchedule.value && pendingAttachments.value.length > 0
    ? "Attachments are not sent in scheduled messages. Clear the schedule or send now to include them."
    : null,
);

function handleComposerUpdate(ed: Editor) {
  saveDraftDebounced(ed);
  maybeStartTypingPulse(ed);
}

function handleComposerBlur() {
  clearTypingPulse();
  emitTypingStop();
}

function flushDraftSync() {
  const ed = editor.value;
  if (!ed || props.workspaceId == null || props.channelId == null || props.editingMessage) return;
  saveDraftDebounced.cancel();
  const doc = normalizeTiptapDoc(ed.getJSON());
  const plain = tiptapToPlainText(doc, { stripFormatting: true }).trim();
  if (!plain) clearChannelDraft(props.workspaceId, props.channelId);
  else saveChannelDraft(props.workspaceId, props.channelId, doc as Record<string, unknown>);
}

watch(
  editor,
  (ed, prevEd) => {
    if (prevEd) {
      prevEd.off("update", onEditorUpdate);
      prevEd.off("blur", onEditorBlur);
    }
    if (!ed) return;
    ed.on("update", onEditorUpdate);
    ed.on("blur", onEditorBlur);
  },
  { immediate: true },
);

function onEditorUpdate() {
  const ed = editor.value;
  if (!ed) return;
  handleComposerUpdate(ed);
}

function onEditorBlur() {
  handleComposerBlur();
}

watch(
  () => props.editingMessage,
  (m, prev) => {
    if (!editor.value) return;
    if (!m) {
      if (prev) editor.value.commands.clearContent();
      return;
    }
    const doc = normalizeTiptapDoc(m.content);
    editor.value.commands.setContent(doc);
    editor.value.commands.focus("end");
  },
  { flush: "post" },
);

watch(
  [editor, () => props.channelId, () => props.workspaceId, () => props.editingMessage],
  async (_curr, prev) => {
    const ed = editor.value;
    if (!ed) return;

    if (props.editingMessage) {
      suppressTypingSignals.value = false;
      return;
    }

    const cid = props.channelId;
    const ws = props.workspaceId;
    if (cid == null || ws == null) return;

    if (prev) {
      const [, pCid, pWs] = prev;
      if (pCid != null && pWs != null && pCid !== cid) {
        emitTypingStopForChannel(pCid, pWs);
        clearTypingPulse();
        isEmittingTyping.value = false;
        saveDraftDebounced.cancel();
        activeSchedule.value = null;
        pendingAttachments.value = [];
      }
    }

    suppressTypingSignals.value = true;
    const draft = loadChannelDraft(ws, cid);
    if (draft?.content) {
      ed.commands.setContent(normalizeTiptapDoc(draft.content));
    } else {
      ed.commands.clearContent();
    }
    await nextTick();
    suppressTypingSignals.value = false;
  },
  { flush: "post" },
);

watch(
  () => props.editingMessage,
  (m) => {
    if (m) {
      activeSchedule.value = null;
      pendingAttachments.value = [];
    }
  },
);

onBeforeUnmount(() => {
  saveDraftDebounced.cancel();
  clearTypingPulse();
  if (props.channelId != null && props.workspaceId != null) {
    emitTypingStopForChannel(props.channelId, props.workspaceId);
  }
  isEmittingTyping.value = false;
  flushDraftSync();
});

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

function insertAtMention() {
  editor.value?.chain().focus().insertContent("@").run();
}

function openStagingFilePicker() {
  stagingFileInputRef.value?.click();
}

async function onStagingFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  input.value = "";
  if (!files?.length) return;
  await uploadStagingFiles(Array.from(files));
}

function removeStagingAttachment(id: number) {
  pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id);
}

function onSendMessage() {
  if (!editor.value) return;
  if (editor.value.isEmpty) return;
  const raw = editor.value.getJSON() as JSONContent;
  const stripped = stripImageNodesFromDoc(raw) as JSONContent;
  const doc = normalizeTiptapDoc(stripped);
  const plain = tiptapToPlainText(doc, { stripFormatting: true });
  if (!plain.trim()) return;
  if (props.editingMessage) {
    emit("submit-edit", {
      messageId: props.editingMessage.id,
      content: doc as RichTextDocument,
    });
    clearTypingPulse();
    if (props.channelId != null && props.workspaceId != null) {
      emitTypingStopForChannel(props.channelId, props.workspaceId);
    }
    isEmittingTyping.value = false;
    return;
  }
  const scheduling = !!(activeSchedule.value && props.channelId != null);
  const attachmentIds = scheduling ? [] : pendingAttachments.value.map((a) => a.id);

  if (scheduling) {
    const sch = activeSchedule.value!;
    const q = props.quotedMessage;
    const scheduledQuote = q && (!("messageId" in q) || q.messageId == null) ? { quotedMessageId: q.id } : {};
    emit("send-scheduled-message", {
      content: doc as RichTextDocument,
      ...scheduledQuote,
      dueAt: sch.dueAt.toISOString(),
      recurrence: sch.recurrence,
    });
    activeSchedule.value = null;
  } else {
    emit("send-message", {
      content: doc as RichTextDocument,
      ...(props.quotedMessage ? composerQuoteRef(props.quotedMessage) : {}),
      ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
    });
  }
  pendingAttachments.value = [];
  editor.value.commands.clearContent();
  saveDraftDebounced.cancel();
  if (props.workspaceId != null && props.channelId != null) {
    clearChannelDraft(props.workspaceId, props.channelId);
  }
  clearTypingPulse();
  if (props.channelId != null && props.workspaceId != null) {
    emitTypingStopForChannel(props.channelId, props.workspaceId);
  }
  isEmittingTyping.value = false;
}

function onCancelEdit() {
  emit("cancel-edit");
}

const isRecording = ref(false);
const stopRecording = ref<(() => void) | null>(null);
const secondsElapsed = ref(0);
const counter = ref<ReturnType<typeof setInterval> | null>(null);

async function onToggleRecording() {
  if (!isRecording.value) {
    secondsElapsed.value = 0;
    isRecording.value = true;
    stopRecording.value = await startRecording();
    counter.value = setInterval(() => {
      secondsElapsed.value++;
    }, 1000);
  } else {
    counter.value && clearInterval(counter.value);
    counter.value = null;
    stopRecording.value?.();
    stopRecording.value = null;
    isRecording.value = false;
  }
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

/** Focus shell only — never blur/re-anchor an existing ProseMirror selection (fixes code-block node views). */
function focusComposerFromShell(ev: MouseEvent) {
  const t = ev.target;
  if (t instanceof Node && editor.value?.view.dom.contains(t)) return;
  editor.value?.commands.focus();
}
</script>

<template>
  <div
    class="flex:col-md flex min-h-0 max-h-[50vh] flex-col overflow-hidden p-3 border border-zinc-200 rounded-xl bg-white focus-within:outline outline-1 outline-zinc-300/60"
    @click="focusComposerFromShell"
  >
    <div
      v-if="quotedMessage && !editingMessage"
      class="flex:row-md flex:center-y shrink-0 gap-2 mb-2 pb-2 border-b border-zinc-200/80 text-xs text-muted-foreground"
    >
      <Icon name="fa-quote-right" class="size-4 self-start" />
      <div class="flex:col-md flex-1 min-w-0">
        <span class="font-medium text-foreground/80">{{ quotedMessage.sender.name }}</span>
        <span class="text-muted-foreground/90"> {{ quotedExcerpt }}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-7 w-7 shrink-0"
        @click.stop="emit('clear-quote')"
      >
        <span class="sr-only">Remove quote</span>
        <Icon name="io-close" class="size-4" />
      </Button>
    </div>
    <div class="min-h-0 flex-auto overflow-y-auto overflow-x-hidden py-0.5 font-lato">
      <RichTextContentEditable
        ref="composerSurfaceRef"
        variant="channel"
        class="min-h-[4rem]"
        :placeholder="composerPlaceholder"
        :mentionables="mentionables ?? []"
        :me-id="meId"
        :extra-editor-props="composerEditorProps"
      />
    </div>
    <input ref="stagingFileInputRef" type="file" class="sr-only" multiple @change="onStagingFilesSelected" />
    <div
      v-if="pendingAttachments.length || scheduleAttachmentHint"
      class="shrink-0 border-t border-zinc-200/80 pt-2"
      @click.stop
    >
      <ChannelAttachmentStrip
        :files="pendingAttachments"
        :disabled="!!activeSchedule"
        :removable="true"
        :hint="scheduleAttachmentHint"
        @remove="removeStagingAttachment"
      />
    </div>

    <div class="flex:row-md flex:center-y mt-2 shrink-0 text-secondary-foreground">
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('bold') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('italic') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('strike') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Strikethrough class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Quote"
        :class="editor?.isActive('blockquote') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <TextQuote class="w-5 h-5" />
        <!-- <Icon name="fa-quote-right" class="w-5 h-5" /> -->
      </Button>
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
      <Button
        variant="ghost"
        size="icon"
        title="Inline code"
        :class="editor?.isActive('code') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <Braces class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('bulletList') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('orderedList') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Task list"
        :class="editor?.isActive('taskList') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleTaskList().run()"
      >
        <ListChecks class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Insert table"
        @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
      >
        <Table2 class="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('codeBlock') ? 'bg-secondary' : ''"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        <Code class="w-5 h-5" />
      </Button>
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
      <Button
        variant="ghost"
        size="icon"
        :class="editor?.isActive('link') ? 'bg-secondary' : ''"
        @click="toggleLink"
      >
        <Link2 class="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" @click="insertAtMention">
        <Icon name="oi-mention" class="w-5 h-5" />
      </Button>

      <div class="flex-1 min-w-0">
        <div
          v-if="!editingMessage && scheduleSummary"
          class="flex:row items-center gap-1 text-xs text-muted-foreground min-w-0"
        >
          <span class="truncate max-w-[14rem]">{{ scheduleSummary }}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-6 w-6 shrink-0"
            @click.stop="clearActiveSchedule"
          >
            <span class="sr-only">Clear schedule</span>
            <Icon name="io-close" class="size-3" />
          </Button>
        </div>
      </div>

      <Button
        v-if="editingMessage"
        type="button"
        variant="ghost"
        size="sm"
        class="text-muted-foreground"
        @click="onCancelEdit"
      >
        Cancel
      </Button>

      <Button variant="ghost" size="icon" @click="onToggleRecording">
        <Icon v-if="!isRecording" name="bi-camera-video" class="w-6 h-6" />
        <template v-else>
          <Icon name="ri-record-circle-fill" class="w-6 h-6 text-red-500" />
          <span class="text-xs ml-1 text-red-400">{{ formatTime(secondsElapsed) }}</span>
        </template>
      </Button>

      <template v-if="!editingMessage && channelId != null">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Attach files"
          class="shrink-0 mr-0.5"
          aria-label="Attach files"
          @click.stop="openStagingFilePicker()"
        >
          <Paperclip class="size-5" />
        </Button>
        <ButtonGroup>
          <Button
            type="button"
            variant="default"
            size="sm"
            class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
            @click="onSendMessage"
          >
            <Icon name="io-paper-plane" />
            {{ activeSchedule ? "Schedule" : "Send" }}
          </Button>
          <ButtonGroupSeparator
            class="!m-0 !w-px !min-w-px shrink-0 self-stretch border-0 bg-white/70"
            orientation="vertical"
          />
          <Menu type="dropdown-menu">
            <MenuTrigger as-child>
              <Button
                type="button"
                variant="default"
                size="sm"
                class="shrink-0 border-0 bg-[#3A66FF] px-1.5 text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Schedule options"
              >
                <ChevronDown class="w-4 h-4" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end" class="min-w-[12rem] font-dmSans">
              <MenuItem @click="applyPreset('in10s')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>In 10 seconds</span>
              </MenuItem>
              <MenuItem @click="applyPreset('in1m')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>In 1 minute</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem @click="applyPreset('in2h')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>In 2 hours</span>
              </MenuItem>
              <MenuItem @click="applyPreset('tomorrow9')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>Tomorrow at 9 AM</span>
              </MenuItem>
              <MenuItem @click="applyPreset('in2days9')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>In 2 days at 9 AM</span>
              </MenuItem>
              <MenuItem @click="applyPreset('nextMonday9')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>Next Monday at 9 AM</span>
              </MenuItem>
              <MenuItem @click="applyPreset('nextWeek9')">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>Next week at 9 AM</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem @click="openCustomScheduleDialog">
                <CalendarIcon class="size-4 text-muted-foreground" />
                <span>Custom schedule…</span>
              </MenuItem>
            </MenuContent>
          </Menu>
        </ButtonGroup>
      </template>
      <Button
        v-else
        type="button"
        variant="default"
        size="sm"
        class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
        @click="onSendMessage"
      >
        <Icon name="io-paper-plane" />
        {{ editingMessage ? "Save" : "Send" }}
      </Button>
    </div>
    <ScheduleMessageCustomDialog v-model:open="customScheduleOpen" @confirm="onCustomScheduleConfirm" />
  </div>
</template>
