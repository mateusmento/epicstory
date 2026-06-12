import { Button, Dialog, DialogContent, DialogTitle } from "@/design-system";
import { toPaginatedListView } from "@/lib/async";
import CreateChannelForm from "@/presentationals/app-pane/channels/CreateChannelForm.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyMembers, storyUsers } from "@/presentationals/stories/fixtures";
import { UserAvatarStack } from "@/presentationals/user";
import WorkspaceMemberDropdown from "@/presentationals/workspace-members/WorkspaceMemberDropdown.vue";
import type { WorkspaceMember } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ChevronsUpDown } from "lucide-vue-next";
import { h, ref } from "vue";

const memberList: WorkspaceMember[] = [
  { id: 1, workspaceId: 1, role: "admin", user: storyUsers.sean },
  { id: 2, workspaceId: 1, role: "member", user: storyUsers.daiana },
  { id: 3, workspaceId: 1, role: "member", user: storyUsers.jean },
];

const meta = {
  title: "Presentational/AppPane/CreateChannelForm",
  component: CreateChannelForm,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
        cellAmount: 5,
        offsetX: 16,
        offsetY: 16,
      },
    },
  },
  decorators: [
    (story) => ({
      setup() {
        const open = ref(true);
        return () => (
          <StoryContainer class="w-[640px]">
            <Dialog
              open={open.value}
              onUpdate:open={(value: boolean) => {
                open.value = value;
              }}
            >
              <DialogContent class="max-w-lg">
                <DialogTitle>Create channel</DialogTitle>
                {h(story())}
              </DialogContent>
            </Dialog>
          </StoryContainer>
        );
      },
    }),
  ],
} satisfies Meta<typeof CreateChannelForm>;

export default meta;

type Story = StoryObj<typeof meta>;

function renderForm(options: {
  initialType?: "group" | "meeting" | "direct";
  showTypeSelector?: boolean;
}) {
  return {
    components: { CreateChannelForm, WorkspaceMemberDropdown, Button, UserAvatarStack, ChevronsUpDown },
    setup() {
      const channelType = ref(options.initialType ?? "group");
      const members = ref([...storyMembers.slice(0, 1)]);
      const lastAction = ref("none");
      const list = toPaginatedListView({
        items: memberList,
        loading: false,
        loadingMore: false,
        hasMore: false,
      });

      return {
        channelType,
        members,
        lastAction,
        list,
        showTypeSelector: options.showTypeSelector ?? true,
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <CreateChannelForm
          v-model:channel-type="channelType"
          v-model:members="members"
          :show-type-selector="showTypeSelector"
          @submit="lastAction = 'submit:' + ($event.name ?? 'direct')"
        >
          <template #add-member>
            <WorkspaceMemberDropdown v-model:users="members" :list="list" :exclude-user-ids="[1]">
              <Button variant="ghost" class="h-auto w-full min-w-0 flex items-center justify-start gap-2 px-2">
                <UserAvatarStack v-if="members.length" :users="members" size="sm" />
                <div v-else class="text-xs text-muted-foreground">Choose workspace members</div>
                <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </WorkspaceMemberDropdown>
          </template>
        </CreateChannelForm>
        <div class="text-xs text-muted-foreground">
          Type: {{ channelType }} · Members: {{ members.length }} · Last: {{ lastAction }}
        </div>
      </div>
    `,
  };
}

export const Default: Story = {
  render: () => renderForm({ initialType: "group", showTypeSelector: true }),
};

export const DirectMessage: Story = {
  render: () => renderForm({ initialType: "direct", showTypeSelector: false }),
};

export const MeetingRoom: Story = {
  render: () => renderForm({ initialType: "meeting", showTypeSelector: false }),
};
