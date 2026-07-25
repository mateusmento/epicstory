import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttachmentReferencesService } from '../services/attachment-references.service';

@Injectable()
export class AttachmentReferencesReclaimCronjob {
  private readonly logger = new Logger(AttachmentReferencesReclaimCronjob.name);

  constructor(private readonly refs: AttachmentReferencesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async reclaimUnreferenced(): Promise<void> {
    const { effects } = await this.refs.commit({
      workspaceId: 0,
      channelId: 0,
      actor: { uploadedById: 0, trustedDelivery: true },
      ops: [{ op: 'reclaim' }],
    });
    const reclaim = effects.find((e) => e.op === 'reclaim');
    if (reclaim && reclaim.op === 'reclaim' && reclaim.deleted > 0) {
      this.logger.log(
        `Reclaimed ${reclaim.deleted} unreferenced attachment row(s)`,
      );
    }
  }
}
