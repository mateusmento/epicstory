<script setup lang="ts">
import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { Button, Field, Form } from "@/design-system";
import { IconGoogle } from "@/design-system/icons";
import { AuthService } from "@/domain/auth/auth.service";
import type { SignupRequest } from "@/domain/auth/dtos/signup.dto";
import type { SubmissionHandler } from "vee-validate";
import { useRouter } from "vue-router";

const router = useRouter();

const authService = useDependency(AuthService);

async function signup(data: SignupRequest) {
  const user = await authService.signup(data);
  router.push({ name: "signin", query: { email: user.email } });
}
</script>

<template>
  <main class="flex flex:center h-full py-4xl">
    <div class="signup w-xl h-full rounded-3xl flex:row-md p-xl">
      <aside class="signup-advertisement highlight-box flex:col-auto w-md rounded-xl">
        <div class="m-4xl">
          <b class="block logo-title font-semibold mb-4xl">Epicstory</b>

          <div class="flex:col-3xl">
            <h1 class="headline_title font-semibold">
              Create epic<br />
              stories with us.
            </h1>
            <p class="headline_subtitle">
              Discover a better communication<br />
              tool for Scrum teams.
            </p>
          </div>
        </div>

        <div class="flex-1"></div>
        <div class="flex-1"></div>

        <article class="testimony m-2xl">
          <div class="testimony-backdrop"></div>
          <div class="testimony-content">
            <p>
              It's simply wonderful to still be aligned with Scrum values when communicating remotely.
              Epicstory helped our teams to best perform when fast communication is required.
            </p>

            <figure>
              <figcaption></figcaption>
              <!-- <img
                src="https://media.licdn.com/dms/image/C4D03AQFdHIdfUdeyTQ/profile-displayphoto-shrink_800_800/0/1605708160283?e=1709164800&v=beta&t=62Kg-gat3PqZ6AtuaUq1NMR4KLOXiWYc5V05HtjhNKw"
              /> -->
            </figure>

            <dl>
              <dt>Mateus Sarmento</dt>
              <dd>Co-founder of Epicstory</dd>
            </dl>
          </div>
        </article>
      </aside>

      <section class="signup-form flex:col-7xl flex:center-y flex-1 mx-6xl">
        <div class="flex:col-xl">
          <h2 class="title text-foreground">Sign up</h2>
          <div class="subtitle text-secondary-foreground">Start your journey with Epicstory.</div>
        </div>

        <Form class="flex:col-3xl" @submit="signup as SubmissionHandler<any, any>" data-testid="signup-form">
          <Field
            class="flex:col-xl"
            label="Name"
            name="name"
            placeholder="Name"
            data-testid="signup-name-input"
          />
          <Field
            class="flex:col-xl"
            label="Email"
            name="email"
            placeholder="Enter your email"
            data-testid="signup-email-input"
          />
          <Field
            class="flex:col-xl"
            type="password"
            label="Password"
            name="password"
            placeholder="Create password"
            data-testid="signup-password-input"
          />
          <div class="text-sm">
            Already have an account?
            <RouterLink to="/signin" class="text-blue-600">Sign in.</RouterLink>
          </div>

          <div class="flex:col-2xl mt-3xl">
            <Button
              type="submit"
              legacy
              legacy-variant="invitational"
              class="w-full"
              data-testid="signup-button"
            >
              Create account
            </Button>
          </div>

          <div class="flex:row-2xl flex:center text-slate-800">
            <div class="border border-solid border-slate-200 flex-1"></div>
            or
            <div class="border border-solid border-slate-200 flex-1"></div>
          </div>

          <Button
            as="a"
            :href="`${config.API_URL}/auth/google`"
            class="flex:row-lg w-full"
            data-testid="signup-with-google"
          >
            <IconGoogle class="h-8" />
            Continue with Google
          </Button>
        </Form>
      </section>
    </div>
  </main>
</template>

<style lang="scss" scoped>
main {
  background-color: #e3e8f8;
  font-family: "Plus Jakarta Sans";
}

.signup {
  background-color: #fff;
}

.signup-form {
  font-family: "Inter";
}

.logo-title {
  font-size: 1.6em;
}

.headline_title {
  font-size: 2.8em;
}

.headline_subtitle {
  font-size: 1.2em;
}

.testimony {
  position: relative;
}

.testimony .testimony-content {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 20px;

  padding: 20px;
  border-radius: 10px;

  background-color: var(--dark-blue);
  // background-image: radial-gradient(transparent 1px, var(--dark-blue) 1px);
  // background-size: 4px 4px;

  font-family: "Lato";

  p {
    grid-column: span 2;
    font-size: 1rem;
  }

  img {
    width: 42px;
    border-radius: 10px;
  }
}
</style>
