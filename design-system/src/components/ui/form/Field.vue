<script setup lang="ts">
import { type FormContext } from 'vee-validate'
import { inject } from 'vue'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  name: string
}>()

const { defineField, errors } = inject('form') as FormContext
const [field, inputProps] = defineField(props.name)
</script>

<template>
  <Input v-model="field" v-bind="{ ...$attrs, ...inputProps }" />
  <div class="text-[0.75rem]">{{ errors[props.name] }}</div>
</template>
