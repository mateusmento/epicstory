<script lang="ts" setup>
import { startRecording } from "@/core/screen-recording";
import { Button } from "@/design-system/ui/button";
import { Separator } from "@/design-system/ui/separator";
import { Icon } from "@/design-system/icons";
import { useWebSockets } from "@/core/websockets";
import {
  CHANNEL_TYPING_PULSE_MS,
  clearChannelDraft,
  loadChannelDraft,
  saveChannelDraft,
} from "@/domain/channels";
import { debounce } from "lodash";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/vue-3";
import { VueRenderer } from "@tiptap/vue-3";
import {
  createMentionExtensionWithNodeView,
  createPlaceholderExtension,
  createRichTextExtensions,
  EPIC_STORY_COMPOSER_EDITOR_CLASS,
} from "@epicstory/tiptap/vue";
import { messageBodyPlainText, normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import { Bold, Code, Italic, Strikethrough, List, ListOrdered, Link2 } from "lucide-vue-next";
import MentionList from "./MentionList.vue";
import type { MentionSuggestionItem } from "./MentionList.vue";
import type { User } from "@/domain/auth";
import TiptapMentionNodeView from "./TiptapMentionNodeView.vue";

void StarterKit;
void Underline;
void Link;

const props = withDefaults(
  defineProps<{
    mentionables?: User[];
    meId?: number;
    /** When set with workspaceId, enables typing signals + channel draft persistence */
    channelId?: number;
    workspaceId?: number;
    placeholder?: string;
    editingMessage?: { id: number; content: string; contentRich?: any } | null;
    quotedMessage?: { sender: { name: string }; content: string; contentRich?: any } | null;
  }>(),
  {
    editingMessage: null,
    quotedMessage: null,
  },
);

const { websocket } = useWebSockets();

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
  (e: "send-message", value: { content: string; contentRich: any }): void;
  (e: "submit-edit", value: { messageId: number; content: string; contentRich: any }): void;
  (e: "clear-quote"): void;
  (e: "cancel-edit"): void;
}>();

const composerPlaceholder = computed(() =>
  props.editingMessage ? "Edit message…" : (props.placeholder ?? "Send a message…"),
);

const quotedExcerpt = computed(() => {
  if (!props.quotedMessage) return "";
  const t = messageBodyPlainText(props.quotedMessage).replace(/\s+/g, " ").trim();
  return t.length > 160 ? `${t.slice(0, 160)}…` : t;
});

const mentionablesForSuggestion = computed(() => {
  const list = props.mentionables ?? [];
  const meId = props.meId;
  return list.filter((u) => (meId ? u.id !== meId : true));
});

const mentionablesById = computed(() => new Map((props.mentionables ?? []).map((u) => [u.id, u])));

function createMentionSuggestion() {
  let renderer: VueRenderer | null = null;
  let popup: HTMLDivElement | null = null;

  function positionAt(clientRect?: DOMRect | null) {
    if (!popup || !clientRect) return;
    popup.style.left = `${clientRect.left}px`;
    popup.style.top = `${clientRect.bottom + 8}px`;
  }

  return {
    items: ({ query }: { query: string }): MentionSuggestionItem[] => {
      const q = (query ?? "").trim().toLowerCase();
      return mentionablesForSuggestion.value
        .filter((u) => (q ? u.name.toLowerCase().includes(q) || String(u.id).startsWith(q) : true))
        .slice(0, 8)
        .map((u) => ({ id: u.id, label: u.name, picture: u.picture }));
    },
    render: () => {
      return {
        onStart: (props: any) => {
          renderer = new VueRenderer(MentionList, {
            props: { items: props.items, command: props.command },
            editor: props.editor,
          });

          popup = document.createElement("div");
          popup.style.position = "fixed";
          if (renderer.element) popup.appendChild(renderer.element);
          document.body.appendChild(popup);
          positionAt(props.clientRect?.());
        },
        onUpdate: (props: any) => {
          renderer?.updateProps({ items: props.items, command: props.command });
          positionAt(props.clientRect?.());
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") {
            props.command(null);
            return true;
          }
          return renderer?.ref?.onKeyDown?.(props) ?? false;
        },
        onExit: () => {
          renderer?.destroy();
          renderer = null;
          popup?.remove();
          popup = null;
        },
      };
    },
  };
}

