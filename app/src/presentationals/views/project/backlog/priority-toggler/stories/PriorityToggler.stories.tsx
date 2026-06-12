import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import PriorityToggler from "../PriorityToggler.vue";

const meta = {
  title: "Presentational/Views/Issue/PriorityToggler",
  component: PriorityToggler,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[280px] p-6">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof PriorityToggler>;

export default meta;
type Story = StoryObj<typeof meta>;

function variant(value: number): Story {
  return {
    render: () => ({
      components: { PriorityToggler },
      setup() {
        const model = ref(value);
        return { model };
      },
      template: `<PriorityToggler v-model:value="model" />`,
    }),
  };
}

export const Signal1Bar = variant(1);
export const Signal2Bars = variant(2);
export const Signal3Bars = variant(3);
export const Urgent = variant(4);
