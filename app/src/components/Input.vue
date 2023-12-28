<script lang="ts" setup>
import { computed, inject, ref } from 'vue';

const state = ref();

const field = inject('field', {
  get: () => state.value,
  set: (value: any) => (state.value = value),
});

const value = computed({
  get: () => field.get(),
  set: (value: any) => {
    state.value = value;
    field.set(value);
  },
});
</script>

<template>
  <input v-bind="$attrs" v-model="value" />
</template>
