import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import ChatboxPresenceStrip from "../ChatboxPresenceStrip.vue";

const meta = {
  title: "Presentational/Channel/ChatboxPresenceStrip",
  component: ChatboxPresenceStrip,
  tags: ["autodocs"],
} satisfies Meta<typeof ChatboxPresenceStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    peers: storyDirectChannel.peers,
    meId: storyUsers.jean.id,
    isUserOnline: (userId: number) => userId === storyUsers.daiana.id,
  },
};
