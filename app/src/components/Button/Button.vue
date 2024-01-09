<script lang="ts" setup>
export type ButtonVariant = 'default' | 'primary';
export type ButtonSize = 'th' | 'sm' | 'md' | 'lg' | 'xl';

const props = withDefaults(
  defineProps<{
    title?: string;
    variant: ButtonVariant;
    size: ButtonSize;
    highlight: boolean;
  }>(),
  {
    variant: 'default',
    size: 'md',
    highlight: false,
  }
);
</script>

<template>
  <button
    :class="[
      'button',
      `button--${props.variant}`,
      `button--${props.size}`,
      props.highlight && 'button--highlight',
    ]"
  >
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
    background-color: var(--active-color);
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
  outline-width: 4px;
  font-size: 1.2rem;
  font-weight: 700;
}

.button--default {
  --border-color: #ccc;
  --bg-color: #fff;
  --text-color: #{$black};
  --active-color: #f6f6f6;

  outline-color: #dedede;
  box-shadow: 0 1px 1px #ccc;

  &:active {
    box-shadow:
      0 0px 0px #ddd,
      inset 0 2px 4px #ddd;
  }
}

.button--primary {
  --text-color: white;
  --border-color: #{$blue};
  --bg-color: #{$blue};
  --active-color: #3734f1;

  outline-color: #c4d5ff;

  &:active {
    box-shadow: inset 0 1px 2px #0300c2;
  }

  &:is(.button--lg, .button-xl):active {
    box-shadow: inset 0 2px 4px #0300c2;
  }
}

.button--primary.button--highlight {
  &:is(.button--th, .button--sm) {
    box-shadow: inset 0 1px 1px 1px #577fff;
    border: 1px solid $blue;
  }

  &:is(.button--md, .button--lg) {
    box-shadow: inset 0 1px 1px 1px #577fff;
    border: 1px solid $blue;
  }

  &.button--xl {
    box-shadow: inset 0 1px 1px 2px #3f6cff;
    border: 2px solid $blue;
  }

  &:active {
    box-shadow: inset 0 1px 2px #0300c2;
  }

  &:is(.button--lg, .button--xl):active {
    box-shadow: inset 0 2px 4px #0300c2;
  }
}
</style>
