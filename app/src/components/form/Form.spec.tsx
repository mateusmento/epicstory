import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { Form, Field } from ".";

describe("Field", () => {
  it("should render named property of provided form data", async () => {
    const expected = "My book title";

    const Render = defineComponent({
      render: () => (
        <Form modelValue={{ title: expected }}>
          <Field name="title" />
        </Form>
      ),
    });

    const wrapper = mount(Render, {});

    const input = await wrapper.find<HTMLInputElement>("input");
    expect(input.element.value).toBe(expected);
  });

  it("should update form data as field input change", async () => {
    const data = ref({ title: "Wrong message" });

    const Render = defineComponent({
      setup: () => {
        return { data };
      },
      render: () => (
        <Form modelValue={data.value} onUpdate:modelValue={(v) => (data.value = v)}>
          <Field name="title" />
        </Form>
      ),
    });

    const wrapper = mount(Render, {});
    const input = await wrapper.find("input");

    const expected = "Hello world";
    await input.setValue(expected);

    expect(data.value.title).toBe(expected);
    expect(input.element.value).toBe(expected);
  });
});
