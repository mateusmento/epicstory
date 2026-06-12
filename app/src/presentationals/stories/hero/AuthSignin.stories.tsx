import { AuthPageShell, SigninForm } from "@/presentationals/auth";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";

const meta = {
  title: "Product/Hero/AuthSignin",
  component: AuthPageShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AuthPageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

function renderSignin(options: { initialEmail?: string } = {}) {
  return {
    components: { AuthPageShell, SigninForm },
    setup() {
      const email = ref(options.initialEmail ?? "");
      const lastAction = ref("none");
      return {
        email,
        lastAction,
        googleHref: "https://example.com/auth/google?redirect=%2F",
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
        <SigninForm v-model:email="email" :google-href="googleHref" @submit="onSubmit" />
      </AuthPageShell>
      <p class="fixed bottom-2 left-2 text-xs text-muted-foreground">Last action: {{ lastAction }}</p>
    `,
  };
}

export const Default: Story = {
  render: () => renderSignin(),
};

export const PrefilledEmail: Story = {
  render: () => renderSignin({ initialEmail: "dev@epicstory.app" }),
};

export const Interactive: Story = {
  render: () => renderSignin({ initialEmail: "dev@epicstory.app" }),
};
