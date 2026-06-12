import { Button, Menu, MenuContent, MenuTrigger } from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MessageContextMenu from "../MessageContextMenu.vue";
import { storyMessage } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageContextMenu",
  component: MessageContextMenu,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => ({
    components: { MessageContextMenu, Menu, MenuTrigger, MenuContent, Button },
    setup() {
      const lastEvent = ref("none");
      return { message: storyMessage, lastEvent };
    },
    template: `
      <div class="p-4">
        <Menu type="dropdown-menu">
          <MenuTrigger as-child>
            <Button variant="outline">Open context menu</Button>
          </MenuTrigger>
          <MenuContent disabled-portal class="font-dmSans">
            <MessageContextMenu
              :me-id="3"
              :sender-id="message.senderId"
              :message="message"
              @emoji-selected="lastEvent = 'emoji:' + $event"
              @toggle-discussion="lastEvent = 'reply'"
              @quote="lastEvent = 'quote'"
              @edit="lastEvent = 'edit'"
              @message-deleted="lastEvent = 'delete'"
            />
          </MenuContent>
        </Menu>
        <p class="mt-2 text-xs text-muted-foreground">Last action: {{ lastEvent }}</p>
      </div>
    `,
  }),
};
