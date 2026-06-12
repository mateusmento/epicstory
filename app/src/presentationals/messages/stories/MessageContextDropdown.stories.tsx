import { Button } from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MessageContextDropdown from "../MessageContextDropdown.vue";
import { storyMessage } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageContextDropdown",
  component: MessageContextDropdown,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageContextDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTrigger: Story = {
  render: () => ({
    components: { MessageContextDropdown, Button },
    setup() {
      const lastEvent = ref("none");
      return { message: storyMessage, lastEvent };
    },
    template: `
      <div class="p-4">
        <MessageContextDropdown
          :me-id="3"
          :sender-id="message.senderId"
          :message="message"
          @emoji-selected="lastEvent = 'emoji:' + $event"
          @toggle-discussion="lastEvent = 'reply'"
          @quote="lastEvent = 'quote'"
          @edit="lastEvent = 'edit'"
          @message-deleted="lastEvent = 'delete'"
        >
          <div class="rounded-md border border-dashed border-border p-6 text-sm">
            Right click this area to open the context dropdown trigger.
          </div>
        </MessageContextDropdown>
        <p class="mt-2 text-xs text-muted-foreground">Last action: {{ lastEvent }}</p>
      </div>
    `,
  }),
};
