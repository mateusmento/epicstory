import { StoryContainer } from "@/presentationals/stories/story-container";
import type { ICalendarEvent } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ScheduleWeekView from "../ScheduleWeekView.vue";

function buildEvent(id: string, date: string, hour: number): ICalendarEvent {
  const startsAt = new Date(`${date}T${hour.toString().padStart(2, "0")}:00:00.000Z`);
  return {
    id,
    occurrenceId: `${id}:${startsAt.toISOString()}`,
    type: "task",
    title: `Slot ${id}`,
    description: "Weekly slot",
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 45 * 60 * 1000).toISOString(),
    payload: {},
  } as ICalendarEvent;
}

const meta = {
  title: "Presentational/Schedule/ScheduleWeekView",
  component: ScheduleWeekView,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[980px] h-[640px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ScheduleWeekView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ScheduleWeekView },
    setup() {
      const weekDays = [
        new Date("2026-06-08T00:00:00.000Z"),
        new Date("2026-06-09T00:00:00.000Z"),
        new Date("2026-06-10T00:00:00.000Z"),
        new Date("2026-06-11T00:00:00.000Z"),
        new Date("2026-06-12T00:00:00.000Z"),
      ];
      const events = ref<ICalendarEvent[]>([
        buildEvent("wk1", "2026-06-09", 10),
        buildEvent("wk2", "2026-06-10", 13),
        buildEvent("wk3", "2026-06-12", 16),
      ]);
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const getEventsAtHour = (date: Date, hour: number) =>
        events.value.filter((event) => {
          const d = new Date(event.startsAt);
          return d.getUTCDate() === date.getUTCDate() && d.getUTCHours() === hour;
        });
      return {
        weekDays,
        hours,
        getEventsAtHour,
      };
    },
    template: `
      <ScheduleWeekView
        :week-days="weekDays"
        :hours="hours"
        :get-events-at-hour="getEventsAtHour"
        :is-resizing="false"
        :resizing-event-id="null"
        :resize-type="null"
        :is-creating="false"
        draft-event-id="none"
        :is-panning="false"
        :panning-event-id="null"
      />
    `,
  }),
};
