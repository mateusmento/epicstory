import { Lowlight } from "@/core/lowlight";
import { autoUpdate, computePosition, offset, shift, type VirtualElement } from "@floating-ui/dom";
import { watchDebounced } from "@vueuse/core";
import type { ComponentPublicInstance } from "vue";
import type { ComputedRef } from "vue";
import { computed, onUnmounted, ref, watch } from "vue";

/** Shared peek / expand / floating-collapse UX for `CodeBlockCard` (TipTap + JSON preview). */
export const CODE_HIGHLIGHT_AUTO_MAX_CHARS = 100_000;
export const CODE_LONG_LINE_THRESHOLD = 12;
export const CODE_PEEK_VISIBLE_LINES = 12;

export type CodeBlockCardModelOptions = {
  sourceText: ComputedRef<string>;
  /** Raw `attrs.language` string (TipTap may omit trim; both callers normalize consistently upstream). */
  languageAttr: ComputedRef<string>;
  expandLongBlocksByDefault: ComputedRef<boolean>;
};

export type CodeBlockCardModel = ReturnType<typeof useCodeBlockCardModel>;

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

/**
 * Shared state for the epic code card: auto language label, peek/expand, floating collapse
 * positioning. Callers provide `sourceText` / `languageAttr` and host + float DOM refs.
 */
export function useCodeBlockCardModel(opts: CodeBlockCardModelOptions) {
  const { sourceText, languageAttr, expandLongBlocksByDefault } = opts;

  const codeExpanded = ref(false);
  const languageClassPrefix = "language-";
  const autoDetectedLanguage = ref<string | null>(null);

  const effectiveLanguageForClass = computed(() => String(languageAttr.value ?? "").trim());

  watchDebounced(
    () => [effectiveLanguageForClass.value, sourceText.value] as const,
    ([lang, text]) => {
      if (lang) {
        autoDetectedLanguage.value = null;
        return;
      }
      const t = (text ?? "").trim();
      if (!t || t.length > CODE_HIGHLIGHT_AUTO_MAX_CHARS) {
        autoDetectedLanguage.value = null;
        return;
      }
      try {
        autoDetectedLanguage.value = Lowlight.highlightAuto(t).data?.language ?? null;
      } catch {
        autoDetectedLanguage.value = null;
      }
    },
    { debounce: 200, maxWait: 800, immediate: true },
  );

  const languageLabel = computed(() => {
    const lang = effectiveLanguageForClass.value;
    if (lang) return lang;
    const guess = autoDetectedLanguage.value;
    if (guess) return guess;
    return "Auto";
  });

  const lineNumbers = computed(() => {
    const raw = sourceText.value;
    const n = raw === "" ? 1 : raw.split("\n").length;
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  const lineCount = computed(() => lineNumbers.value.length);

  const isLongCode = computed(() => lineCount.value > CODE_LONG_LINE_THRESHOLD);

  watch(
    lineCount,
    (n, prev) => {
      const long = n > CODE_LONG_LINE_THRESHOLD;
      if (!long) {
        codeExpanded.value = false;
        return;
      }
      const crossedIntoLong = prev === undefined ? long : prev <= CODE_LONG_LINE_THRESHOLD && long;
      if (crossedIntoLong) {
        codeExpanded.value = expandLongBlocksByDefault.value;
      }
    },
    { immediate: true },
  );

  const showPeekChrome = computed(() => isLongCode.value && !codeExpanded.value);

  const peekHiddenLineCount = computed(() => {
    if (!showPeekChrome.value) return 0;
    return Math.max(0, lineCount.value - Math.floor(CODE_PEEK_VISIBLE_LINES));
  });

  const expandPeekLabel = computed(() => `Show more +${peekHiddenLineCount.value} lines`);

  const showFloatingCollapse = computed(() => isLongCode.value && codeExpanded.value);

  const toggleAriaLabel = computed(() => (codeExpanded.value ? "Show less code" : "Expand code block"));

  const codeClass = computed(() => {
    const lang = effectiveLanguageForClass.value;
    const parts = [
      "epic-code-card-code",
      "block",
      "min-h-0",
      "min-w-0",
      "w-full",
      "font-mono",
      "text-[0.8125rem]",
      "leading-relaxed",
      "hljs",
      "!p-0",
      "bg-transparent",
      "whitespace-pre",
      "py-3",
      "pr-3",
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

  const hostEl = ref<HTMLElement | null>(null);

  function setHostRef(el: Element | ComponentPublicInstance | null) {
    if (!el) {
      hostEl.value = null;
      return;
    }
    hostEl.value = el instanceof HTMLElement ? el : (el as ComponentPublicInstance).$el;
  }

  const floatWrapRef = ref<HTMLElement | null>(null);

  function setFloatWrapRef(el: Element | ComponentPublicInstance | null) {
    if (!el) {
      floatWrapRef.value = null;
      return;
    }
    floatWrapRef.value = el instanceof HTMLElement ? el : (el as ComponentPublicInstance).$el;
  }

  let stopFloatAutoUpdate: (() => void) | undefined;
  let collapseFloatResizeObserver: ResizeObserver | undefined;
  let collapseFloatExtraCleanups: (() => void) | undefined;

  function teardownCollapseFloat(): void {
    stopFloatAutoUpdate?.();
    stopFloatAutoUpdate = undefined;
    collapseFloatResizeObserver?.disconnect();
    collapseFloatResizeObserver = undefined;
    collapseFloatExtraCleanups?.();
    collapseFloatExtraCleanups = undefined;
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
        computePosition(virtualRef, float, {
          placement: "top",
          strategy: "fixed",
          middleware: [
            offset(6),
            shift({
              padding: 12,
              ...(sp ? { boundary: sp } : {}),
            }),
          ],
        })
          .then(({ x, y }) => {
            Object.assign(float.style, {
              position: "fixed",
              left: `${x}px`,
              top: `${y}px`,
              right: "auto",
              bottom: "auto",
            });
          })
          .catch(() => {});
      };

      stopFloatAutoUpdate = autoUpdate(virtualRef, float, runPosition);

      collapseFloatResizeObserver = new ResizeObserver(runPosition);
      const sp0 = findVerticalScrollParent(host);
      if (sp0) {
        collapseFloatResizeObserver.observe(sp0);
        if (sp0.parentElement) {
          collapseFloatResizeObserver.observe(sp0.parentElement);
        }
      }

      const cleanups: (() => void)[] = [];
      const onViewportNudge = () => {
        runPosition();
      };
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
        for (const c of cleanups) {
          c();
        }
      };
    },
    { flush: "post" },
  );

  onUnmounted(teardownCollapseFloat);

  return {
    codeExpanded,
    languageLabel,
    lineNumbers,
    isLongCode,
    showPeekChrome,
    expandPeekLabel,
    showFloatingCollapse,
    toggleAriaLabel,
    codeClass,
    onToggleMouseDown,
    onToggleClick,
    hostEl,
    setHostRef,
    floatWrapRef,
    setFloatWrapRef,
    teardownCollapseFloat,
    effectiveLanguageForClass,
  };
}
