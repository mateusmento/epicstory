import { withStoryContainer } from "@/presentationals/stories/story-container";
import { storyNotificationList } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import InboxNotificationRow from "@/presentationals/inbox/InboxNotificationRow.vue";

const meta = {
  title: "Product/Hero/InboxTriage",
  component: InboxNotificationRow,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[460px]")],
} satisfies Meta<typeof InboxNotificationRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { InboxNotificationRow },
    setup() {
      const selectedId = ref<string | null>(storyNotificationList[0]!.id);
      return { rows: storyNotificationList.slice(0, 5), selectedId };
    },
    template: `
      <div class="divide-y border rounded-md bg-background overflow-hidden">
        <InboxNotificationRow
          v-for="row in rows"
          :key="row.id"
          :notification="row"
          :me-id="1"
          class="px-1"
          :class="selectedId === row.id ? 'bg-muted/50' : ''"
          @select="selectedId = row.id"
        />
      </div>
    `,
  }),
};

export const Dense: Story = {
  render: () => ({
    components: { InboxNotificationRow },
    setup() {
      const selectedId = ref<string | null>(null);
      return { rows: storyNotificationList, selectedId };
    },
    template: `
      <div class="divide-y border rounded-md bg-background overflow-hidden max-h-[520px] overflow-y-auto">
        <InboxNotificationRow
          v-for="row in rows"
          :key="row.id"
          :notification="row"
          :me-id="1"
          class="px-1"
          :class="selectedId === row.id ? 'bg-muted/50' : ''"
          @select="selectedId = row.id"
        />
      </div>
    `,
  }),
};

export const Empty: Story = {
  render: () => ({
    template: `
      <div class="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No notifications yet
      </div>
    `,
  }),
};

export const Interactive: Story = {
  render: () => ({
    components: { InboxNotificationRow },
    setup() {
      const selectedId = ref<string | null>(null);
      return { rows: storyNotificationList.slice(0, 4), selectedId };
    },
    template: `
      <div class="flex flex-col gap-2">
        <div class="divide-y border rounded-md bg-background overflow-hidden">
          <InboxNotificationRow
            v-for="row in rows"
            :key="row.id"
            :notification="row"
            :me-id="1"
            class="px-1"
            :class="selectedId === row.id ? 'bg-muted/50' : ''"
            @select="selectedId = row.id"
          />
        </div>
        <div class="text-xs text-muted-foreground">Selected: {{ selectedId ?? "none" }}</div>
      </div>
    `,
  }),
};
