import { Button } from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import ScheduleMessageCustomDialog from "../ScheduleMessageCustomDialog.vue";

const meta = {
  title: "Presentational/Messages/ScheduleMessageCustomDialog",
  component: ScheduleMessageCustomDialog,
  tags: ["autodocs"],
} satisfies Meta<typeof ScheduleMessageCustomDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenDialog: Story = {
  render: () => ({
    components: { ScheduleMessageCustomDialog, Button },
    setup() {
      const open = ref(true);
      const summary = ref("none");
      return { open, summary };
    },
    template: `
      <div class="p-4">
        <Button v-if="!open" variant="outline" @click="open = true">Open custom schedule</Button>
        <ScheduleMessageCustomDialog
          v-model:open="open"
          @confirm="summary = $event.label + ' · ' + $event.recurrence.frequency"
        />
        <p class="mt-2 text-xs text-muted-foreground">Selected schedule: {{ summary }}</p>
      </div>
    `,
  }),
};
