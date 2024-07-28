<script lang="ts" setup>
import { FormControl, FormField, FormItem, FormLabel, Input } from "@/design-system";
import { omit, pick } from "lodash";
import uniqid from "uniqid";
import { computed, type InputHTMLAttributes } from "vue";

defineOptions({
  inheritAttrs: false,
});

interface Props extends /* @vue-ignore */ InputHTMLAttributes {
  label?: string;
  name: string;
  classes?: { input?: string };
}

const props = defineProps<Props>();

const fieldId = computed(() => uniqid(props.name ? props.name + "-" : ""));
</script>

<template>
  <FormField v-slot="{ componentField }" v-bind="omit($attrs, 'class', 'id')" :name="name" required>
    <FormItem v-if="$attrs.type !== 'hidden'" v-bind="pick($attrs, 'class', 'id') as any">
      <FormLabel v-if="label" class="text-neutral-800" :for="fieldId">{{ label }}</FormLabel>
      <FormControl>
        <Input v-bind="{ ...$attrs, ...componentField }" :id="fieldId" :class="classes?.input" />
      </FormControl>
    </FormItem>
  </FormField>
</template>

<style scoped></style>
