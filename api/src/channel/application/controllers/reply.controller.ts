import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { DeleteReply } from '../features/delete-reply.command';
import { MessageGateway } from '../gateways/message.gateway';
import { MessageService } from '../services/message.service';
import { ReplyMessage } from '../features/reply-message.command';
import { ToggleReplyReaction, UpdateReply } from '../features';

@UseGuards(JwtAuthGuard)
@Controller('messages/:messageId/replies')
export class MessageRepliesController {
  constructor(
    private messageService: MessageService,
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @Get()
  findReplies(@Param('messageId') messageId: number, @Auth() issuer: Issuer) {
    return this.messageService.findReplies(messageId, issuer.id);
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
    private messageService: MessageService,
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @Get('reactions')
  findReplyReactions(
    @Param('replyId') replyId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.messageService.findReplyReactions(replyId, issuer.id);
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
    @Body() body: Pick<UpdateReply, 'content' | 'attachmentIds'>,
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
