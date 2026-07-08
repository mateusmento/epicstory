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
        <div class="w-full max-w-md min-w-0">
          <MessageComposerActions
            class="min-w-0"
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

export const NarrowThreadWidth: Story = {
  name: "Narrow thread (~280px)",
  render: () => ({
    components: { MessageComposerActions },
    setup() {
      const lastEvent = ref("none");
      const pollActive = ref(false);
      return { lastEvent, pollActive };
    },
    template: `
      <div class="flex flex-col gap-2 p-4">
        <p class="text-xs text-muted-foreground">Resize the dashed frame — secondary tools collapse into ⋯</p>
        <div
          class="overflow-hidden rounded-xl border border-dashed border-border bg-background p-2"
          style="width: 280px; resize: horizontal; max-width: 100%"
        >
          <MessageComposerActions
            class="min-w-0"
            :editor="null"
            show-poll-toggle
            :poll-active="pollActive"
            @insert-inline-image="lastEvent = 'insert-inline-image'"
            @toggle-poll="pollActive = !pollActive; lastEvent = 'toggle-poll'"
          />
        </div>
        <p class="text-xs text-muted-foreground">Last event: {{ lastEvent }}</p>
      </div>
    `,
  }),
};
