import { Button } from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import ScheduleMessageDropdown from "../ScheduleMessageDropdown.vue";

const meta = {
  title: "Presentational/Messages/ScheduleMessageDropdown",
  component: ScheduleMessageDropdown,
  tags: ["autodocs"],
} satisfies Meta<typeof ScheduleMessageDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ScheduleMessageDropdown, Button },
    setup() {
      const activeSchedule = ref(null);
      const customOpenRequestCount = ref(0);
      return { activeSchedule, customOpenRequestCount };
    },
    template: `
      <div class="p-4">
        <ScheduleMessageDropdown
          v-model:active-schedule="activeSchedule"
          @open-custom-schedule-dialog="customOpenRequestCount += 1"
        >
          <Button variant="outline">Open schedule presets</Button>
        </ScheduleMessageDropdown>
        <p class="mt-2 text-xs text-muted-foreground">
          Active: {{ activeSchedule ? activeSchedule.label : "none" }} · custom dialog requests: {{ customOpenRequestCount }}
        </p>
      </div>
    `,
  }),
};
