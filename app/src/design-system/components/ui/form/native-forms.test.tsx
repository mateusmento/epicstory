import { mount } from "@vue/test-utils";
import { withModifiers, type SetupContext } from "vue";

describe("Native forms", () => {
  function Render(props: any, { emit }: SetupContext<["submitted"]>) {
    return (
      <form class="form" onSubmit={withModifiers(() => emit("submitted", "hello world"), ["prevent"])}>
        <input />
        <button type="submit">Submit</button>
      </form>
    );
  }

  it("should emit submit event directly through form element", async () => {
    const wrapper = mount(Render);
    await wrapper.find("form").trigger("submit");
    const [[emitted]] = wrapper.emitted("submitted") ?? [["not expected"]];
    expect(emitted).toBe("hello world");
  });

  it("should emit submit event through submit button element", async () => {
    document.body.innerHTML = `
      <div>
        <h1>Non Vue app</h1>
        <div id="app"></div>
      </div>
    `;
    const wrapper = mount(Render, { attachTo: "#app" });
    await wrapper.find('button[type="submit"]').trigger("click");
    const [[emitted]] = wrapper.emitted("submitted") ?? [["not expected"]];
    expect(emitted).toBe("hello world");
  });
});
