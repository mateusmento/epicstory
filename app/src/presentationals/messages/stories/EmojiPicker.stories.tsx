import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import EmojiPicker from "../EmojiPicker.vue";

const meta = {
  title: "Presentational/Messages/EmojiPicker",
  component: EmojiPicker,
  tags: ["autodocs"],
} satisfies Meta<typeof EmojiPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { EmojiPicker },
    setup() {
      const selected = ref("none");
      return { selected };
    },
    template: `
      <div class="p-4">
        <EmojiPicker variant="outline" @select="selected = $event" />
        <p class="mt-2 text-xs text-muted-foreground">Selected: {{ selected }}</p>
      </div>
    `,
  }),
};
