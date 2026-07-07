import type { Meta, StoryObj } from "@storybook/vue3";
import GanttTodayMarker from "../GanttTodayMarker.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttChartTimeline from "../GanttChartTimeline.vue";

const meta = {
  title: "Design System/Gantt/GanttTodayMarker",
  tags: ["autodocs"],
  component: GanttTodayMarker,
} satisfies Meta<typeof GanttTodayMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VisibleInViewport: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttTodayMarker },
    template: `
      <div class="h-[300px] w-[700px] border border-border">
        <GanttStoryProvider>
          <GanttChartTimeline><GanttTodayMarker /></GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
