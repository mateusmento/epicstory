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

const selected = computed({
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
  selected.value = [...(selected.value ?? []), item];
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
    <div class="selection">
      <div v-for="item of selected" :key="trackOf(item)" class="selected-item">
        {{ labelOf(item) }}
      </div>
    </div>
    <input v-model="query" :class="classSearch" />
    <ul>
      <li
        v-for="item of items"
        :key="trackOf(item)"
        @click="select(item)"
        :class="{ active: trackOf(selected) === trackOf(item) }"
      >
        {{ labelOf(item) }}
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.combobox {
  padding: 10px;
  border: 1px solid #ccc;

  &:focus-within {
    outline: 1px solid #ccc;
  }
}

.selection {
  display: flex;
  gap: 10px;
}

.selected-item {
  padding: 5px 10px;
  border-radius: 20px;
  background-color: rgb(215, 215, 255);
  color: rgb(80, 80, 211);
  font-size: 12px;
}

input {
  border: none;
  outline: none;
  padding: 0;
}

.active {
  background-color: #ddd;
}

.selected-item {
}
</style>
