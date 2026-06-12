import { Button } from "@/design-system";
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ChannelRenameDialog from "../ChannelRenameDialog.vue";

const meta = {
  title: "Presentational/AppPane/ChannelRenameDialog",
  component: ChannelRenameDialog,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[640px] h-[360px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ChannelRenameDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ChannelRenameDialog, Button },
    setup() {
      const open = ref(false);
      const currentName = ref("frontend");
      return { open, currentName };
    },
    template: `
      <div class="p-6">
        <Button @click="open = true">Open rename dialog</Button>
        <ChannelRenameDialog
          v-model:open="open"
          :current-name="currentName"
          @confirm="currentName = $event"
        />
        <div class="mt-2 text-xs text-muted-foreground">Current: {{ currentName }}</div>
      </div>
    `,
  }),
};
