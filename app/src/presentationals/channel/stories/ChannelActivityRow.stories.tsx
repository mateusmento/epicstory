import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";
import type { IChannelActivity } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import ChannelActivityRow from "../ChannelActivityRow.vue";

const meetingActivity = {
  id: 701,
  type: "meeting_started",
  actor: storyUsers.sean,
  meetingId: 123,
  createdAt: new Date().toISOString(),
} as unknown as IChannelActivity;

const memberAddedActivity = {
  id: 702,
  type: "user_added",
  actor: storyUsers.sean,
  subjectUser: storyUsers.daiana,
  createdAt: new Date().toISOString(),
} as unknown as IChannelActivity;

const meta = {
  title: "Presentational/Channel/ChannelActivityRow",
  component: ChannelActivityRow,
  tags: ["autodocs"],
} satisfies Meta<typeof ChannelActivityRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MeetingStarted: Story = {
  render: () => ({
    components: { ChannelActivityRow },
    setup() {
      const joinedMeeting = ref<number | null>(null);
      return { joinedMeeting };
    },
    template: `
      <div class="max-w-xl p-4">
        <ChannelActivityRow
          :activity="meetingActivity"
          channel-display-name="engineering"
          :me-id="3"
          can-join-meeting
          :meeting-attendees="storyDirectChannel.peers"
          @join-meeting="joinedMeeting = $event"
        />
        <p class="mt-2 text-xs text-muted-foreground">Joined meeting id: {{ joinedMeeting ?? "none" }}</p>
      </div>
    `,
    data: () => ({ meetingActivity, storyDirectChannel }),
  }),
};

export const MemberAdded: Story = {
  args: {
    activity: memberAddedActivity,
    channelDisplayName: "engineering",
    meId: storyUsers.jean.id,
    canJoinMeeting: false,
    meetingAttendees: [],
  },
};
