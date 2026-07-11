<script lang="ts" setup>
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import MessageComposerActions from "@/presentationals/messages/MessageComposerActions.vue";
import { RichTextComposer } from "@/presentationals/rich-text";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import { UserAvatar } from "@/presentationals/user";
import type { IDescriptionThread, IDescriptionThreadMessage } from "@epicstory/contracts";
import { normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, Check, MoreHorizontal, SmilePlus, X } from "lucide-vue-next";
import { computed, ref, shallowRef } from "vue";

const props = withDefaults(
  defineProps<{
    thread: IDescriptionThread;
    active?: boolean;
    busy?: boolean;
    meName?: string | null;
    mePicture?: string | null;
    mention?: MentionComposerView;
    meId?: number;
    workspaceId?: number;
  }>(),
  {
    meName: null,
    mePicture: null,
  },
);

const emit = defineEmits<{
  focus: [];
  resolve: [];
  accept: [];
  reject: [];
  reply: [content: JSONContent];
  deleteThread: [];
  deleteMessage: [messageId: number];
  "mention-load-more": [];
}>();

const replyEditor = shallowRef<Editor | null>(null);
const replyJson = ref<JSONContent | null>(null);
const replyEpoch = ref(0);

const rootMessage = computed(() => props.thread.messages[0] ?? null);

const rootPlain = computed(() => {
  if (!rootMessage.value) return "";
  return tiptapToPlainText(rootMessage.value.content, { stripFormatting: true }).trim();
});

const replies = computed(() => props.thread.messages.slice(1));

const when = computed(() => formatRelative(props.thread.createdAt));

const canReply = computed(() => {
  if (props.busy || !replyJson.value) return false;
  return tiptapToPlainText(replyJson.value, { stripFormatting: true }).trim().length > 0;
});

function formatRelative(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true }).replace(/^about /, "");
  } catch {
    return "";
  }
}

function messagePlain(msg: IDescriptionThreadMessage) {
  return tiptapToPlainText(msg.content, { stripFormatting: true }).trim();
}

function onReplyEditor(ed: Editor | null) {
  replyEditor.value = ed;
}

function onReplyJson(json: Record<string, unknown>) {
  replyJson.value = json as JSONContent;
}

function submitReply() {
  if (!canReply.value || !replyJson.value) return;
  emit("reply", normalizeTiptapDoc(replyJson.value));
  replyJson.value = null;
  replyEpoch.value += 1;
}

const actionBtnClass =
  "size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground";
</script>

