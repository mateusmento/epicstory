import type { Preview } from "@storybook/vue3";

import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

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
