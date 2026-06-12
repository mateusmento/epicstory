import { withStoryContainer } from "@/presentationals/stories/story-container";
import { messageGroup } from "@/presentationals/stories/fixtures/message-groups";
import type { Meta, StoryObj } from "@storybook/vue3";
import {
  ChatColumnBusyHarness,
  ChatColumnDefaultHarness,
  ChatColumnEmptyHarness,
  createQuoteEditHarness,
} from "./ChatColumn.harness";
import ChatboxShell from "@/presentationals/channel/Chatbox.vue";

const meta = {
  title: "Product/Hero/ChatColumn",
  component: ChatboxShell,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
  decorators: [withStoryContainer("w-[720px] min-h-[600px]")],
} satisfies Meta<typeof ChatboxShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ChatColumnDefaultHarness,
};

export const EmptyDirectMessage: Story = {
  render: () => ChatColumnEmptyHarness,
};

export const BusyChannel: Story = {
  render: () => ChatColumnBusyHarness,
};

export const QuoteEdit: Story = {
  render: () => createQuoteEditHarness(messageGroup.value.messages[0]!),
};

export const Interactive: Story = {
  render: () => ChatColumnDefaultHarness,
};
