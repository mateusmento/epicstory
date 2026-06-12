import { withStoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import IssueCard from "@/presentationals/views/project/board/IssueCard.vue";
import {
  heroPlanningCardDefault,
  heroPlanningCardDense,
  heroPlanningCardDone,
  heroPlanningCardOverdue,
} from "./hero.fixtures";

const meta = {
  title: "Product/Hero/PlanningCard",
  component: IssueCard,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[480px]")],
} satisfies Meta<typeof IssueCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderCard(item: typeof heroPlanningCardDefault) {
  return {
    components: { IssueCard },
    setup() {
      const openedId = ref<number | null>(null);
      return { item, openedId };
    },
    template: `
      <div class="p-2">
        <IssueCard :item="item" @open-issue="openedId = $event.id" />
        <div class="mt-2 text-xs text-muted-foreground">Opened issue: {{ openedId ?? "none" }}</div>
      </div>
    `,
  };
}

export const Default: Story = {
  render: () => renderCard(heroPlanningCardDefault),
};

export const Dense: Story = {
  render: () => renderCard(heroPlanningCardDense),
};

export const Overdue: Story = {
  render: () => renderCard(heroPlanningCardOverdue),
};

export const Done: Story = {
  render: () => renderCard(heroPlanningCardDone),
};

export const Interactive: Story = {
  render: () => renderCard(heroPlanningCardDefault),
};
