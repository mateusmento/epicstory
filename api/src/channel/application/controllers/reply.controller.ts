import type { UpdateReplyBody } from '@epicstory/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { ToggleReplyReaction, UpdateReply } from '../features';
import { DeleteReply } from '../features/delete-reply.command';
import { FindMessageReplies } from '../features/find-message-replies.query';
import { ReplyMessage } from '../features/reply-message.command';
import { MessageGateway } from '../gateways/message.gateway';
import { ReplyService } from '../services/reply.service';

@UseGuards(JwtAuthGuard)
@Controller('messages/:messageId/replies')
export class MessageRepliesController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @Get()
  findReplies(
    @Param('messageId') messageId: number,
    @Query() query: FindMessageReplies,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new FindMessageReplies({
        messageId,
        issuerId: issuer.id,
        full: query.full,
        limit: query.limit,
        beforeSentAt: query.beforeSentAt,
        beforeId: query.beforeId,
      }),
    );
  }

  @Post()
  async createReply(
    @Param('messageId') messageId: number,
    @Body() command: ReplyMessage,
    @Auth() issuer: Issuer,
  ) {
    const reply = await this.commandBus.execute(
      new ReplyMessage({
        ...command,
        messageId,
        senderId: issuer.id,
      }),
    );

    this.messageGateway.emitIncomingReply(reply);

    return reply;
  }
}

@UseGuards(JwtAuthGuard)
@Controller('replies/:replyId')
export class ReplyController {
  constructor(
    private replyService: ReplyService,
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @Get('reactions')
  findReplyReactions(
    @Param('replyId') replyId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.replyService.findReplyReactions(replyId, issuer.id);
  }

  @Post('reactions')
  async toggleReplyReaction(
    @Param('replyId') replyId: number,
    @Body() { emoji }: ToggleReplyReaction,
    @Auth() issuer: Issuer,
  ) {
    const { channelId, action, reactions } = await this.commandBus.execute(
      new ToggleReplyReaction({
        replyId,
        emoji,
        issuerId: issuer.id,
      }),
    );

    this.messageGateway.emitIncomingReplyReaction(
      channelId,
      replyId,
      emoji,
      issuer.id,
      action,
      reactions,
    );

    return {
      success: true,
      channelId,
      replyId,
      emoji,
      action,
      reactions,
    };
  }

  @Patch()
  async updateReply(
    @Param('replyId') replyId: number,
    @Body() body: UpdateReplyBody,
    @Auth() issuer: Issuer,
  ) {
    const reply = await this.commandBus.execute(
      new UpdateReply({
        replyId,
        issuerId: issuer.id,
        content: body.content,
        attachmentIds: body.attachmentIds,
      }),
    );

    this.messageGateway.emitReplyUpdated(reply.channelId, reply, issuer.id);
    return reply;
  }

  @Delete()
  async deleteReply(@Param('replyId') replyId: number, @Auth() issuer: Issuer) {
    const { channelId, messageId } = await this.commandBus.execute(
      new DeleteReply({ replyId, issuerId: issuer.id }),
    );

    this.messageGateway.emitReplyDeleted(
      channelId,
      messageId,
      replyId,
      issuer.id,
    );

    return { success: true, replyId };
  }
}
