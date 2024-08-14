import type { Meta, StoryObj } from "@storybook/vue3";
import WorkspaceCard from "./WorkspaceCard.vue";
import seanPhoto from "../../assets/images/sean.png";
import daianaPhoto from "../../assets/images/daiana.png";
import leonPhoto from "../../assets/images/leon.png";

const meta = {
  title: "Design System/Workspace/WorkspaceCard",
  component: WorkspaceCard,
} satisfies Meta<typeof WorkspaceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "Epicstory",
    ownerName: "Sean",
    projectsCount: 4,
    topMembers: [{ photo: seanPhoto }, { photo: daianaPhoto }, { photo: leonPhoto }],
    membersCount: 16,
  },
};
