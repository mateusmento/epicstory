import "reflect-metadata";

import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

import { createDependencies } from "@/app/dependencies";
import { createDependenciesPlugin } from "@/core/dependency-injection";

import { setup, type Preview } from "@storybook/vue3";

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
});

export default preview;
