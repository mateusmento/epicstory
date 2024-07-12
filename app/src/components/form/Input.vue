<script lang="ts" setup>
import { computed, inject, ref } from "vue";

const state = ref();

const field = inject("field") as any;

const value = computed({
  get: () => {
    return field.get();
  },
  set: (value: any) => {
    state.value = value;
    field.set(value);
  },
});
</script>

<template>
  <input v-bind="$attrs" v-model="value" />
</template>
