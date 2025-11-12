<script setup lang="ts">
import { Button, Field, Form } from "@/design-system";
import { useWorkspace, useWorkspaces } from "@/domain/workspace";
import type { SubmissionHandler } from "vee-validate";
import { useRouter } from "vue-router";

const router = useRouter();
const { createWorkspace } = useWorkspaces();
const { selectWorkspace } = useWorkspace();

async function handleCreateWorkspace(data: { name: string }) {
  const workspace = await createWorkspace(data);
  selectWorkspace(workspace);
  router.push("/");
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
              Create your<br />
              workspace.
            </h1>
            <p class="headline_subtitle">
              Get started by creating<br />
              your first workspace.
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
          <h2 class="title text-foreground">Create Workspace</h2>
          <div class="subtitle text-secondary-foreground">Set up your workspace to get started.</div>
        </div>

        <Form
          class="flex:col-3xl"
          @submit="handleCreateWorkspace as SubmissionHandler<any, any>"
          data-testid="create-workspace-form"
        >
          <Field
            class="flex:col-xl"
            label="Workspace Name"
            name="name"
            placeholder="Enter workspace name"
            data-testid="workspace-name-input"
          />

          <div class="flex:col-2xl mt-3xl">
            <Button
              type="submit"
              legacy
              legacy-variant="invitational"
              class="w-full"
              data-testid="create-workspace-submit-button"
            >
              Create Workspace
            </Button>
          </div>
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
