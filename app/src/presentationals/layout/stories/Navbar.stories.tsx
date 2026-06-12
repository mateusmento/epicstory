import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import Navbar from "../navbar/Navbar.vue";
import NavListItem from "../navbar/NavListItem.vue";
import NavbarContent from "../navbar/NavbarContent.vue";

const meta = {
  title: "Presentational/Layout/Navbar",
  component: Navbar,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[300px] h-[560px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Navbar, NavListItem, NavbarContent },
    template: `
      <Navbar class="border-r">
        <NavListItem view="navbar" content="workspace">Workspace</NavListItem>
        <NavListItem view="navbar" content="settings" :badge-count="2">Settings</NavListItem>
        <NavbarContent content="workspace">
          <div class="mt-3 rounded border p-2 text-xs text-muted-foreground">Workspace content</div>
        </NavbarContent>
      </Navbar>
    `,
  }),
};
