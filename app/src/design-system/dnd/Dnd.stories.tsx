import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, withDirectives } from "vue";
import { vDraggable, vDropzone } from "./dnd";

const Component = defineComponent({
  setup() {
    return () =>
      withDirectives(
        <div class="flex:rows-lg p-2 w-fit border-2 border-dashed border-zinc-300">
          {withDirectives(<div class="child shown w-96 h-52 flex flex:center bg-zinc-200">Item 1</div>, [
            [vDraggable],
          ])}
          {withDirectives(<div class="child shown w-96 h-52 flex flex:center bg-zinc-200">Item 2</div>, [
            [vDraggable],
          ])}
          {withDirectives(<div class="child shown w-96 h-52 flex flex:center bg-zinc-200">Item 3</div>, [
            [vDraggable],
          ])}
        </div>,
        [[vDropzone]],
      );
  },
});

const meta = {
  title: "Drag and Drop/List Reorder",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
