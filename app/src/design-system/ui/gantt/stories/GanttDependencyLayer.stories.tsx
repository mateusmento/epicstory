import type { Meta, StoryObj } from "@storybook/vue3";
import GanttDependencyLayer from "../GanttDependencyLayer.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttChartTimeline from "../GanttChartTimeline.vue";

const meta = {
  title: "Design System/Gantt/GanttDependencyLayer",
  tags: ["autodocs"],
  component: GanttDependencyLayer,
} satisfies Meta<typeof GanttDependencyLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommittedLinks: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttDependencyLayer },
    template: `
      <div class="h-[300px] w-[700px] border border-border">
        <GanttStoryProvider>
          <GanttChartTimeline><GanttDependencyLayer /></GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
