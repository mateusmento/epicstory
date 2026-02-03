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
    sender: messageGroup.value.sender,
    meId: messageGroup.value.senderId,
    sentAt: messageGroup.value.sentAt,
  },
  render: (props) => (
    <MessageGroup {...props}>
      {messageGroup.value.messages.map((message) => (
        <MessageBox meId={props.meId} message={message} />
      ))}
    </MessageGroup>
  ),
};
