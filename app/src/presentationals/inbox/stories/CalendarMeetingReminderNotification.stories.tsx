import type { Meta, StoryObj } from "@storybook/vue3";
import CalendarMeetingReminderNotification from "../notifications/CalendarMeetingReminderNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/CalendarMeetingReminderNotification",
  component: CalendarMeetingReminderNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof CalendarMeetingReminderNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.calendarMeetingReminder.payload,
    createdAt: storyNotifications.calendarMeetingReminder.createdAt,
  },
};
