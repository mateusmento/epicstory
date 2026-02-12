import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from 'src/auth';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { CreateTeam, AddTeamMember } from 'src/workspace/application/features';
import { CreateProject } from 'src/project/application/features/project/create-project.command';
import { CreateBacklogItem } from 'src/project/application/features/backlog/create-backlog-item.command';
import { UpdateIssue } from 'src/project/application/features/issue/update-issue.command';
import { AddAssignee } from 'src/project/application/features/issue/add-assignee.command';
import {
  LinearApiService,
  LinearClientService,
  LinearTokenCryptoService,
} from './index';
import {
  LinearImportJob,
  LinearImportMismatch,
  LinearIssueMap,
  LinearProjectMap,
  LinearTeamMap,
  LinearUserMap,
} from '../entities';
import { LinearConnectionRepository } from '../repositories';
import { Project as EpicProject } from 'src/project/domain/entities/project.entity';

type LinearIssueLike = {
  id: string;
  title: string;
  description?: string | null;
  priority?: number | null;
  dueDate?: any;
  createdAt?: string | null;
  sortOrder?: number | null;
  state?: any;
  assignee?: any;
};

@Injectable()
export class LinearImportProcessorService {
  private readonly logger = new Logger(LinearImportProcessorService.name);

  constructor(
    private commandBus: CommandBus,
    private userRepo: UserRepository,
    private workspaceRepo: WorkspaceRepository,
    private connectionRepo: LinearConnectionRepository,
    private linearApi: LinearApiService,
    private tokenCrypto: LinearTokenCryptoService,
    private clientService: LinearClientService,
    @InjectRepository(LinearTeamMap)
    private teamMapRepo: Repository<LinearTeamMap>,
    @InjectRepository(LinearProjectMap)
    private projectMapRepo: Repository<LinearProjectMap>,
    @InjectRepository(LinearIssueMap)
    private issueMapRepo: Repository<LinearIssueMap>,
    @InjectRepository(LinearUserMap)
    private userMapRepo: Repository<LinearUserMap>,
    @InjectRepository(LinearImportMismatch)
    private mismatchRepo: Repository<LinearImportMismatch>,
    @InjectRepository(LinearImportJob)
    private jobRepo: Repository<LinearImportJob>,
    @InjectRepository(EpicProject)
    private epicProjectRepo: Repository<EpicProject>,
  ) {}

