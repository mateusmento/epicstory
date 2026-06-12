import { withStoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { MeetingRoomHarness } from "./MeetingRoom.harness";

const meta = {
  title: "Product/Hero/MeetingRoom",
  component: MeetingRoomHarness,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[960px] min-h-[640px]")],
} satisfies Meta<typeof MeetingRoomHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderHarness() {
  return {
    components: { MeetingRoomHarness },
    template: "<MeetingRoomHarness />",
  };
}

export const Default: Story = {
  render: () => renderHarness(),
};

export const SpeakerMode: Story = {
  render: () => renderHarness(),
};

export const Interactive: Story = {
  render: () => renderHarness(),
};
