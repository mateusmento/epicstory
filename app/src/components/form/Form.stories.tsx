import type { Meta, StoryObj } from "@storybook/vue3";
import { Form, FormField as Field } from "../../design-system/components/ui/form";
import { ref } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";

const meta = {
  title: "components/Form",
  component: Form,
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FormDemo: Story = {
  render: (args) => ({
    render: () => {
      const data = ref({ password: "" });
      const schema = toTypedSchema(
        z.object({
          password: z.string().min(3),
        }),
      );
      return (
        <Form v-model={data.value} validationSchema={schema}>
          <Field name="password" />
        </Form>
      );
    },
  }),
};
