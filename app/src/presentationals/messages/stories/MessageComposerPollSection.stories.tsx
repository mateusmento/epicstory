import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import MessageComposerPollSection from "../MessageComposerPollSection.vue";
import { makePollBody } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageComposerPollSection",
  component: MessageComposerPollSection,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageComposerPollSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { MessageComposerPollSection },
    setup() {
      const model = ref(makePollBody());
      const optionCount = computed(() => model.value?.options.length ?? 0);
      return { model, optionCount };
    },
    template: `
      <div class="p-4">
        <MessageComposerPollSection :model-value="model" @update:model-value="model = $event" />
        <p class="mt-2 text-xs text-muted-foreground">Question: {{ model?.question || "empty" }} · options={{ optionCount }}</p>
      </div>
    `,
  }),
};
