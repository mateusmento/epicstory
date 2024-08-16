import type { Meta, StoryObj } from "@storybook/vue3";
import { messageGroup } from "./message-groups.data";
import MessageBox from "./MessageBox.vue";
import MessageGroup from "./MessageGroup.vue";

const meta = {
  title: "Design System/Channel/MessageGroup",
  component: MessageGroup,
} satisfies Meta<typeof MessageGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sender: "me",
    messageGroup: messageGroup,
  },
  render: (props) => (
    <MessageGroup {...props}>
      {messageGroup.messages.map((message) => (
        <MessageBox messageContent={message.content} />
      ))}
    </MessageGroup>
  ),
};
