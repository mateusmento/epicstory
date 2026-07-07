import type { Meta, StoryObj } from "@storybook/vue3";
import GanttBar from "../GanttBar.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttChartTimeline from "../GanttChartTimeline.vue";

const meta = {
  title: "Design System/Gantt/GanttBar",
  tags: ["autodocs"],
  component: GanttBar,
} satisfies Meta<typeof GanttBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttBar },
    template: `
      <div class="h-[300px] w-[700px] border border-border">
        <GanttStoryProvider>
          <GanttChartTimeline>
            <GanttBar item-id="e1" />
          </GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
