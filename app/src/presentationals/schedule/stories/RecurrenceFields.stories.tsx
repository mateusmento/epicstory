import { StoryContainer } from "@/presentationals/stories/story-container";
import type { RecurrenceFrequency } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import RecurrenceFields from "../RecurrenceFields.vue";

const meta = {
  title: "Presentational/Schedule/RecurrenceFields",
  component: RecurrenceFields,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[460px] h-[260px] p-4">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof RecurrenceFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { RecurrenceFields },
    setup() {
      const frequency = ref<RecurrenceFrequency>("weekly");
      const interval = ref(1);
      const byWeekday = ref([1, 3, 5]);
      function toggleWeekday(day: number, enabled: boolean) {
        if (enabled) byWeekday.value = [...new Set([...byWeekday.value, day])];
        else byWeekday.value = byWeekday.value.filter((item) => item !== day);
      }
      return { frequency, interval, byWeekday, toggleWeekday };
    },
    template: `
      <RecurrenceFields
        v-model:frequency="frequency"
        v-model:interval="interval"
        v-model:by-weekday="byWeekday"
        @toggle-weekday="toggleWeekday"
      />
    `,
  }),
};
