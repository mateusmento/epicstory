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
    outline: false,
  }
);

type ButtonType = 'default' | 'primary' | 'secondary';

const buttonCss = computed(() => [
  'button',
  `button--${props.variant}`,
  !!props.outline && 'button--outline',
]);
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

.button--outline {
  border-color: var(--bg-color);
  color: var(--bg-color);
  background-color: transparent;
  &:hover {
    background-color: var(--bg-color);
    color: var(--text-color);
  }
}

.button:active {
  background-color: var(--active-color);
}

.button--default {
  --text-color: #{$dark-grey-blue};
  --bg-color: white;
  --active-color: #{$grey-blue};
}

.button--primary {
  --text-color: white;
  --bg-color: #{$blue};
  --active-color: #{$dark-blue};
  outline-color: #{$light-blue};
}

.button--secondary {
  --text-color: #{$dark-grey-blue};
  --bg-color: #{$grey-blue};
  --active-color: #cfc9da;
}
</style>
