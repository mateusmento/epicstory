<script lang="ts" setup>
import { useIssue } from "@/domain/issues/composables/issue";
import { useDependency } from "@/core/dependency-injection";
import { Button, Combobox, Input } from "@/design-system";
import { ProjectApi, type Project } from "@/domain/project";
import { parseAbsolute, getLocalTimeZone, type DateValue } from "@internationalized/date";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { DueDatePicker } from "@/views/project/backlog/date-picker";
import { PriorityToggler } from "@/views/project/backlog/priority-toggler";
import { UserSelect } from "@/components/user";
import type { User } from "@/domain/user";
import { Icon } from "@/design-system/icons";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from "lucide-vue-next";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
  issueId: string;
}>();

const { issue, fetchIssue, updateIssue, addAssignee } = useIssue();

const projectApi = useDependency(ProjectApi);
const project = ref<Project | null>(null);

const isSaving = ref(false);
const saveError = ref<string | null>(null);

const selectedUser = ref<User | undefined>();
const titleEl = ref<HTMLInputElement | null>(null);

const isEditingTitle = ref(false);
const isEditingDescription = ref(false);

const form = reactive({
  title: "",
});

watch(
  issue,
  (iss) => {
    if (!iss) return;
    form.title = iss.title ?? "";
  },
  { immediate: true },
);

const statusOptions = [
  { value: "todo", label: "Todo" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];

const selectedStatus = computed({
  get() {
    const current = issue.value?.status ?? "todo";
    return statusOptions.find((s) => s.value === current) ?? statusOptions[0];
  },
  set(next) {
    if (!next || !issue.value) return;
    if (next.value === issue.value.status) return;
    void savePatch({ status: next.value });
  },
});

const dueDateValue = computed<DateValue | undefined>(() => {
  if (!issue.value?.dueDate) return;
  try {
    return parseAbsolute(issue.value.dueDate, getLocalTimeZone());
  } catch {
    return undefined;
  }
});

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),
    Placeholder.configure({
      placeholder: "Write a description…",
    }),
  ],
  content: "",
  editorProps: {
    attributes: {
      class:
        "min-h-28 outline-none text-sm leading-relaxed focus:outline-none [&_p]:my-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-secondary-foreground",
    },
    handleKeyDown: (_, event) => {
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
  },
});

const descriptionIsHtml = computed(() => {
  const d = issue.value?.description ?? "";
  return /<\/?[a-z][\s\S]*>/i.test(d);
});

async function savePatch(data: Parameters<typeof updateIssue>[0]) {
  if (!issue.value) return;
  isSaving.value = true;
  saveError.value = null;
  try {
    await updateIssue(data);
  } catch (e: any) {
    saveError.value = e?.message ?? "Failed to save changes";
  } finally {
    isSaving.value = false;
  }
}

function saveMainFields() {
  if (!issue.value) return;
  const data: any = {};
  if (form.title !== issue.value.title) data.title = form.title;
  if (Object.keys(data).length === 0) return;
  void savePatch(data);
}

function startEditTitle() {
  if (!issue.value) return;
  isEditingTitle.value = true;
  // allow DOM to render the input
  queueMicrotask(() => titleEl.value?.focus?.());
}

function cancelEditTitle() {
  if (!issue.value) return;
  form.title = issue.value.title ?? "";
  isEditingTitle.value = false;
}

function finishEditTitle() {
  if (!issue.value) return;
  isEditingTitle.value = false;
  saveMainFields();
}

function startEditDescription() {
  if (!issue.value) return;
  isEditingDescription.value = true;
  queueMicrotask(() => editor.value?.commands.focus("end"));
}

function cancelEditDescription() {
  if (!issue.value) return;
  isEditingDescription.value = false;
  editor.value?.commands.setContent(issue.value.description ?? "", { emitUpdate: false });
}

function finishEditDescription() {
  if (!issue.value) return;
  isEditingDescription.value = false;
  const instance = editor.value;
  if (!instance) return;
  const html = instance.getHTML();
  if (html !== issue.value.description) void savePatch({ description: html });
}

watch(isEditingDescription, (editing) => {
  if (!editing) return;
  editor.value?.commands.setContent(issue.value?.description ?? "", { emitUpdate: false });
});

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

function onDueDateChange(next?: DateValue) {
  if (!issue.value) return;
  if (!next) {
    void savePatch({ dueDate: null });
    return;
  }
  void savePatch({ dueDate: next.toDate(getLocalTimeZone()).toISOString() });
}

function clearDueDate() {
  void savePatch({ dueDate: null });
}

onMounted(() => {
  fetchIssue(+props.issueId);
});

