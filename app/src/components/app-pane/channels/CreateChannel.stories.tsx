import type { Meta, StoryObj } from "@storybook/vue3";
import CreateChannel from "./CreateChannel.vue";
import { StoryContainer } from "../channel/story-container";
import { h } from "vue";

const meta = {
  title: "Components/CreateChannel",
  component: CreateChannel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
        cellAmount: 5,
        offsetX: 16, // Default is 0 if story has 'fullscreen' layout, 16 if layout is 'padded'
        offsetY: 16, // Default is 0 if story has 'fullscreen' layout, 16 if layout is 'padded'
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
