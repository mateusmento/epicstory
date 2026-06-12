import { StoryContainer } from "@/presentationals/stories/story-container";
import type { ICalendarEvent } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import CalendarEventContextMenu from "../CalendarEventContextMenu.vue";

const eventItem = {
  id: "meeting-1",
  occurrenceId: "meeting-1:2026-06-10T15:00:00.000Z",
  type: "meeting",
  title: "Sprint planning",
  startsAt: "2026-06-10T15:00:00.000Z",
  endsAt: "2026-06-10T16:00:00.000Z",
  payload: { meetingId: "abc123" },
} as ICalendarEvent;

const meta = {
  title: "Presentational/Schedule/CalendarEventContextMenu",
  component: CalendarEventContextMenu,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[220px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof CalendarEventContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { CalendarEventContextMenu },
    setup() {
      const removed = ref(false);
      return { eventItem, removed };
    },
    template: `
      <div class="p-6">
        <CalendarEventContextMenu
          :event="eventItem"
          @remove="removed = true"
          @edit="removed = false"
          @open-lobby="removed = false"
        >
          <div class="rounded border p-3 text-sm cursor-context-menu">
            Right click this block
          </div>
        </CalendarEventContextMenu>
        <p class="mt-2 text-xs text-muted-foreground">Removed: {{ removed ? "yes" : "no" }}</p>
      </div>
    `,
  }),
};
