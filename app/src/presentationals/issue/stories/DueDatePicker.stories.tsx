import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import DueDatePicker from "../due-date-picker/DueDatePicker.vue";

const meta = {
  title: "Presentational/Issue/DueDatePicker",
  component: DueDatePicker,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[260px] p-6">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof DueDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { DueDatePicker },
    setup() {
      const value = ref<Date | undefined>(new Date("2026-06-15T00:00:00.000Z"));
      return { value };
    },
    template: `<DueDatePicker v-model="value" />`,
  }),
};
