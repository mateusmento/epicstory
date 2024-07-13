import type { Meta, StoryObj } from "@storybook/vue3";
import Button from "./Button.vue";
import Form from "@/components/form/Form.vue";
import Field from "@/components/form/Field.vue";

const meta: Meta<typeof Button> = {
  title: "Design System/Legacy Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    title: "Hello, world!",
    legacy: true,
    legacySize: "md",
  },
  argTypes: {
    title: {
      control: { type: "text" },
    },
    legacySize: { control: "select", options: ["th", "sm", "md", "lg", "xl"] },
    legacyVariant: {
      control: { type: "radio" },
      options: ["default", "primary", "invitational"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const DefaultVariant: Story = {
  args: {
    legacyVariant: "default",
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: /*html*/ `
      <div class="flex:cols-md flex:center-y">
        <Button v-bind="args" size="th"/>
        <Button v-bind="args" size="sm"/>
        <Button v-bind="args" size="md"/>
        <Button v-bind="args" size="lg"/>
        <Button v-bind="args" size="xl"/>
      </div>
    `,
  }),
};

export const PrimaryVariant: Story = {
  args: {
    legacyVariant: "primary",
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: /*html*/ `
      <div class="flex:cols-md flex:center-y">
        <Button v-bind="args" size="th"/>
        <Button v-bind="args" size="sm"/>
        <Button v-bind="args" size="md"/>
        <Button v-bind="args" size="lg"/>
        <Button v-bind="args" size="xl"/>
      </div>
    `,
  }),
};

export const InvitationalVariant: Story = {
  args: {
    legacyVariant: "invitational",
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: /*html*/ `
      <div class="flex:cols-md flex:center-y">
        <Button v-bind="args" size="th"/>
        <Button v-bind="args" size="sm"/>
        <Button v-bind="args" size="md"/>
        <Button v-bind="args" size="lg"/>
        <Button v-bind="args" size="xl"/>
      </div>
    `,
  }),
};

export const FormDemo: StoryObj<typeof Button> = {
  render: (args) => ({
    components: { Button, Form, Field },
    setup: () => ({ args }),
    template: /*html*/ `
      <Form class="flex:rows-md">
        <Field class="flex:rows-sm" label="Email" name="email"/>
        <Field class="flex:rows-sm" type="password" label="Password" name="password"/>
        <div class="flex:cols-md ml-auto">
          <Button v-bind="args">Cancel</Button>
          <Button v-bind="args" legacy legacyVariant="primary">Login</Button>
        </div>
      </Form>
    `,
  }),
};
