import "reflect-metadata";
import "./fonts.css";
import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

import type { Preview } from "@storybook/vue3";

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

export default preview;
