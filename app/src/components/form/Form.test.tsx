import { mount } from "@vue/test-utils";
import { useForm } from "vee-validate";
import { defineComponent, ref } from "vue";
import { Form, Field } from ".";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

describe("Form", () => {
  it("should use defineField correctly", async () => {
    const expected = { name: "My name" };
    const { defineField } = useForm({ initialValues: expected });
    const [name, inputProps] = defineField("name");

    const Render = defineComponent({
      render: () => <input v-model={name.value} {...inputProps} />,
    });

    const inputEl = await mount(Render).find<HTMLInputElement>("input");
    expect(inputEl.element.value).toStrictEqual(expected.name);
  });

  it("should render named property of provided form data", async () => {
    // Arrange
    const expected = "My book title";
    const data = ref({ title: expected });

    const Render = defineComponent({
      render: () => (
        <Form v-model={data.value}>
          <Field name="title" />
        </Form>
      ),
    });

    // Act
    const wrapper = mount(Render, {});
    const input = await wrapper.find<HTMLInputElement>("input");

    // Assert
    expect(input.element.value).toBe(expected);
  });

  it("should update form data as field input change", async () => {
    // Arrange
    const data = ref({ title: "Wrong message" });

    const Render = defineComponent({
      render: () => (
        <Form v-model={data.value}>
          <Field name="title" />
        </Form>
      ),
    });

    const expected = "Hello world";

    // Act
    const wrapper = mount(Render, {});
    const input = await wrapper.find("input");
    await input.setValue(expected);

    // Assert
    expect(data.value.title).toBe(expected);
    expect(input.element.value).toBe(expected);
  });

  it("should update modelValue and form data as field input change", async () => {
    // Arrange
    const data = ref({ title: "" });
    const title = ref();

    const Render = defineComponent({
      render: () => (
        <Form v-model={data.value}>
          <Field v-model={title.value} name="title" />
        </Form>
      ),
    });

    // Act
    const expected = "1994";
    const input = await mount(Render).find("input");
    await input.setValue(expected);

    // Assert
    expect(input.element.value).toBe(expected);
    expect(data.value.title).toBe(expected);
    expect(title.value).toBe(expected);
  });

  it("should diplay input validate feedback", async () => {
    // Arrange
    const data = ref({ password: "" });
    const schema = toTypedSchema(
      z.object({
        password: z.string().min(3),
      }),
    );

    const Render = defineComponent({
      render: () => (
        <Form v-model={data.value} validationSchema={schema}>
          <Field name="password" />
        </Form>
      ),
    });

    // Assert
    const wrapper = mount(Render);
    const input = await wrapper.find("input");
    await input.setValue("foo");

    // Act
    expect(data.value.password).toBe("foo");
    expect(input.element.value).toBe("foo");
  });
});
