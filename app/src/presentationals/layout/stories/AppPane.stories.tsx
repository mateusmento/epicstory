import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import AppPane from "../app-pane/AppPane.vue";
import AppPaneContent from "../app-pane/AppPaneContent.vue";

const meta = {
  title: "Presentational/Layout/AppPane",
  component: AppPane,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[460px] h-[560px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof AppPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { AppPane, AppPaneContent },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <AppPane v-model:open="open" class="w-96 bg-card">
        <AppPaneContent content="channels">
          <div class="p-4 text-sm">Channels content</div>
        </AppPaneContent>
      </AppPane>
    `,
  }),
};