<template>
  <article
    class="group/card flex flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-white text-[13px] text-[#1a1a1b] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-border dark:bg-background dark:text-foreground"
    :class="
      active ? 'border-[#d4d4d4] shadow-[0_1px_4px_rgba(0,0,0,0.1)] dark:ring-1 dark:ring-foreground/10' : ''
    "
    @click="emit('focus')"
  >
    <!-- Body -->
    <div class="flex flex-col gap-2.5 px-3.5 pt-3 pb-3">
      <header class="flex items-center gap-2 min-w-0">
        <UserAvatar
          :name="thread.createdBy.name"
          :picture="thread.createdBy.picture"
          size="sm"
          class="size-6 shrink-0"
        />
        <div class="min-w-0 flex-1 flex items-baseline gap-1.5 overflow-hidden">
          <span class="truncate font-semibold leading-none tracking-tight">{{ thread.createdBy.name }}</span>
          <span class="shrink-0 text-xs leading-none text-[#8a8f98] dark:text-muted-foreground tabular-nums">
            {{ when }}
          </span>
          <span
            v-if="thread.kind === 'suggestion'"
            class="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-sky-500/10 text-sky-800 dark:text-sky-200"
          >
            Suggest
          </span>
        </div>

        <div class="flex shrink-0 items-center gap-0.5">
          <template v-if="thread.kind === 'suggestion' && thread.status === 'open'">
            <button
              type="button"
              :class="actionBtnClass"
              title="Accept suggestion"
              :disabled="busy"
              @click.stop="emit('accept')"
            >
              <Check class="mx-auto size-3.5 opacity-70" stroke-width="2" />
            </button>
            <button
              type="button"
              :class="actionBtnClass"
              title="Reject suggestion"
              :disabled="busy"
              @click.stop="emit('reject')"
            >
              <X class="mx-auto size-3.5 opacity-70" stroke-width="2" />
            </button>
          </template>
          <button
            v-else-if="thread.status === 'open'"
            type="button"
            :class="actionBtnClass"
            title="Resolve"
            :disabled="busy"
            @click.stop="emit('resolve')"
          >
            <Check class="mx-auto size-3.5 opacity-70" stroke-width="2" />
          </button>
          <button type="button" :class="actionBtnClass" title="Add reaction" disabled>
            <SmilePlus class="mx-auto size-3.5 opacity-70" stroke-width="2" />
          </button>
          <Menu type="dropdown-menu">
            <MenuTrigger as-child>
              <button type="button" :class="actionBtnClass" title="More" :disabled="busy" @click.stop>
                <MoreHorizontal class="mx-auto size-3.5 opacity-70" stroke-width="2" />
              </button>
            </MenuTrigger>
            <MenuContent align="end" class="min-w-[9rem]">
              <MenuItem class="cursor-pointer text-sm text-destructive" @select="emit('deleteThread')">
                Delete thread
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      <div
        v-if="thread.kind === 'suggestion'"
        class="flex flex-col gap-0.5 rounded-md px-0 py-0.5 text-[13px] leading-relaxed"
      >
        <p v-if="thread.quoteText">
          <span class="text-[#8a8f98] dark:text-muted-foreground">with: </span>
          <span class="text-[#3b82f6] underline decoration-solid underline-offset-2">{{
            thread.quoteText
          }}</span>
        </p>
        <p v-if="thread.proposedText">
          <span class="text-[#8a8f98] dark:text-muted-foreground">replace: </span>
          <span
            class="text-[#9ca3af] underline decoration-dotted decoration-[#ef4444] underline-offset-[3px]"
            >{{ thread.proposedText }}</span
          >
        </p>
      </div>

      <p
        v-if="rootPlain && !(thread.kind === 'suggestion' && rootPlain === 'Suggested an edit')"
        class="whitespace-pre-wrap leading-[1.45] text-[#1a1a1b] dark:text-foreground"
      >
        {{ rootPlain }}
      </p>

      <div
        v-for="msg in replies"
        :key="msg.id"
        class="group/reply flex gap-2 border-t border-[#eee] pt-2.5 dark:border-border/60"
      >
        <UserAvatar
          :name="msg.author.name"
          :picture="msg.author.picture"
          size="xs"
          class="mt-0.5 size-5 shrink-0"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-1.5">
            <span class="truncate text-xs font-semibold">{{ msg.author.name }}</span>
            <span class="text-[11px] text-[#8a8f98] dark:text-muted-foreground tabular-nums">
              {{ formatRelative(msg.createdAt) }}
            </span>
            <Menu type="dropdown-menu">
              <MenuTrigger as-child>
                <button
                  type="button"
                  class="ml-auto size-6 rounded-md text-muted-foreground opacity-0 hover:bg-muted/80 group-hover/reply:opacity-100"
                  title="More"
                  :disabled="busy"
                  @click.stop
                >
                  <MoreHorizontal class="mx-auto size-3 opacity-70" />
                </button>
              </MenuTrigger>
              <MenuContent align="end" class="min-w-[8rem]">
                <MenuItem
                  class="cursor-pointer text-sm text-destructive"
                  @select="emit('deleteMessage', msg.id)"
                >
                  Delete reply
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
          <p class="mt-0.5 whitespace-pre-wrap leading-[1.45]">{{ messagePlain(msg) }}</p>
        </div>
      </div>
    </div>

    <!-- Reply footer -->
    <div
      v-if="thread.status === 'open'"
      class="flex items-end gap-2 border-t border-[#e8e8e8] bg-white px-3 py-2 dark:border-border dark:bg-background"
      @click.stop
    >
      <UserAvatar v-if="meName" :name="meName" :picture="mePicture" size="xs" class="mb-1 size-5 shrink-0" />
      <div v-else class="mb-1 size-5 shrink-0 rounded-full bg-[#ececec] dark:bg-muted" aria-hidden="true" />
      <div
        :key="replyEpoch"
        class="min-w-0 flex-1 [&_.ProseMirror]:min-h-[2.25rem] [&_.ProseMirror]:max-h-28 [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:text-[13px] [&_.ProseMirror]:leading-relaxed"
      >
        <RichTextComposer
          :mention="mention"
          :me-id="meId"
          :workspace-id="workspaceId"
          placeholder="Reply…"
          @mention-load-more="emit('mention-load-more')"
          @update:editor="onReplyEditor"
          @update:json="onReplyJson"
          @submit="submitReply"
        >
          <template #bubbleMenu="{ editor: bubbleEditor }">
            <div
              data-epicstory-bubble-menu
              class="flex items-center gap-0.5 z-[90] max-w-[min(100vw-1rem,18rem)] overflow-x-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
              @mousedown.prevent
            >
              <MessageComposerActions :editor="bubbleEditor" />
            </div>
          </template>
        </RichTextComposer>
      </div>
      <button
        type="button"
        class="mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-[#e1e1e1] text-[#8a8f98] transition-colors hover:border-[#cfcfcf] hover:text-foreground disabled:opacity-40 dark:border-border"
        :disabled="!canReply"
        title="Send reply"
        @click="submitReply"
      >
        <ArrowUp class="size-3" stroke-width="2.25" />
      </button>
    </div>
  </article>
</template>
