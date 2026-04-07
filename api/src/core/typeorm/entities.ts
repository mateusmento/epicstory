import * as workspaceEntities from '../../workspace/domain/entities';
import * as projectEntities from '../../project/domain/entities';
import * as authEntities from '../../auth/domain';
import * as channelEntities from '../../channel/domain/entities';
import { Notification } from 'src/notifications/entities/notification.entity';
import * as linearIntegrationEntities from 'src/integrations/linear/entities';
import * as calendarEntities from 'src/calendar/entities';
import * as schedulingEntities from 'src/scheduling/entities';

export default [
  ...Object.values(workspaceEntities),
  ...Object.values(projectEntities),
  ...Object.values(channelEntities),
  ...Object.values(authEntities),
  Notification,
  ...Object.values(calendarEntities),
  ...Object.values(schedulingEntities),
  ...Object.values(linearIntegrationEntities),
];
