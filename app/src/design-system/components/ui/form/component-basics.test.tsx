import { flushPromises, mount } from "@vue/test-utils";
import { Field, ErrorMessage as FieldErrorMessage, Form } from "vee-validate";
import { describe, expect, it } from "vitest";
import type { FunctionalComponent as FC } from "vue";

const ErrorMessage = FieldErrorMessage as any;

describe("VeeValidate basics", () => {
  let submitData: any;

  const Render: FC<any, ["update:modelValue"]> = (props, { emit }) => (
    <Form onSubmit={(e) => emit("update:modelValue", e)}>
      <Field name="field" />
    </Form>
  );

  it("should emit submit event directly through form element", async () => {
    const wrapper = mount(() => <Render v-model={submitData} />);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(submitData).toStrictEqual({ field: undefined });

    await wrapper.find("input").setValue("123");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(submitData).toStrictEqual({ field: "123" });
  });
});

describe("Form submission with validation", () => {
  const REQUIRED_MESSAGE = "Field is required";
  const required = (value: any) => (value ? true : REQUIRED_MESSAGE);

  const Render: FC<any, ["update:modelValue"]> = (props, { emit }) => (
    <Form onSubmit={(e) => emit("update:modelValue", e)}>
      <Field name="field" rules={required} />
      <ErrorMessage name="field" id="feedback" />
    </Form>
  );

  it("should not submit form with invalid field", async () => {
    let submitData: any;
    const wrapper = mount(() => <Render v-model={submitData} />);

    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find("#feedback").text()).toBe(REQUIRED_MESSAGE);
  });

  it("should submit form data with invalid field", async () => {
    let submitData: any;
    const wrapper = mount(() => <Render v-model={submitData} />);

    await wrapper.find("input").setValue("123");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(submitData).toStrictEqual({ field: "123" });
  });
});
