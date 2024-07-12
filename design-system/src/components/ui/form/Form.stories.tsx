import type { Meta, StoryObj } from '@storybook/vue3'
import Form from './Form.vue'
import Field from './Field.vue'
import { ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const meta = {
  title: 'Form/Form',
  component: Form,
  tags: ['autodocs']
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const FormDemo: Story = {
  render: (args) => ({
    render: () => {
      const data = ref({ password: '' })
      const schema = toTypedSchema(
        z.object({
          password: z.string().min(3)
        })
      )
      return (
        <Form v-model={data.value} schema={schema}>
          <Field name="password" />
        </Form>
      )
    }
  })
}
