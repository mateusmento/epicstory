import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MessageComposerActions from "../MessageComposerActions.vue";

const meta = {
  title: "Presentational/Messages/MessageComposerActions",
  component: MessageComposerActions,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageComposerActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutEditor: Story = {
  render: () => ({
    components: { MessageComposerActions },
    setup() {
      const lastEvent = ref("none");
      const pollActive = ref(false);
      return { lastEvent, pollActive };
    },
    template: `
      <div class="flex flex-col gap-2 p-4">
        <div class="flex flex-wrap items-center gap-1">
          <MessageComposerActions
            :editor="null"
            show-poll-toggle
            :poll-active="pollActive"
            @insert-inline-image="lastEvent = 'insert-inline-image'"
            @toggle-poll="pollActive = !pollActive; lastEvent = 'toggle-poll'"
          />
        </div>
        <p class="text-xs text-muted-foreground">Last event: {{ lastEvent }} · pollActive={{ pollActive }}</p>
      </div>
    `,
  }),
};
