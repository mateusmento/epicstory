import type { Meta, StoryObj } from "@storybook/vue3";
import MessageGroup from "./MessageGroup.vue";
import messageGroupsData from "./message-groups.data";

const meta = {
  title: "Design System/Channel/MessageGroup",
  component: MessageGroup,
} satisfies Meta<typeof MessageGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    meId: 2,
    messageGroup: messageGroupsData.messageGroups[0],
  },
};
