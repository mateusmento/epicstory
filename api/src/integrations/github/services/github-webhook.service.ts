import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { GithubWebhookDeliveryReceipt } from '../entities/github-webhook-delivery-receipt.entity';
import { verifyGithubWebhookSignature256 } from '../lib/verify-github-webhook-signature';
import { GithubInstallationRepository } from '../repositories';
import { GithubCacheService } from './github-cache.service';
import { GithubIssuePullRequestSyncService } from './github-issue-pull-request-sync.service';
import { GithubWorkspaceInstallationService } from './github-workspace-installation.service';

type GenericPayload = Record<string, unknown>;

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(
    private readonly config: AppConfig,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly workspaceInstallation: GithubWorkspaceInstallationService,
    private readonly githubCache: GithubCacheService,
    private readonly issuePullSync: GithubIssuePullRequestSyncService,
    @InjectRepository(GithubWebhookDeliveryReceipt)
    private readonly webhookDeliveryReceipts: Repository<GithubWebhookDeliveryReceipt>,
  ) {}

  /**
   * Validates HMAC, then routes by `X-GitHub-Event` (installation cleanup, observability hooks, etc.).
   */
  async handleVerifiedDelivery(params: {
    rawBody: Buffer;
    signature256: string | undefined;
    event: string | undefined;
    deliveryId: string | undefined;
  }): Promise<void> {
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

    await this.dispatchEvent(params.event, payload, params.deliveryId);
  }

  private async dispatchEvent(
    event: string | undefined,
    payload: unknown,
    deliveryId: string | undefined,
  ): Promise<void> {
    const p = asObject(payload);
    const action = p && typeof p.action === 'string' ? p.action : '(no action)';
    const del = deliveryId ?? '?';

    switch (event) {
      case 'ping':
        this.logger.log(
          `GitHub ping delivery=${del} zen=${githubPingZen(payload)}`,
        );
        return;
      case 'installation':
        await this.onInstallationWebhook(p, deliveryId);
        return;
      case 'installation_repositories':
        this.onInstallationRepositoriesWebhook(p, deliveryId);
        return;
      case 'repository':
        this.onRepositoryWebhook(p, deliveryId);
        return;
      case 'pull_request':
        await this.onPullRequestWebhook(payload, p, deliveryId);
        return;
      default:
        this.logger.debug(
          `GitHub webhook unhandled event=${event ?? '?'} action=${action} delivery=${del}`,
        );
    }
  }

  private async onInstallationWebhook(
    payload: GenericPayload | null,
    deliveryId: string | undefined,
  ): Promise<void> {
    const action = typeof payload?.action === 'string' ? payload.action : '?';
    const ghId = installationIdString(asObject(payload?.installation));
    const del = deliveryId ?? '?';

    this.logger.log(
      `GitHub installation webhook action=${action} installation_id=${ghId ?? '?'} delivery=${del}`,
    );

    if (action === 'deleted' && ghId != null) {
      const installation =
        await this.installationRepo.findByGithubInstallationId(ghId);
      if (!installation) {
        this.logger.warn(
          `installation deleted on GitHub (id=${ghId}); no Epicstory row matched delivery=${del}`,
        );
        return;
      }

      if (this.githubCache.shouldInvalidateOnAdminActions()) {
        await this.githubCache.purgeInstallationCaches(ghId);
      }

      await this.workspaceInstallation.removeInstallationForWorkspace(
        installation.workspaceId,
      );
      this.logger.log(
        `Removed GitHub linkage for Epicstory workspace ${installation.workspaceId} (GitHub installation_id=${ghId})`,
      );
    }
  }

  private onInstallationRepositoriesWebhook(
    payload: GenericPayload | null,
    deliveryId: string | undefined,
  ): void {
    const action = typeof payload?.action === 'string' ? payload.action : '?';
    const installId =
      installationIdString(asObject(payload?.installation)) ?? '?';
    const del = deliveryId ?? '?';

    this.logger.log(
      `installation_repositories action=${action} installation_id=${installId} delivery=${del}`,
    );

    if (this.githubCache.shouldInvalidateOnRepoWebhooks()) {
      if (installId !== '?') {
        this.githubCache
          .purgeInstallationCaches(installId)
          .catch((e: unknown) =>
            this.logger.warn(
              `installation_repositories cache purge failed: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
      }
    }
  }

  private onRepositoryWebhook(
    payload: GenericPayload | null,
    deliveryId: string | undefined,
  ): void {
    const action = typeof payload?.action === 'string' ? payload.action : '?';
    const repo = asObject(payload?.repository);
    const fullName =
      repo && typeof repo.full_name === 'string' ? repo.full_name : '?';
    const del = deliveryId ?? '?';
    this.logger.log(
      `repository webhook action=${action} repo=${fullName} delivery=${del}`,
    );

    if (this.githubCache.shouldInvalidateOnRepoWebhooks()) {
      const installId = installationIdString(asObject(payload?.installation));
      const owner =
        repo && typeof repo.owner === 'object'
          ? (repo.owner as { login?: string }).login
          : undefined;
      const name =
        repo && typeof repo.name === 'string' ? repo.name : undefined;
      if (installId && owner && name) {
        this.githubCache
          .purgeRepoMetadata(installId, owner, name)
          .catch((e: unknown) =>
            this.logger.warn(
              `repository webhook cache purge failed: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
      } else if (installId) {
        this.githubCache
          .purgeInstallationCaches(installId)
          .catch((e: unknown) =>
            this.logger.warn(
              `repository webhook catalogue purge failed: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
      }
    }
  }

  private async onPullRequestWebhook(
    payloadRoot: unknown,
    payload: GenericPayload | null,
    deliveryId: string | undefined,
  ): Promise<void> {
    const action = typeof payload?.action === 'string' ? payload.action : '?';
    const pr = asObject(payload?.pull_request);
    const repo = asObject(payload?.repository);

    const prId = installationIdString(pr);
    const number =
      pr && typeof pr.number === 'number' ? String(pr.number) : '?';
    const state = pr && typeof pr.state === 'string' ? pr.state : '?';
    const merged = pr && typeof pr.merged === 'boolean' ? pr.merged : false;
    const fullName =
      repo && typeof repo.full_name === 'string' ? repo.full_name : '?';

    this.logger.log(
      `pull_request action=${action} repo=${fullName} pr=#${number} gh_pr_id=${prId ?? '?'} state=${state} merged=${merged} delivery=${deliveryId ?? '?'}`,
    );

    const receiptState = await this.claimPullRequestWebhookDelivery(deliveryId);
    if (receiptState === 'skipped_duplicate') {
      this.logger.debug(
        `pull_request duplicate X-GitHub-Delivery (${deliveryId ?? '?'}); skip ingest`,
      );
      return;
    }

    try {
      await this.issuePullSync.syncFromPullRequestWebhookPayload(payloadRoot);
    } catch (e) {
      if (receiptState === 'claimed' && deliveryId?.trim()) {
        await this.webhookDeliveryReceipts.delete({
          deliveryId: deliveryId.trim(),
        });
      }
      throw e;
    }
  }

  /** Idempotent ingest per GitHub delivery UUID; release receipt if sync throws so retries converge. */
  private async claimPullRequestWebhookDelivery(
    deliveryId: string | undefined,
  ): Promise<'skipped_duplicate' | 'claimed' | 'no_delivery_id'> {
    const id = deliveryId?.trim();
    if (!id) return 'no_delivery_id';

    try {
      await this.webhookDeliveryReceipts.insert({
        deliveryId: id,
      });
      return 'claimed';
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string } | undefined)?.code === '23505'
      ) {
        return 'skipped_duplicate';
      }
      throw e;
    }
  }
}

function asObject(v: unknown): GenericPayload | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as GenericPayload)
    : null;
}

function installationIdString(inst: GenericPayload | null): string | undefined {
  if (inst === null || !('id' in inst)) {
    return undefined;
  }
  const id = inst.id;
  if (typeof id === 'number') return String(id);
  if (typeof id === 'string') return id.trim();
  return undefined;
}

function githubPingZen(payload: unknown): string {
  const p = asObject(payload);
  const z = p?.zen;
  return typeof z === 'string' ? z : '?';
}
