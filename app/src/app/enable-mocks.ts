import { setupWorker } from "msw/browser";
import * as mocks from "./mocks";
import type { RequestHandler } from "msw";

export async function enableMocking() {
  const worker = setupWorker(...Object.values(mocks).map((mock) => mock() as RequestHandler));
  await worker.start({ quiet: true });
}
