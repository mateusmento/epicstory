import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import SubIssuesHeader from "../sub-issues/SubIssuesHeader.vue";

const meta = {
  title: "Presentational/Issue/SubIssuesHeader",
  component: SubIssuesHeader,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[760px] h-[220px] p-4">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof SubIssuesHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { SubIssuesHeader },
    setup() {
      const collapsed = ref(false);
      const total = ref(5);
      const done = ref(2);
      return { collapsed, total, done };
    },
    template: `
      <SubIssuesHeader
        :collapsed="collapsed"
        :done-count="done"
        :total-count="total"
        @toggle="collapsed = !collapsed"
        @add="total += 1"
      />
    `,
  }),
};
