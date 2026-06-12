import type { Meta, StoryObj } from "@storybook/vue3";
import CreateChannel from "@/containers/app-pane/channels/CreateChannel.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { h } from "vue";

const meta = {
  title: "Application/Containers/CreateChannel",
  component: CreateChannel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
        cellAmount: 5,
        offsetX: 16,
        offsetY: 16,
      },
    },
  },
  decorators: [
    (story) => ({
      render: () => <StoryContainer>{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof CreateChannel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
