<script lang="ts" setup>
import { get } from 'lodash';
import { computed, inject, ref, watch } from 'vue';

const props = defineProps<{
  options: any[] | ((query: string) => any[] | Promise<any[]>);
  trackBy: string | ((v: any) => any);
  labelBy: string | ((v: any) => any);
  classSearch?: string;
}>();

const query = ref('');
const items = ref<any[]>([]);

const state = ref();

const field = inject('field', {
  get: () => state.value,
  set: (value: any) => (state.value = value),
});

const value = computed({
  get: () => field.get(),
  set: (value: any) => {
    state.value = value;
    field.set(value);
  },
});

watch(query, async () => {
  if (props.options instanceof Function) items.value = await props.options(query.value);
  else
    items.value = props.options.filter((op) =>
      labelOf(op).toLowerCase().includes(query.value.toLowerCase())
    );
});

function select(item: any) {
  field.set(item);
}

function labelOf(value: any) {
  if (props.labelBy instanceof Function) return props.labelBy(value);
  else return get(value, props.labelBy);
}

function trackOf(value: any) {
  if (props.trackBy instanceof Function) return props.trackBy(value);
  else return get(value, props.trackBy);
}
</script>

<template>
  <div class="combobox">
    <input v-model="query" :class="classSearch" />
    <ul>
      <li
        v-for="item of items"
        :key="trackOf(item)"
        @click="select(item)"
        :class="{ active: trackOf(value) === trackOf(item) }"
      >
        {{ labelOf(item) }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.active {
  background-color: #ddd;
}
</style>
