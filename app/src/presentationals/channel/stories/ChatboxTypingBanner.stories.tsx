import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import ChatboxTypingBanner from "../ChatboxTypingBanner.vue";

const meta = {
  title: "Presentational/Channel/ChatboxTypingBanner",
  component: ChatboxTypingBanner,
  tags: ["autodocs"],
} satisfies Meta<typeof ChatboxTypingBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneUserTyping: Story = {
  args: {
    typingUserIds: [storyUsers.daiana.id],
    peers: storyDirectChannel.peers,
    meId: storyUsers.jean.id,
  },
};

export const MultipleUsersTyping: Story = {
  args: {
    typingUserIds: [storyUsers.sean.id, storyUsers.daiana.id],
    peers: [storyUsers.sean, storyUsers.daiana, storyUsers.jean],
    meId: storyUsers.jean.id,
  },
};
