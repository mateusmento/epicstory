import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import WorkspaceMemberDropdown from "@/presentationals/workspace-members/WorkspaceMemberDropdown.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyMembers } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import ChannelMembers from "../ChannelMembers.vue";

const meta = {
  title: "Presentational/AppPane/ChannelMembers",
  component: ChannelMembers,
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
} satisfies Meta<typeof ChannelMembers>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    members: storyMembers,
  },
  render: (args) => ({
    components: { ChannelMembers, WorkspaceMemberDropdown, Button, Icon },
    setup: () => ({ args }),
    template: `
      <ChannelMembers v-bind="args">
        <template #add-member>
          <WorkspaceMemberDropdown :search-users="[]">
            <Button variant="ghost" size="icon">
              <Icon name="hi-plus" class="text-secondary-foreground w-4 h-4" />
            </Button>
          </WorkspaceMemberDropdown>
        </template>
      </ChannelMembers>
    `,
  }),
};
