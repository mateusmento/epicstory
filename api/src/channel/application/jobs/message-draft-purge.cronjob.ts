import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageDraftService } from '../services/message-draft.service';

@Injectable()
export class MessageDraftPurgeCronjob {
  private readonly logger = new Logger(MessageDraftPurgeCronjob.name);

  constructor(private readonly drafts: MessageDraftService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredDrafts(): Promise<void> {
    const removed = await this.drafts.purgeExpired();
    if (removed > 0) {
      this.logger.log(`Purged ${removed} expired message draft(s)`);
    }
  }
}
