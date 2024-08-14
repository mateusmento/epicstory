import type { Meta, StoryObj } from "@storybook/vue3";
import Chatbox from "./Chatbox.vue";
import messageGroupsData from "./message-groups.data";

const meta = {
  title: "Design System/Channel/Chatbox",
  component: Chatbox,
} satisfies Meta<typeof Chatbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    meId: 2,
    messageGroups: messageGroupsData.messageGroups,
  },
};
