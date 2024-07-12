<script setup lang="ts">
import { useForm, type TypedSchema } from 'vee-validate'
import { provide, watch } from 'vue'

const [modelValue] = defineModel<Record<string, any> | undefined>()

const props = defineProps<{
  schema?: TypedSchema
}>()

const form = useForm({ initialValues: modelValue, validationSchema: props.schema })
provide('form', form)

watch(form.controlledValues, (v) => (modelValue.value = v))
</script>

<template>
  <form>
    <slot :data="form.values"></slot>
  </form>
</template>
