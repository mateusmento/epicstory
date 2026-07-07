import type { Meta, StoryObj } from "@storybook/vue3";
import GanttHeader from "../GanttHeader.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";

const meta = {
  title: "Design System/Gantt/GanttHeader",
  tags: ["autodocs"],
  component: GanttHeader,
  parameters: { docs: { description: { component: "Internal — use GanttChartTimeline in app code." } } },
} satisfies Meta<typeof GanttHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WeekTicks: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttHeader },
    template: `<GanttStoryProvider zoom="week"><GanttHeader /></GanttStoryProvider>`,
  }),
};
