<script lang="ts" setup>
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  OverflowContainer,
  OverflowEllipsis,
  OverflowItem,
  Separator,
} from "@/design-system";
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
  MoreHorizontal,
  Strikethrough,
  Table2,
  TextQuote,
  type LucideIcon,
} from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";

type ComposerAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  pinned?: boolean;
  active?: boolean;
  run: () => void;
};

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
    class?: HTMLAttributes["class"];
    /** Constrained slot width from the composer footer (preferred over self-measurement). */
    layoutWidthPx?: number;
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

/** Marks — left of ellipsis; when wide, ellipsis hides so order matches the old toolbar. */
const markActions = computed<ComposerAction[]>(() => [
  {
    key: "bold",
    label: "Bold",
    icon: Bold,
    active: props.editor?.isActive("bold") ?? false,
    run: () => props.editor?.chain().focus().toggleBold().run(),
  },
  {
    key: "italic",
    label: "Italic",
    icon: Italic,
    active: props.editor?.isActive("italic") ?? false,
    run: () => props.editor?.chain().focus().toggleItalic().run(),
  },
]);

/**
 * Structure tools — right of ellipsis so they collapse first (rightmost first).
 * When the row fits, the ellipsis is hidden and these sit where they always did.
 */
const structureActions = computed<ComposerAction[]>(() => [
  {
    key: "strike",
    label: "Strikethrough",
    icon: Strikethrough,
    active: props.editor?.isActive("strike") ?? false,
    run: () => props.editor?.chain().focus().toggleStrike().run(),
  },
  {
    key: "blockquote",
    label: "Blockquote",
    icon: TextQuote,
    active: props.editor?.isActive("blockquote") ?? false,
    run: () => props.editor?.chain().focus().toggleBlockquote().run(),
  },
  {
    key: "inlineCode",
    label: "Inline code",
    icon: Braces,
    active: props.editor?.isActive("code") ?? false,
    run: () => props.editor?.chain().focus().toggleCode().run(),
  },
  {
    key: "bulletList",
    label: "Bullet list",
    icon: List,
    active: props.editor?.isActive("bulletList") ?? false,
    run: () => props.editor?.chain().focus().toggleBulletList().run(),
  },
  {
    key: "orderedList",
    label: "Numbered list",
    icon: ListOrdered,
    active: props.editor?.isActive("orderedList") ?? false,
    run: () => props.editor?.chain().focus().toggleOrderedList().run(),
  },
  {
    key: "taskList",
    label: "Task list",
    icon: ListChecks,
    active: props.editor?.isActive("taskList") ?? false,
    run: () => props.editor?.chain().focus().toggleTaskList().run(),
  },
  {
    key: "table",
    label: "Insert table",
    icon: Table2,
    run: () => props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    key: "codeBlock",
    label: "Code block",
    icon: Code,
    active: props.editor?.isActive("codeBlock") ?? false,
    run: () => props.editor?.chain().focus().toggleCodeBlock().run(),
  },
]);

/** Insert actions — pinned so they stay visible while structure tools move into ⋯ */
const insertActions = computed<ComposerAction[]>(() => {
  const actions: ComposerAction[] = [
    {
      key: "link",
      label: "Link",
      icon: Link2,
      pinned: true,
      active: props.editor?.isActive("link") ?? false,
      run: toggleLink,
    },
    {
      key: "image",
      label: "Insert inline image",
      icon: Image,
      pinned: true,
      run: () => emit("insertInlineImage"),
    },
  ];

  if (props.showPollToggle) {
    actions.push({
      key: "poll",
      label: "Poll",
      icon: ChartBar,
      pinned: true,
      active: props.pollActive,
      run: () => emit("togglePoll"),
    });
  }

  return actions;
});

const actionsByKey = computed(() => {
  const map = new Map<string, ComposerAction | { key: "mention"; label: string; run: () => void }>();
  for (const action of [...markActions.value, ...structureActions.value, ...insertActions.value]) {
    map.set(action.key, action);
  }
  map.set("mention", { key: "mention", label: "Mention", run: insertAtMention });
  return map;
});

function hiddenMenuItems(keys: string[]) {
  return keys.map((key) => actionsByKey.value.get(key)).filter((a): a is NonNullable<typeof a> => !!a);
}
</script>

<template>
  <OverflowContainer :gap="0" :layout-width-px="layoutWidthPx" :class="['min-w-0 max-w-full', props.class]">
    <OverflowItem v-for="action in markActions" :key="action.key" :segment-key="action.key">
      <Button
        variant="ghost"
        size="icon"
        :title="action.label"
        :aria-label="action.label"
        :class="action.active ? 'bg-secondary' : ''"
        @click="action.run()"
      >
        <component :is="action.icon" class="w-5 h-5" />
      </Button>
    </OverflowItem>

    <Separator orientation="vertical" />

    <OverflowItem v-for="action in structureActions" :key="action.key" :segment-key="action.key">
      <Button
        variant="ghost"
        size="icon"
        :title="action.label"
        :aria-label="action.label"
        :class="action.active ? 'bg-secondary' : ''"
        @click="action.run()"
      >
        <component :is="action.icon" class="w-5 h-5" />
      </Button>
    </OverflowItem>

    <Separator orientation="vertical" />

    <OverflowItem
      v-for="action in insertActions"
      :key="action.key"
      :segment-key="action.key"
      :pinned="action.pinned"
    >
      <Button
        variant="ghost"
        size="icon"
        :title="action.label"
        :aria-label="action.label"
        :class="action.active ? 'bg-secondary' : ''"
        @click="action.run()"
      >
        <component :is="action.icon" class="w-5 h-5" />
      </Button>
    </OverflowItem>

    <OverflowItem segment-key="mention" pinned>
      <Button variant="ghost" size="icon" title="Mention" aria-label="Mention" @click="insertAtMention">
        <Icon name="oi-mention" class="w-5 h-5" />
      </Button>
    </OverflowItem>

    <OverflowEllipsis v-slot="{ collapsed, hiddenSegmentKeys }">
      <!-- Always mount the trigger so ellipsis width is measurable on first paint. -->
      <Menu type="dropdown-menu">
        <MenuTrigger as-child>
          <Button variant="ghost" size="icon" title="More" aria-label="More">
            <MoreHorizontal class="w-5 h-5" />
          </Button>
        </MenuTrigger>
        <MenuContent v-if="collapsed" align="end" class="min-w-[10rem]">
          <MenuItem
            v-for="action in hiddenMenuItems(hiddenSegmentKeys)"
            :key="action.key"
            class="flex:row-md flex:center-y gap-2"
            @click="action.run()"
          >
            <template v-if="action.key === 'mention'">
              <Icon name="oi-mention" class="size-4 shrink-0 text-muted-foreground" />
            </template>
            <component
              v-else
              :is="(action as ComposerAction).icon"
              class="size-4 shrink-0 text-muted-foreground"
            />
            <span>{{ action.label }}</span>
          </MenuItem>
        </MenuContent>
      </Menu>
    </OverflowEllipsis>
  </OverflowContainer>
</template>
