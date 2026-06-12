import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import ChannelDetailsPane from "@/presentationals/app-pane/channel/ChannelDetailsPane.vue";
import ChannelMembers from "@/presentationals/app-pane/channel/ChannelMembers.vue";
import WorkspaceMemberDropdown from "@/presentationals/workspace-members/WorkspaceMemberDropdown.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyMembers } from "@/presentationals/stories/fixtures";
import { h } from "vue";

const meta = {
  title: "Presentational/AppPane/ChannelDetailsPane",
  component: ChannelDetailsPane,
  tags: ["autodocs"],
  parameters: {
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
      render: () => <StoryContainer class="w-96">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof ChannelDetailsPane>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    channelId: 1,
    channelAttachments: { data: [], loading: false, error: null },
    removingChannelAttachmentId: null,
  },
  render: (args) => ({
    components: { ChannelDetailsPane, ChannelMembers, WorkspaceMemberDropdown, Button, Icon },
    setup: () => ({ args, storyMembers }),
    template: `
      <ChannelDetailsPane v-bind="args">
        <template #members>
          <ChannelMembers :members="storyMembers">
            <template #add-member>
              <WorkspaceMemberDropdown :search-users="[]">
                <Button variant="ghost" size="icon">
                  <Icon name="hi-plus" class="text-secondary-foreground w-4 h-4" />
                </Button>
              </WorkspaceMemberDropdown>
            </template>
          </ChannelMembers>
        </template>
      </ChannelDetailsPane>
    `,
  }),
};
