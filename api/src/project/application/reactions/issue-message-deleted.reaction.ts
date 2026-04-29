import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ChannelMessageDeletedEvent,
  type ChannelMessageDeletedPayload,
} from 'src/channel/application/contracts/channel-message-deleted.event';
import { IssueActivityRepository } from 'src/project/infrastructure/repositories/issue-activity.repository';

@Injectable()
export class IssueMessageDeletedReaction {
  constructor(private issueActivities: IssueActivityRepository) {}

  /** Idempotent: DB CASCADE may delete first; deletes 0 rows is fine. */
  @OnEvent(ChannelMessageDeletedEvent)
  async handle(payload: ChannelMessageDeletedPayload): Promise<void> {
    if (payload.channelType !== 'workspace_open') {
      return;
    }
    await this.issueActivities.delete({ messageId: payload.messageId });
  }
}
