<script lang="ts" setup>
import { nextTick, onUpdated, ref } from "vue";

const messagesEl = ref<HTMLElement | null>(null);

onUpdated(() => scrollMessagesToBottom());

function scrollMessagesToBottom() {
  nextTick(() => messagesEl.value && scrollToBottom(messagesEl.value));
}

function scrollToBottom(el: HTMLElement) {
  el.scrollTop = el.scrollHeight - el.clientHeight;
}
</script>

<template>
  <div class="scrollable" ref="messagesEl">
    <slot />
  </div>
</template>

<style scoped>
.scrollable {
  overflow: overlay;
}
</style>
