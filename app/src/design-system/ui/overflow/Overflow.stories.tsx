import type { Meta, StoryObj } from "@storybook/vue3";
import BreadcrumbEllipsis from "../breadcrumb/BreadcrumbEllipsis.vue";
import { OverflowContainer, OverflowEllipsis, OverflowItem } from "./index";

const sampleTags = ["Prototype", "Improvement", "Infrastructure & Improvement", "Decision"];

function pillClass(extra = "") {
  return `rounded-full border border-border bg-card px-2 py-0.5 text-xs text-secondary-foreground capitalize ${extra}`.trim();
}

const ResizableFrame = {
  props: {
    width: { type: String, default: "320px" },
  },
  template: `
    <div class="max-w-full rounded-2xl border border-border bg-muted/30 p-4">
      <div
        class="overflow-hidden rounded-3xl border border-dashed border-border bg-background p-2"
        :style="{ width, resize: 'horizontal' }"
      >
        <slot />
      </div>
    </div>
  `,
};

const meta = {
  title: "Design System/Overflow",
  tags: ["autodocs"],
  component: OverflowContainer,
  args: {
    gap: 4,
  },
} satisfies Meta<typeof OverflowContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LayoutModeMiddleEllipsis: Story = {
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      const before = sampleTags.slice(0, 2);
      const after = sampleTags.slice(2);
      return { args, before, after, pillClass };
    },
    template: `
      <ResizableFrame width="280px">
        <OverflowContainer v-bind="args" class="min-w-0">
          <OverflowItem v-for="tag in before" :key="'before-' + tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span v-if="collapsed" class="rounded-full px-2 py-0.5 text-xs text-muted-foreground" :title="'+' + hiddenCount + ' more'">
              +{{ hiddenCount }}
            </span>
          </OverflowEllipsis>
          <OverflowItem v-for="tag in after" :key="'after-' + tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

export const EllipsisLast: Story = {
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <ResizableFrame width="220px">
        <OverflowContainer v-bind="args" class="min-w-0">
          <OverflowItem v-for="tag in sampleTags" :key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span v-if="collapsed" class="rounded-full px-2 py-0.5 text-xs text-muted-foreground" :title="'+' + hiddenCount + ' more'">
              +{{ hiddenCount }}
            </span>
          </OverflowEllipsis>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

export const IconEllipsis: Story = {
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame, BreadcrumbEllipsis },
    setup() {
      const before = sampleTags.slice(0, 1);
      const after = sampleTags.slice(1);
      return { args, before, after, pillClass };
    },
    template: `
      <ResizableFrame width="240px">
        <OverflowContainer v-bind="args" class="min-w-0">
          <OverflowItem v-for="tag in before" :key="'before-' + tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ collapsed }">
            <BreadcrumbEllipsis v-if="collapsed" class="size-6 rounded-full border border-border" />
          </OverflowEllipsis>
          <OverflowItem v-for="tag in after" :key="'after-' + tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

export const MeasureModePrototype: Story = {
  name: "Measure Mode (overlap prototype)",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, ResizableFrame },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <ResizableFrame width="260px">
        <p class="mb-2 text-xs text-muted-foreground">Drag the frame corner to resize. Overlap styling mirrors the flex-shrink prototype.</p>
        <OverflowContainer v-bind="args" class="min-w-0 rounded-3xl">
          <OverflowItem v-for="(tag, index) in sampleTags" :key="tag" :class="index === sampleTags.length - 1 ? 'shrink-[0.000001]' : index === 0 ? 'shrink-[0.000001]' : 'shrink'">
            <span :class="pillClass('border-[#888]')">{{ tag }}</span>
          </OverflowItem>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

export const WithoutEllipsis: Story = {
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, ResizableFrame },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <ResizableFrame width="180px">
        <OverflowContainer v-bind="args" class="min-w-0">
          <OverflowItem v-for="tag in sampleTags" :key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};
