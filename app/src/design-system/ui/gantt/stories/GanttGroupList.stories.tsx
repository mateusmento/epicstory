import type { Meta, StoryObj } from "@storybook/vue3";
import GanttGroupList from "../GanttGroupList.vue";
import GanttStoryProvider from "../GanttStoryProvider.vue";

const meta = {
  title: "Design System/Gantt/GanttGroupList",
  tags: ["autodocs"],
  component: GanttGroupList,
} satisfies Meta<typeof GanttGroupList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttGroupList },
    template: `
      <GanttStoryProvider>
        <div class="h-[320px] w-[320px] border border-border overflow-hidden">
          <GanttGroupList />
        </div>
      </GanttStoryProvider>
    `,
  }),
};
