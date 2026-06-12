import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import SubIssuesCreateRow from "../SubIssuesCreateRow.vue";

const meta = {
  title: "Presentational/Views/Issue/SubIssuesCreateRow",
  component: SubIssuesCreateRow,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[760px] h-[220px] p-4">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof SubIssuesCreateRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { SubIssuesCreateRow },
    setup() {
      const title = ref("");
      const created = ref<string[]>([]);
      function createIssue() {
        if (!title.value.trim()) return;
        created.value = [...created.value, title.value.trim()];
        title.value = "";
      }
      return { title, created, createIssue };
    },
    template: `
      <SubIssuesCreateRow v-model="title" @create="createIssue" />
      <div class="mt-2 text-xs text-muted-foreground">Created: {{ created.join(", ") || "none" }}</div>
    `,
  }),
};
