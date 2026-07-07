import type { Meta, StoryObj } from "@storybook/vue3";
import GanttBarPreview from "../GanttBarPreview.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";
import GanttChartTimeline from "../GanttChartTimeline.vue";

const meta = {
  title: "Design System/Gantt/GanttBarPreview",
  tags: ["autodocs"],
  component: GanttBarPreview,
} satisfies Meta<typeof GanttBarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Drawing: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttChartTimeline, GanttBarPreview },
    template: `
      <div class="h-[300px] w-[700px] border border-border">
        <GanttStoryProvider>
          <GanttChartTimeline><GanttBarPreview /></GanttChartTimeline>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
