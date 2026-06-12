import { StoryContainer } from "@/presentationals/stories/story-container";
import type { IBacklogItem } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import Board from "../Board.vue";
import GenericDragLayer from "../GenericDragLayer.vue";
import RenderVNode from "../RenderVNode.vue";

const meta = {
  title: "Presentational/Board/Board",
  component: Board,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[1100px] h-[700px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof Board>;

export default meta;
type Story = StoryObj<typeof meta>;

const overlayItem = {
  id: 81,
  issue: {
    id: 810,
    issueKey: "EP-810",
    title: "Overlay item",
    status: "todo",
  },
} as IBacklogItem;

export const Default: Story = {
  render: () => ({
    components: { Board },
    template: `
      <Board>
        <div class="p-6 text-sm text-muted-foreground">Board shell for column composition.</div>
      </Board>
    `,
  }),
};

export const GenericDragLayerTierB: Story = {
  render: () => ({
    components: { GenericDragLayer },
    setup() {
      return {
        overlayData: {
          overlay: {
            render: () => (
              <div class="rounded-lg border bg-card p-3 shadow-md">
                <div class="text-xs text-muted-foreground">Dragging</div>
                <div class="text-sm font-medium">{overlayItem.issue.title}</div>
              </div>
            ),
          },
        },
      };
    },
    template: `
      <div class="p-6">
        <GenericDragLayer id="81" :data="overlayData" />
      </div>
    `,
  }),
};

export const RenderVNodeTierB: Story = {
  render: () => ({
    components: { RenderVNode },
    setup() {
      return {
        renderCard: () => (
          <div class="rounded-md border bg-card px-3 py-2 text-sm">
            Tier-B RenderVNode overlay content
          </div>
        ),
      };
    },
    template: `<div class="p-6"><RenderVNode :render="renderCard" /></div>`,
  }),
};
