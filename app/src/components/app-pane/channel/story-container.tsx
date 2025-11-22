import { cn } from "@/design-system/utils";
import { defineComponent } from "vue";

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
    return () => (
      <div
        class="relative m-0 p-0 w-full h-screen bg-[#333]"
        style="
          background-image:
              linear-gradient(rgba(0, 255, 0, .7) .1em, transparent .1em),
              linear-gradient(90deg, rgba(0, 255, 0, .7) .1em, transparent .1em);
          background-size: 3em 3em;
        "
      >
        <div
          class={cn(
            "p-4 resize box-border overflow-hidden bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            props.class,
          )}
        >
          {slots.default?.()}
        </div>
      </div>
    );
  },
});
