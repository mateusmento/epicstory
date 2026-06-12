import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import Issues from "../Issues.vue";

const meta = {
  title: "Presentational/AppPane/Issues",
  component: Issues,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[520px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof Issues>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
