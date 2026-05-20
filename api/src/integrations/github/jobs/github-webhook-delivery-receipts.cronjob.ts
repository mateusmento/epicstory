import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { GithubWebhookDeliveryReceipt } from '../entities';

@Injectable()
export class GithubWebhookDeliveryReceiptsCronjob {
  private readonly logger = new Logger(
    GithubWebhookDeliveryReceiptsCronjob.name,
  );

  constructor(
    private readonly config: AppConfig,
    @InjectRepository(GithubWebhookDeliveryReceipt)
    private readonly receipts: Repository<GithubWebhookDeliveryReceipt>,
  ) {}

  /**
   * Receipts only dedupe recent deliveries; successful rows are small and accumulate without bound.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async pruneStaleReceipts(): Promise<void> {
    const days = this.config.GITHUB_WEBHOOK_DELIVERY_RECEIPT_RETENTION_DAYS;
    if (days <= 0) {
      return;
    }
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const result = await this.receipts
      .createQueryBuilder()
      .delete()
      .from(GithubWebhookDeliveryReceipt)
      .where('received_at < :cutoff', { cutoff })
      .execute();
    const n = result.affected ?? 0;
    if (n > 0) {
      this.logger.log(
        `Pruned ${n} GitHub webhook delivery receipt(s) older than ${days} day(s)`,
      );
    }
  }
}
