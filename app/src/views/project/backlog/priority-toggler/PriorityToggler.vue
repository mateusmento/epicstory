<script lang="ts" setup>
import { Button } from "@/design-system";
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
  <Button variant="outline" size="badge" @click="toggle" class="flex:cols-md flex:center-y">
    <Urgent v-if="value === 4" />
    <Signal3Bars v-if="value === 3" />
    <Signal2Bars v-else-if="value === 2" />
    <Signal1Bar v-else-if="value === 1" />
    <div class="text-xs">{{ labels[value] }}</div>
  </Button>
</template>
