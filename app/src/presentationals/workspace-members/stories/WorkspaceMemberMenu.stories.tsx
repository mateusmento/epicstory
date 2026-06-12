import { toPaginatedListView } from "@/lib/async";
import { DropdownMenuPanel } from "@/presentationals/stories/harness/DropdownMenuPanel";
import { withStoryContainer } from "@/presentationals/stories/story-container";
import { storyMembers, storyUsers } from "@/presentationals/stories/fixtures";
import type { WorkspaceMember } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import WorkspaceMemberMenu from "../WorkspaceMemberMenu.vue";

const memberList: WorkspaceMember[] = [
  { id: 1, workspaceId: 1, role: "admin", user: storyUsers.sean },
  { id: 2, workspaceId: 1, role: "member", user: storyUsers.daiana },
  { id: 3, workspaceId: 1, role: "member", user: storyUsers.jean },
];

const meta = {
  title: "Presentational/WorkspaceMembers/WorkspaceMemberMenu",
  component: WorkspaceMemberMenu,
  decorators: [withStoryContainer("w-[360px] min-h-[460px]")],
} satisfies Meta<typeof WorkspaceMemberMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { WorkspaceMemberMenu, DropdownMenuPanel },
    setup() {
      const users = ref([storyMembers[0]!, storyMembers[1]!]);
      return { users, list: toPaginatedListView({ items: memberList, loading: false, loadingMore: false, hasMore: false }) };
    },
    template: `
      <DropdownMenuPanel content-class="w-[360px]">
        <WorkspaceMemberMenu v-model:users="users" :list="list" />
      </DropdownMenuPanel>
    `,
  }),
};
