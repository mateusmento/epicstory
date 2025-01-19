import type { Meta, StoryObj } from "@storybook/vue3";
import { Form, Field } from "@/components/form";
import { ref } from "vue";
import { Button } from "@/design-system";

const meta = {
  title: "Components/Form",
  component: Form,
  tags: ["autodocs"],
  render: () => ({
    setup() {
      const data = ref({ password: "" });
      return () => (
        <Form v-model={data.value} class="flex:col-2xl w-96 mx-auto">
          <Field name="email" label="Email" class="flex:col-xl" />
          <Field type="password" name="password" label="Password" class="flex:col-xl" />
          <div class="flex:row-md ml-auto">
            <Button v-bind="args" legacy legacy-size="md" legacy-variant="default" title="Cancel" />
            <Button v-bind="args" legacy legacy-size="md" legacy-variant="invitational" title="Sign in" />
          </div>
        </Form>
      );
    },
  }),
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FormDemo: Story = {};
