import { cn } from "@/design-system/utils";
import type { Decorator } from "@storybook/vue3";
import { defineComponent, h, inject, type InjectionKey } from "vue";

export const STORYBOOK_VIEW_MODE_KEY: InjectionKey<"story" | "docs"> = Symbol("storybook-view-mode");

const gridBackgroundStyle = `
  background-image:
    linear-gradient(rgba(0, 255, 0, .7) .1em, transparent .1em),
    linear-gradient(90deg, rgba(0, 255, 0, .7) .1em, transparent .1em);
  background-size: 3em 3em;
`;

function useStorybookViewMode(): "story" | "docs" {
  return inject(STORYBOOK_VIEW_MODE_KEY, "story");
}

/** Minimal frame for Docs — no grid, no resize, in-flow only. */
export const StoryDocsFrame = defineComponent({
  name: "StoryDocsFrame",
  inheritAttrs: false,
  props: {
    class: {
      type: String,
      default: "",
    },
  },
  setup(props, { slots }) {
    return () => (
      <div
        class={cn(
          "sb-docs-frame not-prose my-4 w-full max-w-full overflow-visible rounded-md border border-border bg-background shadow-sm",
          props.class,
        )}
      >
        {slots.default?.()}
      </div>
    );
  },
});

/**
 * Canvas frame with debug grid. On Docs pages renders {@link StoryDocsFrame} instead
 * so autodocs stays scrollable.
 */
export const StoryContainer = defineComponent({
  name: "StoryContainer",
  inheritAttrs: false,
  props: {
    class: {
      type: String,
      default: "",
    },
  },
  setup(props, { slots }) {
    const viewMode = useStorybookViewMode();

    return () => {
      if (viewMode === "docs") {
        return <StoryDocsFrame class={props.class}>{slots.default?.()}</StoryDocsFrame>;
      }

      return (
        <div
          class="sb-story-frame my-4 flex justify-center p-6 bg-[#333]"
          style={gridBackgroundStyle}
        >
          <div
            class={cn(
              "relative box-border resize overflow-visible rounded-sm bg-white shadow-md max-w-full",
              props.class,
            )}
          >
            {slots.default?.()}
          </div>
        </div>
      );
    };
  },
});

/** Story decorator — prefer this over inline StoryContainer wrappers. */
export function withStoryContainer(className?: string): Decorator {
  return (story) => ({
    render: () => h(StoryContainer, { class: className }, () => h(story())),
  });
}
