import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import ScheduleMessageCustomDialog from "@/presentationals/messages/ScheduleMessageCustomDialog.vue";
import ScheduleMessageDropdown from "@/presentationals/messages/ScheduleMessageDropdown.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import MessageComposerPollSection from "../MessageComposerPollSection.vue";
import MessageComposerShell from "../MessageComposerShell.vue";
import { makeComposerAttachmentsView, makePollBody, makeToolbarView, storyMessage } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageComposerShell",
  component: MessageComposerShell,
  tags: ["autodocs"],
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="h-[560px] w-[820px]">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof MessageComposerShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHarnessSlots: Story = {
  render: () => ({
    components: {
      MessageComposerShell,
      MessageComposerPollSection,
      ScheduleMessageDropdown,
      ScheduleMessageCustomDialog,
      Button,
      Icon,
    },
    setup() {
      const quote = ref({ senderName: storyMessage.sender.name, excerpt: "Please include release notes." });
      const showQuote = ref(true);
      const attachments = ref(makeComposerAttachmentsView());
      const toolbar = ref(makeToolbarView({ scheduleSummary: "Thu, Jun 12 · 9:00 AM" }));
      const pollBody = ref(makePollBody());
      const activeSchedule = ref(null);
      const customScheduleOpen = ref(false);
      const sendCount = ref(0);
      const lastEvent = ref("none");

      function clearSchedule() {
        toolbar.value = { ...toolbar.value, scheduleSummary: null };
      }
      function togglePoll() {
        toolbar.value = { ...toolbar.value, pollActive: !toolbar.value.pollActive };
      }

      return {
        quote,
        showQuote,
        attachments,
        toolbar,
        pollBody,
        activeSchedule,
        customScheduleOpen,
        sendCount,
        lastEvent,
        clearSchedule,
        togglePoll,
      };
    },
    template: `
      <div class="h-full w-full p-4 bg-background">
        <MessageComposerShell
          :placeholder="'Message #engineering'"
          :quote="quote"
          :show-quote="showQuote"
          :attachments="attachments"
          :toolbar="toolbar"
          :editor="null"
          :me-id="3"
          @send="sendCount += 1; lastEvent = 'send'"
          @clear-quote="showQuote = false; lastEvent = 'clear-quote'"
          @cancel-edit="lastEvent = 'cancel-edit'"
          @toggle-recording="toolbar = { ...toolbar, isRecording: !toolbar.isRecording }; lastEvent = 'toggle-recording'"
          @remove-editing-attachment="lastEvent = 'remove-editing-attachment:' + $event"
          @remove-staging-attachment="lastEvent = 'remove-staging-attachment:' + $event"
          @dismiss-pending="lastEvent = 'dismiss-pending:' + $event"
          @clear-schedule="clearSchedule(); lastEvent = 'clear-schedule'"
          @toggle-poll="togglePoll(); lastEvent = 'toggle-poll'"
          @mention-load-more="lastEvent = 'mention-load-more'"
          @inline-image-selected="lastEvent = 'inline-image-selected'"
          @staging-files-selected="lastEvent = 'staging-files-selected'"
          @pasted-files="lastEvent = 'pasted-files'"
        >
          <template #poll>
            <MessageComposerPollSection :model-value="toolbar.pollActive ? pollBody : null" @update:model-value="pollBody = $event" />
          </template>

          <template #sendTrailing>
            <div class="flex items-center gap-2">
              <Button size="sm" @click="sendCount += 1; lastEvent = 'custom-send'">
                <Icon name="io-paper-plane" />
                Send now
              </Button>
              <ScheduleMessageDropdown
                v-model:active-schedule="activeSchedule"
                @open-custom-schedule-dialog="customScheduleOpen = true"
              >
                <Button variant="outline" size="sm">Schedule</Button>
              </ScheduleMessageDropdown>
            </div>
          </template>

          <template #dialogs>
            <ScheduleMessageCustomDialog v-model:open="customScheduleOpen" @confirm="lastEvent = 'custom-schedule-confirmed'" />
          </template>
        </MessageComposerShell>
        <p class="mt-3 text-xs text-muted-foreground">
          sends={{ sendCount }} · last={{ lastEvent }} · schedule={{ activeSchedule ? activeSchedule.label : "none" }}
        </p>
      </div>
    `,
  }),
};
