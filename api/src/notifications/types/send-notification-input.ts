import type {
  NotificationPayloadFor,
  NotificationType,
} from '@epicstory/contracts';

export type SendNotificationInput<
  T extends NotificationType = NotificationType,
> = {
  type: T;
  userId: number;
  workspaceId: number;
  payload: NotificationPayloadFor<T>;
};
