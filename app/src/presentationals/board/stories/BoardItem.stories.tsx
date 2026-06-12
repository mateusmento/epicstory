import { StoryContainer } from "@/presentationals/stories/story-container";
import type { IBacklogItem } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import BoardItem from "../BoardItem.vue";

const source: IBacklogItem[] = [
  {
    id: 7,
    issue: {
      id: 70,
      issueKey: "EP-70",
      title: "Drag me between columns",
      status: "todo",
    },
  } as IBacklogItem,
];

const meta = {
  title: "Presentational/Board/BoardItem",
  component: BoardItem,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[420px] h-[220px] p-4">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof BoardItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { BoardItem },
    setup() {
      return { source };
    },
    template: `
      <BoardItem group="project-board" :source="source" :item-id="source[0].id">
        <div class="rounded-lg border bg-card p-3 text-sm">
          {{ source[0].issue.issueKey }} - {{ source[0].issue.title }}
        </div>
      </BoardItem>
    `,
  }),
};
