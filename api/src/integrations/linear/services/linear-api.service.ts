import { Injectable, NotFoundException } from '@nestjs/common';
import { LinearClientService } from './linear-client.service';
import { LinearTokenCryptoService } from './linear-token-crypto.service';
import { LinearConnectionRepository } from '../repositories';

@Injectable()
export class LinearApiService {
  constructor(
    private connectionRepo: LinearConnectionRepository,
    private crypto: LinearTokenCryptoService,
    private clientService: LinearClientService,
  ) {}

  async getWorkspaceClient(workspaceId: number) {
    const connection = await this.connectionRepo.findWorkspaceConnection(workspaceId);
    if (!connection) throw new NotFoundException('Linear connection not found');
    const accessToken = this.crypto.decrypt(connection.accessTokenEncrypted);
    return {
      connection,
      client: this.clientService.create(accessToken),
    };
  }

  async listTeams(workspaceId: number) {
    const { client } = await this.getWorkspaceClient(workspaceId);
    let conn = await (client as any).teams?.({ first: 100 });
    if (!conn) return [];

    const out: any[] = [];
    out.push(...(conn.nodes ?? []));
    while (conn.pageInfo?.hasNextPage && conn.fetchNext) {
      conn = await conn.fetchNext();
      out.push(...(conn.nodes ?? []));
    }
    return out.map((t) => ({ id: t.id, name: t.name, key: t.key }));
  }

  async listProjects(workspaceId: number) {
    const { client } = await this.getWorkspaceClient(workspaceId);
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
  }
}

