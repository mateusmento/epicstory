import type { Meta, StoryObj } from "@storybook/vue3";
import GanttGrid from "../GanttGrid.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttChartTimeline from "../GanttChartTimeline.vue";

const meta = {
  title: "Design System/Gantt/GanttGrid",
  tags: ["autodocs"],
  component: GanttGrid,
} satisfies Meta<typeof GanttGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WeekZoom: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttGrid },
    template: `
      <div class="h-[300px] w-[700px] border border-border">
        <GanttStoryProvider zoom="week">
          <GanttChartTimeline><GanttGrid /></GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
