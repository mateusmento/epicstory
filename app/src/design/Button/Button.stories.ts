import type { Meta, StoryObj } from '@storybook/vue3';
import MyButton from './Button.vue';
import MyForm from '@/components/Form.vue';
import MyField from '@/components/Field.vue';

const meta: Meta<typeof MyButton> = {
  component: MyButton,
  title: 'Button',
  tags: ['autodocs'],
  argTypes: {
    outline: {
      defaultValue: false,
      control: { type: 'boolean' },
    },
    variant: {
      options: ['default', 'primary', 'secondary'],
      control: { type: 'radio' },
      defaultValue: 'primary',
    },
  },
};

export default meta;

type Story = StoryObj<typeof MyButton>;

export const Default: Story = {};

export const FormDemo: StoryObj<typeof MyButton> = {
  render: (args) => ({
    components: { MyButton, MyForm, MyField },
    setup: () => ({ args }),
    template: /*html*/ `
      <my-form class="flex:rows-md">
        <my-field class="flex:rows-sm" label="Email" name="email"/>
        <my-field class="flex:rows-sm" type="password" label="Password" name="password"/>
        <div class="flex:cols-md ml-auto">
          <my-button v-bind="args" variant="secondary">Cancel</my-button>
          <my-button v-bind="args" variant="primary" outline>Confirm</my-button>
        </div>
      </my-form>
    `,
  }),
};
