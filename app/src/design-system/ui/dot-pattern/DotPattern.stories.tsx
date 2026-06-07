import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import { DotPattern, buildDotPatterns, dotPatternIds, type DotPatternId } from "./index";

const meta = {
  title: "Design System/DotPattern",
  component: DotPattern,
  tags: ["autodocs"],
} satisfies Meta<typeof DotPattern>;

export default meta;

type Story = StoryObj<typeof meta>;

const cluster = {
  rows: 12,
  cols: 10,
  dotSize: 3,
  gap: 2,
} as const;

export const PatternVariations: Story = {
  render: () => ({
    components: { DotPattern },
    setup() {
      const activeDotPatternId = ref<DotPatternId>("scatter");
      const dotPatterns = computed(() => buildDotPatterns(cluster.rows, cluster.cols));
      return { activeDotPatternId, dotPatternIds, dotPatterns, cluster };
    },
    template: `
      <div class="flex flex-col items-center gap-4 p-8">
        <label class="flex items-center gap-2 rounded-lg border border-black/10 bg-white/85 px-2.5 py-1.5 text-xs text-slate-500 backdrop-blur-sm">
          <span>Dot pattern</span>
          <select
            v-model="activeDotPatternId"
            class="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700"
          >
            <option v-for="id in dotPatternIds" :key="id" :value="id">
              {{ dotPatterns[id].label }}
            </option>
          </select>
        </label>

        <div class="flex items-center gap-6 rounded-xl border bg-white p-8">
          <DotPattern
            :pattern="activeDotPatternId"
            :rows="cluster.rows"
            :cols="cluster.cols"
            :dot-size="cluster.dotSize"
            :gap="cluster.gap"
          />
          <div class="flex size-11 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400" aria-hidden="true">
            ···
          </div>
          <DotPattern
            :pattern="activeDotPatternId"
            :rows="cluster.rows"
            :cols="cluster.cols"
            :dot-size="cluster.dotSize"
            :gap="cluster.gap"
            mirrored
          />
        </div>
      </div>
    `,
  }),
};

export const Single: Story = {
  args: {
    pattern: "scatter-rich",
    rows: cluster.rows,
    cols: cluster.cols,
    dotSize: cluster.dotSize,
    gap: cluster.gap,
  },
  render: (args) => ({
    components: { DotPattern },
    setup() {
      return { args };
    },
    template: `
      <div class="p-8 bg-white rounded-xl w-fit">
        <DotPattern v-bind="args" />
      </div>
    `,
  }),
};
