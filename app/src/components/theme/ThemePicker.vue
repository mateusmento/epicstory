<script setup lang="ts">
import { Label, MenuRadioGroup, MenuRadioItem, RadioGroup, RadioGroupItem } from "@/design-system";
import { THEME_OPTIONS, useTheme } from "@/core/composables/use-theme";
import { cn } from "@/design-system/utils";

const props = withDefaults(
  defineProps<{
    variant?: "segmented" | "menu";
  }>(),
  {
    variant: "segmented",
  },
);

const { preference } = useTheme();
</script>

<template>
  <RadioGroup
    v-if="props.variant === 'segmented'"
    v-model="preference"
    type="single"
    class="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1"
  >
    <Label
      v-for="option in THEME_OPTIONS"
      :key="option.value"
      class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
      :class="preference === option.value ? 'bg-card text-foreground shadow' : 'text-secondary-foreground'"
    >
      <RadioGroupItem :value="option.value" class="sr-only" />
      <component :is="option.icon" class="h-4 w-4" aria-hidden="true" />
      {{ option.label }}
    </Label>
  </RadioGroup>

  <MenuRadioGroup v-else v-model="preference">
    <MenuRadioItem
      v-for="option in THEME_OPTIONS"
      :key="option.value"
      :value="option.value"
      :class="cn('text-[13px] w-44')"
    >
      <component :is="option.icon" class="mr-2 h-4 w-4" aria-hidden="true" />
      {{ option.label }}
    </MenuRadioItem>
  </MenuRadioGroup>
</template>
