import {
  Controller,
  HttpCode,
  InternalServerErrorException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { GithubWebhookService } from '../services/github-webhook.service';

/**
 * GitHub App publishes to this URL (POST). Configure the same path + `GITHUB_APP_WEBHOOK_SECRET` in GitHub.
 * Requires `NestFactory.create(..., { rawBody: true })` so the HMAC matches GitHub’s payload bytes.
 */
@Controller('integrations/github')
export class GithubWebhookController {
  constructor(private readonly githubWebhook: GithubWebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>): Promise<{ ok: true }> {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new InternalServerErrorException(
        'Missing raw body (enable rawBody in Nest bootstrap)',
      );
    }

    await this.githubWebhook.handleVerifiedDelivery({
      rawBody: raw,
      signature256: req.get('x-hub-signature-256'),
      event: req.get('x-github-event') ?? undefined,
      deliveryId: req.get('x-github-delivery') ?? undefined,
    });

    return { ok: true };
  }
}