watch(
  () => props.projectId,
  async (projectId) => {
    project.value = await projectApi.findProject(+projectId);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex:col-lg mx-auto py-8 px-6 w-full h-full max-w-5xl">
    <div class="flex:row-xl flex:center-y">
      <div class="flex:col-sm">
        <div class="text-xs text-secondary-foreground">
          <span class="font-medium">{{ project?.name ?? "Project" }}</span>
          <span class="mx-2">/</span>
          <span class="text-foreground/80">Issue #{{ issue?.id ?? props.issueId }}</span>
        </div>
      </div>

      <div class="flex-1" />

      <div class="flex:row-md flex:center-y">
        <div v-if="isSaving" class="text-xs text-secondary-foreground">Saving…</div>
        <Button variant="outline" size="sm" :disabled="!issue || isSaving" @click="saveMainFields"
          >Save</Button
        >
      </div>
    </div>

    <div v-if="saveError" class="text-sm text-red-600">{{ saveError }}</div>

    <div class="grid grid-cols-[1fr_280px] gap-6 flex-1 min-h-0">
      <!-- Main -->
      <div class="flex:col-lg min-h-0">
        <div class="flex:col-sm">
          <div v-if="!isEditingTitle" class="select-none">
            <div
              class="text-2xl font-semibold text-foreground leading-tight cursor-text rounded-md px-2 -mx-2 hover:bg-zinc-50"
              @dblclick="startEditTitle"
              title="Double-click to edit"
            >
              {{ issue?.title || "Untitled issue" }}
            </div>
          </div>
          <div v-else>
            <Input
              ref="titleEl"
              v-model="form.title"
              size="lg"
              placeholder="Issue title"
              class="font-semibold border-transparent shadow-none bg-transparent px-2 -mx-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              :disabled="!issue"
              @blur="finishEditTitle"
              @keydown.enter.prevent="finishEditTitle"
              @keydown.esc.prevent="cancelEditTitle"
            />
          </div>
        </div>

        <div class="flex:col-sm flex-1 min-h-0">
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
              <div v-if="issue?.description" class="text-sm text-foreground leading-relaxed">
                <div
                  v-if="descriptionIsHtml"
                  class="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:my-1 [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-700"
                  v-html="issue.description"
                />
                <div v-else class="whitespace-pre-wrap">{{ issue.description }}</div>
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

              <div class="flex-1" />

              <div class="text-xs text-secondary-foreground mr-2">Ctrl+Enter to save • Esc to cancel</div>
              <Button variant="outline" size="xs" :disabled="isSaving" @click="cancelEditDescription"
                >Cancel</Button
              >
              <Button size="xs" :disabled="isSaving" @click="finishEditDescription">Done</Button>
            </div>

            <EditorContent :editor="editor" />
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="flex:col-xl min-h-0">
        <div class="flex:col-xl p-4 border rounded-xl bg-white shadow-sm">
          <div class="text-sm font-medium text-foreground">Details</div>

          <div class="flex:col-sm">
            <div class="text-xs text-secondary-foreground">Status</div>
            <Combobox
              v-model="selectedStatus"
              :options="statusOptions"
              size="xs"
              track-by="value"
              label-by="label"
              :disabled="!issue"
              trigger-placeholder="Select status..."
            />
          </div>

          <!-- Row: Assignees + Project -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex:col-sm min-w-0">
              <div class="text-xs text-secondary-foreground">Project</div>
              <div class="text-sm font-medium text-foreground truncate">
                {{ project?.name ?? `#${props.projectId}` }}
              </div>
            </div>

            <div class="flex:col-sm min-w-0">
              <div class="text-xs text-secondary-foreground">Assignees</div>
              <div class="flex:row flex:center-y min-w-0">
                <div class="flex:row flex:center-y min-w-0">
                  <img
                    v-for="assignee of issue?.assignees ?? []"
                    :key="assignee.id"
                    :src="assignee.picture"
                    class="w-7 h-7 rounded-full border-2 border-white [&:not(:first-child)]:-ml-3"
                    :title="assignee.name"
                  />
                </div>

                <UserSelect
                  v-model="selectedUser"
                  @update:model-value="
                    if ($event && !(issue?.assignees ?? []).some((a) => a.id === $event.id))
                      addAssignee($event.id);
                    selectedUser = undefined;
                  "
                >
                  <template #trigger>
                    <Button variant="ghost" size="icon" :disabled="!issue" class="ml-2 h-8 w-8">
                      <Icon name="fa-user-plus" class="w-4 h-4" />
                    </Button>
                  </template>
                </UserSelect>
              </div>
            </div>
          </div>

          <!-- Row: Priority + Due date -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex:col-sm min-w-0">
              <div class="text-xs text-secondary-foreground">Priority</div>
              <div class="min-w-0">
                <PriorityToggler
                  :value="issue?.priority ?? 0"
                  @update:value="savePatch({ priority: $event })"
                />
              </div>
            </div>

            <div class="flex:col-sm min-w-0">
              <div class="flex:row-md flex:center-y min-w-0">
                <div class="text-xs text-secondary-foreground">Due date</div>
                <div class="flex-1" />
                <Button
                  v-if="issue?.dueDate"
                  variant="ghost"
                  size="xs"
                  class="text-xs"
                  :disabled="isSaving"
                  @click="clearDueDate"
                >
                  Clear
                </Button>
              </div>
              <div class="min-w-0">
                <DueDatePicker
                  :model-value="dueDateValue"
                  size="badge"
                  :disabled="!issue"
                  @update:model-value="onDueDateChange"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
