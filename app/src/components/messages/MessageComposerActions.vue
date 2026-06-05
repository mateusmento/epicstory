<script lang="ts" setup>
import { Button, Separator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Braces,
  ChartBar,
  Code,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  Table2,
  TextQuote,
} from "lucide-vue-next";

const emit = defineEmits<{
  insertInlineImage: [];
  togglePoll: [];
}>();

const props = withDefaults(
  defineProps<{
    editor: Editor | null;
    /** Channel composer: show poll toggle alongside link/image/mention. */
    showPollToggle?: boolean;
    pollActive?: boolean;
  }>(),
  { editor: null, showPollToggle: false, pollActive: false },
);

function toggleLink() {
  if (!props.editor) return;
  const prev = props.editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", prev ?? "https://");
  if (!url) {
    props.editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  props.editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function insertAtMention() {
  props.editor?.chain().focus().insertContent("@").run();
}
</script>

<template>
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
    title="Blockquote"
    :class="editor?.isActive('blockquote') ? 'bg-secondary' : ''"
    @click="editor?.chain().focus().toggleBlockquote().run()"
  >
    <TextQuote class="w-5 h-5" />
    <!-- <Icon name="fa-quote-right" class="w-5 h-5" /> -->
  </Button>
  <Separator orientation="vertical" class="h-8 bg-border" />
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
  <Separator orientation="vertical" class="h-8 bg-border" />
  <Button
    variant="ghost"
    size="icon"
    :class="editor?.isActive('link') ? 'bg-secondary' : ''"
    @click="toggleLink"
  >
    <Link2 class="w-5 h-5" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    title="Insert inline image"
    aria-label="Insert inline image"
    @click="emit('insertInlineImage')"
  >
    <Image class="w-5 h-5" />
  </Button>
  <Button
    v-if="showPollToggle"
    variant="ghost"
    size="icon"
    title="Poll"
    aria-label="Poll"
    :class="pollActive ? 'bg-secondary' : ''"
    @click="emit('togglePoll')"
  >
    <ChartBar class="w-5 h-5" />
  </Button>
  <Button variant="ghost" size="icon" @click="insertAtMention">
    <Icon name="oi-mention" class="w-5 h-5" />
  </Button>
</template>
