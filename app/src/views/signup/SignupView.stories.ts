import type { Meta, StoryObj } from "@storybook/vue3";
import { within, userEvent, expect } from "@storybook/test";
import SignupView from "./SignupView.vue";

const meta = {
  title: "Views/Signup",
  component: SignupView,
  render: () => ({
    components: { SignupView },
    template: "<SignupView />",
  }),
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SignupView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignUp: Story = {
  play: async ({ canvasElement }: any) => {
    const canvas = within(canvasElement);

    const nameInput = canvas.getByTestId("signup-name-input");
    expect(nameInput).toBeInTheDocument();
    await userEvent.type(nameInput, "Mateus Sarmento");

    const emailInput = canvas.getByTestId("signup-email-input");
    expect(emailInput).toBeInTheDocument();
    await userEvent.type(emailInput, "omateusmento@gmail.com");

    const passwordInput = canvas.getByTestId("signup-password-input");
    expect(passwordInput).toBeInTheDocument();
    await userEvent.type(passwordInput, "1234");

    const signupButton = canvas.getByRole("button", { name: /Create account/i });
    expect(signupButton).toBeInTheDocument();
    // await userEvent.click(signupButton);
  },
};
