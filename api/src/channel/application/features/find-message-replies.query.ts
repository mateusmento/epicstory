import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { MessageReply } from 'src/channel/domain/entities/message-reply.entity';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { ReplyService } from '../services/reply.service';

export class FindMessageReplies {
  messageId: number;
  issuerId: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  full?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsDateString()
  beforeSentAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  beforeId?: number;

  constructor(data: Partial<FindMessageReplies>) {
    patch(this, data);
  }
}

@QueryHandler(FindMessageReplies)
export class FindMessageRepliesQuery
  implements IQueryHandler<FindMessageReplies>
{
  constructor(private replyService: ReplyService) {}

  execute(query: FindMessageReplies): Promise<Page<MessageReply>> {
    const hasBeforeAt = query.beforeSentAt != null && query.beforeSentAt !== '';
    const hasBeforeId = query.beforeId != null;

    if (query.full) {
      if (hasBeforeAt || hasBeforeId) {
        throw new BadRequestException(
          'full cannot be combined with beforeSentAt / beforeId',
        );
      }
      return this.replyService.findAllRepliesForMessage(
        query.messageId,
        query.issuerId,
      );
    }

    if (hasBeforeAt !== hasBeforeId) {
      throw new BadRequestException(
        'beforeSentAt and beforeId must both be provided for pagination',
      );
    }

    let beforeDate: Date | undefined;
    if (hasBeforeAt && query.beforeSentAt) {
      beforeDate = new Date(query.beforeSentAt);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestException('Invalid beforeSentAt');
      }
    }

    const limit = query.limit ?? 50;

    return this.replyService.findReplies(query.messageId, query.issuerId, {
      limit,
      beforeSentAt: beforeDate,
      beforeId: hasBeforeId ? query.beforeId : undefined,
    });
  }
}