  async process(job: LinearImportJob) {
    const issuerUser = await this.userRepo.findOne({
      where: { id: job.createdByUserId },
    });
    if (!issuerUser) throw new Error('Job issuer user not found');

    const issuer = {
      id: issuerUser.id,
      name: issuerUser.name,
      email: issuerUser.email,
    };

    const connection = await this.connectionRepo.findOne({
      where: { id: job.linearConnectionId },
    });
    if (!connection) throw new Error('Linear connection not found');

    const accessToken = this.tokenCrypto.decrypt(
      connection.accessTokenEncrypted,
    );
    const client = this.clientService.create(accessToken);

    const params = job.params ?? {};
    const importAll = !!params.importAll;
    const requestedProjectIds: string[] = Array.isArray(params.projectIds)
      ? params.projectIds
      : [];
    const mappings = params.mappings ?? {};
    const mappedEpicProjectIds: Record<string, number> =
      mappings.projects ?? {};

    const projects =
      importAll || requestedProjectIds.length === 0
        ? await this.linearApi.listProjects(job.workspaceId)
        : requestedProjectIds.map((id) => ({
            id,
            name: '',
            teamId: undefined,
          }));

    let importedProjects = 0;
    let importedIssues = 0;
    let lastProjectName = '';

    for (const lp of projects) {
      lastProjectName = lp.name || lp.id;
      const linearProject = await (client as any).project?.(lp.id);
      if (!linearProject) {
        await this.addMismatch(
          job.id,
          'linear_project_not_found',
          `Linear project not found: ${lp.id}`,
          { linearProjectId: lp.id },
        );
        continue;
      }

      // If user mapped this Linear project into an existing Epic project, use it.
      const mappedEpicProjectId = mappedEpicProjectIds?.[lp.id];
      if (mappedEpicProjectId) {
        const epicProject = await this.epicProjectRepo.findOne({
          where: { id: mappedEpicProjectId },
        });
        if (!epicProject) {
          await this.addMismatch(
            job.id,
            'mapped_epic_project_not_found',
            `Mapped Epic project not found: ${mappedEpicProjectId}`,
            { linearProjectId: lp.id, epicProjectId: mappedEpicProjectId },
          );
          continue;
        }
        if (epicProject.workspaceId !== job.workspaceId) {
          await this.addMismatch(
            job.id,
            'mapped_epic_project_wrong_workspace',
            `Mapped Epic project ${mappedEpicProjectId} does not belong to workspace ${job.workspaceId}`,
            { linearProjectId: lp.id, epicProjectId: mappedEpicProjectId },
          );
          continue;
        }

        // Ensure mapping row exists (idempotent behavior)
        await this.projectMapRepo.upsert(
          {
            linearConnectionId: connection.id,
            linearProjectId: lp.id,
            epicProjectId: epicProject.id,
          } as any,
          ['linearConnectionId', 'linearProjectId'],
        );

        importedProjects += 1;
        importedIssues += await this.importIssues({
          job,
          issuer,
          connectionId: connection.id,
          epicProject,
          linearProject,
          client,
        });

        await this.jobRepo.update(job.id, {
          progress: {
            importedProjects,
            importedIssues,
            lastProject: lastProjectName,
          } as any,
        } as any);
        continue;
      }

      // Resolve Linear team -> Epic team (hybrid mapping, auto-create default)
      const linearTeam = await (linearProject as any).team;
      const linearTeamId: string | undefined = linearTeam?.id ?? lp.teamId;
      let epicTeamId: number | undefined;

      if (linearTeamId) {
        const existingTeamMap = await this.teamMapRepo.findOne({
          where: {
            linearConnectionId: connection.id,
            linearTeamId,
          },
        });
        if (existingTeamMap) {
          epicTeamId = existingTeamMap.epicTeamId;
        } else {
          const createdTeam = await this.commandBus.execute(
            new CreateTeam({
              issuerId: issuer.id,
              workspaceId: job.workspaceId,
              name: linearTeam?.name ?? 'Linear Team',
              members: [],
            }),
          );
          epicTeamId = createdTeam.id;
          await this.teamMapRepo.save(
            this.teamMapRepo.create({
              linearConnectionId: connection.id,
              linearTeamId,
              epicTeamId,
            }),
          );
        }

        // Import team members (email-match), best-effort
        try {
          const membersConn = await (linearTeam as any)?.members?.({
            first: 100,
          });
          const members = await collectNodes(membersConn);
          for (const lm of members) {
            const email = lm?.email as string | undefined;
            if (!email) continue;
            const epicUser = await this.userRepo.findOne({ where: { email } });
            await this.userMapRepo.upsert(
              {
                linearConnectionId: connection.id,
                linearUserId: lm.id,
                epicUserId: epicUser?.id ?? null,
                emailSnapshot: email,
              } as any,
              ['linearConnectionId', 'linearUserId'],
            );

            if (!epicUser) {
              await this.addMismatch(
                job.id,
                'unmatched_user',
                `No Epicstory user found for Linear member ${email}`,
                { email, linearUserId: lm.id, linearTeamId },
              );
              continue;
            }

            const isWorkspaceMember = await this.workspaceRepo.memberExists(
              job.workspaceId,
              epicUser.id,
            );
            if (!isWorkspaceMember) {
              await this.addMismatch(
                job.id,
                'user_not_workspace_member',
                `Epicstory user ${email} is not a workspace member`,
                { email, epicUserId: epicUser.id, linearTeamId },
              );
              continue;
            }

            if (epicTeamId) {
              // idempotency: AddTeamMemberCommand itself is not idempotent; ignore errors later in mismatch if needed
              try {
                await this.commandBus.execute(
                  new AddTeamMember({
                    teamId: epicTeamId,
                    issuerId: issuer.id,
                    userId: epicUser.id,
                  }),
                );
              } catch {
                // ignore duplicates
              }
            }
          }
        } catch (e) {
          this.logger.warn(
            `Failed importing team members for team ${linearTeamId}: ${e?.message ?? e}`,
          );
        }
      }

      // Resolve Linear project -> Epic project
      const existingProjectMap = await this.projectMapRepo.findOne({
        where: {
          linearConnectionId: connection.id,
          linearProjectId: lp.id,
        },
      });

      let epicProject: any;
      if (existingProjectMap) {
        epicProject = await this.epicProjectRepo.findOne({
          where: { id: existingProjectMap.epicProjectId },
        });
        if (!epicProject) {
          await this.addMismatch(
            job.id,
            'mapped_epic_project_not_found',
            `Mapped Epic project not found: ${existingProjectMap.epicProjectId}`,
            {
              linearProjectId: lp.id,
              epicProjectId: existingProjectMap.epicProjectId,
            },
          );
          continue;
        }
      } else {
        epicProject = await this.commandBus.execute(
          new CreateProject({
            issuerId: issuer.id,
            workspaceId: job.workspaceId,
            teamId: epicTeamId,
            name: (linearProject as any).name ?? lp.name ?? 'Linear Project',
          }),
        );
        await this.projectMapRepo.save(
          this.projectMapRepo.create({
            linearConnectionId: connection.id,
            linearProjectId: lp.id,
            epicProjectId: epicProject.id,
          }),
        );
      }

      importedProjects += 1;

      importedIssues += await this.importIssues({
        job,
        issuer,
        connectionId: connection.id,
        epicProject,
        linearProject,
        client,
      });

      await this.jobRepo.update(job.id, {
        progress: {
          importedProjects,
          importedIssues,
          lastProject: lastProjectName,
        } as any,
      } as any);
    }
  }

