import type { Meta, StoryObj } from "@storybook/vue3";
import ChannelDetailsPaneTemplate from "./ChannelDetailsPaneTemplate.vue";
import sean from "@/assets/images/sean.png";
import daiana from "@/assets/images/daiana.png";
import { h } from "vue";
import { StoryContainer } from "./story-container";

const meta = {
  title: "Components/ChannelDetailsPaneTemplate",
  component: ChannelDetailsPaneTemplate,
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
      render: () => <StoryContainer class="w-96">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof ChannelDetailsPaneTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    users: [{ id: 1, name: "Sean", picture: sean, email: "sean@gmail.com" }],
    members: [
      { id: 1, name: "Sean", picture: sean, email: "sean@gmail.com", role: "admin" },
      { id: 1, name: "Daiana", picture: daiana, email: "daiana@gmail.com", role: "member" },
    ],
  },
};
