<script setup lang="ts">
import { Check, ChevronsUpDown } from "lucide-vue-next";
import { ref } from "vue";
import { cn } from "@/design-system/utils";
import { Button } from "@/design-system";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/design-system";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system";
import { Slot, useForwardPropsEmits, type ComboboxRootEmits, type ComboboxRootProps } from "radix-vue";
import { computed } from "vue";

const props = defineProps<
  ComboboxRootProps & {
    options: any[];
    trackBy: string;
    labelBy: string;
    buttonClass?: string;
  }
>();

const emits = defineEmits<ComboboxRootEmits>();

const delegatedProps = computed(() => {
  const { ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const value = defineModel<any>();

const trackOf = (value: any) => `${value[props.trackBy]}`;
const labelOf = (value: any) => value[props.labelBy];

const open = ref(false);
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Slot role="combobox" :aria-expanded="open">
        <slot name="trigger" :label="value ? labelOf(value) : 'Select an option...'">
          <Button variant="outline" class="justify-between">
            {{ value ? labelOf(value) : "Select an option..." }}
            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </slot>
      </Slot>
    </PopoverTrigger>
    <PopoverContent class="p-0">
      <Command v-bind="forwarded" v-model="value">
        <CommandInput placeholder="Search for options..." />
        <CommandEmpty>No options found.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="option in options"
              :key="trackOf(option)"
              :value="option"
              @select="open = false"
            >
              <Check
                :class="
                  cn(
                    'mr-2 h-4 w-4',
                    value && trackOf(value) === trackOf(option) ? 'opacity-100' : 'opacity-0',
                  )
                "
              />
              {{ labelOf(option) }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
