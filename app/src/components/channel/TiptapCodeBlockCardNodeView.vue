<script lang="ts" setup>
import { computed, ref } from "vue";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";

const props = defineProps(nodeViewProps);

const collapsed = ref(false);
const languageClassPrefix = "language-";

const languageLabel = computed(() => {
  const lang = props.node.attrs.language ?? "";
  return lang ? String(lang) : "Auto";
});

const codeClass = computed(() => {
  const lang = props.node.attrs.language ?? "";
  const parts = [
    "epic-code-card-code",
    "block",
    "font-mono",
    "text-[0.8125rem]",
    "leading-relaxed",
    "text-zinc-100",
    "hljs",
  ];
  if (lang) parts.push(languageClassPrefix + lang);
  return parts.join(" ");
});

function onToggleMouseDown(e: MouseEvent) {
  e.preventDefault();
}

function onToggleClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <NodeViewWrapper
    as="div"
    :class="[
      'epic-code-card',
      'my-2',
      'overflow-hidden',
      'rounded-lg',
      'border',
      'border-zinc-200/90',
      'bg-zinc-100',
      'shadow-sm',
      collapsed ? 'epic-code-card--collapsed' : '',
    ]"
  >
    <div
      class="epic-code-card-header flex items-center justify-between gap-2 border-b border-zinc-200/80 bg-zinc-200/45 px-2.5 py-1.5"
    >
      <span
        class="epic-code-lang min-w-0 truncate font-mono text-[11px] font-medium uppercase tracking-wide text-zinc-600"
      >
        {{ languageLabel }}
      </span>
      <button
        type="button"
        class="epic-code-collapse-btn inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-300/60 hover:text-zinc-900"
        :aria-expanded="collapsed ? 'false' : 'true'"
        :aria-label="collapsed ? 'Expand code block' : 'Collapse code block'"
        @mousedown="onToggleMouseDown"
        @click="onToggleClick"
      >
        {{ collapsed ? "▶" : "▼" }}
      </button>
    </div>
    <pre
      class="epic-code-card-pre m-0 max-h-[min(24rem,70vh)] overflow-x-auto overflow-y-auto border-0 bg-zinc-950 p-3 text-left"
      :style="collapsed ? { maxHeight: '7rem' } : {}"
    >
      <NodeViewContent as="code" :class="codeClass" />
    </pre>
  </NodeViewWrapper>
</template>
