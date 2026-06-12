import LiveMeetingJoinCard from "../LiveMeetingJoinCard.vue";
import { storyUsers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";

const meta = {
  title: "Presentational/Navbar/LiveMeetingJoinCard",
  component: LiveMeetingJoinCard,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div class="w-72 p-4"><story /></div>',
    }),
  ],
} satisfies Meta<typeof LiveMeetingJoinCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { LiveMeetingJoinCard },
    setup() {
      const joined = ref(false);
      return {
        title: "Sprint planning",
        people: [storyUsers.sean, storyUsers.daiana, storyUsers.jean],
        joined,
        onJoin: () => {
          joined.value = true;
        },
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <LiveMeetingJoinCard
          :title="title"
          :people="people"
          @join="onJoin"
        />
        <span v-if="joined" class="text-xs text-green-600">Joined meeting</span>
      </div>
    `,
  }),
};

export const SingleParticipant: Story = {
  args: {
    title: "Quick sync",
    people: [storyUsers.daiana],
  },
};

export const ManyParticipants: Story = {
  args: {
    title: "All-hands",
    people: [
      storyUsers.sean,
      storyUsers.daiana,
      storyUsers.jean,
      { id: 4, name: "Pat", picture: storyUsers.sean.picture },
      { id: 5, name: "Sam", picture: undefined },
    ],
  },
};
