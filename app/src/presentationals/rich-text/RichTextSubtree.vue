<script lang="ts" setup>
import type { JSONContent } from "@tiptap/core";
import type { IUser as IUser } from "@epicstory/contracts";
import { openRichTextInlineImageLightbox } from "@/presentationals/messages/media-attachment-lightbox";
import { computed, inject } from "vue";
import type { RichTextJsonPreviewContext } from "./preview";
import { richTextJsonPreviewKey } from "./preview";
import CodeBlockCard from "./segments/CodeBlockCard.vue";
import RichTextJsonInlineFragments from "./segments/InlineFragments.vue";
import MentionChip from "./segments/MentionChip.vue";
import RichTextSubtree from "./RichTextSubtree.vue";

const props = defineProps<{
  node: JSONContent;
}>();

const jsonPreview = inject(richTextJsonPreviewKey);
if (jsonPreview == null) {
  throw new Error("[RichTextRenderer] missing provider — use inside RichTextPreview.");
}
const ctx: RichTextJsonPreviewContext = jsonPreview;

const headingTag = computed(() => {
  const lv = Number(props.node.attrs?.level ?? 1);
  const level = Number.isFinite(lv) ? Math.min(6, Math.max(1, lv)) : 1;
  return `h${level}`;
});

function lookupUser(id: number): IUser | undefined {
  return ctx.lookupUser(id);
}

const taskAttrs = computed(() => props.node.attrs as { checked?: boolean } | undefined);

const imageAriaLabel = computed(() => {
  const alt = String(props.node.attrs?.alt ?? "").trim();
  return alt.length > 0 ? `Open preview: ${alt}` : "Open image preview";
});

async function onPreviewImageClick(ev: MouseEvent) {
  const src = String(props.node.attrs?.src ?? "").trim();
  if (!src) return;
  const gallery = ctx.previewImageGallery.value;
  const root = ev.currentTarget;
  const thumb =
    root instanceof HTMLElement ? ((root.querySelector("img") as HTMLElement | null) ?? root) : null;
  const index = gallery.findIndex((g) => g.url === src);
  const images = index >= 0 ? gallery : [{ url: src, caption: String(props.node.attrs?.alt ?? "").trim() }];
  const start = index >= 0 ? index : 0;
  await openRichTextInlineImageLightbox(images, start, thumb);
}

const imageLayoutStyle = computed(() => {
  const attrs = props.node.attrs as { width?: unknown; height?: unknown } | undefined;
  if (!attrs) return undefined;
  const w = attrs.width != null ? Number(attrs.width) : NaN;
  const h = attrs.height != null ? Number(attrs.height) : NaN;
  const style: Record<string, string> = {};
  if (Number.isFinite(w)) style.width = `${w}px`;
  if (Number.isFinite(h)) style.height = `${h}px`;
  return Object.keys(style).length ? style : undefined;
});
</script>

