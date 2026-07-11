<script setup lang="ts">
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { Editor } from "@tiptap/core";
import { Code, Image, Link2, ListChecks, SquareKanban, Table2, type LucideIcon } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import {
  insertCatalogItems,
  runComposerAction,
  type ComposerActionHooks,
  type ComposerCatalogAction,
} from "./composer-action-catalog";

const props = defineProps<{
  editor: Editor | null;
  hooks?: ComposerActionHooks;
  class?: HTMLAttributes["class"];
}>();

/** Disable long-press open so text selection does not race the format bubble. */
const PRESS_OPEN_DELAY_MS = 60_000;

const open = defineModel<boolean>("open", { default: false });

const INSERT_ICONS: Record<string, LucideIcon | "mention"> = {
  taskList: ListChecks,
  codeBlock: Code,
  table: Table2,
  link: Link2,
  image: Image,
  mention: "mention",
  issue: SquareKanban,
};

type InsertMenuRow =
  | { kind: "item"; item: ComposerCatalogAction; icon: LucideIcon | "mention" }
  | { kind: "separator"; key: string };

const rows = computed((): InsertMenuRow[] => {
  const items = insertCatalogItems();
  const structureIds = new Set(["taskList", "codeBlock", "table"]);
  const structure = items.filter((i) => structureIds.has(i.id));
  const insert = items.filter((i) => !structureIds.has(i.id));

  const out: InsertMenuRow[] = [];
  const pushItems = (list: ComposerCatalogAction[]) => {
    for (const item of list) {
      out.push({ kind: "item", item, icon: INSERT_ICONS[item.id] ?? Link2 });
    }
  };

  pushItems(structure);
  if (structure.length && insert.length) {
    out.push({ kind: "separator", key: "sep-structure-insert" });
  }
  pushItems(insert);
  return out;
});

function hasActiveTextSelection(): boolean {
  const ed = props.editor;
  if (!ed) return false;
  const { empty, from, to } = ed.state.selection;
  if (empty) return false;
  return ed.state.doc.textBetween(from, to, " ").trim().length > 0;
}

/** Prefer the format bubble while text is selected; insert menu is for caret / empty. */
function onContextMenuCapture(event: Event) {
  if (hasActiveTextSelection()) {
    event.preventDefault();
  }
}

function onSelect(id: string) {
  if (!props.editor) return;
  runComposerAction(props.editor, id, props.hooks);
}
</script>

<template>
  <Menu type="context-menu" :modal="false" :press-open-delay="PRESS_OPEN_DELAY_MS" v-model:open="open">
    <MenuTrigger as-child @contextmenu.capture="onContextMenuCapture">
      <slot />
    </MenuTrigger>
    <MenuContent :class="['min-w-[12rem]', props.class]">
      <template v-for="row in rows" :key="row.kind === 'separator' ? row.key : row.item.id">
        <MenuSeparator v-if="row.kind === 'separator'" />
        <MenuItem v-else class="flex:row-md flex:center-y gap-2 text-xs" @select="onSelect(row.item.id)">
          <Icon
            v-if="row.icon === 'mention'"
            name="oi-mention"
            class="size-4 shrink-0 text-muted-foreground"
          />
          <component v-else :is="row.icon" class="size-4 shrink-0 text-muted-foreground" />
          <span>{{ row.item.label }}</span>
        </MenuItem>
      </template>
    </MenuContent>
  </Menu>
</template>
