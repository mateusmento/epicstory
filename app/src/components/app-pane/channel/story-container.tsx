import type { FunctionalComponent as FC } from "vue";

export const StoryContainer: FC = (props, { slots }) => {
  return (
    <div
      class="relative m-0 p-0 w-full h-screen bg-[#333]"
      style="
        background-image:
            linear-gradient(rgba(0, 255, 0, .7) .1em, transparent .1em),
            linear-gradient(90deg, rgba(0, 255, 0, .7) .1em, transparent .1em);
        background-size: 3em 3em;
      "
    >
      <div class="p-4 w-96 resize box-border overflow-hidden bg-white absolute top-40 left-1/2 -translate-x-1/2">
        {slots.default?.()}
      </div>
    </div>
  );
};
