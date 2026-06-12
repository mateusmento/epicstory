import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import Navbar from "../navbar/Navbar.vue";
import NavbarContent from "../navbar/NavbarContent.vue";
import NavListItem from "../navbar/NavListItem.vue";

const meta = {
  title: "Presentational/Layout/NavbarContent",
  component: NavbarContent,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[320px] h-[560px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof NavbarContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Navbar, NavbarContent, NavListItem },
    template: `
      <Navbar class="border-r">
        <NavListItem view="navbar" content="workspace">Workspace</NavListItem>
        <NavListItem view="navbar" content="settings">Settings</NavListItem>
        <NavbarContent content="workspace">
          <div class="mt-2 rounded border p-2 text-xs">Primary navbar panel</div>
        </NavbarContent>
      </Navbar>
    `,
  }),
};
