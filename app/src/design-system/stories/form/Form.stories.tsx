import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";
import { Form } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";

const schema = toTypedSchema(
  z.object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
);

const meta = {
  title: "Design System/Form",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FieldWithValidation: Story = {
  render: () => ({
    components: {
      Button,
      Form,
      FormControl,
      FormField,
      FormItem,
      FormLabel,
      FormMessage,
      Input,
    },
    setup() {
      return {
        schema,
        onSubmit(values: unknown) {
          console.log("Submitted:", values);
        },
      };
    },
    template: `
      <Form
        :validation-schema="schema"
        class="flex w-full max-w-sm flex-col gap-4"
        @submit="onSubmit"
      >
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="you@example.com" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Create password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button type="submit" variant="brand" color="primary" size="lg">Sign up</Button>
      </Form>
    `,
  }),
};

export const WithError: Story = {
  render: () => ({
    components: {
      Form,
      FormControl,
      FormField,
      FormItem,
      FormLabel,
      FormMessage,
      Input,
    },
    setup() {
      return {
        initialValues: { workspace: "a" },
        schema: toTypedSchema(
          z.object({
            workspace: z.string().min(3, "Workspace name must be at least 3 characters"),
          }),
        ),
      };
    },
    template: `
      <Form
        :validation-schema="schema"
        :initial-values="initialValues"
        validate-on-mount
        class="flex w-full max-w-sm flex-col gap-4"
      >
        <FormField v-slot="{ componentField }" name="workspace">
          <FormItem>
            <FormLabel>Workspace name</FormLabel>
            <FormControl>
              <Input placeholder="Enter workspace name" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </Form>
    `,
  }),
};
