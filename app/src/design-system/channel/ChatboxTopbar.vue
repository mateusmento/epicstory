<script lang="ts" setup>
defineProps<{
  chatTitle?: string;
  chatPicture?: string;
}>();
</script>

<template>
  <div class="topbar flex gap-2.5 border-b border-zinc-200">
    <img v-if="chatPicture" :src="chatPicture" class="channel-photo" />

    <div v-else class="channel-photos">
      <div class="channel-photo" style="background: #b2bdbd"></div>
      <div class="channel-photo" style="background: #ccc9c6"></div>
      <div class="channel-photo" style="background: #bcc2bc"></div>
    </div>

    <div class="flex:rows g-0.5">
      <div class="channel-name font-dmSans">{{ chatTitle }}</div>
      <div class="font-dmSans text-[12px] text-[#888]">{{ chatTitle }} is typing something...</div>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.channel-photos {
  height: 42px;
  justify-content: flex-start;
  align-items: center;
  display: inline-flex;
}

.channel-photo {
  width: 42px;
  height: 42px;
  position: relative;
  border-radius: 42px;
}

.channel-photo:not(:first-of-type) {
  margin-left: -30px;
}

.channel-name {
  font-weight: 500;
  font-size: 16px;
}

.topbar {
  padding: 12px;
}
</style>
