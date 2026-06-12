import seanPhoto from "@/assets/images/sean.png";
import UserAvatar from "../UserAvatar.vue";
import { storyUsers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";

const meta = {
  title: "Presentational/User/UserAvatar",
  component: UserAvatar,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "tile"],
    },
    variant: {
      control: "select",
      options: ["default", "meetingDark", "meetingNavbar", "mentionRow", "liveJoin"],
    },
  },
} satisfies Meta<typeof UserAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithPicture: Story = {
  args: {
    name: storyUsers.sean.name,
    picture: storyUsers.sean.picture,
    size: "lg",
  },
};

export const InitialsFallback: Story = {
  args: {
    name: "Alex Morgan",
    picture: null,
    size: "lg",
  },
};

export const ImageError: Story = {
  args: {
    name: storyUsers.sean.name,
    picture: "https://invalid.example/avatar.png",
    size: "lg",
  },
  render: (args) => ({
    components: { UserAvatar },
    setup() {
      const errored = ref(false);
      return {
        args,
        errored,
        onError: () => {
          errored.value = true;
        },
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <UserAvatar v-bind="args" @error="onError" />
        <span v-if="errored" class="text-xs text-muted-foreground">Image failed — showing initials</span>
      </div>
    `,
  }),
};

export const LiveJoinVariant: Story = {
  args: {
    name: storyUsers.daiana.name,
    picture: storyUsers.daiana.picture,
    size: "md",
    variant: "liveJoin",
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { UserAvatar },
    setup: () => ({ seanPhoto, name: storyUsers.sean.name }),
    template: `
      <div class="flex items-end gap-3 p-4">
        <UserAvatar :name="name" :picture="seanPhoto" size="xs" />
        <UserAvatar :name="name" :picture="seanPhoto" size="sm" />
        <UserAvatar :name="name" :picture="seanPhoto" size="md" />
        <UserAvatar :name="name" :picture="seanPhoto" size="base" />
        <UserAvatar :name="name" :picture="seanPhoto" size="lg" />
        <UserAvatar :name="name" :picture="seanPhoto" size="xl" />
      </div>
    `,
  }),
};
