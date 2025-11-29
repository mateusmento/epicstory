import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { MessageService } from '../services/message.service';

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get('messages')
  findMessages(@Param('channelId') channelId: number) {
    return this.messageService.findMessages(channelId);
  }

  @Get('messages/:messageId/replies')
  findReplies(@Param('messageId') messageId: number) {
    return this.messageService.findReplies(messageId);
  }

  @Post('messages/:messageId/replies')
  createReply(
    @Param('messageId') messageId: number,
    @Body() body: { content: string },
    @Auth() issuer: Issuer,
  ) {
    return this.messageService.createReply(body.content, messageId, issuer.id);
  }

  @Get('messages/:messageId/reactions')
  findMessageReactions(@Param('messageId') messageId: number) {
    return this.messageService.findMessageReactions(messageId);
  }

  @Get('messages/:messageId/replies/:replyId/reactions')
  findMessageReplyReactions(@Param('replyId') replyId: number) {
    return this.messageService.findMessageReplyReactions(replyId);
  }

  @Post('messages/:messageId/reactions')
  toggleMessageReaction(
    @Param('messageId') messageId: number,
    @Body() body: { emoji: string },
    @Auth() issuer: Issuer,
  ) {
    return this.messageService.toggleMessageReaction(
      messageId,
      body.emoji,
      issuer.id,
    );
  }

  @Post('messages/:messageId/replies/:replyId/reactions')
  toggleMessageReplyReaction(
    @Param('replyId') replyId: number,
    @Body() body: { emoji: string },
    @Auth() issuer: Issuer,
  ) {
    return this.messageService.toggleMessageReplyReaction(
      replyId,
      body.emoji,
      issuer.id,
    );
  }

  @Delete('messages/:messageId')
  deleteMessage(@Param('messageId') messageId: number, @Auth() issuer: Issuer) {
    return this.messageService.deleteMessage(messageId, issuer.id);
  }

  @Delete('messages/:messageId/replies/:replyId')
  deleteReply(@Param('replyId') replyId: number, @Auth() issuer: Issuer) {
    return this.messageService.deleteReply(replyId, issuer.id);
  }
}
