<script lang="ts" setup>
import { listLowlightLanguagesForMenu } from "@/core/lowlight";
import {
  Button,
  Menu,
  MenuContent,
  MenuInput,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  ScrollArea,
} from "@/design-system";
import type { JSONContent, NodeViewProps } from "@tiptap/core";
import { NodeViewContent } from "@tiptap/vue-3";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useCodeBlockCardModel } from "./code-block-card-model";
import { highlightSnippetToInnerHtml } from "./code-snippet-highlight";

/** TipTap stores code as child `text` nodes (JSON preview path). */
function codeBlockPlainText(n: JSONContent): string {
  if (!n.content?.length) return "";
  return n.content
    .filter((c): c is JSONContent & { text: string } => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("");
}

type Props = {
  variant: "preview" | "tiptap";
  /** JSON `codeBlock` node (preview only). */
  previewNode?: JSONContent;
  previewInteractionMarkers?: boolean;
  collapseFloatExtraClass?: string;
} & Partial<NodeViewProps>;

const props = withDefaults(defineProps<Props>(), {
  previewInteractionMarkers: false,
  collapseFloatExtraClass: "",
});

const previewShellClass =
  "epic-code-card rich-text-json-code-block my-2 w-full max-w-full self-start min-h-0 overflow-visible rounded-lg border border-zinc-200/90 bg-zinc-100 shadow-sm";

const shellClass = computed(() => (props.variant === "preview" ? previewShellClass : ""));

const sourceText = computed(() => {
  if (props.variant === "preview") {
    return props.previewNode ? codeBlockPlainText(props.previewNode) : "";
  }
  return props.node?.textContent ?? "";
});

const languageAttr = computed(() => {
  if (props.variant === "preview") {
    return String(props.previewNode?.attrs?.language ?? "");
  }
  return String(props.node?.attrs.language ?? "");
});

const expandLongBlocksByDefault = computed(() => {
  if (props.variant === "preview") return false;
  return props.editor?.isEditable ?? false;
});

const {
  setHostRef,
  effectiveLanguageForClass,
  languageLabel,
  showPeekChrome,
  lineNumbers,
  displayedSourceText,
  codeClass,
  expandPeekLabel,
  onToggleMouseDown,
  onToggleClick,
  showFloatingCollapse,
  setFloatWrapRef,
  toggleAriaLabel,
} = useCodeBlockCardModel({
  sourceText,
  languageAttr,
  expandLongBlocksByDefault,
});

defineExpose({
  setHostRef: setHostRef,
});

/** TipTap composer: language picker + editable body. */
const isComposer = computed(() => props.variant === "tiptap" && (props.editor?.isEditable ?? false));

const languageSearch = ref("");
const languageOptions = computed(() => listLowlightLanguagesForMenu());
const currentLanguage = computed(() => String(props.node?.attrs.language ?? ""));
const filteredLanguageOptions = computed(() =>
  languageOptions.value.filter((lang) => lang.toLowerCase().includes(languageSearch.value.toLowerCase())),
);

function setLanguage(language: string) {
  if (props.variant !== "tiptap" || !props.updateAttributes) return;
  props.updateAttributes({ language: language || null });
}

function onLanguageTriggerMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/** Preview, or TipTap peek: static highlight inside `<code>` (first N lines when peeking). */
const codeElRef = ref<HTMLElement | null>(null);
const tiptapPeekCodeRef = ref<HTMLElement | null>(null);

async function repaintStaticHighlight(): Promise<void> {
  const isPreview = props.variant === "preview";
  const isTiptapPeek = props.variant === "tiptap" && showPeekChrome.value;
  if (!isPreview && !isTiptapPeek) return;
  await nextTick();
  const el = isPreview ? codeElRef.value : tiptapPeekCodeRef.value;
  if (!el) return;
  const hint = effectiveLanguageForClass.value || undefined;
  el.innerHTML = highlightSnippetToInnerHtml(hint, displayedSourceText.value);
}

watch(
  [displayedSourceText, () => effectiveLanguageForClass.value, () => props.variant, showPeekChrome],
  () => {
    repaintStaticHighlight().catch(() => {});
  },
);

onMounted(() => {
  repaintStaticHighlight().catch(() => {});
});
</script>

<template>
  <div :ref="variant === 'preview' ? setHostRef : undefined" :class="shellClass">
    <div
      class="epic-code-card-header flex items-center justify-between gap-2 rounded-t-lg border-b border-zinc-200/80 bg-zinc-200/45 px-2 py-1"
    >
      <div v-if="variant === 'tiptap' && isComposer" class="max-w-[min(12rem,45vw)] min-w-0 flex-1">
        <Menu>
          <MenuTrigger as-child>
            <Button
              variant="secondary"
              size="sm"
              class="h-7 w-fit px-2 gap-1 font-mono text-[11px] font-normal text-zinc-800 shadow-none"
              aria-label="Syntax highlighting language"
              @click="onLanguageTriggerMouseDown"
            >
              <span class="truncate uppercase tracking-wide">{{ languageLabel }}</span>
              <ChevronDown class="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
            </Button>
          </MenuTrigger>
          <MenuContent align="start" class="w-56">
            <MenuInput placeholder="Search language" v-model="languageSearch" />
            <MenuSeparator />
            <ScrollArea class="h-64">
              <div class="!block">
                <MenuItem
                  class="font-mono text-xs"
                  :class="currentLanguage === '' ? 'bg-accent/40 font-medium' : ''"
                  @click.stop="setLanguage('')"
                >
                  Auto
                </MenuItem>
                <MenuItem
                  v-for="lang in filteredLanguageOptions"
                  :key="lang"
                  class="font-mono text-xs"
                  :class="lang === currentLanguage ? 'bg-accent/40 font-medium' : ''"
                  @click.stop="setLanguage(lang)"
                >
                  {{ lang }}
                </MenuItem>
              </div>
            </ScrollArea>
          </MenuContent>
        </Menu>
      </div>
      <span
        v-else
        class="epic-code-lang min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-zinc-600 uppercase tracking-wide"
      >
        {{ languageLabel }}
      </span>
    </div>
    <div class="epic-code-card-viewport w-full min-h-0 min-w-0 rounded-b-lg">
      <div class="epic-code-card-scroll w-full min-h-0 min-w-0">
        <div
          class="epic-code-card-pre m-0 flex w-full min-w-0 border-0 border-t border-zinc-200/80 bg-[#f8f8f8] text-left rounded-b-lg overflow-hidden relative"
        >
          <div
            class="epic-code-card-gutter pl-3 pr-2 mr-2 shrink-0 select-none border-r border-zinc-200/90 bg-zinc-100/80 font-mono text-[0.8125rem] leading-relaxed text-zinc-400 tabular-nums"
            aria-hidden="true"
          >
            <div v-for="num in lineNumbers" :key="num" class="whitespace-nowrap">
              {{ num }}
            </div>
          </div>
          <!-- Radix ScrollArea: horizontal thumb + constrained width; `!block` avoids viewport display:table quirk. -->
          <ScrollArea
            horizontal
            :vertical="!showPeekChrome"
            class="min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none outline-none [&_[data-radix-scroll-area-corner]]:hidden"
          >
            <div class="!block min-w-0">
              <template v-if="variant === 'tiptap' && showPeekChrome">
                <code ref="tiptapPeekCodeRef" :class="codeClass" />
              </template>
              <NodeViewContent v-else-if="variant === 'tiptap'" as="code" :class="codeClass" />
              <code v-else ref="codeElRef" :class="codeClass" />
            </div>
          </ScrollArea>
          <!-- TipTap requires a [data-node-view-content] host for PM; keep it visually hidden while peek shows a sliced <code>. -->
          <div
            v-if="variant === 'tiptap' && showPeekChrome"
            class="sr-only pointer-events-none"
            aria-hidden="true"
          >
            <NodeViewContent as="code" :class="codeClass" />
          </div>
          <div
            v-if="showPeekChrome"
            class="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center bg-gradient-to-t from-[#f8f8f8] from-35% via-[#f8f8f8]/85 to-transparent px-2 pb-2 pt-8"
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              class="pointer-events-auto gap-1 border border-zinc-200/90 shadow-sm rounded-lg font-inter text-xs"
              :data-rich-text-json-code-expand="props.previewInteractionMarkers ? '' : undefined"
              aria-expanded="false"
              :aria-label="expandPeekLabel"
              @mousedown="onToggleMouseDown"
              @click="onToggleClick"
            >
              {{ expandPeekLabel }}
              <ChevronsUpDown class="size-3.5 shrink-0" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="showFloatingCollapse"
        :ref="setFloatWrapRef"
        class="epic-code-collapse-float pointer-events-none z-[100] w-max"
        :class="props.collapseFloatExtraClass"
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          class="pointer-events-auto gap-1 border border-zinc-200/90 shadow-sm rounded-lg backdrop-blur-[2px] font-inter text-xs"
          :data-rich-text-json-code-collapse="props.previewInteractionMarkers ? '' : undefined"
          aria-expanded="true"
          :aria-label="toggleAriaLabel"
          @mousedown="onToggleMouseDown"
          @click="onToggleClick"
        >
          Collapse
          <ChevronsDownUp class="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.epic-code-collapse-float {
  visibility: hidden;
}

.epic-code-card-pre :deep(.hljs-keyword),
.epic-code-card-pre :deep(.hljs-type),
.epic-code-card-pre :deep(.hljs-variable.language_) {
  color: #681da8;
}
.epic-code-card-pre :deep(.hljs-string),
.epic-code-card-pre :deep(.hljs-meta .hljs-string) {
  color: #702c1c;
}
</style>
