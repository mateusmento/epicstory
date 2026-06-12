import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import DrawerPane from "../drawer-pane/DrawerPane.vue";
import DrawerPaneContent from "../drawer-pane/DrawerPaneContent.vue";

const meta = {
  title: "Presentational/Layout/DrawerPane",
  component: DrawerPane,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[460px] h-[560px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof DrawerPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { DrawerPane, DrawerPaneContent },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <DrawerPane view="details-pane" v-model:open="open" class="w-80 bg-card">
        <DrawerPaneContent content="channel">
          <div class="p-4 text-sm">Details pane slot</div>
        </DrawerPaneContent>
      </DrawerPane>
    `,
  }),
};
