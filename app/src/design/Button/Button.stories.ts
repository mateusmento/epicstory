import type { Meta, StoryObj } from '@storybook/vue3';
import MyButton from './Button.vue';
import MyForm from '@/components/Form.vue';
import MyField from '@/components/Field.vue';

const meta: Meta<typeof MyButton> = {
  component: MyButton,
  title: 'Button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'primary'],
      control: { type: 'radio' },
      defaultValue: 'primary',
    },
  },
};

export default meta;

type Story = StoryObj<typeof MyButton>;

export const DefaultVariant: Story = {
  args: {
    variant: 'default',
  },
  render: (args) => ({
    components: { MyButton },
    setup: () => ({ args }),
    template: /*html*/ `
      <div class="flex:cols-md flex:center-y">
        <my-button v-bind="args" size="th">Hello World</my-button>
        <my-button v-bind="args" size="sm">Hello World</my-button>
        <my-button v-bind="args" size="md">Hello World</my-button>
        <my-button v-bind="args" size="lg">Hello World</my-button>
        <my-button v-bind="args" size="xl">Hello World</my-button>
      </div>
    `,
  }),
};

export const PrimaryVariant: Story = {
  args: {
    variant: 'primary',
  },
  render: (args) => ({
    components: { MyButton },
    setup: () => ({ args }),
    template: /*html*/ `
      <div class="flex:cols-md flex:center-y">
        <my-button v-bind="args" variant="primary" size="th">Hello World</my-button>
        <my-button v-bind="args" variant="primary" size="sm">Hello World</my-button>
        <my-button v-bind="args" variant="primary" size="md">Hello World</my-button>
        <my-button v-bind="args" variant="primary" size="lg">Hello World</my-button>
        <my-button v-bind="args" variant="primary" size="xl">Hello World</my-button>
      </div>
    `,
  }),
};

export const FormDemo: StoryObj<typeof MyButton> = {
  render: (args) => ({
    components: { MyButton, MyForm, MyField },
    setup: () => ({ args }),
    template: /*html*/ `
      <my-form class="flex:rows-md">
        <my-field class="flex:rows-sm" label="Email" name="email"/>
        <my-field class="flex:rows-sm" type="password" label="Password" name="password"/>
        <div class="flex:cols-md ml-auto">
          <my-button v-bind="args">Cancel</my-button>
          <my-button v-bind="args" variant="primary">Login</my-button>
        </div>
      </my-form>
    `,
  }),
};
