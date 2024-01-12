<script lang="ts" setup>
import { inject } from 'vue';

defineProps<{
  name?: string;
}>();

const activeMenuItem = inject('activeMenuItem');
</script>

<template>
  <div
    class="menu-item"
    :class="{ active: activeMenuItem === name }"
    @click="activeMenuItem = name"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;

  border-radius: 8px;
  padding: 6px 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 1.1rem;
  color: #57575e;
  transition: 100ms;

  &:is(:hover, .active):not(.isInboxOpen) {
    background-color: white;
    border-color: #dadada;
    box-shadow: 0 1px 1px #ddd;
    color: #000;
  }

  &.isInboxOpen {
    color: #000;
    &:not(:hover) {
      background-color: #e5e5e5;
      border-color: #e5e5e5;
    }
  }
}
</style>
