import { messageGroups } from "@/presentationals/stories/fixtures/message-groups";
import type { ChatTimelineItem } from "@/lib/chat-timeline";
import MessageBox from "@/presentationals/messages/MessageBox.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import ChatboxIntro from "../ChatboxIntro.vue";
import ChatboxTimeline from "../ChatboxTimeline.vue";
import ChannelActivityRow from "../ChannelActivityRow.vue";
import { storyMeetingActivity } from "@/presentationals/messages/stories/message.fixtures";
import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Channel/ChatboxTimeline",
  component: ChatboxTimeline,
  tags: ["autodocs"],
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="h-[600px] w-[860px]">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof ChatboxTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithContainerStyleSlots: Story = {
  render: () => ({
    components: { ChatboxTimeline, ChatboxIntro, MessageBox, ChannelActivityRow },
    setup() {
      const timeline = ref<ChatTimelineItem[]>([
        ...messageGroups.value.map((group) => ({ kind: "messages" as const, group })),
        { kind: "activity" as const, activity: storyMeetingActivity },
      ]);
      const olderPage = ref({ hasOlder: false, loadingOlder: false });
      const lastEvent = ref("none");
      return {
        timeline,
        olderPage,
        peers: storyDirectChannel.peers,
        meId: storyUsers.jean.id,
        lastEvent,
      };
    },
    template: `
      <div class="h-full w-full bg-background">
        <ChatboxTimeline
          :channel-id="storyDirectChannel.id"
          :timeline="timeline"
          :older-page="olderPage"
          :load-older="async () => {}"
          :me-id="meId"
        >
          <template #intro>
            <ChatboxIntro :peers="peers" :me-id="meId" />
          </template>
          <template #message="{ message }">
            <MessageBox
              :message="message"
              :me-id="meId"
              @quote="lastEvent = 'quote:' + $event.id"
              @edit="lastEvent = 'edit:' + $event.id"
            />
          </template>
          <template #activity="{ activity }">
            <ChannelActivityRow
              :activity="activity"
              channel-display-name="engineering"
              :me-id="meId"
              can-join-meeting
              :meeting-attendees="peers"
              @join-meeting="lastEvent = 'join-meeting:' + $event"
            />
          </template>
        </ChatboxTimeline>
        <p class="absolute bottom-2 left-3 text-xs text-muted-foreground">Last action: {{ lastEvent }}</p>
      </div>
    `,
    data: () => ({ storyDirectChannel }),
  }),
};
