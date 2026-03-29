import { ScheduledJob } from './entities';

export type ScheduledJobWithPayload<T> = ScheduledJob & {
  payload: T;
};
