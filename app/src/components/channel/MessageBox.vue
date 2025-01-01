<script lang="ts" setup>
import IconEmoji from "@/design-system/icons/IconEmoji.vue";
import { cva } from "class-variance-authority";
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
      "flex:cols-auto flex:center-y",
      "w-fit min-w-40 max-w-[35rem] px-3 py-1 border border-[#E4E4E4]",
      "first:rounded-t-xl last:rounded-b-xl rounded-lg",
      "shadow-sm text-[15px] font-lato",
    ].join(" "),
    {
      variants: {
        sender: {
          me: "self-end first:rounded-tr-none bg-[#3A66FF] text-zinc-50 border-none shadow-none",
          someoneElse: "first:rounded-tl-none",
        },
      },
    },
  ),
  emoji: cva("p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", {
    variants: {
      sender: {
        me: "text-zinc-50 ",
        someoneElse: "text-[#686870] hover:bg-zinc-200/60",
      },
    },
  }),
};
</script>

<template>
  <div :class="styles.messageBox({ sender })">
    {{ content }}
    <div class="" :class="styles.emoji({ sender })">
      <IconEmoji />
    </div>
  </div>
</template>
