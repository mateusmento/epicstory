<script lang="ts" setup>
import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system";
import Signal1Bar from "./Signal1Bar.vue";
import Signal2Bars from "./Signal2Bars.vue";
import Signal3Bars from "./Signal3Bars.vue";
import Urgent from "./Urgent.vue";

const value = defineModel<number>("value", { default: 0 });

function toggle() {
  if (value.value === 4) value.value = 0;
  else value.value += 1;
}

const labels = ["No priority", "Low", "Medium", "High", "Urgent"];
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="badge" class="flex:row-md flex:center-y">
        <Urgent v-if="value === 4" />
        <Signal3Bars v-if="value === 3" />
        <Signal2Bars v-else-if="value === 2" />
        <Signal1Bar v-else-if="value === 1" />
        <div class="text-xs">{{ labels[value] }}</div>
      </Button>
    </PopoverTrigger>
    <PopoverContent as-child>
      <Command
        @update:model-value="value = +$event"
        :selected-value="value.toString()"
        class="rounded-lg border shadow-md p-0 top-80 h-fit w-52"
      >
        <CommandInput placeholder="Change priority to" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandItem value="0">
            <Signal1Bar class="opacity-0" />
            <span class="text-xm">No priority</span>
          </CommandItem>
          <CommandItem value="4">
            <Urgent />
            <span class="text-xm">Urgent</span>
          </CommandItem>
          <CommandItem value="3">
            <Signal3Bars />
            <span class="text-xm">High</span>
          </CommandItem>
          <CommandItem value="2">
            <Signal2Bars />
            <span class="text-xm">Medium</span>
          </CommandItem>
          <CommandItem value="1">
            <Signal1Bar />
            <span class="text-xm">Low</span>
          </CommandItem>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
