import type { Meta, StoryObj } from "@storybook/vue3";
import Chatbox from "./Chatbox.vue";
import { messageGroups } from "./message-groups.data";
import daianaPhoto from "@/assets/images/daiana.png";

const meta = {
  title: "Design System/Channel/Chatbox",
  component: Chatbox,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Chatbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    meId: 2,
    chatTitle: "Daiana",
    chatPicture: daianaPhoto,
    messageGroups,
  },
};