<template>
  <template v-if="props.node.type === 'doc'">
    <RichTextSubtree v-for="(child, i) in props.node.content ?? []" :key="i" :node="child" />
  </template>

  <CodeBlockCard
    v-else-if="props.node.type === 'codeBlock'"
    variant="preview"
    :preview-node="props.node"
    preview-interaction-markers
    collapse-float-extra-class="rich-text-json-code-collapse-float"
  />

  <blockquote v-else-if="props.node.type === 'blockquote'" class="epic-blockquote">
    <div class="epic-blockquote-rail" aria-hidden="true" />
    <div class="epic-blockquote-body">
      <RichTextSubtree v-for="(child, bx) in props.node.content ?? []" :key="bx" :node="child" />
    </div>
  </blockquote>

  <p v-else-if="props.node.type === 'paragraph'" class="my-1">
    <RichTextJsonInlineFragments
      :nodes="props.node.content"
      :mention-me-id="ctx.mentionMeId.value"
      :user-by-id="lookupUser"
    />
  </p>

  <component
    :is="headingTag"
    v-else-if="props.node.type === 'heading'"
    class="my-2 font-semibold tracking-tight"
  >
    <RichTextJsonInlineFragments
      :nodes="props.node.content"
      :mention-me-id="ctx.mentionMeId.value"
      :user-by-id="lookupUser"
    />
  </component>

  <hr v-else-if="props.node.type === 'horizontalRule'" class="my-4 border-t border-border" />

  <ul v-else-if="props.node.type === 'bulletList'" class="my-1 list-disc pl-6">
    <RichTextSubtree v-for="(li, lix) in props.node.content ?? []" :key="lix" :node="li" />
  </ul>

  <ol v-else-if="props.node.type === 'orderedList'" class="my-1 list-decimal pl-6">
    <RichTextSubtree v-for="(li, lix) in props.node.content ?? []" :key="lix" :node="li" />
  </ol>

  <ul v-else-if="props.node.type === 'taskList'" class="my-1 ml-0 list-none pl-0" data-type="taskList">
    <RichTextSubtree v-for="(li, lix) in props.node.content ?? []" :key="lix" :node="li" />
  </ul>

  <li v-else-if="props.node.type === 'taskItem'" class="my-0.5 flex items-start gap-2" data-type="taskItem">
    <label class="shrink-0 pt-0.5">
      <input
        type="checkbox"
        class="accent-foreground opacity-75"
        tabindex="-1"
        :checked="taskAttrs?.checked ?? false"
        disabled
      />
    </label>
    <div class="min-w-0 flex-1">
      <RichTextSubtree v-for="(child, ix) in props.node.content ?? []" :key="ix" :node="child" />
    </div>
  </li>

  <li v-else-if="props.node.type === 'listItem'">
    <RichTextSubtree v-for="(child, ix) in props.node.content ?? []" :key="ix" :node="child" />
  </li>

  <span v-else-if="props.node.type === 'mention'" class="inline">
    <MentionChip :attrs="props.node.attrs" :mention-me-id="ctx.mentionMeId.value" :user-by-id="lookupUser" />
  </span>

  <button
    v-else-if="props.node.type === 'image'"
    type="button"
    class="my-2 block max-w-full cursor-zoom-in rounded-[10px] border-0 bg-transparent p-0 text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :aria-label="imageAriaLabel"
    @click="onPreviewImageClick"
  >
    <img
      class="max-h-[24rem] max-w-full rounded-[10px]"
      loading="lazy"
      :src="String(props.node.attrs?.src ?? '')"
      :alt="String(props.node.attrs?.alt ?? '')"
      :title="props.node.attrs?.title != null ? String(props.node.attrs.title) : undefined"
      :style="imageLayoutStyle"
    />
  </button>

  <div v-else-if="props.node.type === 'table'" class="tableWrapper my-2 overflow-x-auto">
    <table class="w-full min-w-[12rem] border-collapse border border-border text-sm">
      <tbody>
        <tr v-for="(row, ri) in props.node.content ?? []" :key="ri" class="border-border border-b">
          <RichTextSubtree v-for="(cell, ci) in row.content ?? []" :key="ci" :node="cell" />
        </tr>
      </tbody>
    </table>
  </div>

  <th
    v-else-if="props.node.type === 'tableHeader'"
    scope="col"
    class="border border-border bg-muted/40 px-3 py-2 align-top text-left font-medium"
    :colspan="props.node.attrs?.colspan != null ? Number(props.node.attrs.colspan) || 1 : undefined"
    :rowspan="props.node.attrs?.rowspan != null ? Number(props.node.attrs.rowspan) || 1 : undefined"
  >
    <RichTextSubtree v-for="(blk, qi) in props.node.content ?? []" :key="qi" :node="blk" />
  </th>

  <td
    v-else-if="props.node.type === 'tableCell'"
    class="border border-border px-3 py-2 align-top"
    :colspan="props.node.attrs?.colspan != null ? Number(props.node.attrs.colspan) || 1 : undefined"
    :rowspan="props.node.attrs?.rowspan != null ? Number(props.node.attrs.rowspan) || 1 : undefined"
  >
    <RichTextSubtree v-for="(blk, qi) in props.node.content ?? []" :key="qi" :node="blk" />
  </td>

  <p v-else class="my-1 text-sm text-muted-foreground">Unsupported block "{{ props.node.type }}"</p>
</template>
