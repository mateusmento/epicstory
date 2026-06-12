import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import ChatboxMeetingActions from "../ChatboxMeetingActions.vue";

const meta = {
  title: "Presentational/Channel/ChatboxMeetingActions",
  component: ChatboxMeetingActions,
  tags: ["autodocs"],
} satisfies Meta<typeof ChatboxMeetingActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ChatboxMeetingActions },
    setup() {
      const lastAction = ref("none");
      return { lastAction };
    },
    template: `
      <div class="p-4">
        <ChatboxMeetingActions
          @join-channel-meeting="lastAction = 'join-channel-meeting'"
          @start-meeting="lastAction = 'start-meeting'"
          @schedule-meeting="lastAction = 'schedule-meeting'"
        />
        <p class="mt-2 text-xs text-muted-foreground">Last action: {{ lastAction }}</p>
      </div>
    `,
  }),
};
