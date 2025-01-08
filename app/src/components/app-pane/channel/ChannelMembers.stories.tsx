import daiana from "@/assets/images/daiana.png";
import sean from "@/assets/images/sean.png";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import ChannelMembers from "./ChannelMembers.vue";
import { StoryContainer } from "./story-container";

const meta = {
  title: "Components/ChannelMembers",
  component: ChannelMembers,
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
} satisfies Meta<typeof ChannelMembers>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    users: [{ id: 1, name: "Sean", picture: sean, email: "sean@gmail.com" }],
    members: [
      { id: 1, name: "Sean", picture: sean, email: "sean@gmail.com", role: "admin" },
      { id: 1, name: "Daiana", picture: daiana, email: "daiana@gmail.com", role: "member", online: true },
    ],
  },
};
