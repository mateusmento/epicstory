import "reflect-metadata";

import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

import { createDependencies } from "@/app/dependencies";
import { createDependenciesPlugin } from "@/core/dependency-injection";

import { setup, type Preview } from "@storybook/vue3";
import { enableMocking } from "@/app/enable-mocks";
import { createPinia } from "pinia";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

setup(async (app) => {
  const dependencies = await createDependencies();
  app.use(createDependenciesPlugin(dependencies));
  app.use(createPinia());
  await enableMocking();
});

export default preview;
