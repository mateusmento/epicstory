import { setupWorker } from "msw/browser";
import * as mocks from "./mocks";
import type { RequestHandler } from "msw";
import { config } from "@/config";

export async function enableMocking() {
  const worker = setupWorker(
    ...Object.values(mocks)
      .map((mock) => mock() as RequestHandler | RequestHandler[])
      .flat(),
  );
  await worker.start({
    quiet: true,
    // Avoid noisy warnings for Storybook/Vite module & asset requests.
    // Only warn when an actual API request goes unmocked.
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      const isApiRequest =
        url.href.startsWith(config.API_URL) ||
        // Fallback for any relative "/api/*" usage.
        url.pathname.startsWith("/api/");

      if (isApiRequest) {
        print.warning();
      }
    },
  });
}
