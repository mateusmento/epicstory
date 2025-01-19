import type { Meta, StoryObj } from "@storybook/vue3";
import Button from "./Button.vue";

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
      <div class="flex:row-md flex:center-y">
        <Button v-bind="args" legacy-size="th"/>
        <Button v-bind="args" legacy-size="sm"/>
        <Button v-bind="args" legacy-size="md"/>
        <Button v-bind="args" legacy-size="lg"/>
        <Button v-bind="args" legacy-size="xl"/>
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
      <div class="flex:row-md flex:center-y">
        <Button v-bind="args" legacy-size="th"/>
        <Button v-bind="args" legacy-size="sm"/>
        <Button v-bind="args" legacy-size="md"/>
        <Button v-bind="args" legacy-size="lg"/>
        <Button v-bind="args" legacy-size="xl"/>
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
      <div class="flex:row-md flex:center-y">
        <Button v-bind="args" legacy-size="th"/>
        <Button v-bind="args" legacy-size="sm"/>
        <Button v-bind="args" legacy-size="md"/>
        <Button v-bind="args" legacy-size="lg"/>
        <Button v-bind="args" legacy-size="xl"/>
      </div>
    `,
  }),
};
