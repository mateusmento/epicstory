<script lang="ts" setup>
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import AttachmentTilesList from "./AttachmentTilesList.vue";
import MessageComposerActions from "./MessageComposerActions.vue";
import type {
  ComposerAttachmentsView,
  ComposerQuoteView,
  ComposerToolbarView,
  MentionComposerView,
} from "./message-composer.types";
import { RichTextComposer } from "@/presentationals/rich-text";
import type { Editor } from "@tiptap/core";
import { Paperclip } from "lucide-vue-next";
import { ref } from "vue";

defineSlots<{
  poll?: () => unknown;
  sendTrailing?: () => unknown;
  dialogs?: () => unknown;
}>();

defineProps<{
  mention?: MentionComposerView;
  meId?: number;
  placeholder: string;
  quote: ComposerQuoteView | null;
  showQuote: boolean;
  attachments: ComposerAttachmentsView;
  toolbar: ComposerToolbarView;
  editor: Editor | null;
}>();

const stagingFileInputRef = ref<HTMLInputElement | null>(null);
const inlineImageInputRef = ref<HTMLInputElement | null>(null);

function onOpenAttach() {
  stagingFileInputRef.value?.click();
}

function onInsertInlineImage() {
  inlineImageInputRef.value?.click();
}

const emit = defineEmits<{
  "clear-quote": [];
  "cancel-edit": [];
  send: [];
  "toggle-recording": [];
  "remove-editing-attachment": [attachmentId: number];
  "remove-staging-attachment": [attachmentId: number];
  "dismiss-pending": [clientId: string];
  "clear-schedule": [];
  "toggle-poll": [];
  "mention-load-more": [];
  "update:editor": [editor: Editor | null];
  "pasted-files": [files: File[]];
  "staging-files-selected": [event: Event];
  "inline-image-selected": [event: Event];
}>();
</script>

