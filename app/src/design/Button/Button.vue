<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    title?: string;
    variant: ButtonVariant;
    size: ButtonSize;
  }>(),
  {
    title: 'Hello',
    variant: 'default',
    size: 'md',
  }
);

type ButtonVariant = 'default' | 'primary';
type ButtonSize = 'th' | 'sm' | 'md' | 'lg' | 'xl';
</script>

<template>
  <button :class="['button', `button--${props.variant}`, `button--${props.size}`]">
    <slot>{{ title }}</slot>
  </button>
</template>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.button {
  font-weight: 600;
  border-color: var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-color);

  transition:
    box-shadow 50ms,
    background-color 100ms;

  &:hover {
    /* background-color: var(--active-color); */
  }
}

.button--default {
  --border-color: #ccc;
  --bg-color: #fff;
  --text-color: #{$dark-grey-blue};
  --active-color: #eee;

  box-shadow: 0 1px 1px #ccc;

  &:active {
    box-shadow:
      0 0px 0px #ccc,
      inset 0 2px 4px #ccc;
  }
}

.button--primary {
  --text-color: white;
  --border-color: #{$blue};
  --bg-color: #{$blue};
  --active-color: #{$dark-blue};

  outline-color: #c4d5ff;

  &:active {
    box-shadow: inset 0 2px 4px #0300a1;
  }
}

.button--th {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  outline-width: 2px;
}

.button--sm {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  outline-width: 2px;
}

.button--md {
  padding: 12px 16px;
  border-radius: 4px;
}

.button--lg {
  padding: 16px 32px;
  border-radius: 6px;
  font-size: 1rem;
}

.button--xl {
  padding: 18px 64px;
  border-radius: 8px;
  font-size: 1.2rem;
  outline-width: 4px;
}
</style>
