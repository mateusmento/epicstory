import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  isString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Page } from 'src/core/page';
import { patch } from 'src/core/objects';
import { WorkspaceMember } from 'src/workspace/domain/entities';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class FindWorkspaceMembers {
  @IsNumber()
  workspaceId: number;

  @IsString()
  @IsOptional()
  name?: string;

  /** Searches by email, mirroring `FindUsers.username` */
  @IsString()
  @IsOptional()
  email?: string;

  /**
   * Single search term: matches `user.name` OR `user.email` (takes precedence over
   * `name` and `email` when set).
   */
  @IsString()
  @IsOptional()
  q?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  count?: number;

  constructor(data: Partial<FindWorkspaceMembers> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindWorkspaceMembers)
export class FindWorkspaceMemberQuery
  implements IQueryHandler<FindWorkspaceMembers>
{
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async execute({
    workspaceId,
    name,
    email,
    q,
    page = 0,
    count = 100,
  }: FindWorkspaceMembers): Promise<Page<WorkspaceMember>> {
    return this.workspaceRepo.findMembersPage({
      workspaceId,
      q: isString(q) ? q : undefined,
      name: isString(name) ? name : undefined,
      email: isString(email) ? email : undefined,
      page,
      count,
    });
  }
}
