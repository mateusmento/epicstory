import { Button } from "@/design-system";
import { toPaginatedListView } from "@/lib/async";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyMembers, storyUsers } from "@/presentationals/stories/fixtures";
import type { WorkspaceMember } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import WorkspaceMemberDropdown from "../WorkspaceMemberDropdown.vue";

const list: WorkspaceMember[] = [
  { id: 1, workspaceId: 1, role: "admin", user: storyUsers.sean },
  { id: 2, workspaceId: 1, role: "member", user: storyUsers.daiana },
  { id: 3, workspaceId: 1, role: "member", user: storyUsers.jean },
];

const meta = {
  title: "Presentational/WorkspaceMembers/WorkspaceMemberDropdown",
  component: WorkspaceMemberDropdown,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[360px] h-[420px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof WorkspaceMemberDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { WorkspaceMemberDropdown, Button },
    setup() {
      const users = ref([storyMembers[0]!]);
      return { users, list: toPaginatedListView({ items: list, loading: false, loadingMore: false, hasMore: false }) };
    },
    template: `
      <div class="p-6">
        <WorkspaceMemberDropdown v-model:users="users" :list="list">
          <Button variant="outline">Select members</Button>
        </WorkspaceMemberDropdown>
      </div>
    `,
  }),
};
