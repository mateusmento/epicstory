<script lang="ts" setup>
import { computed, inject, provide, ref } from "vue";
import Input from "./Input.vue";
import uniqid from "uniqid";
import { omit, pick } from "lodash";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  label?: string;
  name?: string;
  classInput?: any;
}>();

const form = inject<any>("form");

const field = {
  get: (): string | undefined => {
    if (modelValue.value) return modelValue.value;
    if (typeof props.name === "string") return form?.get(props.name);
    return data.value;
  },
  set: (value: any) => {
    data.value = value;
    modelValue.value = value;
    if ("label" in props) form?.set(props.name, value);
  },
};

provide("field", field);

const [modelValue] = defineModel<string | undefined>();
const data = ref<string | undefined>(field.get());

const fieldId = computed(() => uniqid(props.name ? props.name + "-" : ""));
</script>

<template>
  <div class="field" v-bind="pick($attrs, 'class', 'id') as any">
    <label v-if="label" class="text-neutral-800" :for="fieldId">{{ label }}</label>
    <slot>
      <Input v-bind="omit($attrs, 'class', 'id')" :id="fieldId" :class="classInput" />
    </slot>
  </div>
</template>

<style scoped>
.field {
  /* color: #aaa; */
}
</style>
