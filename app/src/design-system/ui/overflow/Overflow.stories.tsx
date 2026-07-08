import type { Meta, StoryObj } from "@storybook/vue3";
import BreadcrumbEllipsis from "../breadcrumb/BreadcrumbEllipsis.vue";
import { OverflowContainer, OverflowEllipsis, OverflowItem } from "./index";

const sampleTags = ["Prototype", "Improvement", "Infrastructure & Improvement", "Decision"];

const labelTags = [
  { id: 1, name: "Epic", color: "#a855f7" },
  { id: 2, name: "Feature", color: "#3b82f6" },
  { id: 3, name: "Non-Functional", color: "#f97316" },
  { id: 4, name: "Refactor", color: "#22c55e" },
  { id: 5, name: "User Story", color: "#06b6d4" },
  { id: 6, name: "Bug", color: "#ef4444" },
];

function pillClass(extra = "") {
  return `rounded-full border border-border bg-card px-2 py-0.5 text-xs text-secondary-foreground capitalize ${extra}`.trim();
}

function labelPillClass() {
  return "flex max-w-full items-center gap-2 rounded-full border bg-card px-2 py-0.5 text-xs";
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

const OVERFLOW_DOCS = `
## Overview

\`OverflowContainer\` measures a horizontal row and decides which child segments stay visible when space is tight. Pair it with \`OverflowItem\` (one per chip/button) and \`OverflowEllipsis\` (the overflow affordance — \`+N\`, \`⋯\`, or a menu trigger).

The container owns **width measurement** and **collapse layout**. Consumers only declare segment order, optional \`segment-key\`, and \`pinned\`.

## Building blocks

| Piece | Role |
| --- | --- |
| \`OverflowContainer\` | Measures available width, runs layout, provides context |
| \`OverflowItem\` | One visible segment; use \`segment-key\` when the ellipsis menu needs stable ids |
| \`OverflowEllipsis\` | Slot for the overflow control; exposes \`collapsed\`, \`hiddenCount\`, \`hiddenSegmentKeys\` |

**Always mount** the ellipsis trigger (use \`v-show\` / empty menu when not collapsed) so its width is measurable on first paint.

## Collapse order (ellipsis placement)

Layout hides items **adjacent to the ellipsis first**, then works outward:

| Ellipsis position | What collapses first | Typical use |
| --- | --- | --- |
| **Trailing** (last, or nothing after it) | Rightmost items before \`⋯\` | Toolbars, label chips, project tabs |
| **Leading** (first, or nothing before it) | Leftmost items after \`⋯\` | Rare; mirrored trailing behavior |
| **Middle** | Outer edges of each side inward | Breadcrumbs |

Use \`pinned\` on segments that must stay visible (e.g. active tab, link/image/@ in composer, \`+\` add button on label rows).

## Props & integration tips

- \`layoutWidthPx\` — pass a **parent-measured** width when the row sits in a flex slot (e.g. composer toolbar). Avoids the container sizing to its own content.
- \`gap\` — pixel gap between segments (default \`4\`).
- \`min-w-0 max-w-full\` on the container; wrap in \`flex-1 basis-0 overflow-hidden\` when inside a flex footer.
- \`hiddenSegmentKeys\` — map keys back to menu entries for breadcrumb / toolbar overflow menus.

## In the app

- **Breadcrumbs** (\`Project.vue\`) — middle ellipsis + \`hiddenSegmentKeys\` menu
- **Issue label chips** (\`IssueLabelTags.vue\`) — trailing \`+N\`, pinned \`+\` add control
- **Message composer toolbar** (\`MessageComposerActions.vue\`) — trailing \`⋯\` menu, pinned inserts
- **Project team tabs** (\`ProjectTeamTabBar.vue\`) — trailing \`⋯\` + pinned “More” for remote tabs

Drag the dashed frame in the stories below to see collapse behavior at different widths.
`;

const meta = {
  title: "Design System/Overflow",
  tags: ["autodocs"],
  component: OverflowContainer,
  parameters: {
    docs: {
      description: {
        component: OVERFLOW_DOCS,
      },
    },
  },
  args: {
    gap: 4,
  },
} satisfies Meta<typeof OverflowContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Recommended default: items first, ellipsis last. Hides rightmost items before ⋯. */
export const TrailingEllipsis: Story = {
  name: "Trailing ellipsis (recommended)",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <ResizableFrame width="220px">
        <OverflowContainer v-bind="args" class="min-w-0 max-w-full">
          <OverflowItem v-for="tag in sampleTags" :key="tag" :segment-key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span
              v-if="collapsed"
              class="rounded-full px-2 py-0.5 text-xs text-muted-foreground"
              :title="'+' + hiddenCount + ' more'"
            >
              +{{ hiddenCount }}
            </span>
          </OverflowEllipsis>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

/** Issue backlog label row: chips, +N overflow, pinned + add button (see IssueLabelTags.vue). */
export const LabelChipsWithPinnedAdd: Story = {
  name: "Label chips + pinned add",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      return { args, labelTags, labelPillClass };
    },
    template: `
      <ResizableFrame width="340px">
        <OverflowContainer v-bind="args" class="min-w-0 max-w-full">
          <OverflowItem
            v-for="label in labelTags"
            :key="label.id"
            :segment-key="String(label.id)"
          >
            <span :class="labelPillClass()">
              <span
                class="h-2 w-2 shrink-0 rounded-full ring-1 ring-border"
                :style="{ backgroundColor: label.color }"
              />
              <span class="max-w-32 truncate capitalize text-secondary-foreground">{{ label.name }}</span>
            </span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span
              v-if="collapsed"
              class="rounded-full px-2 py-0.5 text-xs text-muted-foreground"
              :title="'+' + hiddenCount + ' more'"
            >
              +{{ hiddenCount }}
            </span>
          </OverflowEllipsis>
          <OverflowItem pinned>
            <button
              type="button"
              class="flex items-center gap-2 rounded-full border bg-card p-1 text-xs text-muted-foreground"
              title="Add label"
            >
              +
            </button>
          </OverflowItem>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

export const LayoutModeMiddleEllipsis: Story = {
  name: "Middle ellipsis (breadcrumbs)",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      const before = sampleTags.slice(0, 2);
      const after = sampleTags.slice(2);
      return { args, before, after, pillClass };
    },
    template: `
      <ResizableFrame width="280px">
        <OverflowContainer v-bind="args" class="min-w-0 max-w-full">
          <OverflowItem v-for="tag in before" :key="'before-' + tag" :segment-key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span v-if="collapsed" class="rounded-full px-2 py-0.5 text-xs text-muted-foreground" :title="'+' + hiddenCount + ' more'">
              +{{ hiddenCount }}
            </span>
          </OverflowEllipsis>
          <OverflowItem v-for="tag in after" :key="'after-' + tag" :segment-key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
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
        <OverflowContainer v-bind="args" class="min-w-0 max-w-full">
          <OverflowItem v-for="tag in before" :key="'before-' + tag" :segment-key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ collapsed }">
            <BreadcrumbEllipsis v-if="collapsed" class="size-6 rounded-full border border-border" />
          </OverflowEllipsis>
          <OverflowItem v-for="tag in after" :key="'after-' + tag" :segment-key="tag">
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
        <OverflowContainer v-bind="args" class="min-w-0 max-w-full">
          <OverflowItem v-for="tag in sampleTags" :key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

/** @deprecated Use TrailingEllipsis — kept as alias for older story names. */
export const EllipsisLast = TrailingEllipsis;
