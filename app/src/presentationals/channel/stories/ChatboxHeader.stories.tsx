import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import ChatboxHeader from "../ChatboxHeader.vue";
import ChatboxMeetingActions from "../ChatboxMeetingActions.vue";
import ChatboxPresenceStrip from "../ChatboxPresenceStrip.vue";
import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Channel/ChatboxHeader",
  component: ChatboxHeader,
  tags: ["autodocs"],
} satisfies Meta<typeof ChatboxHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSlots: Story = {
  render: () => ({
    components: { ChatboxHeader, ChatboxPresenceStrip, ChatboxMeetingActions },
    setup() {
      const lastAction = ref("none");
      const peers = storyDirectChannel.peers;
      const meId = storyUsers.jean.id;
      const onlineIds = new Set([storyUsers.daiana.id]);
      return {
        peers,
        meId,
        isUserOnline: (userId: number) => onlineIds.has(userId),
        lastAction,
      };
    },
    template: `
      <div class="w-full max-w-2xl border rounded-md p-2">
        <ChatboxHeader channel-name="engineering" @more-details="lastAction = 'more-details'">
          <template #presence>
            <ChatboxPresenceStrip :peers="peers" :me-id="meId" :is-user-online="isUserOnline" />
          </template>
          <template #meeting-actions>
            <ChatboxMeetingActions
              @join-channel-meeting="lastAction = 'join-channel-meeting'"
              @start-meeting="lastAction = 'start-meeting'"
              @schedule-meeting="lastAction = 'schedule-meeting'"
            />
          </template>
        </ChatboxHeader>
        <p class="mt-2 text-xs text-muted-foreground">Last action: {{ lastAction }}</p>
      </div>
    `,
  }),
};
