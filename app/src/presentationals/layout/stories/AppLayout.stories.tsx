import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import AppLayout from "../AppLayout.vue";
import NavListItem from "../navbar/NavListItem.vue";
import NavbarContent from "../navbar/NavbarContent.vue";
import AppPaneContent from "../app-pane/AppPaneContent.vue";
import DrawerPaneContent from "../drawer-pane/DrawerPaneContent.vue";

const meta = {
  title: "Presentational/Layout/AppLayout",
  component: AppLayout,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[1200px] h-[760px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { AppLayout, NavListItem, NavbarContent, AppPaneContent, DrawerPaneContent },
    setup() {
      const isAppPaneOpen = ref(true);
      const isDetailsPaneOpen = ref(true);
      return { isAppPaneOpen, isDetailsPaneOpen };
    },
    template: `
      <AppLayout v-model:is-app-pane-open="isAppPaneOpen" v-model:is-details-pane-open="isDetailsPaneOpen">
        <template #navbar>
          <NavListItem view="navbar" content="workspace">Workspace</NavListItem>
          <NavListItem view="navbar" content="settings">Settings</NavListItem>
          <NavbarContent content="workspace">
            <div class="mt-2 rounded border p-2 text-xs">Workspace navbar panel</div>
          </NavbarContent>
        </template>

        <template #app-pane>
          <AppPaneContent content="channels">
            <div class="p-3 text-sm">Channels app pane</div>
          </AppPaneContent>
        </template>

        <template #main-content>
          <div class="h-full w-full p-6 text-sm">Main route content</div>
        </template>

        <template #details-pane>
          <DrawerPaneContent content="channel">
            <div class="p-3 text-sm">Details drawer content</div>
          </DrawerPaneContent>
        </template>
      </AppLayout>
    `,
  }),
};
