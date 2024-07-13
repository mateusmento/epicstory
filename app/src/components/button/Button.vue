<script lang="ts" setup>
export type ButtonVariant = 'default' | 'primary' | 'invitational';
export type ButtonSize = 'th' | 'sm' | 'md' | 'lg' | 'xl';

const props = withDefaults(
  defineProps<{
    title?: string;
    variant: ButtonVariant;
    size: ButtonSize;
  }>(),
  {
    variant: 'default',
    size: 'md',
  },
);
</script>

<template>
  <button :class="['button', `button--${props.variant}`, `button--${props.size}`]">
    <slot>{{ title }}</slot>
  </button>
</template>

<style scoped>
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
  /* font-size: 0.8rem; */
  outline-width: 2px;
}

.button--sm {
  padding: 6px 12px;
  border-radius: 6px;
  /* font-size: 0.9rem; */
  outline-width: 3px;
}

.button--md {
  padding: 8px 16px;
  border-radius: 6px;
  /* font-size: 0.9rem; */
  /* font-size: 1rem; */
  outline-width: 3px;
}

.button--lg {
  padding: 16px 32px;
  border-radius: 10px;
  font-size: 1.1rem;
  outline-width: 4px;
}

.button--xl {
  padding: 18px 64px;
  border-radius: 10px;
  outline-width: 4px;
  font-size: 1.2rem;
}

.button--default {
  --border-color: #ccc;
  --bg-color: #fff;
  --text-color: var(--black);
  --active-color: #f6f6f6;

  outline-color: #dedede;
  box-shadow: 0 1px 1px #ccc;

  &:active {
    box-shadow:
      0 0px 0px #ddd,
      inset 0 2px 4px #ddd;
  }
}

.button--primary,
.button--invitational {
  --text-color: white;
  --border-color: var(--blue);
  --bg-color: var(--blue);
  --active-color: #3734f1;

  outline-color: #c4d5ff;

  &:active {
    box-shadow: inset 0 1px 2px #0300c2;
  }

  &:is(.button--lg, .button-xl):active {
    box-shadow: inset 0 2px 4px #0300c2;
  }
}

.button--invitational {
  &:is(.button--th, .button--sm) {
    box-shadow: inset 0 0px 0px 1px #577fff;
    border: 1px solid var(--blue);
  }

  &:is(.button--md, .button--lg) {
    box-shadow: inset 0 0px 0px 2px #577fff;
    border: 1px solid var(--blue);
  }

  &.button--xl {
    box-shadow: inset 0 1px 1px 2px #3f6cff;
    border: 2px solid var(--blue);
  }

  &:active {
    box-shadow: inset 0 1px 2px #0300c2;
  }

  &:is(.button--lg, .button--xl):active {
    box-shadow: inset 0 2px 4px #0300c2;
  }
}
</style>
