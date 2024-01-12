import { setupWorker } from 'msw/browser';
import inboxRoutes from '@/msw/inbox.routes';

export function setupMockApi() {
  const worker = setupWorker(...inboxRoutes);
  return worker.start();
}
