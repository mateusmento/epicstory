<script lang="ts" setup>
import { startRecording } from "@/core/screen-recording";
import { Button } from "@/design-system/ui/button";
import { Separator } from "@/design-system/ui/separator";
import { Icon } from "@/design-system/icons";
import { computed, onBeforeUnmount, ref } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { Bold, Italic, Strikethrough, List, ListOrdered, Link2 } from "lucide-vue-next";

type Mentionable = {
  id: number;
  name: string;
  picture?: string | null;
};

const props = defineProps<{
  mentionables?: Mentionable[];
  meId?: number;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "send-message", value: { content: string; contentRich: any }): void;
}>();

function normalizeTiptapDoc(doc: any): any {
  if (!doc || typeof doc !== "object") return doc;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return doc;

  function isEmptyTrailingParagraph(node: any) {
    if (!node || node.type !== "paragraph") return false;
    if (!node.content || node.content.length === 0) return true;
    // Treat a paragraph containing only hardBreak as empty (common trailingBreak representation).
    return node.content.every((c: any) => c?.type === "hardBreak");
  }

  const next = { ...doc, content: [...doc.content] };
  while (next.content.length > 0 && isEmptyTrailingParagraph(next.content[next.content.length - 1])) {
    next.content.pop();
  }
  return next;
}

function tiptapToPlainText(doc: any): string {
  if (!doc) return "";

  function walk(node: any, ctx?: { inListItem?: boolean }): string {
    const type = node?.type ?? "";
    if (type === "text") return node.text ?? "";
    if (type === "hardBreak") return "\n";
    if (type === "doc") return (node?.content ?? []).map((c: any) => walk(c, ctx)).join("");
    if (type === "mention") {
      const id = node?.attrs?.id ?? node?.attrs?.userId;
      return id === undefined || id === null ? "@" : `@${id}`;
    }

    if (type === "listItem") {
      const children = (node?.content ?? []).map((c: any) => walk(c, { ...ctx, inListItem: true })).join("");
      return children + "\n";
    }

    const children = (node?.content ?? []).map((c: any) => walk(c, ctx)).join("");

    // Inside list items, paragraphs/headings should not add extra newlines; listItem already handles it.
    if ((type === "paragraph" || type === "heading" || type === "blockquote") && ctx?.inListItem) {
      return children;
    }

    if (type === "paragraph" || type === "heading" || type === "blockquote") return children + "\n";
    if (type === "bulletList" || type === "orderedList") return children;
    return children;
  }

  return walk(doc)
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

const mentionablesForSuggestion = computed(() => {
  const list = props.mentionables ?? [];
  const meId = props.meId;
  return list.filter((u) => (meId ? u.id !== meId : true));
});

type SuggestionItem = { id: number; label: string; picture?: string | null };

function createMentionSuggestion() {
  let root: HTMLDivElement | null = null;
  let selectedIndex = 0;

  function renderItems(items: SuggestionItem[], command: (item: SuggestionItem) => void) {
    if (!root) return;
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "px-3 py-2 text-xs text-secondary-foreground border-b font-dmSans";
    header.textContent = "Mention a person";
    root.appendChild(header);

    items.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "w-full flex gap-2 items-center px-3 py-2 text-left hover:bg-secondary transition-colors";
      if (i === selectedIndex) btn.className += " bg-secondary";

      const avatar = document.createElement("div");
      avatar.className =
        "w-7 h-7 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold text-xs overflow-hidden";
      if (item.picture) {
        const img = document.createElement("img");
        img.src = item.picture;
        img.alt = item.label;
        img.className = "w-7 h-7 object-cover";
        avatar.innerHTML = "";
        avatar.appendChild(img);
      } else {
        avatar.textContent = item.label.charAt(0).toUpperCase();
      }

      const text = document.createElement("div");
      text.className = "flex-1 min-w-0";
      const name = document.createElement("div");
      name.className = "text-sm text-foreground font-lato truncate";
      name.textContent = item.label;
      const meta = document.createElement("div");
      meta.className = "text-xs text-secondary-foreground font-dmSans";
      meta.textContent = `ID: ${item.id}`;
      text.appendChild(name);
      text.appendChild(meta);

      btn.appendChild(avatar);
      btn.appendChild(text);

      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        command(item);
      });

      root?.appendChild(btn);
    });
  }

  function positionAt(clientRect?: DOMRect | null) {
    if (!root || !clientRect) return;
    root.style.left = `${clientRect.left}px`;
    root.style.top = `${clientRect.bottom + 8}px`;
  }

  return {
    items: ({ query }: { query: string }): SuggestionItem[] => {
      const q = (query ?? "").trim().toLowerCase();
      return mentionablesForSuggestion.value
        .filter((u) => (q ? u.name.toLowerCase().includes(q) || String(u.id).startsWith(q) : true))
        .slice(0, 8)
        .map((u) => ({ id: u.id, label: u.name, picture: u.picture }));
    },
    render: () => {
      return {
        onStart: (props: any) => {
          selectedIndex = 0;
          root = document.createElement("div");
          root.className = "z-50 rounded-lg border bg-white shadow-lg overflow-hidden w-80";
          root.style.position = "fixed";
          document.body.appendChild(root);
          positionAt(props.clientRect?.());
          renderItems(props.items, props.command);
        },
        onUpdate: (props: any) => {
          selectedIndex = 0;
          positionAt(props.clientRect?.());
          renderItems(props.items, props.command);
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") {
            props.command(null);
            return true;
          }
          if (props.event.key === "ArrowDown") {
            selectedIndex = Math.min(selectedIndex + 1, props.items.length - 1);
            renderItems(props.items, props.command);
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selectedIndex = Math.max(selectedIndex - 1, 0);
            renderItems(props.items, props.command);
            return true;
          }
          if (props.event.key === "Enter") {
            const item = props.items[selectedIndex];
            if (item) props.command(item);
            return true;
          }
          return false;
        },
        onExit: () => {
          root?.remove();
          root = null;
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
    Mention.configure({
      HTMLAttributes: {
        class: "mention-chip inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold",
      },
      renderText({ node }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: createMentionSuggestion(),
    }),
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
