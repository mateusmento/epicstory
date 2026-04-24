import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { UseGuards } from '@nestjs/common';
import type { ScheduledJobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { DeleteScheduledChannelMessage } from '../features/delete-scheduled-channel-message.command';
import { ListScheduledChannelMessages } from '../features/list-scheduled-channel-messages.query';
import { ScheduleChannelMessage } from '../features/schedule-channel-message.command';
import { UpdateScheduledChannelMessage } from '../features/update-scheduled-channel-message.command';

class CreateScheduledMessageBody {
  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  contentRich?: any;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number;

  @Type(() => Date)
  @IsDate()
  dueAt: Date;

  @IsObject()
  recurrence: ScheduledJobRecurrence;
}

class UpdateScheduledMessageBody {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  contentRich?: any;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @IsOptional()
  @IsObject()
  recurrence?: ScheduledJobRecurrence;
}

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/scheduled-messages')
export class ChannelScheduledMessageController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get()
  list(@Param('channelId') channelId: string, @Auth() issuer: Issuer) {
    return this.queryBus.execute(
      new ListScheduledChannelMessages({
        channelId: +channelId,
        issuerId: issuer.id,
      }),
    );
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @Param('channelId') channelId: string,
    @Body() body: CreateScheduledMessageBody,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new ScheduleChannelMessage({
        channelId: +channelId,
        senderId: issuer.id,
        content: body.content,
        contentRich: body.contentRich,
        quotedMessageId: body.quotedMessageId,
        dueAt: body.dueAt,
        recurrence: body.recurrence,
      }),
    );
  }

  @Patch(':scheduledMessageId')
  update(
    @Param('channelId') channelId: string,
    @Param('scheduledMessageId') scheduledMessageId: string,
    @Body() body: UpdateScheduledMessageBody,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateScheduledChannelMessage({
        scheduledMessageId,
        channelId: +channelId,
        issuerId: issuer.id,
        content: body.content,
        contentRich: body.contentRich,
        quotedMessageId: body.quotedMessageId,
        dueAt: body.dueAt,
        recurrence: body.recurrence,
      }),
    );
  }

  @Delete(':scheduledMessageId')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('channelId') channelId: string,
    @Param('scheduledMessageId') scheduledMessageId: string,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new DeleteScheduledChannelMessage({
        scheduledMessageId,
        channelId: +channelId,
        issuerId: issuer.id,
      }),
    );
  }
}
