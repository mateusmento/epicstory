import type { Meta, StoryObj } from "@storybook/vue3";
import { OverflowContainer, OverflowEllipsis, OverflowItem } from "./index";

const sampleTags = ["Prototype", "Improvement", "Infrastructure & Improvement", "Decision", "Bug", "Feature"];

const longLabels = [
  "Epic with a very long name that should cap",
  "Feature",
  "Refactor",
  "Non-Functional",
  "Bug",
];

function pillClass(extra = "") {
  return `rounded-full border border-border bg-card px-2 py-0.5 text-xs text-secondary-foreground capitalize whitespace-nowrap ${extra}`.trim();
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
  component: OverflowContainer,
  tags: ["autodocs"],
  args: {
    gap: 4,
    mode: "auto",
  },
} satisfies Meta<typeof OverflowContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Acceptance: label row in constrained parent truncates with +N */
export const Fill_LabelRow: Story = {
  name: "AC1 — Fill label row",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <ResizableFrame width="120px">
        <OverflowContainer v-bind="args" class="min-w-0 max-w-full w-full">
          <OverflowItem v-for="tag in sampleTags" :key="tag" :segment-key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span v-if="collapsed" class="rounded-full px-2 py-0.5 text-xs text-muted-foreground">+{{ hiddenCount }}</span>
          </OverflowEllipsis>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

/** Acceptance: w-fit inside inline-flex button shows all chips */
export const Intrinsic_FitButton: Story = {
  name: "AC2 — Intrinsic fit button",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis },
    setup() {
      return { args, sampleTags: sampleTags.slice(0, 3), pillClass };
    },
    template: `
      <button type="button" class="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
        <OverflowContainer v-bind="args" class="w-fit shrink-0">
          <OverflowItem v-for="tag in sampleTags" :key="tag">
            <span :class="pillClass()">{{ tag }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span v-if="collapsed" class="text-xs text-muted-foreground">+{{ hiddenCount }}</span>
          </OverflowEllipsis>
        </OverflowContainer>
        Join meeting
      </button>
    `,
  }),
};

/** Acceptance: w-fit max-w-20 truncates at cap */
export const Auto_CappedFit: Story = {
  name: "AC3 — Auto capped fit",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <OverflowContainer v-bind="args" class="w-fit max-w-20 min-w-0">
        <OverflowItem v-for="tag in sampleTags" :key="tag" :segment-key="tag">
          <span :class="pillClass()">{{ tag }}</span>
        </OverflowItem>
        <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
          <span v-if="collapsed" class="rounded-full px-1 text-xs text-muted-foreground">+{{ hiddenCount }}</span>
        </OverflowEllipsis>
      </OverflowContainer>
    `,
  }),
};

/** Acceptance: flex-1 toolbar truncates when pane narrows */
export const Fill_FlexToolbar: Story = {
  name: "AC4 — Fill flex toolbar",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <ResizableFrame width="160px">
        <div class="flex min-w-0 items-center gap-2">
          <OverflowContainer v-bind="args" class="min-w-0 flex-1 basis-0">
            <OverflowItem v-for="tag in sampleTags" :key="tag">
              <span :class="pillClass()">{{ tag }}</span>
            </OverflowItem>
            <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
              <span v-if="collapsed" class="text-xs text-muted-foreground">+{{ hiddenCount }}</span>
            </OverflowEllipsis>
          </OverflowContainer>
          <span class="shrink-0 text-xs text-muted-foreground">Send</span>
        </div>
      </ResizableFrame>
    `,
  }),
};

/** Acceptance: fixed w-60 truncates at 240px */
export const Fill_FixedWidth: Story = {
  name: "AC5 — Fill fixed width",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis },
    setup() {
      return { args, sampleTags, pillClass };
    },
    template: `
      <OverflowContainer v-bind="args" class="w-60 min-w-0">
        <OverflowItem v-for="tag in sampleTags" :key="tag">
          <span :class="pillClass()">{{ tag }}</span>
        </OverflowItem>
        <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
          <span v-if="collapsed" class="text-xs text-muted-foreground">+{{ hiddenCount }}</span>
        </OverflowEllipsis>
      </OverflowContainer>
    `,
  }),
};

/** Acceptance: item maxWidthPx caps segment in layout math */
export const ItemMaxWidth: Story = {
  name: "AC6 — Item max width",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      return { args, longLabels, pillClass };
    },
    template: `
      <ResizableFrame width="200px">
        <OverflowContainer v-bind="args" class="min-w-0 w-full">
          <OverflowItem
            v-for="(label, i) in longLabels"
            :key="i"
            :max-width-px="128"
          >
            <span :class="pillClass()" class="block max-w-32 truncate">{{ label }}</span>
          </OverflowItem>
          <OverflowEllipsis v-slot="{ hiddenCount, collapsed }">
            <span v-if="collapsed" class="text-xs text-muted-foreground">+{{ hiddenCount }}</span>
          </OverflowEllipsis>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};

const stackUsers = [
  { id: 1, name: "Sean", initials: "S" },
  { id: 2, name: "Daiana", initials: "D" },
  { id: 3, name: "Jean", initials: "J" },
  { id: 4, name: "Pat", initials: "P" },
  { id: 5, name: "Sam", initials: "S" },
];

function avatarCircle(initials: string, sizePx: number) {
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    minWidth: `${sizePx}px`,
    fontSize: sizePx <= 20 ? "9px" : "10px",
    initials,
  };
}

/** Acceptance: stacked avatars with overlap truncate with +N badge */
export const Stack_AvatarRow: Story = {
  name: "AC7 — Stacked avatar row",
  render: (args) => ({
    components: { OverflowContainer, OverflowItem, OverflowEllipsis, ResizableFrame },
    setup() {
      const itemW = 32;
      const overlap = 14;
      const badgeW = 32;
      return { args, stackUsers, itemW, overlap, badgeW, avatarCircle };
    },
    template: `
      <ResizableFrame width="80px">
        <OverflowContainer v-bind="args" :overlap-px="overlap" :gap="0" class="w-fit shrink-0">
          <OverflowItem
            v-for="(u, i) in stackUsers"
            :key="u.id"
            :segment-width-px="itemW"
            class="relative"
            :style="{ zIndex: stackUsers.length - i }"
          >
            <span
              class="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-secondary font-medium text-secondary-foreground"
              :style="avatarCircle(u.initials, itemW)"
            >{{ u.initials }}</span>
          </OverflowItem>
          <OverflowEllipsis :segment-width-px="badgeW" class="relative" :style="{ zIndex: 0 }">
            <template #default="{ hiddenCount }">
              <span
                class="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-secondary font-medium text-secondary-foreground"
                :style="avatarCircle('+' + hiddenCount, badgeW)"
              >+{{ hiddenCount }}</span>
            </template>
          </OverflowEllipsis>
        </OverflowContainer>
      </ResizableFrame>
    `,
  }),
};
