<script lang="ts" setup>
import RichTextPreview from "@/components/rich-text/RichTextPreview.vue";
import RichTextContentEditable from "@/components/rich-text/RichTextContentEditable.vue";
import { Button } from "@/design-system";
import {
  messageBodyPlainText,
  normalizeTiptapDoc,
  type RichTextDocument,
} from "@epicstory/tiptap";
import {
  Bold,
  Braces,
  Code,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-vue-next";
import type { Editor } from "@tiptap/core";
import { type Ref, computed, ref, watch } from "vue";

const props = defineProps<{
  description: RichTextDocument;
  issueId: number;
  disabled?: boolean;
  isSaving?: boolean;
}>();

const emit = defineEmits<{
  saveDescription: [doc: RichTextDocument];
}>();

const isEditingDescription = ref(false);

const descriptionSurfaceRef = ref<InstanceType<typeof RichTextContentEditable> | null>(null);

const editor = computed(() => {
  const exposed = descriptionSurfaceRef.value?.editor as Ref<Editor | undefined> | undefined;
  return exposed?.value ?? null;
});

const hasDescription = computed(() =>
  messageBodyPlainText({ content: props.description }).trim(),
);

function cancelEditDescription() {
  if (props.disabled) return;
  editor.value?.commands.setContent(normalizeTiptapDoc(props.description), { emitUpdate: false });
  isEditingDescription.value = false;
}

function finishEditDescription() {
  if (props.disabled) return;
  const instance = editor.value;
  if (!instance) return;
  emit("saveDescription", normalizeTiptapDoc(instance.getJSON()) as RichTextDocument);
  isEditingDescription.value = false;
}

const issueShortcutEditorProps = computed(() => ({
  handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
    if (event.key === "Escape") {
      cancelEditDescription();
      return true;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      finishEditDescription();
      return true;
    }
    return false;
  },
}));

function startEditDescription() {
  if (props.disabled) return;
  isEditingDescription.value = true;
  queueMicrotask(() => editor.value?.commands.focus("end"));
}

watch(isEditingDescription, (editing) => {
  if (!editing) return;
  editor.value?.commands.setContent(normalizeTiptapDoc(props.description), { emitUpdate: false });
});

watch(
  () => props.description,
  (next) => {
    if (isEditingDescription.value) return;
    editor.value?.commands.setContent(normalizeTiptapDoc(next), { emitUpdate: false });
  },
);

function toggleLink() {
  const instance = editor.value;
  if (!instance) return;
  const previous = instance.getAttributes("link")?.href as string | undefined;
  const url = window.prompt("Enter link URL", previous ?? "");
  if (url === null) return;
  if (url.trim() === "") {
    instance.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  instance.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
}
</script>

<template>
  <div class="flex:col-sm min-h-0">
    <div class="flex:row-md flex:center-y">
      <div class="text-sm text-secondary-foreground">Description</div>
      <div class="flex-1" />
      <div class="text-xs text-secondary-foreground">Double-click to edit</div>
    </div>

    <div v-if="!isEditingDescription" class="min-h-0">
      <div
        class="cursor-text rounded-xl p-3 -mx-3 hover:bg-zinc-50"
        @dblclick="startEditDescription"
        title="Double-click to edit"
      >
        <div v-if="hasDescription" class="text-sm text-foreground leading-relaxed">
          <RichTextPreview :content="description" />
        </div>
        <div v-else class="text-sm text-secondary-foreground">Add a description…</div>
      </div>
    </div>

    <div v-else class="p-3 border border-zinc-200 rounded-xl bg-white">
      <div class="flex:row-md flex:center-y mb-2">
        <div class="flex:row-md flex:center-y">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('bold') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleBold().run()"
          >
            <Bold class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('italic') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleItalic().run()"
          >
            <Italic class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('strike') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleStrike().run()"
          >
            <Strikethrough class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Quote"
            :class="editor?.isActive('blockquote') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleBlockquote().run()"
          >
            <Quote class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('underline') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleUnderline().run()"
          >
            <UnderlineIcon class="h-4 w-4" />
          </Button>
          <div class="w-px h-6 bg-zinc-200 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('bulletList') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleBulletList().run()"
          >
            <List class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('orderedList') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleOrderedList().run()"
          >
            <ListOrdered class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Task list"
            :class="editor?.isActive('taskList') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleTaskList().run()"
          >
            <ListChecks class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Insert table"
            :disabled="!editor"
            @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
          >
            <Table2 class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Inline code"
            :class="editor?.isActive('code') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleCode().run()"
          >
            <Braces class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Code block"
            :class="editor?.isActive('codeBlock') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="editor?.chain().focus().toggleCodeBlock().run()"
          >
            <Code class="h-4 w-4" />
          </Button>
          <div class="w-px h-6 bg-zinc-200 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="editor?.isActive('link') ? 'bg-zinc-100' : ''"
            :disabled="!editor"
            @click="toggleLink"
          >
            <Link2 class="h-4 w-4" />
          </Button>
          <div class="w-px h-6 bg-zinc-200 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :disabled="!editor || !editor.can().undo()"
            @click="editor?.chain().focus().undo().run()"
          >
            <Undo2 class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :disabled="!editor || !editor.can().redo()"
            @click="editor?.chain().focus().redo().run()"
          >
            <Redo2 class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <RichTextContentEditable
        ref="descriptionSurfaceRef"
        variant="issue"
        :issue-id="issueId"
        placeholder="Write a description…"
        :document="description"
        :sync-document="false"
        :extra-editor-props="issueShortcutEditorProps"
      />

      <div class="flex:row-md flex:center-y justify-end">
        <div class="text-xs text-secondary-foreground mr-2">Ctrl+Enter to save • Esc to cancel</div>
        <Button variant="outline" size="xs" :disabled="isSaving" @click="cancelEditDescription"
          >Cancel</Button
        >
        <Button size="xs" :disabled="isSaving" @click="finishEditDescription">Done</Button>
      </div>
    </div>
  </div>
</template>
