import type { ScheduleViewType } from "@/lib/schedule";
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ScheduleToolbar from "../ScheduleToolbar.vue";

const meta = {
  title: "Presentational/Schedule/ScheduleToolbar",
  component: ScheduleToolbar,
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="w-[980px] h-[88px]">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof ScheduleToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ScheduleToolbar },
    setup() {
      const view = ref<ScheduleViewType>("week");
      const date = ref(new Date("2026-06-10T10:00:00.000Z"));

      function updateByDays(days: number) {
        date.value = new Date(date.value.getTime() + days * 24 * 60 * 60 * 1000);
      }

      function headerLabel() {
        return date.value.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }

      return {
        view,
        headerLabel,
        onToday: () => (date.value = new Date("2026-06-10T10:00:00.000Z")),
        onPrev: () => updateByDays(view.value === "day" ? -1 : -7),
        onNext: () => updateByDays(view.value === "day" ? 1 : 7),
      };
    },
    template: `
      <ScheduleToolbar
        v-model:view="view"
        :header-label="headerLabel()"
        @today="onToday"
        @prev="onPrev"
        @next="onNext"
        @create="onToday"
      />
    `,
  }),
};
