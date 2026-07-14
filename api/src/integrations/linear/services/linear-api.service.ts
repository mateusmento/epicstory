import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinearConnection, LinearProjectMap } from '../entities';
import { LinearClientService } from './linear-client.service';
import { LinearOAuthService } from './linear-oauth.service';
import { LinearTokenCryptoService } from './linear-token-crypto.service';
import { LinearConnectionRepository } from '../repositories';

/** Refresh when access token expires within this window (Linear tokens last ~24h). */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class LinearApiService {
  private readonly logger = new Logger(LinearApiService.name);

  constructor(
    private connectionRepo: LinearConnectionRepository,
    private crypto: LinearTokenCryptoService,
    private clientService: LinearClientService,
    private oauth: LinearOAuthService,
    @InjectRepository(LinearProjectMap)
    private projectMapRepo: Repository<LinearProjectMap>,
  ) {}

  async getWorkspaceClient(workspaceId: number) {
    let connection =
      await this.connectionRepo.findWorkspaceConnection(workspaceId);
    if (!connection) throw new NotFoundException('Linear connection not found');

    connection = await this.refreshTokensMaybe(connection, 'skew');

    const expiresAt = connection.tokenExpiresAt ?? null;
    if (expiresAt != null && expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'Linear connection expired. Reconnect Linear under Integrations → Linear.',
      );
    }

    const accessToken = this.crypto.decrypt(connection.accessTokenEncrypted);
    return {
      connection,
      client: this.clientService.create(accessToken),
    };
  }

  async listTeams(workspaceId: number) {
    return this.withAuthRefreshRetry(workspaceId, async (client) => {
      let conn = await (client as any).teams?.({ first: 100 });
      if (!conn) return [];

      const out: any[] = [];
      out.push(...(conn.nodes ?? []));
      while (conn.pageInfo?.hasNextPage && conn.fetchNext) {
        conn = await conn.fetchNext();
        out.push(...(conn.nodes ?? []));
      }
      return out.map((t) => ({ id: t.id, name: t.name, key: t.key }));
    });
  }

  async listProjects(workspaceId: number) {
    return this.withAuthRefreshRetry(workspaceId, async (client) => {
      let conn = await (client as any).projects?.({ first: 100 });
      if (!conn) return [];

      const out: any[] = [];
      out.push(...(conn.nodes ?? []));
      while (conn.pageInfo?.hasNextPage && conn.fetchNext) {
        conn = await conn.fetchNext();
        out.push(...(conn.nodes ?? []));
      }

      // `team` may be lazy-loaded; keep minimal stable fields.
      return out.map((p) => ({
        id: p.id,
        name: p.name,
        state: p.state,
        teamId: p.teamId ?? p.team?.id,
      }));
    });
  }

  async listProjectMaps(workspaceId: number) {
    const { connection } = await this.getWorkspaceClient(workspaceId);
    const rows = await this.projectMapRepo.find({
      where: { linearConnectionId: connection.id },
    });
    return rows.map((r) => ({
      linearProjectId: r.linearProjectId,
      epicProjectId: r.epicProjectId,
    }));
  }

  /**
   * Proactively refresh access token (skew window), or force-refresh after a Linear auth error.
   * Linear rotates refresh tokens — the returned refresh_token must replace the previous one.
   */
  private async refreshTokensMaybe(
    connection: LinearConnection,
    mode: 'skew' | 'force',
  ): Promise<LinearConnection> {
    const refreshEnc = connection.refreshTokenEncrypted?.trim();
    if (!refreshEnc) {
      return connection;
    }

    const expMs = connection.tokenExpiresAt?.getTime();
    const shouldRefresh =
      mode === 'force' ||
      expMs == null ||
      Date.now() >= expMs - REFRESH_SKEW_MS;

    if (!shouldRefresh) {
      return connection;
    }

    let refreshPlain: string;
    try {
      refreshPlain = this.crypto.decrypt(refreshEnc);
    } catch {
      this.logger.warn(
        `Linear refresh token decrypt failed for connection ${connection.id}`,
      );
      return connection;
    }

    try {
      const token = await this.oauth.refreshAccessToken(refreshPlain);
      const accessToken = token.access_token?.trim();
      if (!accessToken) {
        return connection;
      }

      const accessTokenEncrypted = this.crypto.encrypt(accessToken);
      const rotatedRefresh = token.refresh_token?.trim();
      const nextRefreshEncrypted =
        rotatedRefresh && rotatedRefresh.length > 0
          ? this.crypto.encrypt(rotatedRefresh)
          : refreshEnc;
      const tokenExpiresAt =
        token.expires_in != null && token.expires_in > 0
          ? new Date(Date.now() + token.expires_in * 1000)
          : null;

      Object.assign(connection, {
        accessTokenEncrypted,
        refreshTokenEncrypted: nextRefreshEncrypted,
        tokenExpiresAt,
        status: 'active',
        revokedAt: null,
      });
      await this.connectionRepo.save(connection);
      return connection;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Linear token refresh failed for connection ${connection.id}: ${msg}`,
      );
      return connection;
    }
  }

  private isLinearAuthError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return /Authentication required|not authenticated|Unauthorized/i.test(msg);
  }

  private async withAuthRefreshRetry<T>(
    workspaceId: number,
    runner: (client: ReturnType<LinearClientService['create']>) => Promise<T>,
  ): Promise<T> {
    const first = await this.getWorkspaceClient(workspaceId);
    try {
      return await runner(first.client);
    } catch (e: unknown) {
      if (!this.isLinearAuthError(e)) throw e;

      let connection =
        await this.connectionRepo.findWorkspaceConnection(workspaceId);
      if (!connection?.refreshTokenEncrypted) throw e;

      const prevTok = connection.accessTokenEncrypted;
      connection = await this.refreshTokensMaybe(connection, 'force');
      if (connection.accessTokenEncrypted === prevTok) throw e;

      const accessToken = this.crypto.decrypt(connection.accessTokenEncrypted);
      return runner(this.clientService.create(accessToken));
    }
  }
}
