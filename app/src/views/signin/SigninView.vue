<script setup lang="ts">
import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { Button, Field, Form } from "@/design-system";
import { IconGoogle } from "@/design-system/icons";
import { AuthService } from "@/domain/auth/auth.service";
import type { SigninRequest } from "@/domain/auth/dtos/singin.dto";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const authService = useDependency(AuthService);

const signinEmail = ref<string>(typeof route.query.email === "string" ? route.query.email : "");

async function signin(data: SigninRequest) {
  await authService.signin(data);
  router.push("/");
}
</script>

<template>
  <main class="flex flex:center h-full py-4xl">
    <div class="signup w-xl h-full rounded-3xl flex:cols-md p-xl">
      <aside class="signup-advertisement highlight-box flex:rows-auto w-md rounded-xl">
        <div class="m-4xl">
          <b class="block logo-title font-semibold mb-4xl">Epicstory</b>

          <div class="flex:rows-3xl">
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

        <div class="flex:space"></div>
        <div class="flex:space"></div>

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

      <section class="signup-form flex:rows-7xl flex:center-y self:fill mx-6xl">
        <div class="flex:rows-xl">
          <h2 class="title text-neutral-800">Sign in</h2>
          <div class="subtitle text-neutral-600">Continue your journey with Epicstory.</div>
        </div>

        <Form class="flex:rows-3xl" @submit="signin as any" data-testid="signup-form">
          <Field
            class="flex:rows-xl"
            v-model="signinEmail"
            label="Email"
            name="email"
            placeholder="Enter your email"
            data-testid="signin-email-input"
          />
          <Field
            class="flex:rows-xl"
            type="password"
            label="Password"
            name="password"
            placeholder="Enter your password"
            data-testid="signin-password-input"
          />
          <div class="text-sm">
            Don't have an account yet?
            <RouterLink to="/signup" class="text-blue-600">Sign up.</RouterLink>
          </div>

          <div class="flex:rows-2xl mt-3xl">
            <Button
              type="submit"
              legacy
              legacy-variant="invitational"
              class="w-full"
              data-testid="signin-submit-button"
            >
              Sign in
            </Button>
          </div>

          <div class="flex:cols-2xl flex:center text-slate-800">
            <div class="border border-solid border-slate-200 flex-1"></div>
            or
            <div class="border border-solid border-slate-200 flex-1"></div>
          </div>

          <Button
            as="a"
            :href="`${config.API_URL}/auth/google`"
            class="flex:cols-lg w-full"
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
