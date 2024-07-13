import type { Meta, StoryObj } from "@storybook/vue3";
import { Form, Field } from "@/components/form";
import { ref } from "vue";
import { Button } from "../button";

const meta = {
  title: "Components/Form",
  component: Form,
  tags: ["autodocs"],
  render: () => ({
    setup() {
      const data = ref({ password: "" });
      return () => (
        <Form v-model={data.value} class="flex:rows-2xl w-96 mx-auto">
          <Field name="email" label="Email" placeholder="Email..." class="flex:rows-xl" />
          <Field
            type="password"
            name="password"
            label="Password"
            placeholder="Password..."
            class="flex:rows-xl"
          />
          <Button variant="invitational" class="ml-auto">
            Sign in
          </Button>
        </Form>
      );
    },
  }),
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FormDemo: Story = {};
