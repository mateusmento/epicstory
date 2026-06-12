import { StoryContainer } from "@/presentationals/stories/story-container";
import type { ICalendarEvent } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ScheduleMonthView from "../ScheduleMonthView.vue";

function monthEvent(id: string, day: number): ICalendarEvent {
  const startsAt = new Date(`2026-06-${day.toString().padStart(2, "0")}T11:00:00.000Z`);
  return {
    id,
    occurrenceId: `${id}:${startsAt.toISOString()}`,
    type: "meeting",
    title: `Event ${id}`,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000).toISOString(),
    payload: {},
  } as ICalendarEvent;
}

const meta = {
  title: "Presentational/Schedule/ScheduleMonthView",
  component: ScheduleMonthView,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[980px] h-[720px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ScheduleMonthView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ScheduleMonthView },
    setup() {
      const dayEvents = ref<ICalendarEvent[]>([
        monthEvent("m1", 2),
        monthEvent("m2", 2),
        monthEvent("m3", 7),
        monthEvent("m4", 15),
      ]);
      const activeMonthAnchor = new Date("2026-06-01T00:00:00.000Z");
      const gridDays = Array.from({ length: 42 }, (_, index) => {
        const day = new Date("2026-06-01T00:00:00.000Z");
        day.setUTCDate(day.getUTCDate() + index - 1);
        return day;
      });
      const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const getPreviewEvents = (date: Date) =>
        dayEvents.value.filter((event) => new Date(event.startsAt).getUTCDate() === date.getUTCDate()).slice(0, 2);
      const getOverflowCount = (date: Date) =>
        Math.max(
          0,
          dayEvents.value.filter((event) => new Date(event.startsAt).getUTCDate() === date.getUTCDate()).length - 2,
        );
      return { activeMonthAnchor, gridDays, weekdayLabels, getPreviewEvents, getOverflowCount };
    },
    template: `
      <ScheduleMonthView
        :grid-days="gridDays"
        :weekday-labels="weekdayLabels"
        :active-month-anchor="activeMonthAnchor"
        :get-preview-events="getPreviewEvents"
        :get-overflow-count="getOverflowCount"
      />
    `,
  }),
};
