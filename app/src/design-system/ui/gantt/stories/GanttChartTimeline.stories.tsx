import type { Meta, StoryObj } from "@storybook/vue3";
import GanttChartTimeline from "../GanttChartTimeline.vue";
import GanttDependencyLayer from "../GanttDependencyLayer.vue";
import GanttGrid from "../GanttGrid.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttTodayMarker from "../GanttTodayMarker.vue";

const meta = {
  title: "Design System/Gantt/GanttChartTimeline",
  tags: ["autodocs"],
  component: GanttChartTimeline,
} satisfies Meta<typeof GanttChartTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultLayers: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttGrid, GanttTodayMarker, GanttDependencyLayer },
    template: `
      <div class="h-[400px] w-[800px] border border-border">
        <GanttStoryProvider>
          <GanttChartTimeline>
            <GanttGrid />
            <GanttTodayMarker />
            <GanttDependencyLayer />
          </GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
