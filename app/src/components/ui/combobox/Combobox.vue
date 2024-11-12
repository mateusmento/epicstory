<script setup lang="ts">
import { Check, ChevronsUpDown } from 'lucide-vue-next';

import { ref } from 'vue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

defineProps<{
  options: any[];
  search: ((val: any[], term: string) => any[]) | undefined;
  labelBy: string;
  trackBy: string;
  modelValue: any;
}>();

const open = ref(false);
</script>

<template>
  <div>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="flex w-full justify-between items-center"
        >
          {{ (modelValue ?? {})[labelBy] ?? 'Select an option...' }}

          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[200px] p-0">
        <Command
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
          v-bind="$attrs"
          :display-value="(value: any) => value[labelBy]"
          :filter-function="search"
        >
          <CommandInput placeholder="Search an option..." />
          <CommandEmpty>No option found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              <CommandItem
                v-for="option in options"
                :key="option[trackBy]"
                :value="option"
                @select="open = false"
              >
                <Check
                  :class="
                    cn('mr-2 h-4 w-4', modelValue === option.value ? 'opacity-100' : 'opacity-0')
                  "
                />
                {{ option[labelBy] }}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
</template>
