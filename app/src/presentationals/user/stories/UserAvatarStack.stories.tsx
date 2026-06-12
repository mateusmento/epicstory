import UserAvatarStack from "../UserAvatarStack.vue";
import { storyStackUsers, storyUsers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Presentational/User/UserAvatarStack",
  component: UserAvatarStack,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div class="w-48 p-4"><story /></div>',
    }),
  ],
} satisfies Meta<typeof UserAvatarStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    users: storyStackUsers,
    size: "md",
  },
};

export const Overflow: Story = {
  args: {
    users: [
      storyUsers.sean,
      storyUsers.daiana,
      storyUsers.jean,
      { id: 4, name: "Pat", picture: storyUsers.sean.picture },
      { id: 5, name: "Sam", picture: storyUsers.daiana.picture },
      { id: 6, name: "Riley", picture: undefined },
    ],
    size: "md",
  },
  decorators: [
    () => ({
      template: '<div class="w-24 p-4"><story /></div>',
    }),
  ],
};

export const SingleUser: Story = {
  args: {
    users: [storyUsers.sean],
    size: "base",
  },
};

export const MeetingNavbarVariant: Story = {
  args: {
    users: storyStackUsers.slice(0, 2),
    size: "mdLg",
    variant: "meetingNavbar",
    avatarClass: "-ml-2 border-2 border-background",
  },
  decorators: [
    () => ({
      template: '<div class="w-32 p-4 bg-muted rounded"><story /></div>',
    }),
  ],
};
