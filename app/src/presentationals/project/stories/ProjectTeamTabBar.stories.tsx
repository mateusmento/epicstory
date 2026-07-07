import { StoryContainer } from "@/presentationals/stories/story-container";
import type { ProjectTeamTab } from "@/lib/project";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import ProjectTeamTabBar from "../ProjectTeamTabBar.vue";

const meta = {
  title: "Presentational/Project/ProjectTeamTabBar",
  component: ProjectTeamTabBar,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[720px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ProjectTeamTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const threeProjectsTabs: ProjectTeamTab[] = [
  { id: 1, name: "Mobile App", to: "/1/project/1/backlog" },
  { id: 2, name: "API Overhaul", to: "/1/project/2/backlog" },
  { id: 3, name: "Infra", to: "/1/project/3/backlog" },
];

const overflowTabs: ProjectTeamTab[] = [
  { id: 4, name: "Design System", to: "/1/project/4/backlog" },
  { id: 5, name: "Docs", to: "/1/project/5/backlog" },
];

export const RecentProjects: Story = {
  args: {
    tabs: threeProjectsTabs,
    activeProjectId: 2,
    showMoreMenu: false,
    overflowTabs: [],
  },
};

export const WithMoreMenu: Story = {
  args: {
    tabs: threeProjectsTabs.slice(0, 2),
    activeProjectId: 2,
    showMoreMenu: true,
    overflowTabs,
  },
};
