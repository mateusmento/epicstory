<script lang="ts" setup>
import { computed, inject, provide } from 'vue';
import Input from './Input.vue';
import uniqid from 'uniqid';
import { omit } from 'lodash';

const props = defineProps<{
  label: string;
  name: string;
  classInput?: any;
}>();

const form = inject<any>('form');

provide('field', {
  get: () => form?.get(props.name),
  set: (value: any) => form?.set(props.name, value),
});

const fieldId = computed(() => uniqid(props.name + '-'));
</script>

<template>
  <div class="field">
    <label :for="fieldId">{{ label }}</label>
    <slot>
      <Input v-bind="omit($attrs, 'class', 'id')" :id="fieldId" :class="classInput" />
    </slot>
  </div>
</template>
