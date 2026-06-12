import { Button } from "@/design-system";
import type { ChannelContextMenuApi } from "@/presentationals/app-pane/channels/channel-context-menu.context";
import { CHANNEL_CONTEXT_MENU_KEY } from "@/presentationals/app-pane/channels/channel-context-menu.context";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyDirectChannel } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, h, provide, ref } from "vue";
import ChannelContextMenu from "../ChannelContextMenu.vue";

const Harness = defineComponent({
  name: "ChannelContextMenuStoryHarness",
  components: { ChannelContextMenu, Button },
  setup() {
    const actionLoading = ref(false);
    const status = ref("idle");
    const api: ChannelContextMenuApi = {
      actionLoading,
      openRename: (channel) => (status.value = `rename:${channel.name}`),
      openDelete: (channel) => (status.value = `delete:${channel.name}`),
      leaveChannel: async (channel) => {
        status.value = `leave:${channel.name}`;
      },
      scheduleMeeting: (channel) => (status.value = `schedule:${channel.name}`),
      startMeeting: (channel) => (status.value = `start:${channel.name}`),
    };
    provide(CHANNEL_CONTEXT_MENU_KEY, api);
    return { status, channel: { ...storyDirectChannel, type: "group" as const, name: "engineering" } };
  },
  template: `
    <div class="p-6">
      <ChannelContextMenu :channel="channel">
        <Button variant="outline">Right click channel</Button>
      </ChannelContextMenu>
      <div class="mt-3 text-xs text-muted-foreground">Last action: {{ status }}</div>
    </div>
  `,
});

const meta = {
  title: "Presentational/AppPane/ChannelContextMenu",
  component: ChannelContextMenu,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[480px] h-[260px]">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof ChannelContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => Harness,
};
