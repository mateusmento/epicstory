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

type StorybookTheme = "light" | "dark";

function applyStorybookTheme(theme: StorybookTheme) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const preview: Preview = {
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Light / dark mode",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
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
    (story, context) => {
      const theme = (context.globals.theme as StorybookTheme | undefined) ?? "light";
      applyStorybookTheme(theme);
      return story();
    },
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
