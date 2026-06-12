import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import ChatboxIntro from "../ChatboxIntro.vue";

const meta = {
  title: "Presentational/Channel/ChatboxIntro",
  component: ChatboxIntro,
  tags: ["autodocs"],
} satisfies Meta<typeof ChatboxIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    peers: storyDirectChannel.peers,
    meId: storyUsers.jean.id,
  },
};
