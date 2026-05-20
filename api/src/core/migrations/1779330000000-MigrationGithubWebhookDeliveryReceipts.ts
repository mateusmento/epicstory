import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationGithubWebhookDeliveryReceipts1779330000000
  implements MigrationInterface
{
  name = 'MigrationGithubWebhookDeliveryReceipts1779330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration"."github_webhook_delivery_receipts" (
        "delivery_id" character varying(72) NOT NULL,
        "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_github_webhook_delivery_receipts" PRIMARY KEY ("delivery_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE "integration"."github_webhook_delivery_receipts"`,
    );
  }
}
