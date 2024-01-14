<script lang="ts" setup>
import { inject, ref, type Ref } from 'vue';

const props = withDefaults(
  defineProps<{
    name?: string;
    secondary: boolean;
  }>(),
  {
    secondary: false,
  }
);

const activeMenuItem = inject<Ref<string | undefined>>('activeMenuItem', ref<string>());

const secondaryActiveMenuItem = inject<Ref<string | undefined>>(
  'secondaryActiveMenuItem',
  ref<string>()
);

function activateMenuItem() {
  if (props.secondary) {
    secondaryActiveMenuItem.value =
      secondaryActiveMenuItem.value === props.name ? undefined : props.name;
  } else {
    activeMenuItem.value = activeMenuItem.value === props.name ? undefined : props.name;
  }
}
</script>

<template>
  <div
    class="menu-item"
    :class="{ active: activeMenuItem === name, secondaryActive: secondaryActiveMenuItem === name }"
    @click="activateMenuItem"
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
  color: #686870;
  transition: 100ms;

  &:hover {
    color: #000;
  }

  &.active {
    background-color: white;
    border-color: #dadada;
    box-shadow: 0 1px 1px #ddd;
    color: #000;
    font-weight: 500;
  }

  &.secondaryActive {
    color: #000;
    font-weight: 500;
    &:not(:hover) {
      background-color: #e5e5e5;
      border-color: #e5e5e5;
    }
  }
}
</style>
