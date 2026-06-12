import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import InboxNotificationRow from "../InboxNotificationRow.vue";
import { withStoryContainer } from "@/presentationals/stories/story-container";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/InboxNotificationRow",
  component: InboxNotificationRow,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[460px]")],
} satisfies Meta<typeof InboxNotificationRow>;

export default meta;

type Story = StoryObj<typeof meta>;

function renderInteractiveRow(notification: typeof storyNotifications.mention) {
  return {
    components: { InboxNotificationRow },
    setup() {
      const selected = ref<string | null>(null);

      function onSelect() {
        selected.value = notification.id;
      }

      return { notification, selected, onSelect };
    },
    template: `
      <div class="bg-white">
        <InboxNotificationRow :notification="notification" :me-id="1" @select="onSelect" />
        <div class="border-t px-4 py-2 text-xs text-muted-foreground">
          Selected row: {{ selected ?? 'none' }}
        </div>
      </div>
    `,
  };
}

export const Mention: Story = {
  render: () => renderInteractiveRow(storyNotifications.mention),
};

export const Reply: Story = {
  render: () => renderInteractiveRow(storyNotifications.reply),
};

export const DirectMessage: Story = {
  render: () => renderInteractiveRow(storyNotifications.directMessage),
};

export const DueDateReminder: Story = {
  render: () => renderInteractiveRow(storyNotifications.issueDueDate),
};

export const IssueAssigned: Story = {
  render: () => renderInteractiveRow(storyNotifications.issueAssigned),
};

export const CalendarMeetingReminder: Story = {
  render: () => renderInteractiveRow(storyNotifications.calendarMeetingReminder),
};

export const CalendarEventReminder: Story = {
  render: () => renderInteractiveRow(storyNotifications.calendarEventReminder),
};

export const MessageReaction: Story = {
  render: () => renderInteractiveRow(storyNotifications.messageReaction),
};

export const ReplyReaction: Story = {
  render: () => renderInteractiveRow(storyNotifications.replyReaction),
};
