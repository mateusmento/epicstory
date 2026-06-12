import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import IssueDueDateMenu from "../IssueDueDateMenu.vue";

const meta = {
  title: "Presentational/Issue/IssueDueDateMenu",
  component: IssueDueDateMenu,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-fit p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueDueDateMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueDueDateMenu },
    setup() {
      const dueDate = ref<Date | null>(new Date("2026-06-20T00:00:00.000Z"));
      return { dueDate };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueDueDateMenu :due-date="dueDate" @change="dueDate = $event" />
        <div class="text-xs text-muted-foreground">Due date: {{ dueDate ? dueDate.toDateString() : 'none' }}</div>
      </div>
    `,
  }),
};
