import { StoryContainer } from "@/presentationals/stories/story-container";
import type { IBacklogItem } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import BoardColumn from "../BoardColumn.vue";

const item = (id: number, key: string, title: string) =>
  ({
    id,
    issue: { id: id * 10, issueKey: key, title, status: "todo" },
  }) as IBacklogItem;

const meta = {
  title: "Presentational/Board/BoardColumn",
  component: BoardColumn,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[520px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof BoardColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { BoardColumn },
    setup() {
      const items = ref<IBacklogItem[]>([
        item(1, "EP-11", "Wire channel search"),
        item(2, "EP-12", "Storybook migration"),
      ]);
      return { items };
    },
    template: `
      <BoardColumn group="project-board" v-model="items" class="rounded-xl border bg-muted/30 p-3">
        <div class="text-sm font-semibold mb-3">To do</div>
        <div class="space-y-2">
          <div
            v-for="entry in items"
            :key="entry.id"
            class="rounded border bg-card p-2 text-xs"
          >
            {{ entry.issue.issueKey }} - {{ entry.issue.title }}
          </div>
        </div>
      </BoardColumn>
    `,
  }),
};
