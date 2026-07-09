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
    ],
    size: "md",
    mode: "fill",
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

export const JoinMeetingButton: Story = {
  name: "Join meeting button (auto)",
  render: (args) => ({
    components: { UserAvatarStack },
    setup() {
      return {
        args: {
          ...args,
          users: storyStackUsers.slice(0, 2),
          size: "base",
          min: 1,
          avatarClass: "ring-2 ring-background",
        },
      };
    },
    template: `
      <button type="button" class="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
        <UserAvatarStack v-bind="args" class="shrink-0" />
        Join meeting
      </button>
    `,
  }),
};

export const CappedFit: Story = {
  name: "Capped auto (max-w-20)",
  args: {
    users: storyStackUsers,
    size: "md",
    mode: "auto",
  },
  decorators: [
    () => ({
      template: '<div class="max-w-20 p-4"><story /></div>',
    }),
  ],
};

export const MeetingNavbarCenter: Story = {
  args: {
    users: storyStackUsers,
    size: "3xl",
    variant: "meetingNavbar",
    center: true,
    overlapPx: 12,
  },
  decorators: [
    () => ({
      template: '<div class="w-48 p-4 bg-muted rounded"><story /></div>',
    }),
  ],
};
