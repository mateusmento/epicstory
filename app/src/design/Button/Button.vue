<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    variant: ButtonType;
    outline: boolean;
  }>(),
  {
    type: 'default',
    title: 'Hello',
  }
);

type ButtonType = 'default' | 'primary' | 'secondary';

const buttonCss = computed(() => ['button', `button--${props.type}`]);
</script>

<template>
  <button :class="buttonCss">
    <slot>{{ title }}</slot>
  </button>
</template>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.button {
  font-weight: 600;
}

.button--default {
  background-color: white;
}

.button--primary {
  background-color: $blue;
  color: white;

  &:hover {
    background-color: $dark-blue;
  }
}

.button--secondary {
  background-color: $grey-blue;
  color: $dark-grey-blue;
  &:hover {
    background-color: #cfc9da;
  }
}
</style>
