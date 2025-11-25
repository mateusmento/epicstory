import * as workspaceEntities from '../../workspace/domain/entities';
import * as projectEntities from '../../project/domain/entities';
import * as authEntities from '../../auth/domain';
import * as channelEntities from '../../channel/domain/entities';
import { ScheduledEvent } from 'src/notifications/scheduled-event.entity';
import { Notification } from 'src/notifications/notification.entity';

export default [
  ...Object.values(workspaceEntities),
  ...Object.values(projectEntities),
  ...Object.values(channelEntities),
  ...Object.values(authEntities),
  ScheduledEvent,
  Notification,
];
