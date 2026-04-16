<script lang="ts" setup>
import { FormControl, FormField, FormItem, FormLabel, Input } from "@/design-system";
import { omit, pick } from "lodash";
import uniqid from "uniqid";
import { computed } from "vue";

defineOptions({
  inheritAttrs: false,
});

/** Native `<input>` attributes (`type`, `placeholder`, …) use fallthrough `$attrs`. */
type Props = {
  label?: string;
  name: string;
  classes?: { input?: string };
};

const props = defineProps<Props>();

const fieldId = computed((): string => {
  const name = props.name.length > 0 ? props.name : "";
  return uniqid(name ? `${name}-` : "");
});
</script>

<template>
  <FormField v-slot="{ componentField }" v-bind="omit($attrs, 'class', 'id')" :name="name" required>
    <FormItem v-if="$attrs.type !== 'hidden'" v-bind="pick($attrs, 'class', 'id') as any">
      <FormLabel v-if="label" class="text-foreground" :for="fieldId">{{ label }}</FormLabel>
      <FormControl>
        <Input v-bind="{ ...$attrs, ...componentField }" :id="fieldId" :class="classes?.input" />
      </FormControl>
    </FormItem>
  </FormField>
</template>

<style scoped></style>
