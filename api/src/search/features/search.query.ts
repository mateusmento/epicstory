import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FindChannels } from 'src/channel/application/features';
import { FindMessages } from 'src/channel/application/features/find-messages.query';
import { ChannelDto } from 'src/channel/domain/dtos/channel.dto';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { FindIssues } from 'src/project/application/features';

export class SearchScope {
  @IsString()
  resourceType: string;
  @IsNumber()
  resourceId: number;

  constructor(data: Partial<SearchScope>) {
    patch(this, data);
  }
}

export class Search {
  workspaceId: number;

  issuerId: number;

  @IsString()
  query: string;

  @ValidateNested()
  @Type(() => SearchScope)
  @IsArray()
  @IsOptional()
  scope?: SearchScope;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  size?: number;

  constructor(data: Partial<Search>) {
    patch(this, data);
  }
}

export class SearchResult extends Page<any> {
  constructor(data: Partial<SearchResult>) {
    super(data);
    patch(this, data);
  }
}

@QueryHandler(Search)
export class SearchQuery implements IQueryHandler<Search> {
  constructor(private readonly queryBus: QueryBus) {}

  async execute({ query, workspaceId, scope, page, size, issuerId }: Search) {
    const channels = (): Promise<Page<ChannelDto>> =>
      this.queryBus.execute(
        new FindChannels({
          workspaceId,
          issuerId,
          query,
          page,
          size,
          orderBy: 'name',
          order: 'ASC',
        }),
      );

    const messages = (): Promise<Page<any>> =>
      this.queryBus.execute(
        new FindMessages({
          channelId: scope?.resourceId,
          issuerId,
          query,
          page,
          size,
          orderBy: 'sentAt',
          order: 'DESC',
        }),
      );

    const issues = (): Promise<Page<any>> =>
      this.queryBus.execute(
        new FindIssues({
          workspaceId,
          projectId: scope?.resourceId,
          query,
          page,
          count: size,
          orderBy: 'createdAt',
          order: 'DESC',
        }),
      );

    if (scope?.resourceType === 'channel') {
      return [
        {
          resource: 'recent-messages',
          data: new SearchResult(await messages()),
        },
      ];
    } else if (scope?.resourceType === 'project') {
      return [
        {
          resource: 'issues',
          data: new SearchResult(await issues()),
        },
      ];
    } else {
      return [
        {
          resource: 'channels',
          data: new SearchResult(await channels()),
        },
        {
          resource: 'recent-messages',
          data: new SearchResult(await messages()),
        },
        {
          resource: 'issues',
          data: new SearchResult(await issues()),
        },
      ];
    }
  }
}
