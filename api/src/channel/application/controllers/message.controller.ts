import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
}
