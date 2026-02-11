<script lang="ts" setup>
import { startRecording } from "@/core/screen-recording";
import { Button } from "@/design-system/ui/button";
import { Separator } from "@/design-system/ui/separator";
import { Icon } from "@/design-system/icons";
import { computed, onBeforeUnmount, ref } from "vue";
import { EditorContent, useEditor, VueNodeViewRenderer } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { Bold, Italic, Strikethrough, List, ListOrdered, Link2 } from "lucide-vue-next";
import { VueRenderer } from "@tiptap/vue-3";
import { normalizeTiptapDoc, tiptapToPlainText } from "@/core/tiptap";
import MentionList from "./MentionList.vue";
import type { MentionSuggestionItem } from "./MentionList.vue";
import type { User } from "@/domain/auth";
import TiptapMentionNodeView from "./TiptapMentionNodeView.vue";

const props = defineProps<{
  mentionables?: User[];
  meId?: number;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "send-message", value: { content: string; contentRich: any }): void;
}>();

const mentionablesForSuggestion = computed(() => {
  const list = props.mentionables ?? [];
  const meId = props.meId;
  return list.filter((u) => (meId ? u.id !== meId : true));
});

const mentionablesById = computed(() => new Map((props.mentionables ?? []).map((u) => [u.id, u])));

const MentionWithHover = Mention.extend({
  addNodeView() {
    return VueNodeViewRenderer(TiptapMentionNodeView);
  },
});

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
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),
    MentionWithHover.configure({
      HTMLAttributes: {
        class: "mention-chip inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold",
      },
      renderText({ node }: any) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      // Used by `TiptapMentionNodeView.vue` via `props.extension.options.userById`
      userById: (id: number) => mentionablesById.value.get(id),
      suggestion: createMentionSuggestion(),
    } as any),
    Placeholder.configure({
      placeholder: props.placeholder ?? "Send a message…",
    }),
  ],
  content: "",
  editorProps: {
    attributes: {
      class:
        "min-h-[3rem] outline-none text-sm leading-relaxed focus:outline-none [&_p]:my-1 [&_li>p]:my-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_a]:text-blue-600 [&_a]:underline",
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

onBeforeUnmount(() => {
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
  emit("send-message", { content: plain, contentRich: doc });
  editor.value.commands.clearContent();
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
        Send
      </Button>
    </div>
  </div>
</template>
