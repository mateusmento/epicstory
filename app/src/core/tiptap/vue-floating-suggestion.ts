import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
  type VirtualElement,
} from "@floating-ui/dom";
import type { Component } from "vue";
import { VueRenderer } from "@tiptap/vue-3";

/**
 * TipTap `@tiptap/suggestion` render payload (subset we forward to Vue).
 * @see https://tiptap.dev/api/utilities/suggestion
 */
export type TiptapSuggestionRenderContext = {
  items: unknown[];
  command: (item: unknown) => void;
  editor: unknown;
  /** Caret / decoration rect; may be a getter from the suggestion plugin */
  clientRect?: (() => DOMRect | null) | DOMRect | null;
};

export type VueFloatingSuggestionOptions<TProps extends Record<string, unknown>> = {
  /** Vue component for the floating list (e.g. `MentionList`, command palette, etc.) */
  listComponent: Component;
  /**
   * Map TipTap suggestion context → props for `listComponent`.
   * Called on start and on every update (query/items changes).
   */
  mapProps: (ctx: TiptapSuggestionRenderContext) => TProps;
  /** @default 'bottom-start' — anchor to the left edge of the caret, below */
  placement?: Placement;
  /** Gap between caret and panel along the main axis (default `8`) */
  mainAxisOffset?: number;
  /** @default 80 — align with design-system menus in most cases */
  zIndex?: number;
  /** Classes on the floating root wrapper (portal host) */
  className?: string;
};

function resolveClientRect(raw: TiptapSuggestionRenderContext["clientRect"]): DOMRect | null {
  if (raw == null) return null;
  if (typeof raw === "function") return raw() ?? null;
  return raw;
}

/**
 * Returns TipTap `suggestion.render` in the shape:
 * `() => ({ onStart, onUpdate, onKeyDown, onExit })`.
 *
 * Uses Floating UI (`computePosition` + `flip` + `shift` + `autoUpdate`) so the
 * panel stays on-screen when the caret is near edges or scroll containers.
 *
 * Reuse for mentions, slash-commands, or any `Suggestion` plugin that uses the
 * same render contract.
 */
export function createVueFloatingSuggestionRender<TProps extends Record<string, unknown>>(
  options: VueFloatingSuggestionOptions<TProps>,
): () => {
  onStart: (props: TiptapSuggestionRenderContext) => void;
  onUpdate: (props: TiptapSuggestionRenderContext) => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  onExit: () => void;
} {
  return () => {
    let renderer: VueRenderer | null = null;
    let floatingEl: HTMLDivElement | null = null;
    let stopAutoUpdate: (() => void) | null = null;
    let lastRect: DOMRect | null = null;

    const virtualRef: VirtualElement = {
      getBoundingClientRect: () => lastRect ?? new DOMRect(0, 0, 0, 0),
      contextElement: typeof document !== "undefined" ? document.documentElement : undefined,
    };

    function syncRect(ctx: TiptapSuggestionRenderContext) {
      lastRect = resolveClientRect(ctx.clientRect);
    }

    async function updatePosition() {
      if (!floatingEl) return;
      const { x, y } = await computePosition(virtualRef, floatingEl, {
        placement: options.placement ?? "bottom-start",
        strategy: "fixed",
        middleware: [offset(options.mainAxisOffset ?? 8), flip(), shift({ padding: 8 })],
      });
      Object.assign(floatingEl.style, {
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        zIndex: String(options.zIndex ?? 80),
      });
    }

    return {
      onStart(props: TiptapSuggestionRenderContext) {
        syncRect(props);
        renderer = new VueRenderer(options.listComponent, {
          props: {
            ...options.mapProps({
              items: props.items ?? [],
              command: props.command,
              editor: props.editor,
              clientRect: props.clientRect,
            }),
          },
          editor: props.editor as never,
        });

        floatingEl = document.createElement("div");
        floatingEl.setAttribute("data-tiptap-floating-suggestion", "");
        if (options.className) {
          floatingEl.className = options.className;
        }
        if (renderer.element) floatingEl.appendChild(renderer.element);
        document.body.appendChild(floatingEl);

        updatePosition();
        stopAutoUpdate = autoUpdate(virtualRef, floatingEl, () => {
          updatePosition();
        });
      },

      onUpdate(props: TiptapSuggestionRenderContext) {
        syncRect(props);
        renderer?.updateProps(
          options.mapProps({
            items: props.items ?? [],
            command: props.command,
            editor: props.editor,
            clientRect: props.clientRect,
          }),
        );
        updatePosition();
      },

      onKeyDown(props: any) {
        if (props.event?.key === "Escape") {
          props.command?.(null);
          return true;
        }
        const exposed = renderer?.ref as { onKeyDown?: (p: any) => boolean } | undefined;
        return exposed?.onKeyDown?.(props) ?? false;
      },

      onExit() {
        stopAutoUpdate?.();
        stopAutoUpdate = null;
        renderer?.destroy();
        renderer = null;
        floatingEl?.remove();
        floatingEl = null;
        lastRect = null;
      },
    };
  };
}

/**
 * Convenience: `{ items, render }` for a single TipTap `suggestion` config
 * (e.g. `Mention.configure({ suggestion: … })`).
 */
export function createVueFloatingSuggestion<TItem, TProps extends Record<string, unknown>>(
  config: {
    items: (ctx: { query: string }) => TItem[];
    listComponent: Component;
    mapProps: (ctx: {
      items: TItem[];
      command: (item: TItem) => void;
      editor: unknown;
      clientRect?: TiptapSuggestionRenderContext["clientRect"];
    }) => TProps;
  } & Omit<VueFloatingSuggestionOptions<TProps>, "listComponent" | "mapProps">,
): {
  items: (ctx: { query: string }) => TItem[];
  render: ReturnType<typeof createVueFloatingSuggestionRender<TProps>>;
} {
  const { items, listComponent, mapProps, ...floating } = config;
  return {
    items,
    render: createVueFloatingSuggestionRender<TProps>({
      listComponent,
      mapProps: (ctx) =>
        mapProps({
          items: ctx.items as TItem[],
          command: ctx.command as (item: TItem) => void,
          editor: ctx.editor,
          clientRect: ctx.clientRect,
        }),
      ...floating,
    }),
  };
}
