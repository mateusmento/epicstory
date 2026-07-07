import type { Meta, StoryObj } from "@storybook/vue3";
import GanttCursorLine from "../GanttCursorLine.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttChartTimeline from "../GanttChartTimeline.vue";

const meta = {
  title: "Design System/Gantt/GanttCursorLine",
  tags: ["autodocs"],
  component: GanttCursorLine,
} satisfies Meta<typeof GanttCursorLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AtCursor: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttCursorLine },
    template: `
      <div class="h-[300px] w-[700px] border border-border">
        <GanttStoryProvider>
          <GanttChartTimeline><GanttCursorLine /></GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
