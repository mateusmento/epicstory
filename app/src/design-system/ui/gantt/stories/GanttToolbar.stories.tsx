import type { Meta, StoryObj } from "@storybook/vue3";
import GanttToolbar from "../GanttToolbar.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";

const meta = {
  title: "Design System/Gantt/GanttToolbar",
  tags: ["autodocs"],
  component: GanttToolbar,
} satisfies Meta<typeof GanttToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttToolbar },
    template: `<GanttStoryProvider><GanttToolbar /></GanttStoryProvider>`,
  }),
};
