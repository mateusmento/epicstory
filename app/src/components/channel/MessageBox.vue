<script lang="ts" setup>
import IconEmoji from "@/design-system/icons/IconEmoji.vue";
import { cva } from "class-variance-authority";
import { inject, ref } from "vue";
import seanPhoto from "@/assets/images/sean.png";
import { Button, Input } from "@/design-system";
import { Icon } from "@/design-system/icons";

const props = defineProps<{
  content: string;
}>();

const isDiscussionOpen = ref(true);

function useMessageGroup() {
  const context = inject<{ meId: number; sender: "me" | "someoneElse" }>("messageGroup");
  if (!context) throw new Error("MessageGroup not provided. Use MessageBox inside a MessageGroup.");
  return context;
}

const { sender } = useMessageGroup();

function toggleDiscussion() {
  isDiscussionOpen.value = !isDiscussionOpen.value;
}
</script>

<template>
  <div class="group flex:row-lg flex:center-y">
    <Button variant="ghost" size="icon">
      <Icon
        v-if="!isDiscussionOpen"
        name="hi-reply"
        class="w-4 h-4 group-hover:visible invisible text-secondary-foreground"
        @click="toggleDiscussion"
      />
    </Button>
    <div class="flex:col-lg bg-[#F9F9F9] border border-[#E4E4E4] rounded-2xl relative">
      <div :class="styles.messageBox({ sender })">
        {{ content }}
        <div class="" :class="styles.emoji({ sender })">
          <IconEmoji />
        </div>
      </div>

      <div class="flex:col-xl p-2 pt-0" v-if="isDiscussionOpen">
        <div class="flex:row-2xl flex:center-y">
          <Button
            variant="outline"
            size="icon"
            class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]"
          >
            👍 1
          </Button>

          <Button variant="ghost" size="icon">
            <IconEmoji class="text-[#686870]" />
          </Button>

          <Button variant="ghost" size="icon" class="text-xs text-[#686870]" @click="toggleDiscussion">
            {{ isDiscussionOpen ? "Hide discussion" : "Show discussion" }}
          </Button>
        </div>

        <template v-if="isDiscussionOpen">
          <div class="px-2">
            <div class="flex:row-md">
              <img :src="seanPhoto" class="w-10 h-10 rounded-full" />
              <div class="flex:col-md">
                <div class="flex:row-md flex:center-y">
                  <div class="text-foreground font-lato font-semibold">Sean</div>
                  <div class="ml-auto text-[#686870] font-dmSans text-xs">3 min ago</div>
                </div>
                <div class="text-[15px] font-lato">
                  It's getting some final refinements before we ship it.
                </div>
              </div>
            </div>
          </div>

          <div class="flex:row-lg">
            <div
              class="flex:row flex:center-y flex-1 h-10 py-4 px-4 bg-white text-[#686870] border border-[#E4E4E4] rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:ring-zinc-300"
            >
              <input
                placeholder="Reply..."
                class="mr-auto p-0 h-fit outline-none border-none font-lato placeholder:font-lato placeholder:text-[15px] text-[15px]"
              />

              <Button variant="ghost" size="icon">
                <Icon name="bi-camera-video" class="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="bi-mic" class="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="bi-image" class="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="ri-attachment-2" class="w-6 h-6" />
              </Button>
            </div>
            <Button
              variant="ghost"
              class="flex:row flex:center bg-[#3A66FF] w-10 h-10 gap-2 rounded-lg text-white"
            >
              <Icon name="io-paper-plane" />
            </Button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const styles = {
  messageContainer: cva("flex:col-md bg-secondary w-fit min-w-40 max-w-[35rem]", {
    variants: {
      sender: {
        me: "self-end first:rounded-tr-none",
        someoneElse: "first:rounded-tl-none",
      },
    },
  }),
  messageWrapper: cva("flex:row-lg flex:center-y", {
    variants: {
      sender: {
        me: "flex:row-auto flex:center-y",
        someoneElse: "flex:row-auto flex:center-y",
      },
    },
  }),
  messageBox: cva(
    [
      "group",
      "flex:row-auto flex:center-y",
      "min-w-40 max-w-[35rem] px-3 py-1 border border-[#E4E4E4]",
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
  emoji: cva("p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", {
    variants: {
      sender: {
        me: "text-zinc-50 ",
        someoneElse: "text-[#686870] hover:bg-secondary",
      },
    },
  }),
};
</script>
