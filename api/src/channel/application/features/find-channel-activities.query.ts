import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { ChannelActivityService } from '../services/channel-activity.service';

export class FindChannelActivities {
  channelId: number;
  issuerId: number;

  constructor(data: Partial<FindChannelActivities>) {
    patch(this, data);
  }
}

@QueryHandler(FindChannelActivities)
export class FindChannelActivitiesQuery
  implements IQueryHandler<FindChannelActivities>
{
  constructor(private channelActivityService: ChannelActivityService) {}

  execute({ channelId, issuerId }: FindChannelActivities) {
    return this.channelActivityService.findForChannel(channelId, issuerId);
  }
}