const editor = useEditor({
  extensions: [
    ...createRichTextExtensions({ linkOpenOnClick: false }),
    createMentionExtensionWithNodeView(TiptapMentionNodeView, {
      HTMLAttributes: {
        class: "mention-chip inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold",
      },
      renderText({ node }: { node: { attrs: { label?: unknown; id?: unknown } } }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      // Used by `TiptapMentionNodeView.vue` via `props.extension.options.userById`
      userById: (id: number) => mentionablesById.value.get(id),
      suggestion: createMentionSuggestion(),
    } as any),
    createPlaceholderExtension(() => composerPlaceholder.value),
  ],
  content: "",
  editorProps: {
    attributes: {
      class: EPIC_STORY_COMPOSER_EDITOR_CLASS,
    },
    handleKeyDown: (_, event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        onSendMessage();
        return true;
      }
      return false;
    },
  },
});

const saveDraftDebounced = debounce((ed: Editor) => {
  if (props.workspaceId == null || props.channelId == null) return;
  if (props.editingMessage) return;
  const doc = normalizeTiptapDoc(ed.getJSON());
  const plain = tiptapToPlainText(doc).trim();
  if (!plain) {
    clearChannelDraft(props.workspaceId, props.channelId);
    return;
  }
  saveChannelDraft(props.workspaceId, props.channelId, doc as Record<string, unknown>);
}, 400);

function maybeStartTypingPulse(ed: Editor) {
  if (suppressTypingSignals.value) return;
  if (props.channelId == null || props.workspaceId == null) return;

  const plain = tiptapToPlainText(normalizeTiptapDoc(ed.getJSON())).trim();
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
      const p = tiptapToPlainText(normalizeTiptapDoc(inner.getJSON())).trim();
      if (!p) {
        clearTypingPulse();
        emitTypingStop();
        return;
      }
      emitTypingPulse();
    }, CHANNEL_TYPING_PULSE_MS);
  }
}

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
  const plain = tiptapToPlainText(doc).trim();
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
    const doc = m.contentRich
      ? normalizeTiptapDoc(m.contentRich)
      : {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: m.content ? [{ type: "text", text: m.content }] : [],
            },
          ],
        };
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
      }
    }

    suppressTypingSignals.value = true;
    const draft = loadChannelDraft(ws, cid);
    if (draft?.contentRich) {
      ed.commands.setContent(normalizeTiptapDoc(draft.contentRich));
    } else {
      ed.commands.clearContent();
    }
    await nextTick();
    suppressTypingSignals.value = false;
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  saveDraftDebounced.cancel();
  clearTypingPulse();
  if (props.channelId != null && props.workspaceId != null) {
    emitTypingStopForChannel(props.channelId, props.workspaceId);
  }
  isEmittingTyping.value = false;
  flushDraftSync();
  editor.value?.destroy();
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

function onSendMessage() {
  if (!editor.value) return;
  if (editor.value.isEmpty) return;
  const doc = normalizeTiptapDoc(editor.value.getJSON());
  const plain = tiptapToPlainText(doc);
  if (!plain.trim()) return;
  if (props.editingMessage) {
    emit("submit-edit", {
      messageId: props.editingMessage.id,
      content: plain,
      contentRich: doc,
    });
    clearTypingPulse();
    if (props.channelId != null && props.workspaceId != null) {
      emitTypingStopForChannel(props.channelId, props.workspaceId);
    }
    isEmittingTyping.value = false;
    return;
  }
  emit("send-message", { content: plain, contentRich: doc });
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
</script>

<template>
  <div
    class="flex:col-md p-3 border border-zinc-200 rounded-xl bg-white focus-within:outline outline-1 outline-zinc-300/60"
    @click="editor?.commands.focus()"
  >
    <div
      v-if="quotedMessage && !editingMessage"
      class="flex:row-md flex:center-y gap-2 mb-2 pb-2 border-b border-zinc-200/80 text-xs text-muted-foreground"
    >
      <div class="flex-1 min-w-0">
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
        ×
      </Button>
    </div>
    <EditorContent v-if="editor" :editor="editor" />

    <div class="flex:row-md flex:center-y mt-2 text-secondary-foreground">
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
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
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

      <div class="flex-1"></div>

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

      <Button
        legacy
        legacy-variant="primary"
        legacy-size="sm"
        class="flex:row-lg flex:center-y text-sm bg-[#3A66FF]"
        @click="onSendMessage"
      >
        <Icon name="io-paper-plane" />
        {{ editingMessage ? "Save" : "Send" }}
      </Button>
    </div>
  </div>
</template>
