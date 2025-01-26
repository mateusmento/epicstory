<script lang="ts" setup>
import { FormControl, FormField, FormItem, FormLabel, Input } from "@/design-system";
import { omit, pick } from "lodash";
import uniqid from "uniqid";
import { computed, inject, provide, ref, type InputHTMLAttributes } from "vue";

defineOptions({
  inheritAttrs: false,
});

interface Props extends /* @vue-ignore */ InputHTMLAttributes {
  label?: string;
  name?: string;
  classInput?: any;
}

const props = defineProps<Props>();

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
  <FormField v-slot="{ componentField }" v-bind="omit($attrs, 'class', 'id')" name="email" required>
    <FormItem v-bind="pick($attrs, 'class', 'id') as any">
      <FormLabel v-if="label" class="text-foreground" :for="fieldId">{{ label }}</FormLabel>
      <FormControl>
        <Input v-bind="componentField" :id="fieldId" :class="classInput" />
      </FormControl>
    </FormItem>
  </FormField>
</template>

<style scoped></style>
