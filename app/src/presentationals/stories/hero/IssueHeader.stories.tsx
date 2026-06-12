import { withStoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { IssueHeaderHarness } from "./IssueHeader.harness";
import {
  heroIssueHeaderDefault,
  heroIssueHeaderDense,
  heroIssueHeaderEmpty,
  heroLongTitle,
  type HeroIssueHeaderState,
} from "./hero.fixtures";

const meta = {
  title: "Product/Hero/IssueHeader",
  component: IssueHeaderHarness,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[420px]")],
} satisfies Meta<typeof IssueHeaderHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderHarness(initial: HeroIssueHeaderState) {
  return {
    components: { IssueHeaderHarness },
    setup() {
      const state = ref<HeroIssueHeaderState>({ ...initial, assignees: [...initial.assignees], labelIds: [...initial.labelIds] });
      return { state };
    },
    template: `
      <IssueHeaderHarness v-model:state="state" />
    `,
  };
}

export const Default: Story = {
  render: () => renderHarness(heroIssueHeaderDefault),
};

export const Dense: Story = {
  render: () => renderHarness(heroIssueHeaderDense),
};

export const Empty: Story = {
  render: () => renderHarness(heroIssueHeaderEmpty),
};

export const Overflow: Story = {
  render: () =>
    renderHarness({
      ...heroIssueHeaderDefault,
      title: heroLongTitle,
    }),
};

export const Interactive: Story = {
  render: () => ({
    components: { IssueHeaderHarness },
    setup() {
      const state = ref<HeroIssueHeaderState>({
        ...heroIssueHeaderDefault,
        assignees: [...heroIssueHeaderDefault.assignees],
        labelIds: [...heroIssueHeaderDefault.labelIds],
      });
      return { state };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueHeaderHarness v-model:state="state" />
        <div class="text-xs text-muted-foreground px-1">
          Status {{ state.status }} · Priority {{ state.priority }} · Labels {{ state.labelIds.length }}
        </div>
      </div>
    `,
  }),
};
