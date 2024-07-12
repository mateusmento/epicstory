import { Button } from "@/components/ui/button";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ErrorMessage as FieldErrorMessage, Field, Form } from "vee-validate";
import type { FunctionalComponent as FC } from "vue";

const ErrorMessage = FieldErrorMessage as any;

const required = (value: any) => (value ? true : "Field is required");

const Render: FC<any, ["submitted"]> = (props, { emit }) => (
  <Form onSubmit={(e) => emit("submitted", e)} class="flex flex-col gap-2">
    <Field name="field" rules={required} class="border border-input px-3 py-1 rounded-md" />
    <ErrorMessage name="field" id="feedback" />
    <Button type="submit">Send</Button>
  </Form>
);

const meta = {
  name: "VeeValidate/ComponentBasics",
  component: Render,
} as Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
