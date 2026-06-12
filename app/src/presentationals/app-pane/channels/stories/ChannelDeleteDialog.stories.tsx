import { Button } from "@/design-system";
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ChannelDeleteDialog from "../ChannelDeleteDialog.vue";

const meta = {
  title: "Presentational/AppPane/ChannelDeleteDialog",
  component: ChannelDeleteDialog,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[640px] h-[360px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ChannelDeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ChannelDeleteDialog, Button },
    setup() {
      const open = ref(false);
      const confirmed = ref(false);
      return { open, confirmed };
    },
    template: `
      <div class="p-6">
        <Button @click="open = true">Open delete dialog</Button>
        <ChannelDeleteDialog
          v-model:open="open"
          title="engineering"
          @confirm="confirmed = true"
        />
        <div class="mt-2 text-xs text-muted-foreground">Confirmed: {{ confirmed ? "yes" : "no" }}</div>
      </div>
    `,
  }),
};