<template>
  <div
    class="flex:col-md flex min-h-0 max-h-[50vh] flex-col overflow-hidden p-3 border border-border rounded-xl bg-card focus-within:outline outline-1 outline-border/60"
    @click="editor?.commands.focus()"
  >
    <div
      v-if="showQuote && quote"
      class="flex:row-md flex:center-y shrink-0 gap-2 mb-2 pb-2 border-b border-border/80 text-xs text-muted-foreground"
    >
      <Icon name="fa-quote-right" class="size-4 self-start" />
      <div class="flex:col-md flex-1 min-w-0">
        <span class="font-medium text-foreground/80">{{ quote.senderName }}</span>
        <span class="text-muted-foreground/90"> {{ quote.excerpt }}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-7 w-7 shrink-0"
        @click.stop="emit('clear-quote')"
      >
        <span class="sr-only">Remove quote</span>
        <Icon name="io-close" class="size-4" />
      </Button>
    </div>

    <div class="min-h-0 min-w-0 flex-auto overflow-y-auto overflow-x-auto py-0.5 font-lato">
      <RichTextComposer
        :mention="mention"
        :me-id="meId"
        :placeholder="placeholder"
        @mention-load-more="emit('mention-load-more')"
        @update:editor="emit('update:editor', $event)"
        @pasted-files="emit('pasted-files', $event)"
        @submit="emit('send')"
      >
        <template #bubbleMenu="{ editor: bubbleEditor }">
          <div
            class="flex:row-md z-[90] flex max-w-[min(100vw-1rem,42rem)] flex-wrap items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
            @mousedown.prevent
          >
            <MessageComposerActions
              :editor="bubbleEditor"
              :show-poll-toggle="toolbar.showPollToggle"
              :poll-active="toolbar.pollActive"
              @insert-inline-image="onInsertInlineImage"
              @toggle-poll="emit('toggle-poll')"
            />
          </div>
        </template>
      </RichTextComposer>
    </div>

    <slot name="poll" />

    <input
      ref="stagingFileInputRef"
      type="file"
      class="sr-only"
      multiple
      @change="emit('staging-files-selected', $event)"
    />
    <input
      ref="inlineImageInputRef"
      type="file"
      class="sr-only"
      accept="image/png,image/jpeg,image/gif,image/webp"
      multiple
      @change="emit('inline-image-selected', $event)"
    />

    <div
      v-if="
        attachments.stagingRows.length ||
        attachments.scheduleHint ||
        (toolbar.isEditing && attachments.editingRows.length)
      "
      class="shrink-0 border-t border-border/80 pt-2"
      @click.stop
    >
      <AttachmentTilesList
        v-if="toolbar.isEditing && attachments.editingRows.length"
        aria-label="Message attachments"
        :rows="attachments.editingRows"
        :disabled="attachments.removingEditing"
        removable
        :me-id="meId ?? null"
        @remove="emit('remove-editing-attachment', $event)"
        @dismiss-pending="emit('dismiss-pending', $event)"
      />
      <p v-if="attachments.scheduleHint" class="mb-1 text-[0.65rem] leading-snug text-muted-foreground">
        {{ attachments.scheduleHint }}
      </p>
      <AttachmentTilesList
        v-if="attachments.stagingRows.length"
        aria-label="Staging attachments"
        :rows="attachments.stagingRows"
        :disabled="attachments.stagingDisabled"
        removable
        :me-id="meId ?? null"
        @remove="emit('remove-staging-attachment', $event)"
        @dismiss-pending="emit('dismiss-pending', $event)"
      />
    </div>

    <div class="flex:row-md flex:center-y mt-2 shrink-0 text-secondary-foreground">
      <MessageComposerActions
        :editor="editor"
        :show-poll-toggle="toolbar.showPollToggle"
        :poll-active="toolbar.pollActive"
        @insert-inline-image="onInsertInlineImage"
        @toggle-poll="emit('toggle-poll')"
      />

      <div
        v-if="!toolbar.isEditing && toolbar.scheduleSummary"
        class="flex:row items-center gap-1 text-xs text-muted-foreground min-w-0"
      >
        <span class="truncate max-w-[14rem]">{{ toolbar.scheduleSummary }}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="h-6 w-6 shrink-0"
          @click.stop="emit('clear-schedule')"
        >
          <span class="sr-only">Clear schedule</span>
          <Icon name="io-close" class="size-3" />
        </Button>
      </div>

      <div class="flex-1"></div>

      <Button
        v-if="toolbar.isEditing"
        type="button"
        variant="ghost"
        size="sm"
        class="text-muted-foreground"
        @click="emit('cancel-edit')"
      >
        Cancel
      </Button>

      <Button variant="ghost" size="icon" @click="emit('toggle-recording')">
        <Icon v-if="!toolbar.isRecording" name="bi-camera-video" class="w-6 h-6" />
        <template v-else>
          <Icon name="ri-record-circle-fill" class="w-6 h-6 text-red-500" />
          <span class="text-xs ml-1 text-red-400">{{ toolbar.recordingLabel }}</span>
        </template>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Attach files"
        class="shrink-0 mr-0.5"
        aria-label="Attach files"
        :disabled="attachments.stagingDisabled"
        @click.stop="onOpenAttach"
      >
        <Paperclip class="size-5" />
      </Button>

      <template v-if="toolbar.isEditing">
        <Button
          type="button"
          variant="default"
          size="sm"
          class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
          :disabled="toolbar.attachmentsBlocked"
          @click="emit('send')"
        >
          <Icon name="io-paper-plane" />
          Save
        </Button>
      </template>
      <slot v-else name="sendTrailing">
        <Button
          type="button"
          variant="default"
          size="sm"
          class="flex:row-lg flex:center-y text-sm border-0 bg-[#3A66FF] text-white shadow-sm hover:bg-[#3A66FF]/90 focus-visible:ring-2 focus-visible:ring-white/30"
          :disabled="toolbar.attachmentsBlocked"
          @click="emit('send')"
        >
          <Icon name="io-paper-plane" />
          {{ toolbar.sendLabel }}
        </Button>
      </slot>
    </div>

    <slot name="dialogs" />
  </div>
</template>
