<script lang="ts" setup>
import { cva } from "class-variance-authority";
import IconEmoji from "../icons/IconEmoji.vue";
import { inject } from "vue";

const props = defineProps<{
  content: string;
}>();

function useMessageGroup() {
  const context = inject<{ meId: number; sender: "me" | "someoneElse" }>("messageGroup");
  if (!context) throw new Error("MessageGroup not provided. Use MessageBox inside a MessageGroup.");
  return context;
}

const { sender } = useMessageGroup();

const styles = {
  messageBox: cva(
    [
      "group",
      "flex:cols-auto items-end",
      "px-3 py-1 border border-[#E4E4E4]",
      "first:rounded-t-xl last:rounded-b-xl rounded-lg",
      "shadow-sm text-[15px] font-lato",
    ].join(" "),
    {
      variants: {
        sender: {
          me: "first:rounded-tr-none bg-[#3A66FF] text-zinc-50 border-none shadow-none",
          someoneElse: "first:rounded-tl-none",
        },
      },
    },
  ),
};
</script>

<template>
  <div :class="styles.messageBox({ sender })">
    {{ content }}
    <div
      class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-zinc-200/60 rounded-full p-1"
    >
      <IconEmoji />
    </div>
  </div>
</template>
