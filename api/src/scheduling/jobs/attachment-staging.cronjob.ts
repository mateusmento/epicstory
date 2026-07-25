import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';

/** S3 orphan sweep only — join reclaim lives in channel AttachmentReferencesReclaimCronjob. */
@Injectable()
export class AttachmentStagingCronjob {
  private readonly logger = new Logger(AttachmentStagingCronjob.name);

  constructor(private readonly attachments: AttachmentService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepOrphanObjects(): Promise<void> {
    const orphans = await this.attachments.sweepS3Orphans();
    if (orphans > 0) {
      this.logger.log(`Swept ${orphans} orphaned S3 attachment object(s)`);
    }
  }
}
