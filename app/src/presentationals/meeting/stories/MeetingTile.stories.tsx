import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MeetingTile from "../MeetingTile.vue";
import { storyMeetingParticipants } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Meeting/MeetingTile",
  component: MeetingTile,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[320px] h-[220px] p-4 bg-black"><story /></div>' })],
} satisfies Meta<typeof MeetingTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GridTile: Story = {
  render: () => ({
    components: { MeetingTile },
    setup() {
      const pinned = ref(false);
      return { pinned, participant: storyMeetingParticipants[0]! };
    },
    template: `
      <MeetingTile
        tile-role="grid"
        variant="grid"
        class="w-full h-full rounded-2xl"
        :participant="participant"
        :pinned="pinned"
        title="Toggle pin"
        @click="pinned = !pinned"
      />
    `,
  }),
};

export const FeaturedTile: Story = {
  args: {
    tileRole: "featured",
    variant: "featured",
    participant: storyMeetingParticipants[1],
    class: "w-full h-full rounded-2xl",
    speaking: true,
  },
};

export const CameraOff: Story = {
  args: {
    tileRole: "dock",
    variant: "dock",
    participant: {
      ...storyMeetingParticipants[2],
      isCameraOn: false,
      isMicrophoneOn: false,
    },
    class: "w-full h-full rounded-2xl",
  },
};
