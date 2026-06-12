import { StoryContainer } from "@/presentationals/stories/story-container";
import type { ICalendarEvent } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, h, ref } from "vue";
import ScheduleDayView from "../ScheduleDayView.vue";

function createEvent(id: string, hour: number, minute = 0, durationMinutes = 60): ICalendarEvent {
  const startsAt = new Date(`2026-06-10T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00.000Z`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  return {
    id,
    occurrenceId: `${id}:${startsAt.toISOString()}`,
    type: "meeting",
    title: `Event ${id}`,
    description: "Story event",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    payload: {},
  } as ICalendarEvent;
}

const meta = {
  title: "Presentational/Schedule/ScheduleDayView",
  component: ScheduleDayView,
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="w-[980px] h-[640px]">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof ScheduleDayView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ScheduleDayView },
    setup() {
      const day = new Date("2026-06-10T00:00:00.000Z");
      const events = ref<ICalendarEvent[]>([createEvent("a", 9, 30, 90), createEvent("b", 14, 0, 60)]);
      const draftEventId = ref("__none__");
      const hours = Array.from({ length: 24 }, (_, idx) => idx);

      const getEventsAtHour = (date: Date, hour: number) =>
        events.value.filter((event) => {
          const start = new Date(event.startsAt);
          return start.getUTCDate() === date.getUTCDate() && start.getUTCHours() === hour;
        });

      function onRemove(event: ICalendarEvent) {
        events.value = events.value.filter((item) => item.id !== event.id);
      }

      return {
        day,
        hours,
        getEventsAtHour,
        draftEventId,
        isResizing: computed(() => false),
        resizingEventId: computed(() => null),
        resizeType: computed(() => null),
        isCreating: computed(() => false),
        isPanning: computed(() => false),
        panningEventId: computed(() => null),
        onRemove,
      };
    },
    template: `
      <ScheduleDayView
        :day="day"
        :hours="hours"
        :get-events-at-hour="getEventsAtHour"
        :is-resizing="isResizing"
        :resizing-event-id="resizingEventId"
        :resize-type="resizeType"
        :is-creating="isCreating"
        :draft-event-id="draftEventId"
        :is-panning="isPanning"
        :panning-event-id="panningEventId"
        @remove="onRemove"
      />
    `,
  }),
};
