import type { INotification, NotificationPayload } from '@epicstory/contracts';
import { Notification as NotificationEntity } from '../entities';

export function notificationEntityToClient(
  row: NotificationEntity,
): INotification {
  return {
    id: String(row.id),
    userId: row.userId,
    type: row.type,
    payload: (row.payload as NotificationPayload) ?? {},
    createdAt: row.createdAt.toISOString(),
    seen: row.seen,
  } as INotification;
}
