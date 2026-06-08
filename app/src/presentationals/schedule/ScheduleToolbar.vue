<script lang="ts" setup>
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group";
import type { ScheduleViewType } from "@/lib/schedule";

defineProps<{
  headerLabel: string;
}>();

const view = defineModel<ScheduleViewType>("view", { required: true });

const emit = defineEmits<{
  today: [];
  prev: [];
  next: [];
  create: [];
}>();
</script>

<template>
  <div class="flex:row-md flex:center-y p-4 border-b">
    <div class="flex:row-lg flex:center-y flex-1">
      <h1 class="text-2xl font-semibold text-foreground">Schedule</h1>
      <Button variant="outline" size="sm" class="ml-4" @click="emit('today')"> Today </Button>
      <div class="flex:row-md flex:center-y ml-4">
        <Button variant="ghost" size="icon" @click="emit('prev')">
          <Icon name="hi-solid-arrow-sm-left" class="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" class="rotate-180" @click="emit('next')">
          <Icon name="hi-solid-arrow-sm-left" class="w-5 h-5" />
        </Button>
      </div>
      <div class="ml-4 text-lg font-medium text-foreground">
        {{ headerLabel }}
      </div>
    </div>
    <ToggleGroup v-model="view" type="single" class="ml-auto">
      <ToggleGroupItem value="month" aria-label="Month view"> Month </ToggleGroupItem>
      <ToggleGroupItem value="week" aria-label="Week view"> Week </ToggleGroupItem>
      <ToggleGroupItem value="day" aria-label="Day view"> Day </ToggleGroupItem>
    </ToggleGroup>
    <Button variant="default" size="sm" class="ml-4" @click="emit('create')">
      <Icon name="hi-plus" class="w-4 h-4 mr-2" />
      Create
    </Button>
  </div>
</template>
