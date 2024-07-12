<script lang="ts" setup>
import { provide, ref, watch } from "vue";
import { get, set } from "lodash";

const props = withDefaults(
  defineProps<{
    modelValue?: any;
    mode?: "create" | "update";
  }>(),
  {
    mode: "create",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: any): void;
  (e: "submit", data: any): void;
}>();

const data = ref(props.modelValue ?? {});
const previous = ref(props.modelValue ?? {});
const changes = ref({});

watch(data, (v) => props.modelValue !== v && emit("update:modelValue", v));
watch(
  () => props.modelValue,
  (v) => data.value !== v && (data.value = v),
);

provide("form", {
  get: (field: string) => {
    return get(data.value, field);
  },
  set: (field: string, value: any) => {
    changes.value = set({ ...changes.value }, field, value);
    data.value = set({ ...data.value }, field, value);
  },
});

function submit() {
  emit("submit", { ...changes.value });
  previous.value = data.value;
  // clear();
}

function reset() {
  if (props.mode === "update") revert();
  else clear();
}

function revert() {
  data.value = previous.value;
  changes.value = {};
}

function clear() {
  if (props.mode === "create") data.value = {};
  changes.value = {};
}
</script>

<template>
  <form v-bind="$attrs" @submit.prevent="submit" @reset.prevent="reset">
    <slot />
  </form>
</template>
