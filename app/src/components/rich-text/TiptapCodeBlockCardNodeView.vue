<script lang="ts" setup>
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
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { autoUpdate, computePosition, offset, shift, type VirtualElement } from "@floating-ui/dom";
import { watchDebounced } from "@vueuse/core";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-vue-next";
import type { ComponentPublicInstance } from "vue";
import { computed, onUnmounted, ref, watch } from "vue";
import { epicStoryLowlight, listLowlightLanguagesForMenu } from "@/core/epic-story-lowlight";

/**
 * `CodeBlockLowlight` uses `highlightAuto` for decorations when `language` is empty, but it never
 * writes the guess back to `node.attrs.language` — so the UI must read `highlightAuto` too to
 * mirror what lowlight is using while typing.
 */
const HIGHLIGHT_AUTO_MAX_CHARS = 100_000;

/** Past this many lines, the block opens in a short “peek” with a fade (Slack-style). */
const LONG_CODE_LINE_THRESHOLD = 12;
/** How many text lines worth of height to show in peek mode (fraction ok). */
const PEEK_VISIBLE_LINES = 12;

const props = defineProps(nodeViewProps);

const isComposer = computed(() => props.editor.isEditable);

const languageOptions = computed(() => listLowlightLanguagesForMenu());

/** Long blocks only: false = peek snippet, true = full scrollable code. */
const codeExpanded = ref(false);
const languageClassPrefix = "language-";

const autoDetectedLanguage = ref<string | null>(null);

watchDebounced(
  () => [props.node.attrs.language, props.node.textContent] as const,
  ([lang, text]) => {
    if (lang) {
      autoDetectedLanguage.value = null;
      return;
    }
    const t = (text ?? "").trim();
    if (!t || t.length > HIGHLIGHT_AUTO_MAX_CHARS) {
      autoDetectedLanguage.value = null;
      return;
    }
    try {
      const root = epicStoryLowlight.highlightAuto(t);
      autoDetectedLanguage.value = root.data?.language ?? null;
    } catch {
      autoDetectedLanguage.value = null;
    }
  },
  { debounce: 200, maxWait: 800, immediate: true },
);

const languageLabel = computed(() => {
  const lang = props.node.attrs.language ?? "";
  if (lang) return String(lang);
  const guess = autoDetectedLanguage.value;
  if (guess) return guess;
  return "Auto";
});

/** Line indices for gutter (ProseMirror text; split like a text editor). */
const lineNumbers = computed(() => {
  const raw = props.node.textContent ?? "";
  const n = raw === "" ? 1 : raw.split("\n").length;
  return Array.from({ length: n }, (_, i) => i + 1);
});

const lineCount = computed(() => lineNumbers.value.length);

const isLongCode = computed(() => lineCount.value > LONG_CODE_LINE_THRESHOLD);

/** Composer: default expanded when crossing into “long”; read-only: default peek. */
watch(
  lineCount,
  (n, prev) => {
    const long = n > LONG_CODE_LINE_THRESHOLD;
    if (!long) {
      codeExpanded.value = false;
      return;
    }
    const crossedIntoLong = prev === undefined ? long : prev <= LONG_CODE_LINE_THRESHOLD && long;
    if (crossedIntoLong) {
      codeExpanded.value = isComposer.value;
    }
  },
  { immediate: true },
);

const showPeekChrome = computed(() => isLongCode.value && !codeExpanded.value);

/** Lines not shown in peek (approx. first `floor(PEEK_VISIBLE_LINES)` rows are visible). */
const peekHiddenLineCount = computed(() => {
  if (!showPeekChrome.value) return 0;
  const peekApproxVisible = Math.floor(PEEK_VISIBLE_LINES);
  return Math.max(0, lineCount.value - peekApproxVisible);
});

const expandPeekLabel = computed(() => `Show more +${peekHiddenLineCount.value} lines`);

/** Long + expanded: teleported Collapse (composer + read-only). Expand uses inline peek control. */
const showFloatingCollapse = computed(() => isLongCode.value && codeExpanded.value);

/**
 * Wraps the flex row (gutter + code). Peek clips here; expanded read-only uses full height (chat
 * scrolls vertically). Horizontal overflow only on this layer keeps the flex row out of a vertical
 * scrollport so gutter height stays aligned with code.
 */
const codeScrollLayerClass = computed(() => {
  if (showPeekChrome.value) {
    return "overflow-hidden";
  }
  return "overflow-x-auto";
});

