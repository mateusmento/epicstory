import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfig } from 'src/core/app.config';
import { verifyGithubWebhookSignature256 } from '../lib/verify-github-webhook-signature';

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(private readonly config: AppConfig) {}

  /**
   * Validates HMAC signature and acknowledges the delivery. Event-specific handling (e.g. `pull_request`) comes later.
   */
  handleVerifiedDelivery(params: {
    rawBody: Buffer;
    signature256: string | undefined;
    event: string | undefined;
    deliveryId: string | undefined;
  }): void {
    const secret = this.config.GITHUB_APP_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'GITHUB_APP_WEBHOOK_SECRET is not configured; cannot verify GitHub webhooks.',
      );
    }

    if (
      !verifyGithubWebhookSignature256(
        params.rawBody,
        params.signature256,
        secret,
      )
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(params.rawBody.toString('utf8')) as unknown;
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    const action =
      payload &&
      typeof payload === 'object' &&
      'action' in payload &&
      typeof (payload as { action?: unknown }).action === 'string'
        ? (payload as { action: string }).action
        : undefined;

    this.logger.log(
      `GitHub webhook received: event=${params.event ?? '?'} action=${action ?? '—'} delivery=${params.deliveryId ?? '?'}`,
    );
  }
}
