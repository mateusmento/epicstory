import { withStoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import AppLayout from "@/presentationals/layout/AppLayout.vue";
import NavListItem from "@/presentationals/layout/navbar/NavListItem.vue";
import NavbarContent from "@/presentationals/layout/navbar/NavbarContent.vue";
import AppPaneContent from "@/presentationals/layout/app-pane/AppPaneContent.vue";
import DrawerPaneContent from "@/presentationals/layout/drawer-pane/DrawerPaneContent.vue";

const meta = {
  title: "Product/Hero/AppShell",
  component: AppLayout,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[1200px] min-h-[760px]")],
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderShell(options: { appPaneOpen: boolean; detailsOpen: boolean }) {
  return {
    components: { AppLayout, NavListItem, NavbarContent, AppPaneContent, DrawerPaneContent },
    setup() {
      const isAppPaneOpen = ref(options.appPaneOpen);
      const isDetailsPaneOpen = ref(options.detailsOpen);
      return { isAppPaneOpen, isDetailsPaneOpen };
    },
    template: `
      <AppLayout
        v-model:is-app-pane-open="isAppPaneOpen"
        v-model:is-details-pane-open="isDetailsPaneOpen"
        class="h-[720px]"
      >
        <template #navbar>
          <NavListItem view="navbar" content="workspace" :badge-count="3">Workspace</NavListItem>
          <NavListItem view="navbar" content="settings">Settings</NavListItem>
          <NavbarContent content="workspace">
            <div class="mt-2 rounded border p-2 text-xs text-muted-foreground">Projects · Channels · Inbox</div>
          </NavbarContent>
        </template>

        <template #app-pane>
          <AppPaneContent content="channels">
            <div class="p-3 text-sm space-y-2">
              <div class="font-medium"># engineering</div>
              <div class="text-muted-foreground"># design</div>
              <div class="text-muted-foreground">DM · Daiana</div>
            </div>
          </AppPaneContent>
        </template>

        <template #main-content>
          <div class="h-full w-full p-6 text-sm bg-background">
            Main route content (chat, board, or issue detail)
          </div>
        </template>

        <template #details-pane>
          <DrawerPaneContent content="channel">
            <div class="p-3 text-sm space-y-2">
              <div class="font-medium">Channel details</div>
              <div class="text-xs text-muted-foreground">Members · Attachments · Schedules</div>
            </div>
          </DrawerPaneContent>
        </template>
      </AppLayout>
    `,
  };
}

export const Default: Story = {
  render: () => renderShell({ appPaneOpen: true, detailsOpen: true }),
};

export const AppPaneOnly: Story = {
  render: () => renderShell({ appPaneOpen: true, detailsOpen: false }),
};

export const DetailsDrawerOpen: Story = {
  render: () => renderShell({ appPaneOpen: false, detailsOpen: true }),
};

export const FocusedMain: Story = {
  render: () => renderShell({ appPaneOpen: false, detailsOpen: false }),
};

export const Interactive: Story = {
  render: () => renderShell({ appPaneOpen: true, detailsOpen: false }),
};
