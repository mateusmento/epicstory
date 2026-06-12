import { StoryContainer } from "@/presentationals/stories/story-container";
import type { ICalendarEvent } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import CalendarTimedEventBlock from "../CalendarTimedEventBlock.vue";

const baseEvent = {
  id: "event-1",
  occurrenceId: "event-1:2026-06-10T10:15:00.000Z",
  type: "meeting",
  title: "Design review",
  description: "Align priorities",
  startsAt: "2026-06-10T10:15:00.000Z",
  endsAt: "2026-06-10T11:00:00.000Z",
  payload: {},
} as ICalendarEvent;

const meta = {
  title: "Presentational/Schedule/CalendarTimedEventBlock",
  component: CalendarTimedEventBlock,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[500px] h-[260px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof CalendarTimedEventBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    event: baseEvent,
    minHeightPx: 24,
    isResizing: false,
    resizingEventId: null,
    resizeType: null,
    isPanning: false,
    panningEventId: null,
  },
};

export const Draft: Story = {
  args: {
    ...Default.args,
    draft: true,
  },
};
