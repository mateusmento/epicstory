<script lang="ts" setup>
import { provide, ref } from 'vue';

const activeMenuItem = ref<string>();
const secondaryActiveMenuItem = ref<string>();

provide('activeMenuItem', activeMenuItem);
provide('secondaryActiveMenuItem', secondaryActiveMenuItem);
</script>

<template>
  <div class="menu flex:rows-th px-lg pt-lg">
    <slot />
  </div>
</template>
