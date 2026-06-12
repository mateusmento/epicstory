import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import MessageBox from "../MessageBox.vue";
import { storyMessage, storyPoll, storyQuotedMessage } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageBox",
  component: MessageBox,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { MessageBox },
    setup() {
      const message = ref({
        ...storyMessage,
        poll: storyPoll,
        quotedMessage: storyQuotedMessage,
      });
      const quotedId = ref<number | null>(null);
      const editingId = ref<number | null>(null);
      const reaction = ref<string | null>(null);
      const pickedPoll = ref<string | null>(null);
      const feedback = computed(
        () =>
          `quote=${quotedId.value ?? "-"} | edit=${editingId.value ?? "-"} | reaction=${reaction.value ?? "-"} | poll=${pickedPoll.value ?? "-"}`,
      );

      return { message, quotedId, editingId, reaction, pickedPoll, feedback };
    },
    template: `
      <div class="max-w-xl p-4">
        <MessageBox
          :message="message"
          :me-id="3"
          @discussion-opened="reaction = 'discussion-opened'"
          @reaction-toggled="reaction = $event"
          @quote="quotedId = $event.id"
          @edit="editingId = $event.id"
          @poll-voted="pickedPoll = $event"
        />
        <p class="mt-3 text-xs text-muted-foreground">{{ feedback }}</p>
      </div>
    `,
  }),
};

export const QuoteAndStartEdit: Story = {
  render: () => ({
    components: { MessageBox },
    setup() {
      const activeQuote = ref<number | null>(null);
      const activeEdit = ref<number | null>(null);
      return { message: storyMessage, activeQuote, activeEdit };
    },
    template: `
      <div class="max-w-xl p-4">
        <MessageBox
          :message="message"
          :me-id="3"
          @quote="activeQuote = $event.id"
          @edit="activeEdit = $event.id"
        />
        <div class="mt-2 text-xs text-muted-foreground">
          Quote target: {{ activeQuote ?? "none" }} · Start edit target: {{ activeEdit ?? "none" }}
        </div>
      </div>
    `,
  }),
};
