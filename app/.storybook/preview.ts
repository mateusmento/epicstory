import "reflect-metadata";

import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";
import "./preview.css";

import { createDependencies } from "@/app/dependencies";
import { createDependenciesPlugin } from "@/core/dependency-injection";

import { TooltipProvider } from "@/design-system";
import { ConfirmDialogProvider } from "@/presentationals/confirm-dialog";
import { STORYBOOK_VIEW_MODE_KEY } from "@/presentationals/stories/story-container";
import { setup, type Preview } from "@storybook/vue3";
import { enableMocking } from "@/app/enable-mocks";
import { createPinia } from "pinia";
import { addIcons } from "oh-vue-icons";
import * as icons from "@/app/icons";
import router from "@/app/router";
import { h, provide } from "vue";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "padded",
    docs: {
      story: {
        inline: true,
        height: "auto",
      },
      canvas: {
        layout: "padded",
      },
    },
  },
  decorators: [
    (story, context) => ({
      setup() {
        provide(STORYBOOK_VIEW_MODE_KEY, context.viewMode === "docs" ? "docs" : "story");
        return () =>
          h(ConfirmDialogProvider, null, {
            default: () => h(TooltipProvider, null, { default: () => h(story()) }),
          });
      },
    }),
  ],
};

setup(async (app) => {
  const dependencies = await createDependencies();
  app.use(createDependenciesPlugin(dependencies));
  app.use(createPinia());
  app.use(router);

  addIcons(...Object.values(icons));

  await enableMocking();
});

export default preview;
