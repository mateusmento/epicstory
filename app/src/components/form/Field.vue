<script lang="ts" setup>
import { FormControl, FormField, FormItem, FormLabel, Input } from "@/design-system";
import { omit, pick } from "lodash";
import uniqid from "uniqid";
import { computed, inject, provide, ref, useAttrs } from "vue";

defineOptions({
  inheritAttrs: false,
});

/**
 * Explicit API for this wrapper. Common input props are listed so TSX can pass them;
 * anything else still comes through `useAttrs()` (e.g. `data-testid`).
 */
type Props = {
  label?: string;
  name: string;
  classInput?: any;
  type?: string;
  placeholder?: string;
  autocomplete?: string;
  disabled?: boolean;
  readonly?: boolean;
};

const props = defineProps<Props>();
const attrs = useAttrs();

const form = inject<any>("form");

/** Declared props are omitted from `attrs`; merge them back for vee-validate's `Field`. */
const formFieldAttrs = computed(() => {
  const base = omit({ ...(attrs as Record<string, unknown>) }, "class", "id");
  if (props.type !== undefined) base.type = props.type;
  if (props.placeholder !== undefined) base.placeholder = props.placeholder;
  if (props.autocomplete !== undefined) base.autocomplete = props.autocomplete;
  if (props.disabled !== undefined) base.disabled = props.disabled;
  if (props.readonly !== undefined) base.readonly = props.readonly;
  return base;
});

function fieldName(): string {
  return props.name;
}

const field = {
  get: (): string | undefined => {
    if (modelValue.value) return modelValue.value;
    const n = fieldName();
    if (n !== undefined) return form?.get(n);
    return data.value;
  },
  set: (value: any) => {
    data.value = value;
    modelValue.value = value;
    form?.set(fieldName(), value);
  },
};

provide("field", field);

const [modelValue] = defineModel<string | undefined>();
const data = ref<string | undefined>(field.get());

const fieldId = computed((): string => {
  const name = fieldName();
  const prefix = name.length > 0 ? `${name}-` : "";
  return uniqid(prefix);
});
</script>

<template>
  <FormField v-slot="{ componentField }" v-bind="formFieldAttrs" :name="name" required>
    <FormItem v-bind="pick($attrs, 'class', 'id') as any">
      <FormLabel v-if="label" class="text-foreground" :for="fieldId">{{ label }}</FormLabel>
      <FormControl>
        <Input v-bind="componentField" :id="fieldId" :class="classInput" />
      </FormControl>
    </FormItem>
  </FormField>
</template>

<style scoped></style>
