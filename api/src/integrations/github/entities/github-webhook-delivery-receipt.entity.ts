import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per GitHub `X-GitHub-Delivery` successfully processed `pull_request` webhook payload.
 * Receipt is removed again if ingest throws so retries can converge (at-least-once + duplicate skip).
 */
@Entity({ schema: 'integration', name: 'github_webhook_delivery_receipts' })
export class GithubWebhookDeliveryReceipt {
  @PrimaryColumn({ name: 'delivery_id', length: 72 })
  deliveryId: string;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;
}
