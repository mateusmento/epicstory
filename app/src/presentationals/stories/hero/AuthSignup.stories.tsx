import { AuthPageShell, SignupForm } from "@/presentationals/auth";
import type { Meta, StoryObj } from "@storybook/vue3";
import { within, userEvent, expect } from "@storybook/test";
import { ref } from "vue";

const meta = {
  title: "Product/Hero/AuthSignup",
  component: AuthPageShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AuthPageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

function renderSignup() {
  return {
    components: { AuthPageShell, SignupForm },
    setup() {
      const lastAction = ref("none");
      return {
        lastAction,
        googleHref: "https://example.com/auth/google",
        onSubmit: () => {
          lastAction.value = "submitted";
        },
      };
    },
    template: `
      <AuthPageShell>
        <template #headline>
          <h1 class="headline_title font-semibold">
            Create epic<br />
            stories with us.
          </h1>
        </template>
        <template #subtitle>
          <p class="headline_subtitle">
            Discover a better communication<br />
            tool for Scrum teams.
          </p>
        </template>
        <SignupForm :google-href="googleHref" @submit="onSubmit" />
      </AuthPageShell>
      <p class="fixed bottom-2 left-2 text-xs text-muted-foreground">Last action: {{ lastAction }}</p>
    `,
  };
}

export const Default: Story = {
  render: () => renderSignup(),
};

export const Interactive: Story = {
  render: () => renderSignup(),
  play: async ({ canvasElement }) => {
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
  },
};
