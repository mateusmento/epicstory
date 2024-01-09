import type { Meta, StoryObj } from '@storybook/vue3';
import MyButton from './Button.vue';
import MyForm from '@/components/Form.vue';
import MyField from '@/components/Field.vue';

const meta: Meta<typeof MyButton> = {
  component: MyButton,
  title: 'Button',
  tags: ['autodocs'],
  args: {
    title: 'Hello, world!',
    size: 'md',
  },
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    variant: {
      control: { type: 'radio' },
      options: ['default', 'primary', 'special'],
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
        <my-button v-bind="args" size="th"/>
        <my-button v-bind="args" size="sm"/>
        <my-button v-bind="args" size="md"/>
        <my-button v-bind="args" size="lg"/>
        <my-button v-bind="args" size="xl"/>
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
        <my-button v-bind="args" size="th"/>
        <my-button v-bind="args" size="sm"/>
        <my-button v-bind="args" size="md"/>
        <my-button v-bind="args" size="lg"/>
        <my-button v-bind="args" size="xl"/>
      </div>
    `,
  }),
};

export const SpecialVariant: Story = {
  args: {
    variant: 'special',
  },
  render: (args) => ({
    components: { MyButton },
    setup: () => ({ args }),
    template: /*html*/ `
      <div class="flex:cols-md flex:center-y">
        <my-button v-bind="args" size="th"/>
        <my-button v-bind="args" size="sm"/>
        <my-button v-bind="args" size="md"/>
        <my-button v-bind="args" size="lg"/>
        <my-button v-bind="args" size="xl"/>
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
          <my-button v-bind="args" variant="primary" highlight>Login</my-button>
        </div>
      </my-form>
    `,
  }),
};
