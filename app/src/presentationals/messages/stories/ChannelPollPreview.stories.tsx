import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import ChannelPollPreview from "../ChannelPollPreview.vue";
import { storyPoll } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/ChannelPollPreview",
  component: ChannelPollPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof ChannelPollPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveVote: Story = {
  render: () => ({
    components: { ChannelPollPreview },
    setup() {
      const poll = ref({ ...storyPoll, optionVotes: { ...storyPoll.optionVotes } });
      const votingOptionId = ref<string | null>(null);
      function onPick(optionId: string) {
        const prev = poll.value.myOptionId;
        if (prev && poll.value.optionVotes) {
          poll.value.optionVotes[prev] = Math.max(0, (poll.value.optionVotes[prev] ?? 0) - 1);
        }
        poll.value.optionVotes[optionId] = (poll.value.optionVotes?.[optionId] ?? 0) + 1;
        poll.value.myOptionId = optionId;
        poll.value.totalVotes = (poll.value.totalVotes ?? 0) + (prev ? 0 : 1);
        votingOptionId.value = optionId;
      }
      return { poll, votingOptionId, onPick };
    },
    template: `
      <div class="p-4">
        <ChannelPollPreview :poll="poll" :voting-option-id="null" @pick="onPick" />
        <p class="text-xs text-muted-foreground">My option: {{ poll.myOptionId }} · last pick: {{ votingOptionId || "none" }}</p>
      </div>
    `,
  }),
};
