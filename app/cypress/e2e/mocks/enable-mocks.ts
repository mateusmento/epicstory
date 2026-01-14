import { setupWorker } from "msw/browser";
import type { RequestHandler } from "msw";

export function enableMocking(
  mocks:
    | (() => RequestHandler | RequestHandler[])[]
    | { [key: string]: () => RequestHandler | RequestHandler[] },
) {
  if (!Array.isArray(mocks)) {
    mocks = Object.values(mocks);
  }

  const worker = setupWorker(...mocks.map((mock) => mock()).flat());

  beforeEach(async () => {
    await worker.start();
  });

  afterEach(async () => {
    await worker.stop();
  });

  return worker;
}
