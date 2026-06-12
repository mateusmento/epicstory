import { Dialog, DialogContent, DialogTitle } from "@/design-system";
import CreateChannel from "@/containers/app-pane/channels/CreateChannel.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";

const meta = {
  title: "Application/Containers/CreateChannel",
  component: CreateChannel,
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
} satisfies Meta<typeof CreateChannel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialType: "group",
    showTypeSelector: true,
  },
};

export const DirectMessage: Story = {
  args: {
    initialType: "direct",
    showTypeSelector: false,
  },
};

export const MeetingRoom: Story = {
  args: {
    initialType: "meeting",
    showTypeSelector: false,
  },
};
