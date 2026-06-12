import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MessageActions from "../MessageActions.vue";
import { storyMessage } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageActions",
  component: MessageActions,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => ({
    components: { MessageActions },
    setup() {
      const lastEvent = ref("none");
      return { message: storyMessage, lastEvent };
    },
    template: `
      <div class="p-4">
        <MessageActions
          :me-id="3"
          :sender-id="message.senderId"
          :message="message"
          @emoji-selected="lastEvent = 'emoji:' + $event"
          @toggle-discussion="lastEvent = 'toggle-discussion'"
          @quote="lastEvent = 'quote'"
          @edit="lastEvent = 'edit'"
          @message-deleted="lastEvent = 'message-deleted'"
        />
        <p class="mt-2 text-xs text-muted-foreground">Last event: {{ lastEvent }}</p>
      </div>
    `,
  }),
};
