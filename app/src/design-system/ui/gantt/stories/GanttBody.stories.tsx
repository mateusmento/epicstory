import type { Meta, StoryObj } from "@storybook/vue3";
import GanttBody from "../GanttBody.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";

const meta = {
  title: "Design System/Gantt/GanttBody",
  tags: ["autodocs"],
  component: GanttBody,
  parameters: { docs: { description: { component: "Internal — use GanttChartTimeline in app code." } } },
} satisfies Meta<typeof GanttBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSlotContent: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttBody },
    template: `
      <div class="h-[240px] w-[700px] border border-border">
        <GanttStoryProvider>
          <GanttBody>
            <div class="absolute inset-4 rounded border border-dashed border-border text-xs text-muted-foreground flex items-center justify-center">
              Chart layers render here
            </div>
          </GanttBody>
        </GanttStoryProvider>
      </div>
    `,
  }),
};
