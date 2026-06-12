import type { Meta, StoryObj } from "@storybook/vue3";
import CalendarEventReminderNotification from "../notifications/CalendarEventReminderNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/CalendarEventReminderNotification",
  component: CalendarEventReminderNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof CalendarEventReminderNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.calendarEventReminder.payload,
    createdAt: storyNotifications.calendarEventReminder.createdAt,
  },
};
