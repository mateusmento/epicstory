<script lang="ts" setup>
defineProps<{
  chatTitle?: string;
  chatPicture?: string;
}>();

const emit = defineEmits(["more-details"]);
</script>

<template>
  <div class="flex:row-xl flex:center-y p-2 h-14">
    <img :src="chatPicture" class="h-9 w-9 rounded-full" />

    <div class="flex:col" @click="emit('more-details')">
      <div class="text-base font-medium font-dmSans">{{ chatTitle }}</div>
      <div class="font-dmSans text-[13px] text-[#888]">{{ chatTitle }} is typing something...</div>
    </div>

    <slot />
  </div>
</template>
