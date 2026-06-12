import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import Navbar from "../navbar/Navbar.vue";
import NavListItem from "../navbar/NavListItem.vue";

const meta = {
  title: "Presentational/Layout/NavListItem",
  component: NavListItem,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[320px] h-[300px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof NavListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Navbar, NavListItem },
    template: `
      <Navbar class="border-r">
        <NavListItem view="navbar" content="workspace" :badge-count="4">Workspace</NavListItem>
        <NavListItem view="navbar" content="settings">Settings</NavListItem>
      </Navbar>
    `,
  }),
};
