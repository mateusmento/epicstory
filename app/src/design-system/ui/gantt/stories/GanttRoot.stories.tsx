import type { Meta, StoryObj } from "@storybook/vue3";
import { GanttRoot, GanttStoryProvider } from "../index";

const Frame = {
  template: `
    <div class="h-[640px] w-[980px] overflow-hidden rounded-xl border border-border bg-background">
      <slot />
    </div>
  `,
};

const meta = {
  title: "Design System/Gantt/GanttRoot",
  tags: ["autodocs"],
  component: GanttRoot,
  decorators: [(story) => ({ components: { Frame }, template: "<Frame><story /></Frame>" })],
} satisfies Meta<typeof GanttRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttRoot },
    template: `
      <GanttStoryProvider>
        <GanttRoot />
      </GanttStoryProvider>
    `,
  }),
};

export const WithDependencies: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttRoot },
    template: `
      <GanttStoryProvider>
        <GanttRoot />
      </GanttStoryProvider>
    `,
  }),
};

export const CustomItemLabel: Story = {
  render: () => ({
    components: { GanttStoryProvider, GanttRoot },
    template: `
      <GanttStoryProvider>
        <GanttRoot>
          <template #item-label="{ item }">
            <span class="font-mono text-xs text-muted-foreground">{{ item.id }}</span>
            <span class="ml-2 truncate">{{ item.label }}</span>
          </template>
        </GanttRoot>
      </GanttStoryProvider>
    `,
  }),
};
