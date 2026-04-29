import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';

@Injectable()
export class AttachmentStagingCronjob {
  private readonly logger = new Logger(AttachmentStagingCronjob.name);

  constructor(private readonly attachments: AttachmentService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredStaging(): Promise<void> {
    const removed = await this.attachments.purgeUnlinkedExpiredStaging();
    if (removed > 0) {
      this.logger.log(`Purged ${removed} expired unlinked attachment row(s)`);
    }
  }
}