const toggleAriaLabel = computed(() => (codeExpanded.value ? "Show less code" : "Expand code block"));

const codeClass = computed(() => {
  const lang = props.node.attrs.language ?? "";
  const parts = [
    "epic-code-card-code",
    "block",
    "min-h-0",
    "min-w-0",
    "flex-1",
    /**
     * Peek: clip inside `<code>` (full text height). Otherwise do not set overflow on `<code>`:
     * `overflow-x-auto` here + `overflow-y-auto` on `.epic-code-card-pre` makes the other axis
     * compute to `auto` as well → two vertical scrollbars.
     */
    ...(showPeekChrome.value ? ["overflow-hidden"] : []),
    "font-mono",
    "text-[0.8125rem]",
    "leading-relaxed",
    "hljs",
    /** `github.css` targets `pre code.hljs { padding: 1em }` — card uses `div` + padding on the panel */
    "!p-0",
    "bg-transparent",
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
  if (!isLongCode.value) return;
  codeExpanded.value = !codeExpanded.value;
}

function setLanguage(language: string) {
  props.updateAttributes({ language: language || null });
}

function onLanguageTriggerMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

const currentLanguage = computed(() => String(props.node.attrs.language ?? ""));
const languageSearch = ref("");

const filteredLanguageOptions = computed(() => {
  return languageOptions.value.filter((lang) =>
    lang.toLowerCase().includes(languageSearch.value.toLowerCase()),
  );
});

/** Host element for Floating UI + intersection (whole code card). */
const hostEl = ref<HTMLElement | null>(null);

function setHostRef(el: Element | ComponentPublicInstance | null) {
  if (!el) {
    hostEl.value = null;
    return;
  }
  hostEl.value = el instanceof HTMLElement ? el : (el as ComponentPublicInstance).$el;
}

const floatWrapRef = ref<HTMLElement | null>(null);
let stopFloatAutoUpdate: (() => void) | undefined;
let collapseFloatResizeObserver: ResizeObserver | undefined;
let collapseFloatExtraCleanups: (() => void) | undefined;

function teardownCollapseFloat() {
  stopFloatAutoUpdate?.();
  stopFloatAutoUpdate = undefined;
  collapseFloatResizeObserver?.disconnect();
  collapseFloatResizeObserver = undefined;
  collapseFloatExtraCleanups?.();
  collapseFloatExtraCleanups = undefined;
}

/** Nearest vertical scrollport (e.g. chat ScrollArea viewport), not the browser window. */
function findVerticalScrollParent(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

watch(
  [hostEl, floatWrapRef, showFloatingCollapse],
  () => {
    teardownCollapseFloat();
    const host = hostEl.value;
    const float = floatWrapRef.value;
    if (!host || !float || !showFloatingCollapse.value) {
      return;
    }

    const virtualRef: VirtualElement = {
      contextElement: host,
      getBoundingClientRect: () => {
        const r = host.getBoundingClientRect();
        const sp = findVerticalScrollParent(host);
        const sbr = sp?.getBoundingClientRect();
        const clipBottom = sbr?.bottom ?? window.innerHeight;
        const pad = 12;
        const vw = window.innerWidth;
        const y = Math.min(r.bottom, clipBottom) - pad;
        const cx = Math.min(Math.max(r.left + r.width / 2, 48), vw - 48);
        return new DOMRect(cx - 0.5, y - 0.5, 1, 1);
      },
    };

    const runPosition = () => {
      const sp = findVerticalScrollParent(host);
      const sbr = sp?.getBoundingClientRect();
      const clipTop = sbr?.top ?? 0;
      const clipBottom = sbr?.bottom ?? window.innerHeight;
      const pad = 12;
      const r = host.getBoundingClientRect();
      if (r.bottom < clipTop + pad || r.top > clipBottom - pad) {
        float.style.visibility = "hidden";
        return;
      }
      float.style.visibility = "visible";
      void computePosition(virtualRef, float, {
        placement: "top",
        strategy: "fixed",
        middleware: [
          offset(6),
          shift({
            padding: 12,
            ...(sp ? { boundary: sp } : {}),
          }),
        ],
      }).then(({ x, y }) => {
        Object.assign(float.style, {
          position: "fixed",
          left: `${x}px`,
          top: `${y}px`,
          right: "auto",
          bottom: "auto",
        });
      });
    };

    stopFloatAutoUpdate = autoUpdate(virtualRef, float, runPosition);

    /** Composer height changes shrink the thread row; `autoUpdate` often misses scrollport resize. */
    collapseFloatResizeObserver = new ResizeObserver(runPosition);
    const sp0 = findVerticalScrollParent(host);
    if (sp0) {
      collapseFloatResizeObserver.observe(sp0);
      if (sp0.parentElement) {
        collapseFloatResizeObserver.observe(sp0.parentElement);
      }
    }

    const cleanups: (() => void)[] = [];
    const onViewportNudge = () => runPosition();
    window.addEventListener("resize", onViewportNudge);
    cleanups.push(() => window.removeEventListener("resize", onViewportNudge));
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onViewportNudge);
      vv.addEventListener("scroll", onViewportNudge);
      cleanups.push(() => {
        vv.removeEventListener("resize", onViewportNudge);
        vv.removeEventListener("scroll", onViewportNudge);
      });
    }
    collapseFloatExtraCleanups = () => {
      for (const c of cleanups) c();
    };
  },
  { flush: "post" },
);

onUnmounted(teardownCollapseFloat);
</script>

<template>
  <NodeViewWrapper
    :ref="setHostRef"
    as="div"
    :class="[
      'epic-code-card',
      'my-2',
      'w-full',
      'max-w-full',
      'self-start',
      'min-h-0',
      'overflow-visible',
      'rounded-lg',
      'border',
      'border-zinc-200/90',
      'bg-zinc-100',
      'shadow-sm',
    ]"
  >
    <div
      class="epic-code-card-header flex items-center justify-between gap-2 rounded-t-lg border-b border-zinc-200/80 bg-zinc-200/45 px-2 py-1"
    >
      <div v-if="isComposer" class="max-w-[min(12rem,45vw)] min-w-0 flex-1">
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
      <div class="epic-code-card-scroll w-full min-h-0 min-w-0" :class="codeScrollLayerClass">
        <div
          class="epic-code-card-pre m-0 flex w-full min-w-0 border-0 border-t border-zinc-200/80 bg-[#f8f8f8] text-left rounded-b-lg overflow-hidden"
          :class="[showPeekChrome ? 'epic-code-card-pre--peek' : '']"
        >
          <div
            class="epic-code-card-gutter pl-3 pr-2 mr-2 shrink-0 select-none border-r border-zinc-200/90 bg-zinc-100/80 font-mono text-[0.8125rem] leading-relaxed text-zinc-400 tabular-nums"
            aria-hidden="true"
          >
            <div v-for="num in lineNumbers" :key="num" class="whitespace-nowrap">
              {{ num }}
            </div>
          </div>
          <NodeViewContent as="code" :class="`${codeClass} w-full min-w-0 whitespace-pre py-3 pr-3`" />
          <div
            v-if="showPeekChrome"
            class="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center bg-gradient-to-t from-[#f8f8f8] from-35% via-[#f8f8f8]/85 to-transparent px-2 pb-2 pt-8"
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              class="pointer-events-auto gap-1 border border-zinc-200/90 shadow-sm rounded-lg font-inter text-xs"
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
        ref="floatWrapRef"
        class="epic-code-collapse-float pointer-events-none z-[100] w-max"
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          class="pointer-events-auto gap-1 border border-zinc-200/90 shadow-sm rounded-lg backdrop-blur-[2px] font-inter text-xs"
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
  </NodeViewWrapper>
</template>

<style scoped>
.epic-code-collapse-float {
  visibility: hidden;
}

/**
 * Peek mode: clip tall blocks and fade the bottom so a small snippet stays visible.
 * Height ≈ PEEK_VISIBLE_LINES × (0.8125rem × 1.625) + vertical padding on the code.
 */
.epic-code-card-pre--peek {
  --epic-code-fs: 0.8125rem;
  --epic-code-lh: 1.625;
  max-height: calc(var(--epic-code-fs) * var(--epic-code-lh) * v-bind(PEEK_VISIBLE_LINES) + 1.5rem);
  position: relative;
}
.epic-code-card-pre--peek::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2rem;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(248, 248, 248, 0), #f8f8f8);
}

/**
 * Slack-ish tweaks on top of highlight.js `github.css` (light): slightly more purple keywords,
 * warmer strings — still readable on the light gray panel.
 */
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
