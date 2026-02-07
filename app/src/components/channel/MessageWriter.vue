<script lang="ts" setup>
import { computed, nextTick, ref } from "vue";
import { Icon } from "@/design-system/icons";
import { Button } from "@/design-system/ui/button";
import { Separator } from "@/design-system/ui/separator";
import { vTextareaAutosize } from "@/design-system/directives";
import { startRecording } from "@/core/screen-recording";

type Mentionable = {
  id: number;
  name: string;
  picture?: string | null;
};

const props = defineProps<{
  mentionables?: Mentionable[];
  meId?: number;
}>();

const emit = defineEmits<{
  (e: "send-message", value: { content: string }): void;
}>();

const messageContent = defineModel<string>("messageContent");
const messageTextEl = ref<HTMLTextAreaElement | null>(null);

const isMentionMenuOpen = ref(false);
const mentionQuery = ref("");
const mentionAtIndex = ref<number | null>(null);

function getCaret(): number {
  const el = messageTextEl.value;
  return el?.selectionStart ?? (messageContent.value?.length ?? 0);
}

function getMentionContext(text: string, caret: number) {
  const uptoCaret = text.slice(0, caret);
  const at = uptoCaret.lastIndexOf("@");
  if (at === -1) return null;

  const charBefore = at > 0 ? uptoCaret[at - 1] : " ";
  if (charBefore && !/\s/.test(charBefore)) return null;

  const query = uptoCaret.slice(at + 1);
  if (query.includes(" ") || query.includes("\n")) return null;
  return { at, query };
}

function updateMentionStateFromCaret() {
  const text = messageContent.value ?? "";
  const caret = getCaret();
  const ctx = getMentionContext(text, caret);
  if (!ctx) {
    isMentionMenuOpen.value = false;
    mentionQuery.value = "";
    mentionAtIndex.value = null;
    return;
  }

  isMentionMenuOpen.value = true;
  mentionQuery.value = ctx.query;
  mentionAtIndex.value = ctx.at;
}

const filteredMentionables = computed(() => {
  const list = props.mentionables ?? [];
  const meId = props.meId;
  const q = mentionQuery.value.trim().toLowerCase();

  return list
    .filter((u) => (meId ? u.id !== meId : true))
    .filter((u) => {
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || String(u.id).startsWith(q);
    })
    .slice(0, 8);
});

async function insertMention(user: Mentionable) {
  const text = messageContent.value ?? "";
  const caret = getCaret();
  const at = mentionAtIndex.value;
  if (at === null) return;

  const before = text.slice(0, at);
  const after = text.slice(caret);
  const inserted = `@${user.id} `;
  const next = `${before}${inserted}${after}`;

  messageContent.value = next;
  isMentionMenuOpen.value = false;
  mentionQuery.value = "";
  mentionAtIndex.value = null;

  await nextTick();
  const el = messageTextEl.value;
  if (!el) return;
  const nextCaret = (before + inserted).length;
  el.focus();
  el.setSelectionRange(nextCaret, nextCaret);
}

async function onOpenMentions() {
  const el = messageTextEl.value;
  if (!el) return;

  const text = messageContent.value ?? "";
  const caret = getCaret();
  const ctx = getMentionContext(text, caret);
  if (ctx) {
    updateMentionStateFromCaret();
    return;
  }

  // Insert '@' at the caret to start a mention.
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  messageContent.value = `${before}@${after}`;

  await nextTick();
  el.focus();
  el.setSelectionRange(caret + 1, caret + 1);
  updateMentionStateFromCaret();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isMentionMenuOpen.value) {
    isMentionMenuOpen.value = false;
    return;
  }

  // Keep mention menu in sync while typing/navigating.
  if (
    e.key.length === 1 ||
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight"
  ) {
    nextTick(updateMentionStateFromCaret);
  }
}

function onSendMessage() {
  emit("send-message", { content: messageContent.value ?? "" });
  messageContent.value = "";
}

const isRecording = ref(false);
const stopRecording = ref<(() => void) | null>(null);

const secondsElapsed = ref(0);
const counter = ref<ReturnType<typeof setInterval> | null>(null);

async function onToggleRecording(e: MouseEvent) {
  if (!isRecording.value) {
    secondsElapsed.value = 0;
    isRecording.value = true;
    stopRecording.value = await startRecording();
    counter.value = setInterval(() => {
      secondsElapsed.value++;
    }, 1000);
  } else {
    counter.value && clearInterval(counter.value);
    counter.value = null;
    stopRecording.value?.();
    stopRecording.value = null;
    isRecording.value = false;
  }
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}
</script>

<template>
  <div
    class="flex:col-md p-3 border border-zinc-200 rounded-xl bg-white focus-within:outline outline-1 outline-zinc-300/60"
    @click="messageTextEl?.focus()">
    <div class="relative">
      <textarea v-model="messageContent" v-textarea-autosize min-rows="2" max-rows="10"
        placeholder="Send a message to channel..."
        class="w-full flex-1 px-2 text-sm rounded-md resize-none outline-none" ref="messageTextEl"
        @keydown.ctrl.enter="onSendMessage" @keydown.exact="onKeydown" @input="updateMentionStateFromCaret"
        @click="updateMentionStateFromCaret" />

      <div v-if="isMentionMenuOpen && filteredMentionables.length > 0"
        class="absolute left-2 right-2 bottom-full mb-2 rounded-lg border bg-white shadow-lg overflow-hidden z-50">
        <div class="px-3 py-2 text-xs text-secondary-foreground border-b font-dmSans">
          Mention a person (inserts <span class="font-mono">@&lt;userId&gt;</span>)
        </div>
        <button v-for="u in filteredMentionables" :key="u.id" type="button"
          class="w-full flex:row-md items-center px-3 py-2 hover:bg-secondary transition-colors text-left"
          @click.stop="insertMention(u)">
          <img v-if="u.picture" :src="u.picture" :alt="u.name" class="w-7 h-7 rounded-full flex-shrink-0" />
          <div v-else
            class="w-7 h-7 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold text-xs">
            {{ u.name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-foreground font-lato truncate">{{ u.name }}</div>
            <div class="text-xs text-secondary-foreground font-dmSans">ID: {{ u.id }}</div>
          </div>
        </button>
      </div>
    </div>

    <div class="flex:row-xl flex:center-y text-secondary-foreground">
      <Button variant="ghost" size="icon" @click="onToggleRecording">
        <Icon v-if="!isRecording" name="bi-camera-video" class="w-6 h-6" />
        <template v-else>
          <Icon name="ri-record-circle-fill" class="w-6 h-6 text-red-500" />
          <span class="text-xs ml-1 text-red-400">{{ formatTime(secondsElapsed) }}</span>
        </template>
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="bi-mic" class="w-6 h-6" />
      </Button>
      <Separator orientation="vertical" class="h-8 bg-zinc-300" />
      <Button variant="ghost" size="icon">
        <Icon name="co-smile" class="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="icon" @click="onOpenMentions">
        <Icon name="oi-mention" class="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="bi-image" class="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="icon">
        <Icon name="ri-attachment-2" class="w-6 h-6" />
      </Button>

      <div class="flex-1"></div>

      <Button legacy legacy-variant="primary" legacy-size="sm" class="flex:row-lg flex:center-y text-sm bg-[#3A66FF]"
        @click="onSendMessage">
        <Icon name="io-paper-plane" />
        Send
      </Button>
    </div>
  </div>
</template>