  private async importIssues(args: {
    job: LinearImportJob;
    issuer: { id: number; name: string; email: string };
    connectionId: number;
    epicProject: any;
    linearProject: any;
    client: any;
  }): Promise<number> {
    const { job, issuer, connectionId, epicProject, linearProject, client } =
      args;
    let imported = 0;

    const issuesConn = await (linearProject as any).issues?.({ first: 100 });
    const partialIssues = (await collectNodes(issuesConn)) as LinearIssueLike[];

    // Hydrate issues using the SDK to ensure fields like state, assignee, dueDate are available.
    const issues: LinearIssueLike[] = [];
    for (const pi of partialIssues) {
      try {
        const full = await (client as any).issue?.(pi.id);
        issues.push((full ?? pi) as any);
      } catch {
        issues.push(pi);
      }
    }

    issues.sort((a, b) => {
      const soA = typeof a.sortOrder === 'number' ? a.sortOrder : null;
      const soB = typeof b.sortOrder === 'number' ? b.sortOrder : null;
      if (soA !== null && soB !== null) return soA - soB;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });

    const backlogId = epicProject.backlogId;
    if (!backlogId) {
      await this.addMismatch(
        job.id,
        'missing_backlog',
        `Epic project backlogId missing for project ${epicProject.id}`,
        {
          epicProjectId: epicProject.id,
          linearProjectId: (linearProject as any).id,
        },
      );
      return 0;
    }

    let afterOf: number | undefined;

    for (const li of issues) {
      const existingIssueMap = await this.issueMapRepo.findOne({
        where: {
          linearConnectionId: connectionId,
          linearIssueId: li.id,
        },
      });
      if (existingIssueMap) {
        afterOf = existingIssueMap.epicBacklogItemId;
        continue;
      }

      const backlogItem = await this.commandBus.execute(
        new CreateBacklogItem({
          issuer,
          projectId: epicProject.id,
          backlogId,
          afterOf,
          title: li.title ?? '',
          description: li.description ?? '',
        }),
      );

      const epicIssueId = backlogItem.issueId ?? backlogItem.issue?.id;
      const epicBacklogItemId = backlogItem.id;

      await this.issueMapRepo.save(
        this.issueMapRepo.create({
          linearConnectionId: connectionId,
          linearIssueId: li.id,
          epicIssueId,
          epicBacklogItemId,
        }),
      );

      afterOf = epicBacklogItemId;
      imported += 1;

      const state = (await resolveMaybe<any>((li as any).state)) as any;
      const status = mapLinearStateToEpicStatus(state?.type, state?.name);
      const dueDate = parseLinearDueDate((li as any).dueDate);
      const priority =
        typeof li.priority === 'number' ? li.priority : undefined;

      await this.commandBus.execute(
        new UpdateIssue({
          issueId: epicIssueId,
          issuer,
          status,
          dueDate,
          priority,
        } as any),
      );

      const assignee = (await resolveMaybe<any>((li as any).assignee)) as any;
      const assigneeEmail = assignee?.email ?? null;
      if (assigneeEmail) {
        const epicAssignee = await this.userRepo.findOne({
          where: { email: assigneeEmail },
        });
        if (!epicAssignee) {
          await this.addMismatch(
            job.id,
            'unmatched_assignee',
            `No Epicstory user found for Linear assignee ${assigneeEmail}`,
            { email: assigneeEmail, linearIssueId: li.id },
          );
        } else {
          const isWorkspaceMember = await this.workspaceRepo.memberExists(
            job.workspaceId,
            epicAssignee.id,
          );
          if (!isWorkspaceMember) {
            await this.addMismatch(
              job.id,
              'assignee_not_workspace_member',
              `Epicstory user ${assigneeEmail} is not a workspace member`,
              {
                email: assigneeEmail,
                epicUserId: epicAssignee.id,
                linearIssueId: li.id,
              },
            );
          } else {
            await this.commandBus.execute(
              new AddAssignee({
                issuer,
                issueId: epicIssueId,
                userId: epicAssignee.id,
              }),
            );
          }
        }
      } else if (assignee?.id) {
        // Try to resolve assignee email via SDK user lookup (best-effort).
        try {
          const user = await (client as any).user?.(assignee.id);
          const email = (user as any)?.email as string | undefined;
          if (email) {
            const epicAssignee = await this.userRepo.findOne({
              where: { email },
            });
            if (epicAssignee) {
              const isWorkspaceMember = await this.workspaceRepo.memberExists(
                job.workspaceId,
                epicAssignee.id,
              );
              if (isWorkspaceMember) {
                await this.commandBus.execute(
                  new AddAssignee({
                    issuer,
                    issueId: epicIssueId,
                    userId: epicAssignee.id,
                  }),
                );
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    return imported;
  }

  // (kept intentionally empty)

  private async addMismatch(
    jobId: string,
    type: string,
    message: string,
    payload: any,
  ) {
    await this.mismatchRepo.save(
      this.mismatchRepo.create({
        jobId,
        type,
        message,
        payload: payload ?? {},
      }),
    );
  }
}

function mapLinearStateToEpicStatus(
  type: string | null | undefined,
  name: string | null | undefined,
): string {
  const t = (type ?? '').toLowerCase();
  const n = (name ?? '').toLowerCase();

  // Match as close as possible to Epicstory:
  // - backlog/todo -> todo
  // - in progress -> doing
  // - done -> done
  if (t.includes('complete') || n.includes('done')) return 'done';
  if (
    t.includes('start') ||
    n.includes('in progress') ||
    n.includes('progress')
  )
    return 'doing';
  if (t.includes('backlog') || n.includes('backlog') || n.includes('todo'))
    return 'todo';
  return 'todo';
}

async function resolveMaybe<T>(value: any): Promise<T | undefined> {
  if (!value) return undefined;
  if (typeof value.then === 'function') return (await value) as T;
  return value as T;
}

function parseLinearDueDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

async function collectNodes(conn: any): Promise<any[]> {
  if (!conn) return [];
  const out: any[] = [];
  out.push(...(conn.nodes ?? []));
  while (conn.pageInfo?.hasNextPage && conn.fetchNext) {
    conn = await conn.fetchNext();
    out.push(...(conn.nodes ?? []));
  }
  return out;
}
